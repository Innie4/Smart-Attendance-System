from datetime import datetime
from app.extensions import db


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    matric_number = db.Column(db.String(40), unique=True, nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    consent_given = db.Column(db.Boolean, default=False, nullable=False)
    consent_given_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    department = db.relationship("Department", back_populates="students")
    enrolments = db.relationship(
        "CourseEnrolment", back_populates="student", cascade="all, delete-orphan"
    )
    facial_enrolment = db.relationship(
        "FacialEnrolment",
        back_populates="student",
        uselist=False,
        cascade="all, delete-orphan",
    )
    attendance_logs = db.relationship(
        "AttendanceLog", back_populates="student", cascade="all, delete-orphan"
    )

    def record_consent(self):
        self.consent_given = True
        self.consent_given_at = datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "matric_number": self.matric_number,
            "full_name": self.full_name,
            "department_id": self.department_id,
            "consent_given": self.consent_given,
            "has_facial_enrolment": self.facial_enrolment is not None,
            "created_at": self.created_at.isoformat(),
        }
