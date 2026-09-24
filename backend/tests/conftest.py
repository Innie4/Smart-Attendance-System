import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import Department, User, Lecturer, Course, Student, CourseEnrolment, FacialEnrolment


@pytest.fixture()
def app():
    application = create_app(TestConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def seeded(app):
    department = Department(name="Computer Science", code="CSC")
    db.session.add(department)
    db.session.flush()

    admin = User(email="admin@test.local", full_name="Admin User", role=User.ROLE_ADMIN)
    admin.set_password("Password@1")
    db.session.add(admin)

    lecturer_user = User(email="lecturer@test.local", full_name="Lecturer User", role=User.ROLE_LECTURER)
    lecturer_user.set_password("Password@1")
    db.session.add(lecturer_user)
    db.session.flush()

    lecturer = Lecturer(user_id=lecturer_user.id, staff_id="STF001", department_id=department.id)
    db.session.add(lecturer)

    course = Course(course_code="CSC301", title="Operating Systems", unit_load=3, department_id=department.id)
    db.session.add(course)
    db.session.flush()

    student_one = Student(matric_number="CSC/20/1001", full_name="Student One", department_id=department.id)
    student_two = Student(matric_number="CSC/20/1002", full_name="Student Two", department_id=department.id)
    db.session.add_all([student_one, student_two])
    db.session.flush()

    db.session.add_all(
        [
            CourseEnrolment(student_id=student_one.id, course_id=course.id, session_year="2025/2026"),
            CourseEnrolment(student_id=student_two.id, course_id=course.id, session_year="2025/2026"),
        ]
    )

    enrolment_one = FacialEnrolment(student_id=student_one.id)
    enrolment_one.set_vector([0.1] * 128)
    enrolment_two = FacialEnrolment(student_id=student_two.id)
    enrolment_two.set_vector([0.9] * 128)
    db.session.add_all([enrolment_one, enrolment_two])

    db.session.commit()

    return {
        "department": department,
        "admin": admin,
        "lecturer_user": lecturer_user,
        "lecturer": lecturer,
        "course": course,
        "students": [student_one, student_two],
    }


@pytest.fixture()
def admin_headers():
    return {}


@pytest.fixture()
def lecturer_headers():
    return {}
