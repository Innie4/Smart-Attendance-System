"""Face detection, alignment, and embedding extraction.

Detection uses YuNet (cv2.FaceDetectorYN) and embedding extraction uses SFace
(cv2.FaceRecognizerSF), both distributed as ONNX weights through the OpenCV
Zoo. SFace is trained with an ArcFace-family margin loss, so its 128D vectors
carry the same discriminative properties requested of an ArcFace/FaceNet
embedding while keeping the runtime to OpenCV alone (no TensorFlow/PyTorch/
dlib build step), which matters for classroom hardware and CI reproducibility.

Only the resulting numerical vector is ever persisted (see
app/models/facial_enrolment.py) -- raw frames are processed in memory and
discarded, in line with NDPA 2023 data-minimisation for biometric data.
"""

import os
import numpy as np

EMBEDDING_DIM = 128


def euclidean_distance(vector_a, vector_b) -> float:
    a = np.asarray(vector_a, dtype=np.float64)
    b = np.asarray(vector_b, dtype=np.float64)
    if a.shape != b.shape:
        raise ValueError("Embedding vectors must have the same shape")
    return float(np.linalg.norm(a - b))


def cosine_distance(vector_a, vector_b) -> float:
    a = np.asarray(vector_a, dtype=np.float64)
    b = np.asarray(vector_b, dtype=np.float64)
    if a.shape != b.shape:
        raise ValueError("Embedding vectors must have the same shape")
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 1.0
    similarity = float(np.dot(a, b) / denom)
    similarity = max(-1.0, min(1.0, similarity))
    return 1.0 - similarity


def is_match(vector_a, vector_b, threshold: float, metric: str = "euclidean") -> tuple:
    """Returns (is_match: bool, distance: float) for the given metric."""
    if metric == "euclidean":
        distance = euclidean_distance(vector_a, vector_b)
    elif metric == "cosine":
        distance = cosine_distance(vector_a, vector_b)
    else:
        raise ValueError(f"Unsupported metric: {metric}")
    return distance <= threshold, distance


def best_match(probe_vector, candidates: list, threshold: float, metric: str = "euclidean"):
    """Finds the closest enrolled candidate to a probe embedding.

    `candidates` is a list of (student_id, embedding_vector) tuples scoped to
    the roster of the active course session. Returns a dict with the winning
    student_id, distance, and confidence, or None if nothing clears the
    threshold.
    """
    best_student_id = None
    best_distance = float("inf")

    for student_id, embedding in candidates:
        _, distance = is_match(probe_vector, embedding, threshold, metric)
        if distance < best_distance:
            best_distance = distance
            best_student_id = student_id

    if best_student_id is None or best_distance > threshold:
        return None

    confidence = max(0.0, 1.0 - (best_distance / threshold)) if threshold > 0 else 0.0
    return {
        "student_id": best_student_id,
        "distance": best_distance,
        "confidence": round(min(confidence, 1.0), 4),
    }


class FaceRecognitionPipeline:
    """Wraps the OpenCV DNN detector/recognizer pair. Model weights are
    lazy-loaded on first use so importing this module never requires network
    access or the presence of the ONNX files (needed for unit tests that only
    exercise the distance math above).
    """

    DETECTOR_FILENAME = "face_detection_yunet_2023mar.onnx"
    RECOGNIZER_FILENAME = "face_recognition_sface_2021dec.onnx"

    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self._detector = None
        self._recognizer = None

    def _detector_path(self) -> str:
        return os.path.join(self.model_dir, self.DETECTOR_FILENAME)

    def _recognizer_path(self) -> str:
        return os.path.join(self.model_dir, self.RECOGNIZER_FILENAME)

    def _ensure_loaded(self):
        import cv2

        if self._detector is None:
            detector_path = self._detector_path()
            if not os.path.exists(detector_path):
                raise RuntimeError(
                    f"Face detector weights missing at {detector_path}. "
                    "Run `python download_models.py` from the backend directory."
                )
            self._detector = cv2.FaceDetectorYN.create(
                detector_path, "", (320, 320), score_threshold=0.8
            )
        if self._recognizer is None:
            recognizer_path = self._recognizer_path()
            if not os.path.exists(recognizer_path):
                raise RuntimeError(
                    f"Face recognizer weights missing at {recognizer_path}. "
                    "Run `python download_models.py` from the backend directory."
                )
            self._recognizer = cv2.FaceRecognizerSF.create(recognizer_path, "")

    def detect_faces(self, frame):
        """Returns YuNet detections for a BGR frame: an array of rows shaped
        [x, y, w, h, 5 landmark x/y pairs, confidence].
        """
        import cv2

        self._ensure_loaded()
        height, width = frame.shape[:2]
        self._detector.setInputSize((width, height))
        _, faces = self._detector.detect(frame)
        return faces if faces is not None else np.empty((0, 15))

    def extract_embedding(self, frame, face_row) -> list:
        """Aligns and crops the detected face, then returns its 128D
        embedding as a plain Python list ready for JSON storage.
        """
        self._ensure_loaded()
        aligned = self._recognizer.alignCrop(frame, face_row)
        feature = self._recognizer.feature(aligned)
        return feature.flatten().tolist()

    def enrol_from_frames(self, frames: list) -> list:
        """Multi-angle enrolment: extracts an embedding from each frame that
        contains exactly one confidently-detected face, then averages them
        into a single centroid vector for a more robust enrolment record.
        """
        vectors = []
        for frame in frames:
            faces = self.detect_faces(frame)
            if len(faces) != 1:
                continue
            vectors.append(self.extract_embedding(frame, faces[0]))

        if not vectors:
            raise ValueError(
                "No single-face frame could be processed across the capture set"
            )

        return np.mean(np.array(vectors), axis=0).tolist()
