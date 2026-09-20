import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(value: str) -> bool:
    return bool(value) and bool(EMAIL_RE.match(value))


def require_fields(payload: dict, fields: list) -> list:
    """Returns the list of missing/empty field names."""
    missing = []
    for field in fields:
        if payload is None or payload.get(field) in (None, ""):
            missing.append(field)
    return missing
