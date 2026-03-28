"""
Module 4 - Narrator API
FastAPI router for generating LLM narratives for diagnosis and progress.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
import os, sys
from typing import List, Dict, Optional, Any

# Adjust paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODULE3_PATH = os.path.join(BASE_DIR, "module 3")
MODULE2_PATH = os.path.join(BASE_DIR, "module 2")

# Import logic
sys.path.insert(0, os.path.dirname(__file__))
from narrator import narrate_root_cause, narrate_learning_path, narrate_mastery_report

# Import tracer dependencies
sys.path.insert(0, MODULE3_PATH)
from tracer_api import _load_graph, _load_mastery
from tracer import find_root_gaps

# Import quiz_store
sys.path.insert(0, MODULE2_PATH)
from quiz_store import get_all_mastery

narrator_router = APIRouter(tags=["LLM Narration"])

class CustomNarrateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=2000)

@narrator_router.get("/narrate/diagnosis/{student_id}/{concept_slug}")
def diagnosis_narration(
    student_id: str,
    concept_slug: str,
    threshold: float = 0.4
):
    G = _load_graph()
    mastery = _load_mastery(student_id)
    result = find_root_gaps(G, concept_slug, mastery, threshold)
    
    gap_list = [{"slug": g.slug, "name": g.name, 
                  "mastery_score": g.mastery_score, "depth": g.depth} 
                 for g in result.gap_chain]
    
    narrative = narrate_root_cause(concept_slug, gap_list, mastery, student_id)
    
    return {
        "student_id": student_id,
        "failed_concept": concept_slug,
        "gap_count": result.total_gaps,
        "root_causes": [r.slug for r in result.root_causes],
        "learning_path": result.learning_path,
        "narrative": narrative
    }

@narrator_router.get("/narrate/report/{student_id}")
def report_narration(student_id: str):
    records = get_all_mastery(student_id)
    if not records:
         raise HTTPException(status_code=404, detail="No mastery data for student.")
         
    gaps = [r for r in records if r["score"] < 0.4]
    strong = [r for r in records if r["score"] >= 0.8]
    
    # Build subject summary
    subj_summary = {}
    for r in records:
        subj = r["subject"]
        if subj not in subj_summary:
            subj_summary[subj] = {"total_score": 0, "count": 0}
        subj_summary[subj]["total_score"] += r["score"]
        subj_summary[subj]["count"] += 1
        
    for subj in subj_summary:
        subj_summary[subj]["avg_score"] = subj_summary[subj]["total_score"] / subj_summary[subj]["count"]
        
    narrative = narrate_mastery_report(student_id, len(records), gaps, strong, subj_summary)
    
    return {
        "student_id": student_id,
        "total_assessed": len(records),
        "gap_count": len(gaps),
        "strong_count": len(strong),
        "subject_summary": subj_summary,
        "narrative": narrative
    }

@narrator_router.post("/narrate/custom")
def custom_narration(body: CustomNarrateRequest):
    from narrator import _call_gemini
    system_prefix = "You are an expert engineering tutor at Mumbai University. "
    result = _call_gemini(system_prefix + body.prompt)
    if not result:
        result = "AI narration is temporarily unavailable. Please try again later."
    return {"narrative": result}
