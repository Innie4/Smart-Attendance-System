import click

from app.extensions import db
from app.models import Department, User, Lecturer, Student, Course, CourseEnrolment


def register_cli(app):
    @app.cli.command("init-db")
    def init_db():
        """Creates all tables from the SQLAlchemy models."""
        db.create_all()
        click.echo("Database tables created.")

    @app.cli.command("seed")
    def seed():
        """Populates development data: departments, courses, an admin
        account, one lecturer, and a handful of enrolled students.
        """
        db.create_all()

        if Department.query.first():
            click.echo("Database already seeded, skipping.")
            return

        csc = Department(name="Computer Science", code="CSC")
        eee = Department(name="Electrical Engineering", code="EEE")
        db.session.add_all([csc, eee])
        db.session.flush()

        admin = User(email="admin@smartattendance.ng", full_name="System Administrator", role=User.ROLE_ADMIN)
        admin.set_password("Admin@12345")
        db.session.add(admin)

        lecturer_user = User(
            email="lecturer@smartattendance.ng", full_name="Dr. Ada Obi", role=User.ROLE_LECTURER
        )
        lecturer_user.set_password("Lecturer@12345")
        db.session.add(lecturer_user)
        db.session.flush()

        lecturer = Lecturer(user_id=lecturer_user.id, staff_id="CSC/L/001", department_id=csc.id)
        db.session.add(lecturer)

        course = Course(course_code="CSC301", title="Operating Systems", unit_load=3, department_id=csc.id)
        db.session.add(course)
        db.session.flush()

        for index in range(1, 6):
            student = Student(
                matric_number=f"CSC/20/{1000 + index}",
                full_name=f"Student {index}",
                department_id=csc.id,
            )
            db.session.add(student)
            db.session.flush()
            db.session.add(
                CourseEnrolment(student_id=student.id, course_id=course.id, session_year="2025/2026")
            )

        db.session.commit()
        click.echo("Seed data created. Admin login: admin@smartattendance.ng / Admin@12345")
