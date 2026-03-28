"""
Module 5 - Cross-Subject Linking API
FastAPI router for cross-subject analysis and personalised insights.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Optional
import os, sys

# Adjust paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODULE5_PATH = os.path.join(BASE_DIR, "module 5")
MODULE1_PATH = os.path.join(BASE_DIR, "module 1")

# Import module 5 logic
sys.path.insert(0, os.path.dirname(__file__))
from cross_links import (
    get_links_for_concept, 
    get_all_links, 
    get_links_for_subject_pair, 
    get_concept_bridge_score
)

cross_links_router = APIRouter(tags=["Cross-Subject Linking"])

@cross_links_router.get("/cross-links")
def fetch_all_links():
    links = get_all_links()
    return {"total": len(links), "links": links}

@cross_links_router.get("/cross-links/concept/{slug}")
def fetch_concept_links(slug: str):
    links = get_links_for_concept(slug)
    if not links:
         raise HTTPException(status_code=404, detail=f"No links found for concept '{slug}'.")
    
    return {
        "concept_slug": slug,
        "bridge_score": get_concept_bridge_score(slug),
        "links": links
    }

@cross_links_router.get("/cross-links/subjects")
def fetch_subject_pair_links(
    subject_a: str = Query(...), 
    subject_b: str = Query(...)
):
    links = get_links_for_subject_pair(subject_a, subject_b)
    return {
        "subject_a": subject_a,
        "subject_b": subject_b,
        "link_count": len(links),
        "links": links
    }

@cross_links_router.get("/cross-links/bridge-concepts")
def fetch_bridge_concepts():
    import sqlite3
    sys.path.insert(0, MODULE1_PATH)
    from graph_db import DB_PATH

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Count appearances per slug across both columns — Python-side aggregation
    # avoids SQLite subquery column-alias ambiguity that caused 500 errors
    slug_counts: dict = {}
    for row in conn.execute("SELECT slug_a as slug FROM cross_subject_links").fetchall():
        slug_counts[row["slug"]] = slug_counts.get(row["slug"], 0) + 1
    for row in conn.execute("SELECT slug_b as slug FROM cross_subject_links").fetchall():
        slug_counts[row["slug"]] = slug_counts.get(row["slug"], 0) + 1

    # Top 10 by bridge score
    top_slugs = sorted(slug_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    bridge_concepts = []
    for slug, count in top_slugs:
        concept = conn.execute("""
            SELECT c.name, s.name as subject_name
            FROM concepts c JOIN subjects s ON s.id = c.subject_id
            WHERE c.slug = ?
        """, (slug,)).fetchone()

        linked_subjects = set()
        for lnk in get_links_for_concept(slug):
            linked_subjects.add(lnk["subject_a"])
            linked_subjects.add(lnk["subject_b"])

        subject = concept["subject_name"] if concept else "Unknown"
        linked_subjects.discard(subject)

        bridge_concepts.append({
            "slug": slug,
            "name": concept["name"] if concept else slug,
            "subject": subject,
            "bridge_score": count,
            "linked_subjects": list(linked_subjects),
        })

    conn.close()
    return {"bridge_concepts": bridge_concepts}

@cross_links_router.get("/cross-links/student/{student_id}")
def fetch_student_links(student_id: str):
    import sqlite3
    sys.path.insert(0, MODULE1_PATH)
    from graph_db import DB_PATH
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    mastery = conn.execute("""
        SELECT c.slug, m.score 
        FROM mastery m
        JOIN concepts c ON c.id = m.concept_id
        WHERE m.student_id = ?
    """, (student_id,)).fetchall()
    
    strengths = {r['slug']: r['score'] for r in mastery if r['score'] >= 0.7}
    gaps = {r['slug']: r['score'] for r in mastery if r['score'] < 0.4}
    
    strength_opportunities = []
    gap_impact = []
    
    for slug in strengths:
        links = get_links_for_concept(slug)
        for l in links:
            if l['slug_a'] == slug:
                 strength_opportunities.append({
                     "mastered_concept": slug,
                     "unlocks_in_subject": l['subject_b'],
                     "linked_concept": l['slug_b'],
                     "insight": l['insight']
                 })
            else:
                 strength_opportunities.append({
                     "mastered_concept": slug,
                     "unlocks_in_subject": l['subject_a'],
                     "linked_concept": l['slug_a'],
                     "insight": l['insight']
                 })
                 
    for slug in gaps:
        links = get_links_for_concept(slug)
        for l in links:
             if l['slug_a'] == slug:
                  gap_impact.append({
                      "gap_concept": slug,
                      "also_affects": f"{l['subject_b']} -> {l['slug_b']}",
                      "insight": l['insight']
                  })
             else:
                  gap_impact.append({
                      "gap_concept": slug,
                      "also_affects": f"{l['subject_a']} -> {l['slug_a']}",
                      "insight": l['insight']
                  })
                  
    conn.close()
    return {
        "student_id": student_id,
        "strength_opportunities": strength_opportunities,
        "gap_impact": gap_impact
    }
