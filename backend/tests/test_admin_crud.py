def test_create_department(client, seeded, admin_headers):
    response = client.post(
        "/api/admin/departments", headers=admin_headers, json={"name": "Mass Communication", "code": "MAC"}
    )
    assert response.status_code == 201
    assert response.get_json()["code"] == "MAC"


def test_create_department_duplicate_code_conflicts(client, seeded, admin_headers):
    client.post("/api/admin/departments", headers=admin_headers, json={"name": "Physics", "code": "PHY"})
    response = client.post(
        "/api/admin/departments", headers=admin_headers, json={"name": "Physics II", "code": "PHY"}
    )
    assert response.status_code == 409


def test_create_course_requires_valid_department(client, seeded, admin_headers):
    response = client.post(
        "/api/admin/courses",
        headers=admin_headers,
        json={"course_code": "CSC400", "title": "AI", "department_id": 9999},
    )
    assert response.status_code == 404


def test_create_student(client, seeded, admin_headers):
    department = seeded["department"]
    response = client.post(
        "/api/admin/students",
        headers=admin_headers,
        json={"matric_number": "csc/20/2001", "full_name": "New Student", "department_id": department.id},
    )
    assert response.status_code == 201
    assert response.get_json()["matric_number"] == "CSC/20/2001"
    assert response.get_json()["consent_given"] is False


def test_create_enrolment_prevents_duplicates(client, seeded, admin_headers):
    student = seeded["students"][0]
    course = seeded["course"]

    duplicate = client.post(
        "/api/admin/enrolments",
        headers=admin_headers,
        json={"student_id": student.id, "course_id": course.id, "session_year": "2025/2026"},
    )
    assert duplicate.status_code == 409


def test_delete_department(client, seeded, admin_headers):
    created = client.post(
        "/api/admin/departments", headers=admin_headers, json={"name": "Chemistry", "code": "CHM"}
    ).get_json()
    response = client.delete(f"/api/admin/departments/{created['id']}", headers=admin_headers)
    assert response.status_code == 204


def test_delete_student_with_logs_and_enrolments(client, seeded, admin_headers):
    from app.extensions import db
    from app.models import AttendanceSession, AttendanceLog

    student = seeded["students"][0]
    course = seeded["course"]
    lecturer = seeded["lecturer"]
    session = AttendanceSession(course_id=course.id, lecturer_id=lecturer.id)
    db.session.add(session)
    db.session.flush()
    db.session.add(
        AttendanceLog(session_id=session.id, student_id=student.id, confidence_score=0.9)
    )
    db.session.commit()

    response = client.delete(f"/api/admin/students/{student.id}", headers=admin_headers)
    assert response.status_code == 204
    assert AttendanceLog.query.filter_by(student_id=student.id).all() == []


def test_delete_lecturer_with_sessions_conflicts(client, seeded, admin_headers):
    course = seeded["course"]
    created = client.post(
        "/api/attendance/sessions", headers=admin_headers, json={"course_id": course.id}
    ).get_json()
    assert created["lecturer_id"] == seeded["lecturer"].id

    response = client.delete(
        f"/api/admin/lecturers/{seeded['lecturer'].id}", headers=admin_headers
    )
    assert response.status_code == 409


def test_delete_lecturer_without_sessions(client, seeded, admin_headers):
    department = seeded["department"]
    created = client.post(
        "/api/admin/lecturers",
        headers=admin_headers,
        json={
            "email": "temp.lecturer@test.local",
            "password": "Password@1",
            "full_name": "Temp Lecturer",
            "staff_id": "STF999",
            "department_id": department.id,
        },
    )
    assert created.status_code == 201

    response = client.delete(
        f"/api/admin/lecturers/{created.get_json()['id']}", headers=admin_headers
    )
    assert response.status_code == 204
