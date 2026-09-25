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


# ------------------------------------------------------------------ liveness
OPEN_EAR = {"left": 0.30, "right": 0.30}
SHUT_EAR = {"left": 0.05, "right": 0.05}


def _blink_then_scroll_out(frames_after_blink=200):
    """EAR history where a blink happened early and has since scrolled out of
    a short trailing window, which is the normal case by the time a scan
    reaches the server.
    """
    return [OPEN_EAR] * 100 + [SHUT_EAR] * 6 + [OPEN_EAR] * 100 + [OPEN_EAR] * frames_after_blink


def test_liveness_accepts_reported_blink_when_window_has_scrolled_past(
    client, seeded, lecturer_headers
):
    """A blink that has already left the trailing EAR window must still count,
    otherwise live attendance can never mark anyone present.
    """
    from app.routes.attendance import _passes_liveness

    history = _blink_then_scroll_out()
    short_window = history[-30:]
    assert _passes_liveness(short_window, 0) is False, "window should no longer contain the blink"
    assert _passes_liveness(short_window, 1) is True


def test_liveness_rejects_when_no_blink_ever_happened(client, seeded, lecturer_headers):
    from app.routes.attendance import _passes_liveness

    assert _passes_liveness([OPEN_EAR] * 300, 0) is False


def test_liveness_still_detects_blink_inside_the_window(client, seeded, lecturer_headers):
    from app.routes.attendance import _passes_liveness

    assert _passes_liveness([OPEN_EAR] * 5 + [SHUT_EAR] * 3 + [OPEN_EAR] * 5, 0) is True
