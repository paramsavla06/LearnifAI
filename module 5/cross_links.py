"""
Module 5 - Cross-Subject Concept Linking
Maps concepts that appear across multiple subjects.
Extends the existing knowledge_graph.db with cross-subject links.
"""

import sqlite3
import os
import sys
from typing import List, Dict

# Path to DB from module 1
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "module 1"))
from graph_db import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS cross_subject_links (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug_a          TEXT NOT NULL,
    slug_b          TEXT NOT NULL,
    relationship    TEXT NOT NULL,
    description     TEXT NOT NULL,
    insight         TEXT,
    UNIQUE(slug_a, slug_b)
);
"""

SEED_LINKS = [
    ("trigonometry", "phasor-analysis", "applied_as", 
     "Trigonometric identities are directly used to represent sinusoidal voltages and currents as phasors in AC circuit analysis.",
     "sin/cos from maths class IS the voltage waveform in electronics."),
    ("complex-numbers", "phasor-analysis", "applied_as",
     "Complex number arithmetic (real + imaginary) is the mathematical foundation of phasor representation (magnitude + phase angle).",
     "j = √-1 in maths becomes the 90° phase shift in AC circuits."),
    ("complex-numbers", "control-systems", "applied_as",
     "Pole-zero analysis in control systems uses complex numbers to determine system stability via the s-plane.",
     "The imaginary axis in complex numbers IS the stability boundary in control systems."),
    ("laplace-transform", "signals-systems", "applied_as",
     "The Laplace transform converts differential equations describing circuits/signals into algebraic equations in the s-domain.",
     "Laplace is just maths making circuit analysis algebraically solvable."),
    ("laplace-transform", "control-systems", "applied_as",
     "Transfer functions — the core of control system design — are derived using the Laplace transform of system differential equations.",
     "Every transfer function G(s) you write in control systems comes from Laplace."),
    ("fourier-series", "signals-systems", "applied_as",
     "Fourier series decompose periodic signals into frequency components, which is the mathematical basis of signal spectrum analysis.",
     "Fourier series IS how we break any signal into sine waves."),
    ("fourier-series", "communication-systems", "applied_as",
     "Bandwidth, modulation, and frequency-domain signal representation in communication systems all rely directly on Fourier analysis.",
     "AM/FM radio works because of Fourier — signals in frequency domain."),
    ("differential-calculus", "signals-systems", "applied_as",
     "Differentiation describes how signals change over time; the derivative operator appears directly in circuit equations (V = L·dI/dt).",
     "dI/dt in inductors and dV/dt in capacitors IS calculus in circuits."),
    ("ode", "control-systems", "applied_as",
     "System dynamics in control engineering are modelled as ordinary differential equations; the transfer function is their Laplace transform.",
     "The system differential equation IS what the transfer function encodes."),
    ("linear-algebra", "ml-fundamentals", "applied_as",
     "Matrices represent datasets; vectors represent data points; matrix operations (dot product, transpose, inverse) power every ML algorithm.",
     "Training a neural network IS just millions of matrix multiplications."),
    ("linear-algebra", "finite-element-analysis", "applied_as",
     "FEA assembles global stiffness matrices from element matrices; solving the FEA system is solving a large linear system [K]{u}={F}.",
     "FEA IS applied linear algebra — the stiffness matrix is your coefficient matrix."),
    ("probability-statistics", "ml-fundamentals", "applied_as",
     "Probability theory underpins loss functions, Bayesian classifiers, regularisation, and the entire probabilistic interpretation of ML models.",
     "Every ML model is really a probability distribution in disguise."),
    ("probability-statistics", "communication-systems", "applied_as",
     "Noise modelling, channel capacity (Shannon's theorem), and error probability in digital communication all use probability theory.",
     "SNR and BER — the key metrics of any communication system — are pure probability."),
    ("vector-calculus", "electromagnetic-fields", "applied_as",
     "Maxwell's equations — which govern all electromagnetic phenomena — are written entirely in vector calculus (divergence, curl, gradient).",
     "∇×E = -∂B/∂t IS vector calculus. Maxwell IS vector calculus."),
    ("fluid-mechanics", "mech-fluid-mechanics", "same_concept",
     "Both subjects cover identical core fluid mechanics principles (continuity, Bernoulli, momentum equations) applied to their respective domains.",
     "The Bernoulli equation you learn in Civil is the same one used to design pumps in Mechanical."),
    ("engineering-mechanics", "mech-engg-mechanics", "same_concept",
     "Statics and dynamics principles are identical across Civil and Mechanical engineering — only the application context differs.",
     "Free body diagrams work the same whether you're analysing a bridge or an engine."),
    ("strength-of-materials", "machine-design", "applied_as",
     "Stress, strain, bending moment, and factor of safety concepts from Strength of Materials are directly used to design machine components.",
     "When you calculate shaft diameter in Machine Design, you're using SOM formulas."),
    ("dc-circuit-analysis", "basic-electrical-engg", "same_concept",
     "DC circuit analysis methods (mesh, nodal, Thevenin) taught in Electronics are the same methods used in Electrical Engineering.",
     "Thevenin's theorem is Thevenin's theorem — same formula, same circuit, both branches."),
    ("digital-logic", "plc-automation", "applied_as",
     "Boolean logic gates, flip-flops, and combinational logic from digital design are the foundation of PLC ladder logic programming.",
     "A PLC rung IS a digital logic gate implemented in industrial hardware."),
    ("microcontrollers", "mechatronics", "applied_as",
     "Mechatronics integrates mechanical systems with microcontroller-based control; the embedded programming skills from Electronics apply directly.",
     "The Arduino/ARM code you write in Electronics IS what controls robots in Mechatronics."),
    ("optimization-techniques", "ml-fundamentals", "applied_as",
     "Gradient descent and other numerical optimisation methods from Operations Research are the core training algorithms of ML models.",
     "Backpropagation IS gradient descent — the same algorithm from your Maths OR class."),
    ("graph-theory", "dsa", "applied_as",
     "Graph traversal algorithms (BFS, DFS, Dijkstra) taught in graph theory are core data structure algorithms in Computer Science.",
     "BFS/DFS in graph theory and BFS/DFS in DSA are literally the same algorithm."),
    ("numerical-methods", "finite-element-analysis", "applied_as",
     "FEA solvers use numerical methods — Gaussian elimination, iterative solvers, numerical integration — to solve the assembled system.",
     "FEA without numerical methods is just a matrix you can't solve."),
    ("thermodynamics", "refrigeration-ac", "extends",
     "Refrigeration and air conditioning systems are direct applications of thermodynamic cycles (reversed Carnot, vapour compression).",
     "A fridge IS a heat engine running in reverse — pure thermodynamics.")
]

def _get_conn():
   conn = sqlite3.connect(DB_PATH)
   conn.row_factory = sqlite3.Row
   return conn

def init_cross_links_schema(seed=True):
    conn = _get_conn()
    conn.execute(SCHEMA)
    conn.commit()
    
    if seed:
        cur = conn.cursor()
        for s_a, s_b, rel, desc, ins in SEED_LINKS:
             cur.execute("""
                 INSERT OR IGNORE INTO cross_subject_links (slug_a, slug_b, relationship, description, insight)
                 VALUES (?, ?, ?, ?, ?)
             """, (s_a, s_b, rel, desc, ins))
        conn.commit()
        count = cur.execute("SELECT COUNT(*) FROM cross_subject_links").fetchone()[0]
        print(f"    Cross-subject links initialized: {count}")
    conn.close()

def get_links_for_concept(slug: str) -> List[dict]:
    conn = _get_conn()
    # Join twice to get metadata for both slugs
    rows = conn.execute("""
        SELECT 
            cs.slug_a, c1.name AS name_a, s1.name AS subject_a,
            cs.slug_b, c2.name AS name_b, s2.name AS subject_b,
            cs.relationship, cs.description, cs.insight
        FROM cross_subject_links cs
        JOIN concepts c1 ON c1.slug = cs.slug_a
        JOIN subjects s1 ON s1.id = c1.subject_id
        JOIN concepts c2 ON c2.slug = cs.slug_b
        JOIN subjects s2 ON s2.id = c2.subject_id
        WHERE cs.slug_a=? OR cs.slug_b=?
    """, (slug, slug)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all_links() -> List[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT 
            cs.slug_a, c1.name AS name_a, s1.name AS subject_a,
            cs.slug_b, c2.name AS name_b, s2.name AS subject_b,
            cs.relationship, cs.description, cs.insight
        FROM cross_subject_links cs
        JOIN concepts c1 ON c1.slug = cs.slug_a
        JOIN subjects s1 ON s1.id = c1.subject_id
        JOIN concepts c2 ON c2.slug = cs.slug_b
        JOIN subjects s2 ON s2.id = c2.subject_id
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_links_for_subject_pair(subject_a: str, subject_b: str) -> List[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT 
            cs.slug_a, c1.name AS name_a, s1.name AS subject_a,
            cs.slug_b, c2.name AS name_b, s2.name AS subject_b,
            cs.relationship, cs.description, cs.insight
        FROM cross_subject_links cs
        JOIN concepts c1 ON c1.slug = cs.slug_a
        JOIN subjects s1 ON s1.id = c1.subject_id
        JOIN concepts c2 ON c2.slug = cs.slug_b
        JOIN subjects s2 ON s2.id = c2.subject_id
        WHERE (s1.name=? AND s2.name=?) OR (s1.name=? AND s2.name=?)
    """, (subject_a, subject_b, subject_b, subject_a)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_concept_bridge_score(slug: str) -> int:
    conn = _get_conn()
    count = conn.execute(
        "SELECT COUNT(*) FROM cross_subject_links WHERE slug_a=? OR slug_b=?", 
        (slug, slug)
    ).fetchone()[0]
    conn.close()
    return count
