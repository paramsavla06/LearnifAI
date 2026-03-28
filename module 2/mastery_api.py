"""
Module 2 - Mastery Estimator API
FastAPI router for quiz submission, mastery tracking, and question serving.
"""

from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from typing import List, Optional
import sys
import os

# Import module 2 logic
sys.path.insert(0, os.path.dirname(__file__))
from mastery import QuizAttempt, estimate_mastery, estimate_batch, GAP_THRESHOLD
from quiz_store import (
    get_questions_for_concept,
    get_questions_for_concepts,
    save_attempt,
    get_attempts,
    upsert_mastery,
    get_all_mastery,
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AnswerItem(BaseModel):
    concept_slug: str
    question_id: Optional[int] = None
    selected_option: str = Field(..., pattern=r"^[a-d]$")
    correct_option: str = Field(..., pattern=r"^[a-d]$")
    difficulty: int = Field(default=3, ge=1, le=5)
    time_taken_sec: int = Field(default=30, ge=1, le=600)
    hint_used: bool = False


class QuizSubmission(BaseModel):
    student_id: str
    answers: List[AnswerItem]


class MasteryUpdateRequest(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

mastery_router = APIRouter(tags=["Mastery Estimator"])


def _score_label(score: float) -> str:
    if score >= 0.80:
        return "Strong"
    elif score >= 0.60:
        return "Good"
    elif score >= 0.40:
        return "Partial"
    else:
        return "Gap"


def _recommendation_text(score: float) -> str:
    if score >= 0.80:
        return "Strong mastery. Ready to advance to dependent concepts."
    elif score >= 0.60:
        return "Good understanding. Attempt 1-2 more practice problems to solidify."
    elif score >= 0.40:
        return "Partial mastery. Review concept notes and retry the quiz."
    else:
        return "Significant gap detected. Study prerequisite concepts first, then revisit."


# ---------------------------------------------------------------------------
# POST /quiz/submit
# ---------------------------------------------------------------------------

@mastery_router.post("/quiz/submit")
def submit_quiz(body: QuizSubmission):
    """
    Submit quiz answers. Persists each attempt, re-runs BKT on full history,
    upserts mastery scores, and returns per-concept results.
    """
    student_id = body.student_id

    # 1. Save each answer
    for ans in body.answers:
        is_correct = ans.selected_option == ans.correct_option
        save_attempt(
            student_id=student_id,
            concept_slug=ans.concept_slug,
            question_id=ans.question_id or 0,
            selected_option=ans.selected_option,
            is_correct=is_correct,
            time_taken_sec=ans.time_taken_sec,
            hint_used=ans.hint_used,
        )

    # 2. Get unique concept slugs from this submission
    concept_slugs = list({ans.concept_slug for ans in body.answers})

    # 3. For each concept, load FULL history (not just this session)
    all_quiz_attempts: List[QuizAttempt] = []
    for slug in concept_slugs:
        history = get_attempts(student_id, concept_slug=slug)
        for row in history:
            all_quiz_attempts.append(QuizAttempt(
                concept_slug=row["concept_slug"],
                is_correct=bool(row["is_correct"]),
                difficulty=body.answers[0].difficulty,  # fallback
                time_taken_sec=row["time_taken_sec"],
                hint_used=bool(row["hint_used"]),
            ))

    # Fix difficulty: use per-answer difficulty from the submission map
    slug_diff_map = {ans.concept_slug: ans.difficulty for ans in body.answers}
    for qa in all_quiz_attempts:
        if qa.concept_slug in slug_diff_map:
            qa.difficulty = slug_diff_map[qa.concept_slug]

    # 4. Run BKT batch
    results = estimate_batch(all_quiz_attempts)

    # 5. Upsert mastery for each result
    for slug, result in results.items():
        upsert_mastery(student_id, slug, result.mastery_score)

    # 6. Build response
    result_list = []
    gaps = []
    for slug in concept_slugs:
        r = results.get(slug)
        if r:
            entry = {
                "concept_slug": r.concept_slug,
                "mastery_score": r.mastery_score,
                "confidence": r.confidence,
                "attempts": r.attempts,
                "correct": r.correct,
                "method": r.method,
                "is_gap": r.is_gap,
                "recommendation": r.recommendation,
            }
            result_list.append(entry)
            if r.is_gap:
                gaps.append(slug)

    return {
        "student_id": student_id,
        "session_answers": len(body.answers),
        "concepts_assessed": len(concept_slugs),
        "results": result_list,
        "gaps_detected": gaps,
    }


# ---------------------------------------------------------------------------
# GET /mastery/{student_id}
# ---------------------------------------------------------------------------

@mastery_router.get("/mastery/{student_id}")
def get_student_mastery(student_id: str):
    """
    Returns all mastery scores for a student, grouped by subject.
    """
    rows = get_all_mastery(student_id)

    by_subject = {}
    gaps = []
    for r in rows:
        label = _score_label(r["score"])
        is_gap = r["score"] < GAP_THRESHOLD
        entry = {
            "slug": r["slug"],
            "name": r["name"],
            "difficulty": r["difficulty"],
            "semester": r["semester"],
            "score": r["score"],
            "label": label,
            "is_gap": is_gap,
            "updated_at": r["updated_at"],
        }
        subject = r["subject"]
        by_subject.setdefault(subject, []).append(entry)
        if is_gap:
            gaps.append({"slug": r["slug"], "name": r["name"], "score": r["score"]})

    return {
        "student_id": student_id,
        "total_assessed": len(rows),
        "gaps": gaps,
        "by_subject": by_subject,
    }


# ---------------------------------------------------------------------------
# GET /mastery/{student_id}/{concept_slug}
# ---------------------------------------------------------------------------

@mastery_router.get("/mastery/{student_id}/{concept_slug}")
def get_concept_mastery(student_id: str, concept_slug: str):
    """
    Detailed mastery info for a single student-concept pair.
    """
    # Get mastery score
    all_mastery = get_all_mastery(student_id)
    mastery_entry = None
    for m in all_mastery:
        if m["slug"] == concept_slug:
            mastery_entry = m
            break

    # Get attempt history
    attempts = get_attempts(student_id, concept_slug)

    if not mastery_entry and not attempts:
        raise HTTPException(
            status_code=404,
            detail=f"No mastery data or attempts found for student '{student_id}' "
                   f"on concept '{concept_slug}'"
        )

    score = mastery_entry["score"] if mastery_entry else 0.0
    label = _score_label(score)
    is_gap = score < GAP_THRESHOLD

    # Run estimator on history for method/confidence
    quiz_attempts = [
        QuizAttempt(
            concept_slug=a["concept_slug"],
            is_correct=bool(a["is_correct"]),
            difficulty=3,
            time_taken_sec=a["time_taken_sec"],
            hint_used=bool(a["hint_used"]),
        )
        for a in attempts
    ]
    estimation = estimate_mastery(quiz_attempts) if quiz_attempts else None

    attempt_details = [
        {
            "question_id": a["question_id"],
            "selected_option": a["selected_option"],
            "is_correct": bool(a["is_correct"]),
            "time_taken_sec": a["time_taken_sec"],
            "hint_used": bool(a["hint_used"]),
            "attempted_at": a["attempted_at"],
        }
        for a in attempts
    ]

    return {
        "student_id": student_id,
        "concept_slug": concept_slug,
        "score": score,
        "label": label,
        "is_gap": is_gap,
        "recommendation": _recommendation_text(score),
        "method": estimation.method if estimation else "none",
        "confidence": estimation.confidence if estimation else "low",
        "attempt_count": len(attempts),
        "attempts": attempt_details,
    }


# ---------------------------------------------------------------------------
# POST /mastery/{student_id}/{concept_slug}/update
# ---------------------------------------------------------------------------

@mastery_router.post("/mastery/{student_id}/{concept_slug}/update")
def update_mastery(student_id: str, concept_slug: str,
                   body: MasteryUpdateRequest):
    """Manual mastery override."""
    success = upsert_mastery(student_id, concept_slug, body.score)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Concept slug '{concept_slug}' not found in database"
        )

    label = _score_label(body.score)
    return {
        "student_id": student_id,
        "concept_slug": concept_slug,
        "score": body.score,
        "label": label,
        "updated": True,
    }


# ---------------------------------------------------------------------------
# GET /quiz/questions/{concept_slug}
# ---------------------------------------------------------------------------

@mastery_router.get("/quiz/questions/{concept_slug}")
def get_quiz_questions(
    concept_slug: str,
    limit: int = Query(default=3, ge=1, le=10),
    hide_answers: bool = Query(default=True),
):
    """
    Returns quiz questions for a single concept.
    If hide_answers=True (default), the correct_option is removed.
    """
    questions = get_questions_for_concept(concept_slug, limit)
    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found for concept '{concept_slug}'"
        )

    if hide_answers:
        for q in questions:
            q.pop("correct_option", None)

    return {
        "concept_slug": concept_slug,
        "question_count": len(questions),
        "questions": questions,
    }


# ---------------------------------------------------------------------------
# GET /quiz/questions
# ---------------------------------------------------------------------------

@mastery_router.get("/quiz/questions")
def get_quiz_questions_batch(
    slugs: str = Query(..., description="Comma-separated concept slugs"),
    per_concept: int = Query(default=3, ge=1, le=10),
    hide_answers: bool = Query(default=True),
):
    """
    Batch-fetch quiz questions for multiple concepts.
    """
    slug_list = [s.strip() for s in slugs.split(",") if s.strip()]
    if not slug_list:
        raise HTTPException(status_code=400, detail="No slugs provided")

    questions = get_questions_for_concepts(slug_list, per_concept)

    if hide_answers:
        for q in questions:
            q.pop("correct_option", None)

    return {
        "requested_concepts": slug_list,
        "question_count": len(questions),
        "questions": questions,
    }
