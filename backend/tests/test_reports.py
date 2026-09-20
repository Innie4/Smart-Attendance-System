def test_course_report_requires_session_year(client, seeded, lecturer_headers):
    course = seeded["course"]
    response = client.get(f"/api/reports/courses/{course.id}", headers=lecturer_headers)
    assert response.status_code == 400


def test_course_report_flags_zero_attendance_as_non_compliant(client, seeded, lecturer_headers):
    course = seeded["course"]
    response = client.get(
        f"/api/reports/courses/{course.id}", headers=lecturer_headers, query_string={"session_year": "2025/2026"}
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["nuc_threshold"] == 75.0
    assert len(body["students"]) == 2
    assert body["at_risk_count"] == 2
    assert all(not row["is_compliant"] for row in body["students"])


def test_export_csv_returns_csv_content(client, seeded, lecturer_headers):
    course = seeded["course"]
    response = client.get(
        f"/api/reports/courses/{course.id}/export.csv",
        headers=lecturer_headers,
        query_string={"session_year": "2025/2026"},
    )
    assert response.status_code == 200
    assert "csv" in response.content_type


def test_export_pdf_returns_pdf_content(client, seeded, lecturer_headers):
    course = seeded["course"]
    response = client.get(
        f"/api/reports/courses/{course.id}/export.pdf",
        headers=lecturer_headers,
        query_string={"session_year": "2025/2026"},
    )
    assert response.status_code == 200
    assert "pdf" in response.content_type
