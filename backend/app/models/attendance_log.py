from datetime import datetime
from app.extensions import db


class AttendanceLog(db.Model):
    __tablename__ = "attendance_logs"
    __table_args__ = (
        db.UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(
        db.Integer, db.ForeignKey("attendance_sessions.id"), nullable=False
    )
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    confidence_score = db.Column(db.Float, nullable=False)
    is_offline_sync = db.Column(db.Boolean, default=False, nullable=False)

    session = db.relationship("AttendanceSession", back_populates="logs")
    student = db.relationship("Student", back_populates="attendance_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "matric_number": self.student.matric_number if self.student else None,
            "timestamp": self.timestamp.isoformat(),
            "confidence_score": self.confidence_score,
            "is_offline_sync": self.is_offline_sync,
        }
