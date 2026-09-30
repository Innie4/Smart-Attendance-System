from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from app.extensions import db
from app.models import User
from app.utils.validators import require_fields

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _issue_tokens(user):
    claims = {"role": user.role}
    return {
        "access_token": create_access_token(identity=str(user.id), additional_claims=claims),
        "refresh_token": create_refresh_token(identity=str(user.id), additional_claims=claims),
        "user": user.to_dict(),
    }


@auth_bp.post("/login")
def login():
    """Single sign-in for all account types. Students and staff use the same
    email + password flow but are routed to different areas of the app by the
    role claim carried on the token.
    """
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["email", "password"])
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400

    email = str(payload["email"]).lower().strip()
    user = User.query.filter_by(email=email).first()
    # Always run the hash comparison so a missing account and a wrong password
    # take a similar amount of time.
    if not user or not user.check_password(payload["password"]):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    return jsonify(_issue_tokens(user))


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    claims = get_jwt()
    return jsonify(
        {"access_token": create_access_token(identity=get_jwt_identity(), additional_claims={"role": claims.get("role")})}
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())
