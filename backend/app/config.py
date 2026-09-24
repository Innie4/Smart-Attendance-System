import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///" + os.path.join(os.getcwd(), "attendance.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

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

    # Cloudflare R2 (S3-compatible) storage
    CLOUD_STORAGE_PROVIDER = os.environ.get("CLOUD_STORAGE_PROVIDER", "")
    CLOUD_STORAGE_BUCKET = os.environ.get("CLOUD_STORAGE_BUCKET", "")
    CLOUD_STORAGE_ACCESS_KEY = os.environ.get("CLOUD_STORAGE_ACCESS_KEY", "")
    CLOUD_STORAGE_SECRET_KEY = os.environ.get("CLOUD_STORAGE_SECRET_KEY", "")
    CLOUD_STORAGE_ENDPOINT = os.environ.get("CLOUD_STORAGE_ENDPOINT", "")
    CLOUD_STORAGE_REGION = os.environ.get("CLOUD_STORAGE_REGION", "auto")
    CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    CLOUDFLARE_R2_API_TOKEN = os.environ.get("CLOUDFLARE_R2_API_TOKEN", "")


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
