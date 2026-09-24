import click
from datetime import datetime, timedelta

from app.extensions import db
from app.models import (
    Department,
    User,
    Lecturer,
    Student,
    Course,
    CourseEnrolment,
    FacialEnrolment,
    AttendanceSession,
    AttendanceLog,
)


def register_cli(app):
    @app.cli.command("init-db")
    def init_db():
        """Creates all tables from the SQLAlchemy models."""
        db.create_all()
        click.echo("Database tables created.")

    @app.cli.command("seed")
    def seed():
        """Populates demo data for every table: departments, courses, users,
        a lecturer, students with facial enrolments, course enrolments, and
        attendance sessions with logs (locked + one open). Safe to re-run:
        existing rows are reused, missing demo rows are backfilled.
        """
        import random

        db.create_all()
        session_year = "2025/2026"

        csc = Department.query.filter_by(code="CSC").first()
        if not csc:
            csc = Department(name="Computer Science", code="CSC")
            db.session.add(csc)
        eee = Department.query.filter_by(code="EEE").first()
        if not eee:
            eee = Department(name="Electrical Engineering", code="EEE")
            db.session.add(eee)
        db.session.flush()

        admin = User.query.filter_by(email="admin@smartattendance.ng").first()
        if not admin:
            admin = User(email="admin@smartattendance.ng", full_name="System Administrator", role=User.ROLE_ADMIN)
            admin.set_password("Admin@12345")
            db.session.add(admin)

        lecturer_user = User.query.filter_by(email="lecturer@smartattendance.ng").first()
        if not lecturer_user:
            lecturer_user = User(
                email="lecturer@smartattendance.ng", full_name="Dr. Ada Obi", role=User.ROLE_LECTURER
            )
            lecturer_user.set_password("Lecturer@12345")
            db.session.add(lecturer_user)
        db.session.flush()

        lecturer = Lecturer.query.filter_by(user_id=lecturer_user.id).first()
        if not lecturer:
            lecturer = Lecturer(user_id=lecturer_user.id, staff_id="CSC/L/001", department_id=csc.id)
            db.session.add(lecturer)

        course = Course.query.filter_by(course_code="CSC301").first()
        if not course:
            course = Course(course_code="CSC301", title="Operating Systems", unit_load=3, department_id=csc.id)
            db.session.add(course)
        db.session.flush()

        students = []
        for index in range(1, 6):
            matric = f"CSC/20/{1000 + index}"
            student = Student.query.filter_by(matric_number=matric).first()
            if not student:
                student = Student(
                    matric_number=matric,
                    full_name=f"Student {index}",
                    department_id=csc.id,
                )
                db.session.add(student)
                db.session.flush()
            if not student.consent_given:
                student.record_consent()
            # Distinct deterministic demo vectors per student.
            if not student.facial_enrolment:
                rng = random.Random(1000 + index)
                vector = [rng.uniform(-1.0, 1.0) for _ in range(128)]
                offline = [rng.uniform(-0.1, 0.1) for _ in range(128)]
                enrolment = FacialEnrolment(student_id=student.id, model_version="sface-v1")
                enrolment.set_vector(vector)
                enrolment.set_offline_descriptor(offline)
                db.session.add(enrolment)
            if not CourseEnrolment.query.filter_by(
                student_id=student.id, course_id=course.id, session_year=session_year
            ).first():
                db.session.add(
                    CourseEnrolment(student_id=student.id, course_id=course.id, session_year=session_year)
                )
            students.append(student)
        db.session.flush()

        # Locked sessions with varied attendance (drives compliance reports)
        # plus one open session for live-attendance testing.
        attendance_plan = [
            {"days_ago": 14, "present": [1, 2, 3, 4, 5], "locked": True},
            {"days_ago": 7, "present": [1, 2, 3, 4], "locked": True},
            {"days_ago": 2, "present": [1, 2, 3], "locked": True},
            {"days_ago": 0, "present": [], "locked": False},
        ]
        sessions = AttendanceSession.query.filter_by(
            course_id=course.id, lecturer_id=lecturer.id
        ).all()
        if len(sessions) < len(attendance_plan):
            for slot, spec in enumerate(attendance_plan[len(sessions):]):
                start = datetime.utcnow() - timedelta(days=spec["days_ago"], hours=1)
                attendance_session = AttendanceSession(
                    course_id=course.id,
                    lecturer_id=lecturer.id,
                    start_time=start,
                )
                if spec["locked"]:
                    attendance_session.close()
                    attendance_session.end_time = start + timedelta(hours=1)
                db.session.add(attendance_session)
                db.session.flush()
                for position, student_index in enumerate(spec["present"]):
                    student = students[student_index - 1]
                    if AttendanceLog.query.filter_by(
                        session_id=attendance_session.id, student_id=student.id
                    ).first():
                        continue
                    db.session.add(
                        AttendanceLog(
                            session_id=attendance_session.id,
                            student_id=student.id,
                            timestamp=start + timedelta(minutes=5 * (position + 1)),
                            confidence_score=round(0.85 + 0.03 * position, 4),
                            # Flag one row per locked session as an offline sync
                            # so the resilience path has demo data too.
                            is_offline_sync=(position == 0),
                        )
                    )
            db.session.commit()
        else:
            db.session.commit()
        click.echo("Seed data created.")
