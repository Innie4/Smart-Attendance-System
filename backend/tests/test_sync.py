from datetime import datetime, timedelta


def _open_session(client, headers, course_id):
    response = client.post("/api/attendance/sessions", headers=headers, json={"course_id": course_id})
    return response.get_json()["id"]


def test_sync_accepts_valid_offline_batch(client, seeded, lecturer_headers):
    course = seeded["course"]
    student = seeded["students"][0]
    session_id = _open_session(client, lecturer_headers, course.id)

    captured_at = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
    response = client.post(
        "/api/sync/attendance",
        headers=lecturer_headers,
        json={
            "records": [
                {
                    "session_id": session_id,
                    "student_id": student.id,
                    "confidence_score": 0.91,
                    "captured_at": captured_at,
                }
            ]
        },
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["accepted_count"] == 1
    assert body["error_count"] == 0


def test_sync_skips_duplicate_and_locked_session_records(client, seeded, lecturer_headers):
    course = seeded["course"]
    student = seeded["students"][0]
    session_id = _open_session(client, lecturer_headers, course.id)
    client.post(f"/api/attendance/sessions/{session_id}/close", headers=lecturer_headers)

    captured_at = datetime.utcnow().isoformat()
    response = client.post(
        "/api/sync/attendance",
        headers=lecturer_headers,
        json={
            "records": [
                {
                    "session_id": session_id,
                    "student_id": student.id,
                    "confidence_score": 0.9,
                    "captured_at": captured_at,
                }
            ]
        },
    )

    body = response.get_json()
    assert body["accepted_count"] == 0
    assert body["skipped_count"] == 1
    assert body["skipped"][0]["reason"] == "session_locked"


def test_sync_reports_errors_for_missing_fields(client, seeded, lecturer_headers):
    response = client.post(
        "/api/sync/attendance",
        headers=lecturer_headers,
        json={"records": [{"session_id": 1}]},
    )
    body = response.get_json()
    assert body["error_count"] == 1


def test_sync_requires_non_empty_records(client, seeded, lecturer_headers):
    response = client.post("/api/sync/attendance", headers=lecturer_headers, json={"records": []})
    assert response.status_code == 400
