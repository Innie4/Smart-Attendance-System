from app.extensions import db


class CourseEnrolment(db.Model):
    __tablename__ = "course_enrolments"
    __table_args__ = (
        db.UniqueConstraint("student_id", "course_id", "session_year", name="uq_enrolment"),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    session_year = db.Column(db.String(9), nullable=False)

    student = db.relationship("Student", back_populates="enrolments")
    course = db.relationship("Course", back_populates="enrolments")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "course_id": self.course_id,
            "session_year": self.session_year,
        }
