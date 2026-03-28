"""
EdTech Smart Solutions - Main App
Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys, os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# --- Module 1 imports ---
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "module 1"))
from graph_db import build_database, DB_PATH
from api import graph_router

# --- Module 2 imports ---
sys.path.insert(0, os.path.join(ROOT_DIR, "module 2"))
from quiz_store import init_quiz_schema
from mastery_api import mastery_router

# --- Module 3 imports ---
sys.path.insert(0, os.path.join(ROOT_DIR, "module 3"))
from tracer_api import tracer_router

# --- Module 4 imports ---
sys.path.insert(0, os.path.join(ROOT_DIR, "module 4"))
from narrator_api import narrator_router

# --- Module 5 imports ---
sys.path.insert(0, os.path.join(ROOT_DIR, "module 5"))
from cross_links import init_cross_links_schema
from cross_links_api import cross_links_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Module 1: build knowledge graph DB if not present
    if not os.path.exists(DB_PATH):
        print("[startup] Building database...")
        build_database(reset=True)
    else:
        print("[startup] Database already exists, skipping seed.")

    # Module 2: initialise quiz tables + seed questions
    print("[startup] Initialising quiz schema (Module 1/2)...")
    init_quiz_schema(seed_questions=True)

    # Module 5: initialise cross-subject links
    print("[startup] Initialising cross-subject links (Module 5)...")
    init_cross_links_schema(seed=True)

    yield


app = FastAPI(
    title="LearnifAI API",
    description="Knowledge Graph + BKT Mastery + Root Cause Tracer + LLM Narration + Cross-Linking",
    version="5.0.0",
    lifespan=lifespan,
)

# Allow all origins during hackathon dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrations
app.include_router(graph_router, prefix="/api")
app.include_router(mastery_router, prefix="/api")
app.include_router(tracer_router, prefix="/api")
app.include_router(narrator_router, prefix="/api")
app.include_router(cross_links_router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "ok",
        "version": "5.0.0",
        "modules": [
            "Module 1: Concept Knowledge Graph",
            "Module 2: Mastery Estimator (BKT)",
            "Module 3: Root Cause Tracer",
            "Module 4: LLM Narration (Gemini)",
            "Module 5: Cross-Subject Linking"
        ],
        "docs": "/docs",
    }
