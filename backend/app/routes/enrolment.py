import base64

import numpy as np
from flask import Blueprint, request, jsonify, current_app

from app.extensions import db
from app.models import Student, FacialEnrolment
from app.services.face_service import FaceRecognitionPipeline

enrolment_bp = Blueprint("enrolment", __name__, url_prefix="/api/facial-enrolment")


def _decode_frame(data_url: str):
    import cv2

    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    binary = base64.b64decode(data_url)
    buffer = np.frombuffer(binary, dtype=np.uint8)
    frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode one of the submitted frames")
    return frame


@enrolment_bp.get("/<int:student_id>")
def get_enrolment_status(student_id):
    student = db.get_or_404(Student, student_id)
    return jsonify(
        {
            "student_id": student.id,
            "consent_given": student.consent_given,
            "enrolled": student.facial_enrolment is not None,
            "enrolment": student.facial_enrolment.to_dict() if student.facial_enrolment else None,
        }
    )


@enrolment_bp.post("/<int:student_id>")
def enrol_student(student_id):
    student = db.get_or_404(Student, student_id)
    payload = request.get_json(silent=True) or {}

    if not payload.get("consent_given"):
        return (
            jsonify(
                {
                    "error": "NDPA 2023 requires recorded student consent before "
                    "biometric enrolment. Set consent_given: true after the "
                    "student has accepted the consent notice."
                }
            ),
            400,
        )

    frames_b64 = payload.get("frames", [])
    if not isinstance(frames_b64, list) or len(frames_b64) < 3:
        return jsonify({"error": "At least 3 multi-angle frames are required"}), 400

    try:
        frames = [_decode_frame(f) for f in frames_b64]
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    pipeline = FaceRecognitionPipeline(current_app.config["MODEL_DIR"])
    try:
        vector = pipeline.enrol_from_frames(frames)
    except (ValueError, RuntimeError) as exc:
        return jsonify({"error": str(exc)}), 422

    if not student.consent_given:
        student.record_consent()

    enrolment = student.facial_enrolment or FacialEnrolment(student_id=student.id)
    enrolment.set_vector(vector)
    offline_descriptor = payload.get("offline_descriptor")
    if offline_descriptor:
        enrolment.set_offline_descriptor(offline_descriptor)
    db.session.add(enrolment)
    db.session.commit()

    return jsonify(enrolment.to_dict()), 201


@enrolment_bp.delete("/<int:student_id>")
def revoke_enrolment(student_id):
    """NDPA right-to-erasure support: removes the stored embedding vector
    without affecting the student's academic records.
    """
    student = db.get_or_404(Student, student_id)
    if student.facial_enrolment:
        db.session.delete(student.facial_enrolment)
        db.session.commit()
    return "", 204
