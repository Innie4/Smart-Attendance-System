def test_enrolment_requires_consent(client, seeded, lecturer_headers):
    student = seeded["students"][0]
    response = client.post(
        f"/api/facial-enrolment/{student.id}",
        headers=lecturer_headers,
        json={"consent_given": False, "frames": ["a", "b", "c"]},
    )
    assert response.status_code == 400
    assert "NDPA" in response.get_json()["error"]


def test_enrolment_requires_minimum_frame_count(client, seeded, lecturer_headers):
    student = seeded["students"][0]
    response = client.post(
        f"/api/facial-enrolment/{student.id}",
        headers=lecturer_headers,
        json={"consent_given": True, "frames": ["only-one"]},
    )
    assert response.status_code == 400


def test_enrolment_status_reflects_existing_vector(client, seeded, lecturer_headers):
    student = seeded["students"][0]
    response = client.get(f"/api/facial-enrolment/{student.id}", headers=lecturer_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["enrolled"] is True
    assert body["enrolment"]["vector_length"] == 128


def test_revoke_enrolment_removes_vector(client, seeded, lecturer_headers):
    student = seeded["students"][0]
    response = client.delete(f"/api/facial-enrolment/{student.id}", headers=lecturer_headers)
    assert response.status_code == 204

    status = client.get(f"/api/facial-enrolment/{student.id}", headers=lecturer_headers)
    assert status.get_json()["enrolled"] is False
