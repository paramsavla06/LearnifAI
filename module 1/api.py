"""
Module 1 — FastAPI Router
Exposes the concept graph to the D3.js frontend and other modules.
Mount this in your main FastAPI app with:
    app.include_router(graph_router, prefix="/api")
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import sqlite3
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from graph_db import export_d3_graph, DB_PATH

graph_router = APIRouter(tags=["Concept Graph"])


# ── GET /api/graph ────────────────────────────────────────────
@graph_router.get("/graph")
def get_graph(student_id: str = Query(default=None, description="Include mastery scores for this student")):
    """
    Returns full concept graph in D3-compatible format.
    {
      nodes: [ { id, name, subject, difficulty, mastery, library_section, shelf_number, book_title } ],
      links: [ { source, target, strength } ]
    }
    mastery is -1 if student not assessed yet, 0.0–1.0 otherwise.
    """
    return export_d3_graph(student_id=student_id)


# ── GET /api/concept/{slug} ───────────────────────────────────
@graph_router.get("/concept/{slug}")
def get_concept(slug: str, student_id: str = Query(default=None)):
    """
    Returns a single concept with its prerequisites and dependents.
    Used by the library UI to show book + shelf info on click.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    concept = cur.execute("""
        SELECT c.*, s.name AS subject
        FROM concepts c JOIN subjects s ON s.id=c.subject_id
        WHERE c.slug=?
    """, (slug,)).fetchone()

    if not concept:
        raise HTTPException(status_code=404, detail=f"Concept '{slug}' not found")

    concept = dict(concept)

    # Mastery score
    if student_id:
        row = cur.execute(
            "SELECT score FROM mastery WHERE student_id=? AND concept_id=?",
            (student_id, concept["id"])
        ).fetchone()
        concept["mastery"] = row["score"] if row else -1

    # Prerequisites (what to study before this)
    prereqs = cur.execute("""
        SELECT c.slug, c.name, p.strength
        FROM prerequisites p
        JOIN concepts c ON c.id = p.prerequisite_id
        WHERE p.concept_id=?
    """, (concept["id"],)).fetchall()
    concept["prerequisites"] = [dict(r) for r in prereqs]

    # Dependents (what this unlocks)
    dependents = cur.execute("""
        SELECT c.slug, c.name, p.strength
        FROM prerequisites p
        JOIN concepts c ON c.id = p.concept_id
        WHERE p.prerequisite_id=?
    """, (concept["id"],)).fetchall()
    concept["unlocks"] = [dict(r) for r in dependents]

    conn.close()
    return concept


# ── GET /api/subjects ─────────────────────────────────────────
@graph_router.get("/subjects")
def get_subjects():
    """Returns all subjects and their concept counts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT s.id, s.name, s.description, COUNT(c.id) AS concept_count
        FROM subjects s
        LEFT JOIN concepts c ON c.subject_id=s.id
        GROUP BY s.id
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── GET /api/library/navigate ─────────────────────────────────
@graph_router.get("/library/navigate")
def navigate_library(student_id: str = Query(..., description="Student ID for gap-based navigation")):
    """
    Core library navigation endpoint.
    Returns concepts grouped by section → shelf,
    with mastery scores and gap flags for the UI to highlight.
    Used by the shelf/section navigation UI.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    concepts = cur.execute("""
        SELECT c.slug, c.name, c.difficulty,
               c.library_section, c.shelf_number, c.book_title, c.book_isbn,
               s.name AS subject,
               COALESCE(m.score, -1) AS mastery
        FROM concepts c
        JOIN subjects s ON s.id=c.subject_id
        LEFT JOIN mastery m ON m.concept_id=c.id AND m.student_id=?
        ORDER BY c.library_section, c.shelf_number, c.difficulty
    """, (student_id,)).fetchall()

    # Group by section → shelf
    nav = {}
    for c in concepts:
        section = c["library_section"] or "Uncategorised"
        shelf   = c["shelf_number"]    or "Shelf 1"
        nav.setdefault(section, {}).setdefault(shelf, []).append({
            "slug":       c["slug"],
            "name":       c["name"],
            "subject":    c["subject"],
            "difficulty": c["difficulty"],
            "book_title": c["book_title"],
            "book_isbn":  c["book_isbn"],
            "mastery":    c["mastery"],
            # gap = never assessed OR mastery below threshold
            "is_gap":     c["mastery"] != -1 and c["mastery"] < 0.4,
            "not_assessed": c["mastery"] == -1,
        })

    conn.close()
    return {"student_id": student_id, "library": nav}
