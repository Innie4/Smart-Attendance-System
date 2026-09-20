def test_login_success(client, seeded):
    response = client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "Password@1"}
    )
    assert response.status_code == 200
    body = response.get_json()
    assert "access_token" in body
    assert body["user"]["role"] == "admin"


def test_login_invalid_password(client, seeded):
    response = client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "wrong"}
    )
    assert response.status_code == 401


def test_login_missing_fields(client):
    response = client.post("/api/auth/login", json={"email": "admin@test.local"})
    assert response.status_code == 400


def test_protected_route_requires_token(client):
    response = client.get("/api/admin/departments")
    assert response.status_code == 401


def test_lecturer_cannot_access_admin_only_route(client, seeded, lecturer_headers):
    response = client.post(
        "/api/admin/departments", headers=lecturer_headers, json={"name": "Physics", "code": "PHY"}
    )
    assert response.status_code == 403


def test_admin_can_access_admin_route(client, seeded, admin_headers):
    response = client.post(
        "/api/admin/departments", headers=admin_headers, json={"name": "Physics", "code": "PHY"}
    )
    assert response.status_code == 201


def test_lecturer_can_read_shared_reference_data(client, seeded, lecturer_headers):
    response = client.get("/api/admin/departments", headers=lecturer_headers)
    assert response.status_code == 200


def test_register_requires_admin(client, seeded, lecturer_headers):
    response = client.post(
        "/api/auth/register",
        headers=lecturer_headers,
        json={
            "email": "newuser@test.local",
            "password": "Password@1",
            "full_name": "New User",
            "role": "lecturer",
        },
    )
    assert response.status_code == 403


def test_admin_can_register_lecturer(client, seeded, admin_headers):
    department = seeded["department"]
    response = client.post(
        "/api/auth/register",
        headers=admin_headers,
        json={
            "email": "newlecturer@test.local",
            "password": "Password@1",
            "full_name": "New Lecturer",
            "role": "lecturer",
            "staff_id": "STF002",
            "department_id": department.id,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["role"] == "lecturer"


def test_refresh_token_issues_new_access_token(client, seeded):
    login = client.post(
        "/api/auth/login", json={"email": "admin@test.local", "password": "Password@1"}
    )
    refresh_token = login.get_json()["refresh_token"]
    response = client.post(
        "/api/auth/refresh", headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert response.status_code == 200
    assert "access_token" in response.get_json()
