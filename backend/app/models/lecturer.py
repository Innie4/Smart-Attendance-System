from app.extensions import db


class Lecturer(db.Model):
    __tablename__ = "lecturers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    staff_id = db.Column(db.String(40), unique=True, nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)

    user = db.relationship("User", back_populates="lecturer_profile")
    department = db.relationship("Department", back_populates="lecturers")
    sessions = db.relationship("AttendanceSession", back_populates="lecturer")

    def to_dict(self):
        return {
            "id": self.id,
            "staff_id": self.staff_id,
            "department_id": self.department_id,
            "full_name": self.user.full_name if self.user else None,
            "email": self.user.email if self.user else None,
        }
