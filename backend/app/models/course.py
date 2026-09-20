from app.extensions import db


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    unit_load = db.Column(db.Integer, default=0, nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False)

    department = db.relationship("Department", back_populates="courses")
    enrolments = db.relationship(
        "CourseEnrolment", back_populates="course", cascade="all, delete-orphan"
    )
    sessions = db.relationship("AttendanceSession", back_populates="course")

    def to_dict(self):
        return {
            "id": self.id,
            "course_code": self.course_code,
            "title": self.title,
            "unit_load": self.unit_load,
            "department_id": self.department_id,
        }
