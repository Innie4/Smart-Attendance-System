from flask import Blueprint, request, jsonify, current_app

from app.extensions import db
from app.models import (
    AttendanceSession,
    AttendanceLog,
    Course,
    CourseEnrolment,
    FacialEnrolment,
    Lecturer,
    Student,
)
from app.services.face_service import FaceRecognitionPipeline, best_match
from app.services.liveness import BlinkDetector
from app.utils.validators import require_fields
from app.routes.enrolment import _decode_frame

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")


def _current_lecturer(lecturer_id=None):
    if lecturer_id is not None:
        return db.session.get(Lecturer, lecturer_id)
    return Lecturer.query.first()


@attendance_bp.post("/sessions")
def create_session():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["course_id"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400

    course = db.session.get(Course, payload["course_id"])
    if not course:
        return jsonify({"error": "Course not found"}), 404

    lecturer = _current_lecturer(payload.get("lecturer_id"))
    if not lecturer:
        return jsonify({"error": "No lecturer profile exists yet"}), 400

    open_session = AttendanceSession.query.filter_by(
        course_id=course.id, lecturer_id=lecturer.id, is_locked=False
    ).first()
    if open_session:
        return jsonify(open_session.to_dict()), 200

    session = AttendanceSession(course_id=course.id, lecturer_id=lecturer.id)
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201


@attendance_bp.get("/sessions/<int:session_id>")
def get_session(session_id):
    session = db.get_or_404(AttendanceSession, session_id)
    return jsonify(session.to_dict())


@attendance_bp.post("/sessions/<int:session_id>/close")
def close_session(session_id):
    session = db.get_or_404(AttendanceSession, session_id)
    session.close()
    db.session.commit()
    return jsonify(session.to_dict())


@attendance_bp.get("/sessions/<int:session_id>/logs")
def get_session_logs(session_id):
    session = db.get_or_404(AttendanceSession, session_id)
    return jsonify([log.to_dict() for log in session.logs])


@attendance_bp.get("/sessions/<int:session_id>/roster-cache")
def roster_cache(session_id):
    """Returns each enrolled student's offline descriptor so the lecturer's
    device can cache it locally and keep recognising students if the network
    drops mid-session.
    """
    session = db.get_or_404(AttendanceSession, session_id)
    session_year = request.args.get("session_year")
    if not session_year:
        return jsonify({"error": "session_year query parameter is required"}), 400

    rows = (
        db.session.query(Student, FacialEnrolment)
        .join(FacialEnrolment, FacialEnrolment.student_id == Student.id)
        .join(CourseEnrolment, CourseEnrolment.student_id == Student.id)
        .filter(
            CourseEnrolment.course_id == session.course_id,
            CourseEnrolment.session_year == session_year,
            FacialEnrolment.offline_descriptor.isnot(None),
        )
        .all()
    )

    return jsonify(
        [
            {
                "student_id": student.id,
                "matric_number": student.matric_number,
                "full_name": student.full_name,
                "offline_descriptor": enrolment.get_offline_descriptor(),
            }
            for student, enrolment in rows
        ]
    )


def _course_roster_embeddings(course_id: int, session_year: str):
    rows = (
        db.session.query(Student.id, FacialEnrolment.embedding_vector)
        .join(FacialEnrolment, FacialEnrolment.student_id == Student.id)
        .join(CourseEnrolment, CourseEnrolment.student_id == Student.id)
        .filter(
            CourseEnrolment.course_id == course_id,
            CourseEnrolment.session_year == session_year,
        )
        .all()
    )
    import json

    return [(student_id, json.loads(vector)) for student_id, vector in rows]


@attendance_bp.post("/sessions/<int:session_id>/recognize")
def recognize(session_id):
    session = db.get_or_404(AttendanceSession, session_id)
    if session.is_locked:
        return jsonify({"error": "Session is closed"}), 409

    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["frame", "session_year"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400

    try:
        frame = _decode_frame(payload["frame"])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    pipeline = FaceRecognitionPipeline(current_app.config["MODEL_DIR"])
    faces = pipeline.detect_faces(frame)
    if len(faces) == 0:
        return jsonify({"status": "no_face_detected"}), 200
    if len(faces) > 1:
        return jsonify({"status": "multiple_faces_detected"}), 200

    probe_vector = pipeline.extract_embedding(frame, faces[0])
    roster = _course_roster_embeddings(session.course_id, payload["session_year"])
    threshold = current_app.config["FACE_MATCH_THRESHOLD"]
    match = best_match(probe_vector, roster, threshold)

    if not match:
        return jsonify({"status": "no_match"}), 200

    ear_sequence = payload.get("ear_sequence", [])
    detector = BlinkDetector(
        ear_threshold=current_app.config["LIVENESS_EAR_THRESHOLD"],
        consec_frames=current_app.config["LIVENESS_CONSEC_FRAMES"],
    )
    for reading in ear_sequence:
        detector.update(reading.get("left", 1.0), reading.get("right", 1.0))

    if not detector.is_live():
        return jsonify({"status": "liveness_check_failed", "student_id": match["student_id"]}), 200

    existing_log = AttendanceLog.query.filter_by(
        session_id=session.id, student_id=match["student_id"]
    ).first()
    if existing_log:
        return jsonify({"status": "already_marked", "student_id": match["student_id"]}), 200

    log = AttendanceLog(
        session_id=session.id,
        student_id=match["student_id"],
        confidence_score=match["confidence"],
        is_offline_sync=False,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"status": "marked_present", "log": log.to_dict()}), 201
