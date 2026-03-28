"""
Module 2 - Mastery Estimator Engine
Bayesian Knowledge Tracing (BKT) with weighted-ratio fallback.
Pure logic - no database, no FastAPI imports.
"""

from dataclasses import dataclass, field
from typing import List, Dict


# ---------------------------------------------------------------------------
# BKT default parameters by difficulty level (1-5)
# ---------------------------------------------------------------------------

BKT_DEFAULTS = {
    1: {"p_l0": 0.50, "p_t": 0.30, "p_s": 0.10, "p_g": 0.20},
    2: {"p_l0": 0.35, "p_t": 0.25, "p_s": 0.12, "p_g": 0.18},
    3: {"p_l0": 0.25, "p_t": 0.20, "p_s": 0.15, "p_g": 0.15},
    4: {"p_l0": 0.15, "p_t": 0.15, "p_s": 0.18, "p_g": 0.12},
    5: {"p_l0": 0.10, "p_t": 0.10, "p_s": 0.20, "p_g": 0.10},
}

DIFFICULTY_PENALTY = {1: 1.0, 2: 0.95, 3: 0.90, 4: 0.85, 5: 0.80}

GAP_THRESHOLD = 0.4


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class QuizAttempt:
    concept_slug: str
    is_correct: bool
    difficulty: int = 3
    time_taken_sec: int = 30
    hint_used: bool = False


@dataclass
class MasteryResult:
    concept_slug: str
    mastery_score: float          # 0.0 - 1.0
    confidence: str               # "low" | "medium" | "high"
    attempts: int
    correct: int
    method: str                   # "bkt" | "weighted_ratio"
    is_gap: bool                  # True if mastery_score < GAP_THRESHOLD
    recommendation: str


# ---------------------------------------------------------------------------
# BKT core update
# ---------------------------------------------------------------------------

def _bkt_update(p_l: float, is_correct: bool,
                p_s: float, p_g: float, p_t: float) -> float:
    """
    Single BKT step.
    1) Compute P(obs | L) and P(obs | not L)
    2) Posterior: P(L | obs)
    3) Learning transition: P(L_n) = P(L|obs) + (1 - P(L|obs)) * p_t
    4) Clamp to [0.0, 1.0]
    """
    if is_correct:
        p_obs_given_l = 1.0 - p_s       # correct and knows
        p_obs_given_nl = p_g             # correct but doesn't know (guess)
    else:
        p_obs_given_l = p_s              # incorrect but knows (slip)
        p_obs_given_nl = 1.0 - p_g       # incorrect and doesn't know

    # Posterior
    numerator = p_obs_given_l * p_l
    denominator = numerator + p_obs_given_nl * (1.0 - p_l)
    if denominator == 0:
        p_l_posterior = p_l
    else:
        p_l_posterior = numerator / denominator

    # Learning transition
    p_l_new = p_l_posterior + (1.0 - p_l_posterior) * p_t

    # Clamp
    return max(0.0, min(1.0, p_l_new))


def _run_bkt(attempts: List[QuizAttempt]) -> float:
    """Run full BKT sequence over ordered attempts, returns final mastery."""
    if not attempts:
        return 0.0

    # Use the difficulty of the first attempt for parameters
    diff = attempts[0].difficulty
    params = BKT_DEFAULTS.get(diff, BKT_DEFAULTS[3])

    p_l = params["p_l0"]
    for a in attempts:
        # Allow per-attempt difficulty to pick params
        a_params = BKT_DEFAULTS.get(a.difficulty, BKT_DEFAULTS[3])
        p_l = _bkt_update(p_l, a.is_correct,
                          a_params["p_s"], a_params["p_g"], a_params["p_t"])

    return round(p_l, 4)


# ---------------------------------------------------------------------------
# Weighted ratio fallback (for < 3 attempts)
# ---------------------------------------------------------------------------

def _speed_bonus(time_sec: int) -> float:
    """1.0 if <=20s, linear decay to 0.5 at 60s, 0.0 beyond 60s."""
    if time_sec <= 20:
        return 1.0
    elif time_sec <= 60:
        return 1.0 - 0.5 * (time_sec - 20) / 40.0
    else:
        return 0.0


def _weighted_ratio_score(attempts: List[QuizAttempt]) -> float:
    """Weighted ratio with speed + hint bonuses. Returns 0.0-1.0."""
    if not attempts:
        return 0.0

    scores = []
    for a in attempts:
        correctness = 1.0 if a.is_correct else 0.0
        speed = _speed_bonus(a.time_taken_sec)
        hint = 0.0 if a.hint_used else 1.0

        raw = 0.70 * correctness + 0.15 * speed + 0.15 * hint
        penalty = DIFFICULTY_PENALTY.get(a.difficulty, 0.90)
        scores.append(raw * penalty)

    return round(sum(scores) / len(scores), 4)


# ---------------------------------------------------------------------------
# Recommendation text
# ---------------------------------------------------------------------------

def _recommendation(score: float) -> str:
    if score >= 0.80:
        return "Strong mastery. Ready to advance to dependent concepts."
    elif score >= 0.60:
        return "Good understanding. Attempt 1-2 more practice problems to solidify."
    elif score >= 0.40:
        return "Partial mastery. Review concept notes and retry the quiz."
    else:
        return "Significant gap detected. Study prerequisite concepts first, then revisit."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def estimate_mastery(attempts: List[QuizAttempt]) -> MasteryResult:
    """
    Estimate mastery for a SINGLE concept given its attempts.
    Uses BKT if len(attempts) >= 3, else weighted_ratio_score.
    """
    if not attempts:
        slug = "unknown"
        return MasteryResult(
            concept_slug=slug, mastery_score=0.0, confidence="low",
            attempts=0, correct=0, method="weighted_ratio",
            is_gap=True, recommendation=_recommendation(0.0),
        )

    slug = attempts[0].concept_slug
    n = len(attempts)
    correct_count = sum(1 for a in attempts if a.is_correct)

    if n >= 3:
        score = _run_bkt(attempts)
        method = "bkt"
    else:
        score = _weighted_ratio_score(attempts)
        method = "weighted_ratio"

    if n >= 5:
        confidence = "high"
    elif n >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    return MasteryResult(
        concept_slug=slug,
        mastery_score=score,
        confidence=confidence,
        attempts=n,
        correct=correct_count,
        method=method,
        is_gap=score < GAP_THRESHOLD,
        recommendation=_recommendation(score),
    )


def estimate_batch(all_attempts: List[QuizAttempt]) -> Dict[str, MasteryResult]:
    """
    Group attempts by concept_slug, run estimate_mastery on each group.
    Returns dict mapping slug -> MasteryResult.
    """
    groups: Dict[str, List[QuizAttempt]] = {}
    for a in all_attempts:
        groups.setdefault(a.concept_slug, []).append(a)

    results: Dict[str, MasteryResult] = {}
    for slug, att_list in groups.items():
        results[slug] = estimate_mastery(att_list)

    return results
