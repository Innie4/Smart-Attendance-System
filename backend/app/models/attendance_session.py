from datetime import datetime
from app.extensions import db


class AttendanceSession(db.Model):
    __tablename__ = "attendance_sessions"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    lecturer_id = db.Column(db.Integer, db.ForeignKey("lecturers.id"), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    is_locked = db.Column(db.Boolean, default=False, nullable=False)

    course = db.relationship("Course", back_populates="sessions")
    lecturer = db.relationship("Lecturer", back_populates="sessions")
    logs = db.relationship(
        "AttendanceLog", back_populates="session", cascade="all, delete-orphan"
    )

    def close(self):
        self.end_time = datetime.utcnow()
        self.is_locked = True

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "lecturer_id": self.lecturer_id,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "is_locked": self.is_locked,
            "present_count": len(self.logs),
        }
