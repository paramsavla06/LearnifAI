"""
Module 4 - LLM Narration
Gemini API client + prompt builder for educational narratives.
"""

import google.generativeai as genai
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load .env variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Gemini Configuration
MODEL_NAME = "gemini-2.5-flash"
api_key = os.environ.get("GEMINI_API_KEY", "")

if not api_key:
    print("[ERROR] GEMINI_API_KEY is not set in the environment!")
else:
    print(f"[SUCCESS] GEMINI_API_KEY loaded successfully (Ends in: ...{api_key[-4:]})")
    genai.configure(api_key=api_key)

def _get_model():
    if not api_key:
        return None
    try:
        return genai.GenerativeModel(MODEL_NAME)
    except Exception:
        return None

def _call_gemini(prompt: str) -> str:
    model = _get_model()
    if not model:
        return "LLM narration unavailable — GEMINI_API_KEY not set."
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=800,
                temperature=0.7,
            )
        )
        # Check if Gemini blocked the response due to safety
        if response.candidates and response.candidates[0].finish_reason != 1: # 1 is STOP
            print(f"[WARNING] Gemini stopped early. Reason: {response.candidates[0].finish_reason}")
            
        return response.text.strip()
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini API Error: {error_msg}")
        return f"Gemini Error: {error_msg}. Check your terminal logs or API dashboard."

def narrate_root_cause(
    failed_concept: str,
    gap_chain: List[dict],
    mastery_scores: Dict[str, float],
    student_id: str = "Student",
) -> str:
    if not gap_chain:
        return f"No prerequisite gaps found. Student is ready for {failed_concept}."

    chain_text = "\n".join([f"{i+1}. {g['name']} (mastery: {g.get('mastery_score', -1):.0%})" 
                            for i, g in enumerate(gap_chain)])
    root_cause_name = gap_chain[0]['name']

    import datetime
    now_str = datetime.datetime.now().strftime("%H:%M:%S")

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
    return _call_gemini(prompt)


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
    return _call_gemini(prompt)

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
    return _call_gemini(prompt)
