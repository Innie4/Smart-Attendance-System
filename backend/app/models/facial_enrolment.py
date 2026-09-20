import json
from datetime import datetime
from app.extensions import db


class FacialEnrolment(db.Model):
    """Stores only the numerical embedding vector produced by the face
    recognition pipeline. Raw photographs are never persisted, satisfying the
    NDPA 2023 data-minimisation principle for biometric data.
    """

    __tablename__ = "facial_enrolments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id"), unique=True, nullable=False
    )
    embedding_vector = db.Column(db.Text, nullable=False)
    model_version = db.Column(db.String(40), default="sface-v1", nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Optional secondary descriptor computed client-side by the browser's
    # face-api.js FaceRecognitionNet during enrolment. It is cached back to
    # the lecturer's device before a live session so attendance can still be
    # matched locally when the offline resilience path kicks in -- the
    # server-side SFace vector above and this descriptor come from different
    # embedding spaces and are never compared against each other.
    offline_descriptor = db.Column(db.Text, nullable=True)

    student = db.relationship("Student", back_populates="facial_enrolment")

    def set_vector(self, vector: list) -> None:
        self.embedding_vector = json.dumps([float(v) for v in vector])

    def get_vector(self) -> list:
        return json.loads(self.embedding_vector)

    def set_offline_descriptor(self, descriptor: list) -> None:
        self.offline_descriptor = json.dumps([float(v) for v in descriptor]) if descriptor else None

    def get_offline_descriptor(self):
        return json.loads(self.offline_descriptor) if self.offline_descriptor else None

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "model_version": self.model_version,
            "enrolled_at": self.enrolled_at.isoformat(),
            "vector_length": len(self.get_vector()),
            "has_offline_descriptor": self.offline_descriptor is not None,
        }
