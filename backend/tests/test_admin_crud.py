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
