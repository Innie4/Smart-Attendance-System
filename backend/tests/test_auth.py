"""Authentication and role separation."""

from conftest import login_headers


# ------------------------------------------------------------------- sign in
def test_login_returns_tokens_and_user(client, seeded):
    response = client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "Password@1"}
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["access_token"] and body["refresh_token"]
    assert body["user"]["role"] == "admin"
    assert body["user"]["email"] == "admin@test.local"


def test_login_email_is_case_insensitive(client, seeded):
    response = client.post(
        "/api/auth/login", json={"email": "ADMIN@TEST.LOCAL", "password": "Password@1"}
    )
    assert response.status_code == 200


def test_login_wrong_password_is_401(client, seeded):
    response = client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "nope"}
    )
    assert response.status_code == 401
    assert response.get_json()["error"] == "Invalid email or password"


def test_login_unknown_account_gives_same_error(client, seeded):
    """A missing account must not be distinguishable from a wrong password."""
    response = client.post(
        "/api/auth/login", json={"email": "ghost@test.local", "password": "whatever"}
    )
    assert response.status_code == 401
    assert response.get_json()["error"] == "Invalid email or password"


def test_login_missing_fields_is_400(client, seeded):
    response = client.post("/api/auth/login", json={"email": "admin@test.local"})
    assert response.status_code == 400
    assert response.get_json()["fields"] == ["password"]


def test_deactivated_account_is_403(client, seeded):
    seeded["admin"].is_active = False
    from app.extensions import db

    db.session.commit()
    response = client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "Password@1"}
    )
    assert response.status_code == 403


def test_me_requires_token(client, seeded):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client, seeded, student_headers):
    response = client.get("/api/auth/me", headers=student_headers)
    assert response.status_code == 200
    assert response.get_json()["role"] == "student"


def test_refresh_requires_refresh_token(client, seeded):
    # An access token is not accepted on the refresh endpoint.
    response = client.post("/api/auth/refresh", headers=login_headers(client, "admin@test.local"))
    assert response.status_code == 422


def test_garbage_token_is_rejected(client, seeded):
    assert client.get("/api/admin/students", headers={"Authorization": "Bearer nonsense"}).status_code == 422


# ------------------------------------------------------------- role scoping
def test_unauthenticated_cannot_read_students(client, seeded):
    assert client.get("/api/admin/students").status_code == 401


def test_student_cannot_read_the_cohort(client, seeded, student_headers):
    assert client.get("/api/admin/students", headers=student_headers).status_code == 403
    assert client.get("/api/admin/courses", headers=student_headers).status_code == 403


def test_student_cannot_open_attendance_sessions(client, seeded, student_headers):
    response = client.post(
        "/api/attendance/sessions",
        headers=student_headers,
        json={"course_id": seeded["course"].id},
    )
    assert response.status_code == 403


def test_student_cannot_reach_staff_reports(client, seeded, student_headers):
    response = client.get(
        f"/api/reports/courses/{seeded['course'].id}",
        headers=student_headers,
        query_string={"session_year": "2025/2026"},
    )
    assert response.status_code == 403


def test_lecturer_cannot_mutate_admin_records(client, seeded, lecturer_headers):
    response = client.post(
        "/api/admin/departments",
        headers=lecturer_headers,
        json={"name": "Physics", "code": "PHY"},
    )
    assert response.status_code == 403


def test_lecturer_can_read_reference_data(client, seeded, lecturer_headers):
    assert client.get("/api/admin/departments", headers=lecturer_headers).status_code == 200


def test_staff_cannot_use_the_student_portal(client, seeded, lecturer_headers, admin_headers):
    assert client.get("/api/student/attendance", headers=lecturer_headers).status_code == 403
    assert client.get("/api/student/attendance", headers=admin_headers).status_code == 403


# ---------------------------------------------------------- student portal
def test_student_reads_own_attendance(client, seeded, student_headers):
    response = client.get("/api/student/attendance", headers=student_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["nuc_threshold"] == 75.0
    assert body["session_year"] == "2025/2026"
    assert len(body["courses"]) == 1
    assert body["courses"][0]["course_code"] == "CSC301"
    assert "student_id" not in body["courses"][0], "portal must not expose raw ids"


def test_student_portal_profile(client, seeded, student_headers):
    response = client.get("/api/student/me", headers=student_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["matric_number"] == "CSC/20/1001"
    assert body["department"] == "Computer Science"


def test_student_portal_requires_login(client, seeded):
    assert client.get("/api/student/attendance").status_code == 401


def test_two_students_see_different_percentages(client, seeded, student_headers):
    """Attendance is computed per student, not shared."""
    from app.extensions import db
    from app.models import AttendanceSession, AttendanceLog

    course = seeded["course"]
    lecturer = seeded["lecturer"]
    student_one, student_two = seeded["students"]

    session = AttendanceSession(course_id=course.id, lecturer_id=lecturer.id)
    session.close()
    db.session.add(session)
    db.session.flush()
    # Only the first student is marked present.
    db.session.add(
        AttendanceLog(session_id=session.id, student_id=student_one.id, confidence_score=0.95)
    )
    db.session.commit()

    body = client.get("/api/student/attendance", headers=student_headers).get_json()
    assert body["summary"]["is_eligible_for_exams"] is True
    assert body["courses"][0]["attendance_percentage"] == 100.0

    # The second student has no portal account in this fixture, so verify the
    # calculation itself is per-student by checking the cohort report instead.
    report = client.get(
        f"/api/reports/courses/{course.id}",
        headers=login_headers(client, "lecturer@test.local"),
        query_string={"session_year": "2025/2026"},
    ).get_json()
    percentages = {row["student_id"]: row["attendance_percentage"] for row in report["students"]}
    assert percentages[student_one.id] == 100.0
    assert percentages[student_two.id] == 0.0


def test_student_without_linked_record_is_404(client, seeded):
    """A staff account must not be able to read a student portal it lacks."""
    from app.extensions import db
    from app.models import User

    orphan = User(email="orphan@test.local", full_name="No Student", role=User.ROLE_STUDENT)
    orphan.set_password("Password@1")
    db.session.add(orphan)
    db.session.commit()

    headers = login_headers(client, "orphan@test.local")
    assert client.get("/api/student/attendance", headers=headers).status_code == 404
    assert client.get("/api/student/me", headers=headers).status_code == 404


# ------------------------------------------------------ account management
def test_create_student_with_portal_account(client, seeded, admin_headers):
    response = client.post(
        "/api/admin/students",
        headers=admin_headers,
        json={
            "matric_number": "CSC/20/3001",
            "full_name": "Portal Student",
            "department_id": seeded["department"].id,
            "email": "portal.student@test.local",
            "password": "Password@1",
        },
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["has_portal_account"] is True
    assert body["email"] == "portal.student@test.local"

    # The account can actually sign in and reach the portal.
    headers = login_headers(client, "portal.student@test.local")
    assert client.get("/api/student/attendance", headers=headers).status_code == 200


def test_create_student_without_account_is_allowed(client, seeded, admin_headers):
    response = client.post(
        "/api/admin/students",
        headers=admin_headers,
        json={
            "matric_number": "CSC/20/3002",
            "full_name": "No Portal",
            "department_id": seeded["department"].id,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["has_portal_account"] is False


def test_create_student_rejects_duplicate_portal_email(client, seeded, admin_headers):
    response = client.post(
        "/api/admin/students",
        headers=admin_headers,
        json={
            "matric_number": "CSC/20/3003",
            "full_name": "Clash",
            "department_id": seeded["department"].id,
            "email": "student@test.local",
            "password": "Password@1",
        },
    )
    assert response.status_code == 409


def test_create_student_rejects_half_specified_account(client, seeded, admin_headers):
    """An email without a password must fail rather than create a broken login."""
    response = client.post(
        "/api/admin/students",
        headers=admin_headers,
        json={
            "matric_number": "CSC/20/3004",
            "full_name": "Half Account",
            "department_id": seeded["department"].id,
            "email": "half@test.local",
        },
    )
    assert response.status_code == 400


def test_create_student_rejects_short_password(client, seeded, admin_headers):
    response = client.post(
        "/api/admin/students",
        headers=admin_headers,
        json={
            "matric_number": "CSC/20/3005",
            "full_name": "Weak",
            "department_id": seeded["department"].id,
            "email": "weak@test.local",
            "password": "short",
        },
    )
    assert response.status_code == 400
    assert "8 characters" in response.get_json()["error"]


def test_issue_account_for_existing_student(client, seeded, admin_headers):
    student = seeded["students"][1]
    response = client.post(
        f"/api/admin/students/{student.id}/account",
        headers=admin_headers,
        json={"email": "second.student@test.local", "password": "Password@1"},
    )
    assert response.status_code == 201
    assert response.get_json()["has_portal_account"] is True
    assert client.get("/api/student/attendance", headers=login_headers(client, "second.student@test.local")).status_code == 200


def test_issue_account_twice_conflicts(client, seeded, admin_headers):
    student = seeded["students"][1]
    client.post(
        f"/api/admin/students/{student.id}/account",
        headers=admin_headers,
        json={"email": "twice@test.local", "password": "Password@1"},
    )
    again = client.post(
        f"/api/admin/students/{student.id}/account",
        headers=admin_headers,
        json={"email": "twice2@test.local", "password": "Password@1"},
    )
    assert again.status_code == 409


def test_deleting_student_removes_portal_account(client, seeded, admin_headers):
    from app.models import User

    student = seeded["students"][1]
    client.post(
        f"/api/admin/students/{student.id}/account",
        headers=admin_headers,
        json={"email": "doomed@test.local", "password": "Password@1"},
    )
    assert client.delete(f"/api/admin/students/{student.id}", headers=admin_headers).status_code == 204
    # Login must no longer resolve, and the email is free for reuse.
    assert client.post(
        "/api/auth/login", json={"email": "doomed@test.local", "password": "Password@1"}
    ).status_code == 401
    assert User.query.filter_by(email="doomed@test.local").first() is None
