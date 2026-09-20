import pytest

from app.services.liveness import eye_aspect_ratio, BlinkDetector

OPEN_EYE = [(0, 0), (1, 1), (3, 1), (4, 0), (3, -1), (1, -1)]
CLOSED_EYE = [(0, 0), (1, 0.05), (3, 0.05), (4, 0), (3, -0.05), (1, -0.05)]


def test_eye_aspect_ratio_open_eye():
    assert eye_aspect_ratio(OPEN_EYE) == pytest.approx(0.5, abs=1e-6)


def test_eye_aspect_ratio_closed_eye_is_much_smaller():
    open_ear = eye_aspect_ratio(OPEN_EYE)
    closed_ear = eye_aspect_ratio(CLOSED_EYE)
    assert closed_ear < open_ear
    assert closed_ear == pytest.approx(0.025, abs=1e-6)


def test_eye_aspect_ratio_requires_six_points():
    with pytest.raises(ValueError):
        eye_aspect_ratio(OPEN_EYE[:4])


def test_eye_aspect_ratio_zero_width_returns_zero():
    degenerate = [(2, 0), (2, 1), (2, 1), (2, 0), (2, -1), (2, -1)]
    assert eye_aspect_ratio(degenerate) == 0.0


def test_blink_detector_registers_completed_blink():
    detector = BlinkDetector(ear_threshold=0.21, consec_frames=2)
    frame_ears = [0.30, 0.28, 0.10, 0.09, 0.08, 0.31, 0.29]

    blinked_frames = [detector.update(ear, ear) for ear in frame_ears]

    assert detector.blink_count == 1
    assert any(blinked_frames)


def test_blink_detector_ignores_single_frame_noise():
    detector = BlinkDetector(ear_threshold=0.21, consec_frames=2)
    frame_ears = [0.30, 0.10, 0.30, 0.29]  # dips for only one frame

    for ear in frame_ears:
        detector.update(ear, ear)

    assert detector.blink_count == 0


def test_blink_detector_is_live_respects_min_blinks():
    detector = BlinkDetector(ear_threshold=0.21, consec_frames=1)
    assert detector.is_live() is False
    detector.update(0.10, 0.10)
    detector.update(0.30, 0.30)
    assert detector.is_live() is True
    assert detector.is_live(min_blinks=2) is False


def test_blink_detector_reset_clears_state():
    detector = BlinkDetector(ear_threshold=0.21, consec_frames=1)
    detector.update(0.10, 0.10)
    detector.update(0.30, 0.30)
    assert detector.blink_count == 1
    detector.reset()
    assert detector.blink_count == 0
    assert len(detector.history) == 0


def test_static_photo_never_registers_a_blink():
    detector = BlinkDetector(ear_threshold=0.21, consec_frames=2)
    for _ in range(60):
        detector.update(0.32, 0.32)
    assert detector.blink_count == 0
    assert detector.is_live() is False
