import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///" + os.path.join(os.getcwd(), "attendance.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me-please-32-bytes")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 30))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 7))
    )

    # Face matching tuned threshold. Distances below this value are accepted
    # as a match; SFace cosine-derived L2 distance in the ~1.0-1.1 band is the
    # documented operating point for the balanced-accuracy configuration.
    FACE_MATCH_THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", 1.02))
    LIVENESS_EAR_THRESHOLD = float(os.environ.get("LIVENESS_EAR_THRESHOLD", 0.21))
    LIVENESS_CONSEC_FRAMES = int(os.environ.get("LIVENESS_CONSEC_FRAMES", 2))

    # NUC compliance threshold: students below this attendance percentage are
    # flagged as ineligible for examinations.
    NUC_ATTENDANCE_THRESHOLD = float(os.environ.get("NUC_ATTENDANCE_THRESHOLD", 75.0))

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

    MODEL_DIR = os.environ.get(
        "MODEL_DIR", os.path.join(os.path.dirname(__file__), "..", "models_data")
    )


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
