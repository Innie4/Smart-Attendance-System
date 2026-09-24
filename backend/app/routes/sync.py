from datetime import datetime

from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models import AttendanceSession, AttendanceLog, Student
from app.utils.validators import require_fields

sync_bp = Blueprint("sync", __name__, url_prefix="/api/sync")


@sync_bp.post("/attendance")
def sync_attendance_batch():
    """Accepts a batch of attendance ticks captured while the lecturer's
    device was offline. Each record was already matched against the locally
    cached roster embeddings on-device; this endpoint only validates and
    persists them, tagging every row is_offline_sync=True for audit purposes.
    """
    payload = request.get_json(silent=True) or {}
    records = payload.get("records", [])
    if not isinstance(records, list) or not records:
        return jsonify({"error": "records must be a non-empty list"}), 400

    accepted, skipped, errors = [], [], []

    for index, record in enumerate(records):
        missing = require_fields(record, ["session_id", "student_id", "confidence_score", "captured_at"])
        if missing:
            errors.append({"index": index, "error": "Missing fields", "fields": missing})
            continue

        session = db.session.get(AttendanceSession, record["session_id"])
        if not session:
            errors.append({"index": index, "error": "Session not found"})
            continue
        if session.is_locked:
            skipped.append({"index": index, "reason": "session_locked"})
            continue
        if not db.session.get(Student, record["student_id"]):
            errors.append({"index": index, "error": "Student not found"})
            continue

        existing = AttendanceLog.query.filter_by(
            session_id=record["session_id"], student_id=record["student_id"]
        ).first()
        if existing:
            skipped.append({"index": index, "reason": "already_marked"})
            continue

        try:
            captured_at = datetime.fromisoformat(record["captured_at"])
        except ValueError:
            errors.append({"index": index, "error": "captured_at must be ISO 8601"})
            continue

        log = AttendanceLog(
            session_id=record["session_id"],
            student_id=record["student_id"],
            confidence_score=record["confidence_score"],
            timestamp=captured_at,
            is_offline_sync=True,
        )
        db.session.add(log)
        accepted.append(index)

    db.session.commit()

    return jsonify(
        {
            "accepted_count": len(accepted),
            "skipped_count": len(skipped),
            "error_count": len(errors),
            "skipped": skipped,
            "errors": errors,
        }
    ), 200
