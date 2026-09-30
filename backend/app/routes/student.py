"""Student self-service endpoints.

A student only ever sees their own record: their courses, the attendance
percentage for each, and the NUC 75% eligibility flag. Every query is scoped to
the student resolved from the JWT, so no student id is ever taken from the
request and one student cannot read another's data.
"""

from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models import (
    AttendanceLog,
    AttendanceSession,
    Course,
    CourseEnrolment,
    Student,
)
from app.services.attendance_service import (
    calculate_attendance_percentage,
    is_nuc_compliant,
)
from app.utils.rbac import student_required

student_bp = Blueprint("student", __name__, url_prefix="/api/student")


def _current_student() -> Student | None:
    return Student.query.filter_by(user_id=int(get_jwt_identity())).first()


def _attendance_rows(student: Student):
    """One record per course the student is enrolled in for the given session
    year, counting only locked sessions so in-progress classes don't drag the
    percentage down.
    """
    threshold = current_app.config["NUC_ATTENDANCE_THRESHOLD"]
    enrolments = (
        db.session.query(CourseEnrolment, Course)
        .join(Course, Course.id == CourseEnrolment.course_id)
        .filter(
            CourseEnrolment.student_id == student.id,
            CourseEnrolment.session_year == current_app.config["STUDENT_PORTAL_SESSION_YEAR"],
        )
        .order_by(Course.course_code)
        .all()
    )

    rows = []
    for enrolment, course in enrolments:
        sessions_held = AttendanceSession.query.filter_by(
            course_id=course.id, is_locked=True
        ).count()
        sessions_attended = (
            db.session.query(AttendanceLog)
            .join(AttendanceSession, AttendanceSession.id == AttendanceLog.session_id)
            .filter(
                AttendanceLog.student_id == student.id,
                AttendanceSession.course_id == course.id,
                AttendanceSession.is_locked == True,  # noqa: E712
            )
            .count()
        )
        percentage = calculate_attendance_percentage(sessions_attended, sessions_held)
        rows.append(
            {
                "course_id": course.id,
                "course_code": course.course_code,
                "title": course.title,
                "unit_load": course.unit_load,
                "sessions_attended": sessions_attended,
                "sessions_held": sessions_held,
                "attendance_percentage": percentage,
                "is_compliant": is_nuc_compliant(percentage, threshold),
            }
        )
    return rows, threshold


@student_bp.get("/me")
@student_required
def profile():
    student = _current_student()
    if not student:
        return jsonify({"error": "No student record is linked to this account"}), 404
    return jsonify(
        {
            "id": student.id,
            "full_name": student.full_name,
            "matric_number": student.matric_number,
            "department": student.department.name if student.department else None,
            "consent_given": student.consent_given,
            "has_facial_enrolment": student.facial_enrolment is not None,
        }
    )


@student_bp.get("/attendance")
@student_required
def attendance():
    student = _current_student()
    if not student:
        return jsonify({"error": "No student record is linked to this account"}), 404

    rows, threshold = _attendance_rows(student)
    graded = [r for r in rows if r["sessions_held"] > 0]
    at_risk = [r for r in graded if not r["is_compliant"]]

    return jsonify(
        {
            "session_year": current_app.config["STUDENT_PORTAL_SESSION_YEAR"],
            "nuc_threshold": threshold,
            "courses": rows,
            "summary": {
                "courses_enrolled": len(rows),
                "courses_graded": len(graded),
                "at_risk_count": len(at_risk),
                # A student is eligible only if every graded course clears the bar.
                "is_eligible_for_exams": bool(graded) and not at_risk,
                "average_percentage": round(
                    sum(r["attendance_percentage"] for r in graded) / len(graded), 2
                )
                if graded
                else 0.0,
            },
        }
    )
