"""NUC compliance calculations: per-student attendance percentage and the
75% eligibility flag, computed from logged attendance versus the number of
sessions actually held for a course.
"""


def calculate_attendance_percentage(sessions_attended: int, sessions_held: int) -> float:
    if sessions_held <= 0:
        return 0.0
    percentage = (sessions_attended / sessions_held) * 100.0
    return round(percentage, 2)


def is_nuc_compliant(percentage: float, threshold: float = 75.0) -> bool:
    return percentage >= threshold


def build_course_attendance_report(students: list, sessions_held: int, threshold: float = 75.0) -> list:
    """`students` is a list of dicts: {student_id, matric_number, full_name,
    sessions_attended}. Returns the same records enriched with percentage
    and compliance flag, sorted by ascending percentage so at-risk students
    surface first.
    """
    report = []
    for record in students:
        percentage = calculate_attendance_percentage(
            record["sessions_attended"], sessions_held
        )
        report.append(
            {
                **record,
                "sessions_held": sessions_held,
                "attendance_percentage": percentage,
                "is_compliant": is_nuc_compliant(percentage, threshold),
            }
        )
    return sorted(report, key=lambda r: r["attendance_percentage"])
