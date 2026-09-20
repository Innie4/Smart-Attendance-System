def test_create_session_returns_existing_open_session(client, seeded, lecturer_headers):
    course = seeded["course"]

    first = client.post(
        "/api/attendance/sessions", headers=lecturer_headers, json={"course_id": course.id}
    )
    assert first.status_code == 201

    second = client.post(
        "/api/attendance/sessions", headers=lecturer_headers, json={"course_id": course.id}
    )
    assert second.status_code == 200
    assert second.get_json()["id"] == first.get_json()["id"]


def test_create_session_unknown_course_returns_404(client, seeded, lecturer_headers):
    response = client.post(
        "/api/attendance/sessions", headers=lecturer_headers, json={"course_id": 9999}
    )
    assert response.status_code == 404


def test_close_session_locks_it(client, seeded, lecturer_headers):
    course = seeded["course"]
    created = client.post(
        "/api/attendance/sessions", headers=lecturer_headers, json={"course_id": course.id}
    ).get_json()

    response = client.post(f"/api/attendance/sessions/{created['id']}/close", headers=lecturer_headers)
    assert response.status_code == 200
    assert response.get_json()["is_locked"] is True


def test_recognize_rejected_on_locked_session(client, seeded, lecturer_headers):
    course = seeded["course"]
    created = client.post(
        "/api/attendance/sessions", headers=lecturer_headers, json={"course_id": course.id}
    ).get_json()
    client.post(f"/api/attendance/sessions/{created['id']}/close", headers=lecturer_headers)

    response = client.post(
        f"/api/attendance/sessions/{created['id']}/recognize",
        headers=lecturer_headers,
        json={"frame": "irrelevant", "session_year": "2025/2026"},
    )
    assert response.status_code == 409


def test_recognize_missing_fields_returns_400(client, seeded, lecturer_headers):
    course = seeded["course"]
    created = client.post(
        "/api/attendance/sessions", headers=lecturer_headers, json={"course_id": course.id}
    ).get_json()

    response = client.post(
        f"/api/attendance/sessions/{created['id']}/recognize",
        headers=lecturer_headers,
        json={"frame": "irrelevant"},
    )
    assert response.status_code == 400


def test_session_logs_start_empty(client, seeded, lecturer_headers):
    course = seeded["course"]
    created = client.post(
        "/api/attendance/sessions", headers=lecturer_headers, json={"course_id": course.id}
    ).get_json()

    response = client.get(f"/api/attendance/sessions/{created['id']}/logs", headers=lecturer_headers)
    assert response.status_code == 200
    assert response.get_json() == []
