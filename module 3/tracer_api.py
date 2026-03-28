"""
Module 3 - Tracer API
FastAPI router for root cause analysis and learning path generation.
"""

from fastapi import APIRouter, HTTPException, Query
import networkx as nx
import os, sys
from typing import Dict, List, Optional

# Load module logic
sys.path.insert(0, os.path.dirname(__file__))
from tracer import find_root_gaps, batch_trace, get_learning_path

# Path adjustments
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODULE1_PATH = os.path.join(BASE_DIR, "module 1")
MODULE2_PATH = os.path.join(BASE_DIR, "module 2")

def _load_graph(subject_filter=None) -> nx.DiGraph:
    # Need to import graph_db properly
    sys.path.insert(0, MODULE1_PATH)
    from graph_db import export_d3_graph
    data = export_d3_graph(subject_filter=subject_filter)
    G = nx.DiGraph()
    for node in data["nodes"]:
        G.add_node(node["id"], **node)
    for link in data["links"]:
        G.add_edge(link["source"], link["target"], strength=link["strength"])
    return G

def _load_mastery(student_id: str) -> Dict[str, float]:
    # Need to import quiz_store properly
    sys.path.insert(0, MODULE2_PATH)
    from quiz_store import get_all_mastery
    records = get_all_mastery(student_id)
    return {r["slug"]: r["score"] for r in records}

tracer_router = APIRouter(tags=["Root Cause Tracer"])

@tracer_router.get("/trace/{student_id}/{concept_slug}")
def trace_concept(
    student_id: str,
    concept_slug: str,
    threshold: float = 0.4,
    include_recommended: bool = True,
    subject_filter: Optional[str] = None
):
    try:
        G = _load_graph(subject_filter)
        if concept_slug not in G:
             raise HTTPException(status_code=404, detail="Concept not found in graph.")
        
        mastery = _load_mastery(student_id)
        result = find_root_gaps(G, concept_slug, mastery, threshold, include_recommended)
        
        # Summary text
        if result.total_gaps > 0:
            summary = f"Student has {result.total_gaps} prerequisite gaps. Start with: {result.root_causes[0].slug}."
        else:
            summary = "No prerequisite gaps found. Student is ready for this concept."
        
        return {
            "student_id": student_id,
            "failed_concept": {"slug": concept_slug, "name": result.failed_concept_name},
            "total_gaps": result.total_gaps,
            "max_depth": result.max_depth,
            "root_causes": [n.__dict__ for n in result.root_causes],
            "gap_chain": [n.__dict__ for n in result.gap_chain],
            "required_gaps": [n.__dict__ for n in result.required_gaps],
            "recommended_gaps": [n.__dict__ for n in result.recommended_gaps],
            "learning_path": result.learning_path,
            "summary": summary
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@tracer_router.get("/trace/{student_id}")
def trace_all(
    student_id: str,
    threshold: float = 0.4,
    subject_filter: Optional[str] = None
):
    G = _load_graph(subject_filter)
    mastery = _load_mastery(student_id)
    
    if not mastery:
        return {"failing_concepts": 0, "traces": [], "message": "No mastery data found."}
        
    results = batch_trace(G, mastery, threshold)
    
    if not results:
        return {"failing_concepts": 0, "traces": [], "message": "No gaps detected."}
        
    traces = []
    for r in results:
        traces.append({
            "failed_concept_slug": r.failed_concept_slug,
            "failed_concept_name": r.failed_concept_name,
            "total_gaps": r.total_gaps,
            "root_causes": [n.slug for n in r.root_causes],
            "learning_path": r.learning_path,
            "summary": f"Student has {r.total_gaps} prerequisite gaps. Start with: {r.root_causes[0].slug}."
        })
        
    return {
        "student_id": student_id,
        "failing_concepts": len(results),
        "traces": traces
    }

@tracer_router.get("/learning-path/{student_id}/{target_slug}")
def fetch_learning_path(
    student_id: str,
    target_slug: str,
    threshold: float = 0.4
):
    G = _load_graph()
    mastery = _load_mastery(student_id)
    path = get_learning_path(G, target_slug, mastery, threshold)
    
    return {
        "student_id": student_id,
        "target_concept": target_slug,
        "steps": len(path),
        "path": path,
        "message": f"Master these {len(path)} concepts in order to reach {target_slug}."
    }
