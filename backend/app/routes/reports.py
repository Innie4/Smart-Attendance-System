from flask import Blueprint, request, jsonify, current_app, send_file

from app.extensions import db
from app.models import Course, CourseEnrolment, Student, AttendanceSession, AttendanceLog
from app.services.attendance_service import build_course_attendance_report
from app.services.report_service import generate_csv, generate_pdf

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def _compute_report(course_id: int, session_year: str):
    course = db.get_or_404(Course, course_id)

    sessions_held = AttendanceSession.query.filter_by(
        course_id=course_id, is_locked=True
    ).count()

    enrolled_students = (
        db.session.query(Student)
        .join(CourseEnrolment, CourseEnrolment.student_id == Student.id)
        .filter(
            CourseEnrolment.course_id == course_id,
            CourseEnrolment.session_year == session_year,
        )
        .all()
    )

    records = []
    for student in enrolled_students:
        attended = (
            db.session.query(AttendanceLog)
            .join(AttendanceSession, AttendanceSession.id == AttendanceLog.session_id)
            .filter(
                AttendanceLog.student_id == student.id,
                AttendanceSession.course_id == course_id,
                AttendanceSession.is_locked == True,  # noqa: E712
            )
            .count()
        )
        records.append(
            {
                "student_id": student.id,
                "matric_number": student.matric_number,
                "full_name": student.full_name,
                "sessions_attended": attended,
            }
        )

    threshold = current_app.config["NUC_ATTENDANCE_THRESHOLD"]
    report_rows = build_course_attendance_report(records, sessions_held, threshold)
    return course, report_rows, threshold


@reports_bp.get("/courses/<int:course_id>")
def course_attendance_report(course_id):
    session_year = request.args.get("session_year")
    if not session_year:
        return jsonify({"error": "session_year query parameter is required"}), 400

    course, report_rows, threshold = _compute_report(course_id, session_year)
    at_risk_count = sum(1 for row in report_rows if not row["is_compliant"])

    return jsonify(
        {
            "course": course.to_dict(),
            "session_year": session_year,
            "nuc_threshold": threshold,
            "at_risk_count": at_risk_count,
            "students": report_rows,
        }
    )


@reports_bp.get("/courses/<int:course_id>/export.csv")
def export_csv(course_id):
    session_year = request.args.get("session_year")
    if not session_year:
        return jsonify({"error": "session_year query parameter is required"}), 400

    course, report_rows, _ = _compute_report(course_id, session_year)
    buffer = generate_csv(course.course_code, report_rows)
    return send_file(
        buffer,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"{course.course_code}_{session_year}_attendance.csv",
    )


@reports_bp.get("/courses/<int:course_id>/export.pdf")
def export_pdf(course_id):
    session_year = request.args.get("session_year")
    if not session_year:
        return jsonify({"error": "session_year query parameter is required"}), 400

    course, report_rows, threshold = _compute_report(course_id, session_year)
    buffer = generate_pdf(course.course_code, course.title, report_rows, threshold)
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{course.course_code}_{session_year}_attendance.pdf",
    )
