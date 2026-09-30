from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def role_required(*roles):
    """Restrict a route to the given roles. Must be used after (below in
    decorator order, evaluated before) a JWT is present on the request.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


admin_required = role_required("admin")
staff_required = role_required("admin", "lecturer")
student_required = role_required("student")
