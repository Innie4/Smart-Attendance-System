from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)

from app.extensions import db
from app.models import User, Lecturer, Department
from app.utils.validators import is_valid_email, require_fields
from app.utils.rbac import admin_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["email", "password"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400

    user = User.query.filter_by(email=payload["email"].lower().strip()).first()
    if not user or not user.check_password(payload["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    additional_claims = {"role": user.role}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict(),
        }
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims = get_jwt()
    access_token = create_access_token(
        identity=identity, additional_claims={"role": claims.get("role")}
    )
    return jsonify({"access_token": access_token})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


@auth_bp.post("/register")
@admin_required
def register():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["email", "password", "full_name", "role"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400

    email = payload["email"].lower().strip()
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email address"}), 400
    if payload["role"] not in (User.ROLE_ADMIN, User.ROLE_LECTURER):
        return jsonify({"error": "Role must be 'admin' or 'lecturer'"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409
    if len(payload["password"]) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    user = User(email=email, full_name=payload["full_name"].strip(), role=payload["role"])
    user.set_password(payload["password"])
    db.session.add(user)
    db.session.flush()

    if payload["role"] == User.ROLE_LECTURER:
        lecturer_missing = require_fields(payload, ["staff_id", "department_id"])
        if lecturer_missing:
            db.session.rollback()
            return jsonify({"error": "Missing lecturer fields", "fields": lecturer_missing}), 400
        if not db.session.get(Department, payload["department_id"]):
            db.session.rollback()
            return jsonify({"error": "Department not found"}), 404

        lecturer = Lecturer(
            user_id=user.id,
            staff_id=payload["staff_id"].strip(),
            department_id=payload["department_id"],
        )
        db.session.add(lecturer)

    db.session.commit()
    return jsonify(user.to_dict()), 201
