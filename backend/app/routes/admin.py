from flask import Blueprint, request, jsonify

from app.extensions import db
from app.models import Department, Course, Lecturer, Student, CourseEnrolment
from app.utils.validators import require_fields
from app.utils.rbac import admin_required, lecturer_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# ---------------------------------------------------------------- departments
# List endpoints use lecturer_required (admins pass too) since lecturers need
# this reference data for their own dashboards; create/update/delete stay
# admin-only.
@admin_bp.get("/departments")
@lecturer_required
def list_departments():
    departments = Department.query.order_by(Department.name).all()
    return jsonify([d.to_dict() for d in departments])


@admin_bp.post("/departments")
@admin_required
def create_department():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["name", "code"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400

    if Department.query.filter_by(code=payload["code"].upper()).first():
        return jsonify({"error": "Department code already exists"}), 409

    department = Department(name=payload["name"].strip(), code=payload["code"].upper().strip())
    db.session.add(department)
    db.session.commit()
    return jsonify(department.to_dict()), 201


@admin_bp.put("/departments/<int:department_id>")
@admin_required
def update_department(department_id):
    department = db.get_or_404(Department, department_id)
    payload = request.get_json(silent=True) or {}
    if "name" in payload:
        department.name = payload["name"].strip()
    if "code" in payload:
        department.code = payload["code"].upper().strip()
    db.session.commit()
    return jsonify(department.to_dict())


@admin_bp.delete("/departments/<int:department_id>")
@admin_required
def delete_department(department_id):
    department = db.get_or_404(Department, department_id)
    db.session.delete(department)
    db.session.commit()
    return "", 204


# --------------------------------------------------------------------- courses
@admin_bp.get("/courses")
@lecturer_required
def list_courses():
    courses = Course.query.order_by(Course.course_code).all()
    return jsonify([c.to_dict() for c in courses])


@admin_bp.post("/courses")
@admin_required
def create_course():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["course_code", "title", "department_id"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400
    if not db.session.get(Department, payload["department_id"]):
        return jsonify({"error": "Department not found"}), 404
    if Course.query.filter_by(course_code=payload["course_code"].upper()).first():
        return jsonify({"error": "Course code already exists"}), 409

    course = Course(
        course_code=payload["course_code"].upper().strip(),
        title=payload["title"].strip(),
        unit_load=payload.get("unit_load", 0),
        department_id=payload["department_id"],
    )
    db.session.add(course)
    db.session.commit()
    return jsonify(course.to_dict()), 201


@admin_bp.put("/courses/<int:course_id>")
@admin_required
def update_course(course_id):
    course = db.get_or_404(Course, course_id)
    payload = request.get_json(silent=True) or {}
    if "title" in payload:
        course.title = payload["title"].strip()
    if "unit_load" in payload:
        course.unit_load = payload["unit_load"]
    if "department_id" in payload:
        course.department_id = payload["department_id"]
    db.session.commit()
    return jsonify(course.to_dict())


@admin_bp.delete("/courses/<int:course_id>")
@admin_required
def delete_course(course_id):
    course = db.get_or_404(Course, course_id)
    db.session.delete(course)
    db.session.commit()
    return "", 204


# ------------------------------------------------------------------- lecturers
@admin_bp.get("/lecturers")
@admin_required
def list_lecturers():
    lecturers = Lecturer.query.all()
    return jsonify([l.to_dict() for l in lecturers])


@admin_bp.delete("/lecturers/<int:lecturer_id>")
@admin_required
def delete_lecturer(lecturer_id):
    lecturer = db.get_or_404(Lecturer, lecturer_id)
    db.session.delete(lecturer.user)
    db.session.commit()
    return "", 204


# -------------------------------------------------------------------- students
@admin_bp.get("/students")
@lecturer_required
def list_students():
    department_id = request.args.get("department_id", type=int)
    query = Student.query
    if department_id:
        query = query.filter_by(department_id=department_id)
    students = query.order_by(Student.full_name).all()
    return jsonify([s.to_dict() for s in students])


@admin_bp.post("/students")
@admin_required
def create_student():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["matric_number", "full_name", "department_id"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400
    if not db.session.get(Department, payload["department_id"]):
        return jsonify({"error": "Department not found"}), 404
    if Student.query.filter_by(matric_number=payload["matric_number"].upper()).first():
        return jsonify({"error": "Matric number already exists"}), 409

    student = Student(
        matric_number=payload["matric_number"].upper().strip(),
        full_name=payload["full_name"].strip(),
        department_id=payload["department_id"],
    )
    db.session.add(student)
    db.session.commit()
    return jsonify(student.to_dict()), 201


@admin_bp.put("/students/<int:student_id>")
@admin_required
def update_student(student_id):
    student = db.get_or_404(Student, student_id)
    payload = request.get_json(silent=True) or {}
    if "full_name" in payload:
        student.full_name = payload["full_name"].strip()
    if "department_id" in payload:
        student.department_id = payload["department_id"]
    db.session.commit()
    return jsonify(student.to_dict())


@admin_bp.delete("/students/<int:student_id>")
@admin_required
def delete_student(student_id):
    student = db.get_or_404(Student, student_id)
    db.session.delete(student)
    db.session.commit()
    return "", 204


# ------------------------------------------------------------------ enrolments
@admin_bp.get("/enrolments")
@lecturer_required
def list_enrolments():
    course_id = request.args.get("course_id", type=int)
    query = CourseEnrolment.query
    if course_id:
        query = query.filter_by(course_id=course_id)
    enrolments = query.all()
    return jsonify([e.to_dict() for e in enrolments])


@admin_bp.post("/enrolments")
@admin_required
def create_enrolment():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["student_id", "course_id", "session_year"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400
    if not db.session.get(Student, payload["student_id"]):
        return jsonify({"error": "Student not found"}), 404
    if not db.session.get(Course, payload["course_id"]):
        return jsonify({"error": "Course not found"}), 404

    existing = CourseEnrolment.query.filter_by(
        student_id=payload["student_id"],
        course_id=payload["course_id"],
        session_year=payload["session_year"],
    ).first()
    if existing:
        return jsonify({"error": "Student already enrolled for this session"}), 409

    enrolment = CourseEnrolment(
        student_id=payload["student_id"],
        course_id=payload["course_id"],
        session_year=payload["session_year"],
    )
    db.session.add(enrolment)
    db.session.commit()
    return jsonify(enrolment.to_dict()), 201


@admin_bp.delete("/enrolments/<int:enrolment_id>")
@admin_required
def delete_enrolment(enrolment_id):
    enrolment = db.get_or_404(CourseEnrolment, enrolment_id)
    db.session.delete(enrolment)
    db.session.commit()
    return "", 204
