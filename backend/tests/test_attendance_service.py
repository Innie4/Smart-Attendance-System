import pytest

from app.services.attendance_service import (
    calculate_attendance_percentage,
    is_nuc_compliant,
    build_course_attendance_report,
)


def test_calculate_attendance_percentage_normal_case():
    assert calculate_attendance_percentage(9, 12) == 75.0


def test_calculate_attendance_percentage_rounds_to_two_places():
    assert calculate_attendance_percentage(1, 3) == 33.33


def test_calculate_attendance_percentage_no_sessions_held_is_zero():
    assert calculate_attendance_percentage(0, 0) == 0.0


def test_calculate_attendance_percentage_full_attendance():
    assert calculate_attendance_percentage(10, 10) == 100.0


def test_is_nuc_compliant_at_exact_threshold():
    assert is_nuc_compliant(75.0, threshold=75.0) is True


def test_is_nuc_compliant_below_threshold():
    assert is_nuc_compliant(74.9, threshold=75.0) is False


def test_build_course_attendance_report_flags_and_sorts():
    students = [
        {"student_id": 1, "matric_number": "A1", "full_name": "Alice", "sessions_attended": 10},
        {"student_id": 2, "matric_number": "B2", "full_name": "Bob", "sessions_attended": 4},
        {"student_id": 3, "matric_number": "C3", "full_name": "Chi", "sessions_attended": 8},
    ]
    report = build_course_attendance_report(students, sessions_held=10, threshold=75.0)

    assert [row["student_id"] for row in report] == [2, 3, 1]
    assert report[0]["is_compliant"] is False
    assert report[-1]["is_compliant"] is True
    assert report[-1]["attendance_percentage"] == 100.0


def test_build_course_attendance_report_empty_roster():
    assert build_course_attendance_report([], sessions_held=10) == []
