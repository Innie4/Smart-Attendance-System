"""Blink-based liveness detection using the Eye Aspect Ratio (EAR).

EAR guards the live attendance engine against a printed photo or a phone
screen held up to the camera: a genuine eye periodically closes and reopens,
producing a characteristic dip in the ratio, while a static image holds a
constant EAR forever.

Landmark points follow the standard 6-point-per-eye ordering (p1 at the outer
corner, going around the eyelid to p6 at the lower outer point), the same
convention used by dlib's 68-point model and most face-landmark backends, so
this module stays independent of whichever landmark model is wired in front
of it.
"""

import math
from collections import deque


def _distance(p1, p2) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def eye_aspect_ratio(eye_points) -> float:
    if len(eye_points) != 6:
        raise ValueError("eye_points must contain exactly 6 (x, y) landmarks")

    p1, p2, p3, p4, p5, p6 = eye_points
    vertical_1 = _distance(p2, p6)
    vertical_2 = _distance(p3, p5)
    horizontal = _distance(p1, p4)

    if horizontal == 0:
        return 0.0

    return (vertical_1 + vertical_2) / (2.0 * horizontal)


class BlinkDetector:
    """Tracks a rolling window of EAR readings for one candidate across
    consecutive frames and reports completed blinks.

    A blink is counted once the EAR has stayed at or below `ear_threshold`
    for at least `consec_frames` frames and then recovers above it -- this
    rejects single-frame detector noise while still catching a normal, fast
    blink.
    """

    def __init__(self, ear_threshold: float = 0.21, consec_frames: int = 2, window: int = 30):
        self.ear_threshold = ear_threshold
        self.consec_frames = consec_frames
        self.history = deque(maxlen=window)
        self._below_streak = 0
        self.blink_count = 0

    def update(self, left_ear: float, right_ear: float) -> bool:
        """Feed one frame's eye readings in. Returns True the instant a
        completed blink is registered.
        """
        avg_ear = (left_ear + right_ear) / 2.0
        self.history.append(avg_ear)

        blinked = False
        if avg_ear < self.ear_threshold:
            self._below_streak += 1
        else:
            if self._below_streak >= self.consec_frames:
                self.blink_count += 1
                blinked = True
            self._below_streak = 0

        return blinked

    def is_live(self, min_blinks: int = 1) -> bool:
        return self.blink_count >= min_blinks

    def reset(self):
        self.history.clear()
        self._below_streak = 0
        self.blink_count = 0
