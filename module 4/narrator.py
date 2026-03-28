"""
Module 4 - LLM Narration
Gemini API client + prompt builder for educational narratives.
Gracefully falls back to structured offline narratives when API is unavailable.
"""

import google.generativeai as genai
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load .env variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Gemini Configuration
MODEL_NAME = "gemini-2.0-flash"
api_key = os.environ.get("GEMINI_API_KEY", "")

if not api_key:
    print("[INFO] GEMINI_API_KEY not set — narration will use offline fallback.")
else:
    print(f"[OK] GEMINI_API_KEY loaded (ends ...{api_key[-4:]})")
    genai.configure(api_key=api_key)

def _get_model():
    if not api_key:
        return None
    try:
        return genai.GenerativeModel(MODEL_NAME)
    except Exception:
        return None

def _call_gemini(prompt: str) -> str:
    """Call Gemini API. Returns empty string on any failure (caller handles fallback)."""
    model = _get_model()
    if not model:
        return ""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=800,
                temperature=0.7,
            )
        )
        if response.candidates and response.candidates[0].finish_reason != 1:
            print(f"[WARN] Gemini stopped early: {response.candidates[0].finish_reason}")

        return response.text.strip()
    except Exception as e:
        # Log full error for debugging, but never expose it to the user
        print(f"[WARN] Gemini API call failed: {e}")
        return ""


# ---------------------------------------------------------------------------
# Narrate: Root Cause Diagnosis
# ---------------------------------------------------------------------------

def narrate_root_cause(
    failed_concept: str,
    gap_chain: List[dict],
    mastery_scores: Dict[str, float],
    student_id: str = "Student",
) -> str:
    if not gap_chain:
        return f"No prerequisite gaps found. {student_id} is ready for {failed_concept}."

    chain_text = "\n".join([f"{i+1}. {g['name']} (mastery: {g.get('mastery_score', -1):.0%})"
                            for i, g in enumerate(gap_chain)])
    root_cause_name = gap_chain[0]['name']

    prompt = f"""
    You are an expert engineering tutor at Mumbai University.
    A student is currently looking to improve their understanding of the concept: '{failed_concept}'.

    Their prerequisite study sequence (in the order they must learn):
    {chain_text}

    The fundamental starting point (what to study first): {root_cause_name}

    Write a friendly, encouraging 3-sentence diagnosis:
    Sentence 1: Explain WHY the student should review {failed_concept} in simple terms, referencing the starting point.
    Sentence 2: Name the exact sequence of concepts they must study first (use the sequence list).
    Sentence 3: End with an encouraging, motivating statement.

    Keep it under 100 words. Use simple language, no jargon.
    Do not use bullet points. Write in paragraph form only.
    """
    result = _call_gemini(prompt)
    if result:
        return result

    # ── Offline fallback narrative ──
    path_names = " → ".join(g["name"] for g in gap_chain)
    return (
        f"To master {failed_concept}, you first need a solid foundation in {root_cause_name}. "
        f"Follow this study path: {path_names}. "
        f"Take it one concept at a time — you've got this!"
    )


# ---------------------------------------------------------------------------
# Narrate: Learning Path
# ---------------------------------------------------------------------------

def narrate_learning_path(
    target_concept: str,
    path: List[str],
    concept_names: Dict[str, str],
) -> str:
    if not path:
        return f"Student is already prepared for {target_concept}."

    names_list = "\n".join([f"{i+1}. {concept_names.get(slug, slug)}" for i, slug in enumerate(path)])

    prompt = f"""
    You are an engineering tutor. A student wants to master: '{target_concept}'.

    They must study these concepts in order:
    {names_list}

    Write 2 sentences:
    Sentence 1: Describe the learning journey from start to target in an encouraging way.
    Sentence 2: Give one practical study tip specific to the first concept in the path.

    Under 60 words. No bullet points.
    """
    result = _call_gemini(prompt)
    if result:
        return result

    # ── Offline fallback ──
    first_name = concept_names.get(path[0], path[0])
    return (
        f"Your journey to {target_concept} starts with {first_name} and covers {len(path)} concepts. "
        f"Begin by reviewing {first_name} — try working through practice problems to build confidence."
    )


# ---------------------------------------------------------------------------
# Narrate: Mastery Report
# ---------------------------------------------------------------------------

def narrate_mastery_report(
    student_id: str,
    total_assessed: int,
    gaps: List[dict],
    strong_concepts: List[dict],
    subject_summary: Dict[str, dict],
) -> str:
    strong_names = ", ".join([g['name'] for g in strong_concepts]) if strong_concepts else "none yet"
    gap_names = ", ".join([g['name'] for g in gaps]) if gaps else "none"
    subj_text = ", ".join([f"{s}: {m['avg_score']:.0%}" for s, m in subject_summary.items()])

    prompt = f"""
    You are an academic advisor reviewing a student's performance across Mumbai University engineering subjects.

    Student ID: {student_id}
    Concepts assessed: {total_assessed}
    Strong areas: {strong_names}
    Gaps requiring attention: {gap_names}
    Subject performance: {subj_text}

    Write a 4-sentence academic progress report:
    Sentence 1: Overall performance summary.
    Sentence 2: Highlight strengths.
    Sentence 3: Address the most critical gaps.
    Sentence 4: Concrete next step recommendation.

    Under 100 words. Formal but encouraging tone.
    """
    result = _call_gemini(prompt)
    if result:
        return result

    # ── Offline fallback ──
    lines = [
        f"Student {student_id} has been assessed on {total_assessed} concepts across {len(subject_summary)} subjects.",
    ]
    if strong_concepts:
        lines.append(f"Strong performance in: {strong_names}.")
    else:
        lines.append("No strong mastery areas identified yet.")

    if gaps:
        lines.append(f"Priority gaps to address: {gap_names}.")
    else:
        lines.append("No significant gaps detected — great work!")

    lines.append("Focus on the weakest areas first, then revisit to reinforce understanding.")
    return " ".join(lines)
