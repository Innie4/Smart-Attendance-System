from datetime import datetime
from app.extensions import db


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    matric_number = db.Column(db.String(40), unique=True, nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)
    # Links the student to the login account used for the student portal.
    # Nullable so existing records can be backfilled before the column is
    # treated as required.
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=True)
    consent_given = db.Column(db.Boolean, default=False, nullable=False)
    consent_given_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    department = db.relationship("Department", back_populates="students")
    user = db.relationship("User", back_populates="student_profile")
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
            "email": self.user.email if self.user else None,
            "has_portal_account": self.user_id is not None,
            "consent_given": self.consent_given,
            "has_facial_enrolment": self.facial_enrolment is not None,
            "created_at": self.created_at.isoformat(),
        }
