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

    @app.cli.command("migrate")
    def migrate():
        """Additive schema upgrades for databases created before a column was
        introduced. db.create_all() only creates missing tables, so existing
        deployments need new columns added explicitly.
        """
        from sqlalchemy import inspect, text

        db.create_all()
        inspector = inspect(db.engine)
        dialect = db.engine.dialect.name
        applied = []

        if "students" in inspector.get_table_names():
            columns = {c["name"] for c in inspector.get_columns("students")}
            if "user_id" not in columns:
                if dialect == "postgresql":
                    db.session.execute(
                        text(
                            "ALTER TABLE students ADD COLUMN user_id INTEGER "
                            "REFERENCES users(id)"
                        )
                    )
                elif dialect == "mysql":
                    db.session.execute(
                        text(
                            "ALTER TABLE students ADD COLUMN user_id INTEGER NULL, "
                            "ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) "
                            "REFERENCES users(id)"
                        )
                    )
                else:
                    db.session.execute(text("ALTER TABLE students ADD COLUMN user_id INTEGER"))
                applied.append("students.user_id")

            # The unique index backs the one-account-per-student guarantee.
            names = {ix["name"] for ix in inspector.get_indexes("students")}
            if "user_id" in columns or "user_id" not in names:
                try:
                    if dialect == "postgresql":
                        db.session.execute(
                            text(
                                "CREATE UNIQUE INDEX IF NOT EXISTS ux_students_user_id "
                                "ON students (user_id)"
                            )
                        )
                    else:
                        db.session.execute(
                            text("CREATE UNIQUE INDEX IF NOT EXISTS ux_students_user_id ON students (user_id)")
                        )
                    applied.append("unique index on students.user_id")
                except Exception as exc:  # pragma: no cover - dialect specific
                    click.echo(f"  skipped unique index: {exc}")

        db.session.commit()
        if applied:
            click.echo("Applied: " + ", ".join(applied))
        else:
            click.echo("Schema already up to date.")

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
            # Portal login so every seeded student can sign in to their own
            # attendance view. Passwords are shared for demo convenience.
            if not student.user_id:
                email = f"student{index}@smartattendance.ng"
                if not User.query.filter_by(email=email).first():
                    account = User(
                        email=email,
                        full_name=student.full_name,
                        role=User.ROLE_STUDENT,
                    )
                    account.set_password("Student@12345")
                    db.session.add(account)
                    db.session.flush()
                    student.user_id = account.id
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
        click.echo("")
        click.echo("Demo logins (all use the same flow, different role areas):")
        click.echo("  admin     admin@smartattendance.ng     Admin@12345")
        click.echo("  lecturer  lecturer@smartattendance.ng  Lecturer@12345")
        click.echo("  student   student1@smartattendance.ng   Student@12345")
        click.echo("  (student2..student5 follow the same pattern)")
