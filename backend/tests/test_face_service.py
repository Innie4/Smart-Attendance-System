import pytest

from app.services.face_service import (
    euclidean_distance,
    cosine_distance,
    is_match,
    best_match,
)


def test_euclidean_distance_identical_vectors_is_zero():
    vector = [0.5, 0.2, 0.1]
    assert euclidean_distance(vector, vector) == 0.0


def test_euclidean_distance_known_value():
    assert euclidean_distance([0, 0], [3, 4]) == 5.0


def test_cosine_distance_identical_vectors_is_zero():
    vector = [0.3, 0.4, 0.5]
    assert cosine_distance(vector, vector) == pytest.approx(0.0, abs=1e-9)


def test_cosine_distance_orthogonal_vectors_is_one():
    assert cosine_distance([1, 0], [0, 1]) == pytest.approx(1.0)


def test_distance_functions_reject_mismatched_shapes():
    with pytest.raises(ValueError):
        euclidean_distance([1, 2], [1, 2, 3])


def test_is_match_within_threshold():
    matched, distance = is_match([0, 0], [0.5, 0.5], threshold=1.02, metric="euclidean")
    assert matched is True
    assert distance < 1.02


def test_is_match_outside_threshold():
    matched, distance = is_match([0, 0], [5, 5], threshold=1.02, metric="euclidean")
    assert matched is False
    assert distance > 1.02


def test_is_match_unsupported_metric_raises():
    with pytest.raises(ValueError):
        is_match([0, 0], [1, 1], threshold=1.0, metric="manhattan")


def test_best_match_picks_closest_candidate_within_threshold():
    probe = [0.1] * 128
    candidates = [
        (1, [0.1] * 128),
        (2, [5.0] * 128),
    ]
    result = best_match(probe, candidates, threshold=1.02)
    assert result is not None
    assert result["student_id"] == 1
    assert 0.0 <= result["confidence"] <= 1.0


def test_best_match_returns_none_when_no_candidate_clears_threshold():
    probe = [0.1] * 128
    candidates = [(1, [9.0] * 128)]
    result = best_match(probe, candidates, threshold=1.02)
    assert result is None


def test_best_match_empty_roster_returns_none():
    assert best_match([0.1, 0.2], [], threshold=1.02) is None
