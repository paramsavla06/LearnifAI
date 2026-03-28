"""
Module 2 - Quiz Store
SQLite persistence layer for quiz questions, attempts, and mastery updates.
Re-uses the SAME database (knowledge_graph.db) created by Module 1.
"""

import sqlite3
import os
import sys

# Import DB_PATH from module 1
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "module 1"))
from graph_db import DB_PATH


# ---------------------------------------------------------------------------
# Schema for Module 2 tables
# ---------------------------------------------------------------------------

QUIZ_SCHEMA = """
CREATE TABLE IF NOT EXISTS quiz_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    concept_slug    TEXT NOT NULL,
    question_text   TEXT NOT NULL,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    option_c        TEXT NOT NULL,
    option_d        TEXT NOT NULL,
    correct_option  TEXT NOT NULL CHECK(correct_option IN ('a','b','c','d')),
    difficulty      INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      TEXT NOT NULL,
    concept_slug    TEXT NOT NULL,
    question_id     INTEGER REFERENCES quiz_questions(id),
    selected_option TEXT NOT NULL,
    is_correct      INTEGER DEFAULT 0 CHECK(is_correct IN (0, 1)),
    time_taken_sec  INTEGER DEFAULT 30,
    hint_used       INTEGER DEFAULT 0 CHECK(hint_used IN (0, 1)),
    attempted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_student
    ON quiz_attempts(student_id);

CREATE INDEX IF NOT EXISTS idx_attempts_concept
    ON quiz_attempts(concept_slug);

CREATE INDEX IF NOT EXISTS idx_attempts_student_concept
    ON quiz_attempts(student_id, concept_slug);
"""


# ---------------------------------------------------------------------------
# Seed questions (3+ per concept, Mumbai University engineering level)
# ---------------------------------------------------------------------------

SEED_QUESTIONS = [
    # ===== basic-algebra =====
    {"slug": "basic-algebra", "q": "Solve for x: 3x + 7 = 22", "a": "x = 5", "b": "x = 7", "c": "x = 3", "d": "x = 15", "ans": "a", "diff": 1},
    {"slug": "basic-algebra", "q": "Factorise: x^2 - 5x + 6", "a": "(x-1)(x-6)", "b": "(x-2)(x-3)", "c": "(x+2)(x+3)", "d": "(x-1)(x+6)", "ans": "b", "diff": 1},
    {"slug": "basic-algebra", "q": "If log(x) = 2, what is x (base 10)?", "a": "20", "b": "2", "c": "100", "d": "1000", "ans": "c", "diff": 2},
    {"slug": "basic-algebra", "q": "Simplify: (a^3 * a^4) / a^2", "a": "a^5", "b": "a^9", "c": "a^6", "d": "a^7", "ans": "a", "diff": 1},

    # ===== ohms-law =====
    {"slug": "ohms-law", "q": "A 10-ohm resistor carries 2A current. What is the voltage across it?", "a": "5V", "b": "20V", "c": "12V", "d": "0.2V", "ans": "b", "diff": 1},
    {"slug": "ohms-law", "q": "If V = 12V and I = 3A, what is the resistance?", "a": "36 ohm", "b": "4 ohm", "c": "15 ohm", "d": "9 ohm", "ans": "b", "diff": 1},
    {"slug": "ohms-law", "q": "Which quantity does Ohm's law NOT directly relate?", "a": "Voltage", "b": "Current", "c": "Power", "d": "Resistance", "ans": "c", "diff": 1},
    {"slug": "ohms-law", "q": "A conductor has resistance 5 ohm and voltage 25V across it. Find the current.", "a": "125A", "b": "5A", "c": "0.2A", "d": "30A", "ans": "b", "diff": 1},

    # ===== kirchhoffs-laws =====
    {"slug": "kirchhoffs-laws", "q": "KCL states that the algebraic sum of currents at a node is:", "a": "Maximum", "b": "Minimum", "c": "Zero", "d": "Infinity", "ans": "c", "diff": 2},
    {"slug": "kirchhoffs-laws", "q": "KVL is based on conservation of:", "a": "Charge", "b": "Energy", "c": "Mass", "d": "Momentum", "ans": "b", "diff": 2},
    {"slug": "kirchhoffs-laws", "q": "In a closed loop, the sum of all voltage drops and rises equals:", "a": "Supply voltage", "b": "1", "c": "Zero", "d": "Infinity", "ans": "c", "diff": 2},
    {"slug": "kirchhoffs-laws", "q": "How many KCL equations can be written for a circuit with N nodes?", "a": "N", "b": "N-1", "c": "N+1", "d": "2N", "ans": "b", "diff": 2},

    # ===== dc-circuit-analysis =====
    {"slug": "dc-circuit-analysis", "q": "Two 10-ohm resistors in parallel give an equivalent resistance of:", "a": "20 ohm", "b": "10 ohm", "c": "5 ohm", "d": "100 ohm", "ans": "c", "diff": 2},
    {"slug": "dc-circuit-analysis", "q": "In a series circuit, which quantity remains the same across all components?", "a": "Voltage", "b": "Current", "c": "Resistance", "d": "Power", "ans": "b", "diff": 2},
    {"slug": "dc-circuit-analysis", "q": "Thevenin's theorem replaces a complex network with:", "a": "Current source and parallel resistance", "b": "Voltage source and series resistance", "c": "Two voltage sources", "d": "Ideal wire", "ans": "b", "diff": 3},

    # ===== differential-calculus =====
    {"slug": "differential-calculus", "q": "d/dx (x^3) = ?", "a": "x^2", "b": "3x^2", "c": "3x^3", "d": "x^4/4", "ans": "b", "diff": 2},
    {"slug": "differential-calculus", "q": "The derivative of sin(x) is:", "a": "-cos(x)", "b": "cos(x)", "c": "tan(x)", "d": "sin(x)", "ans": "b", "diff": 2},
    {"slug": "differential-calculus", "q": "If f(x) = e^(2x), then f'(x) = ?", "a": "e^(2x)", "b": "2e^(2x)", "c": "2e^x", "d": "e^(x+2)", "ans": "b", "diff": 3},
    {"slug": "differential-calculus", "q": "The derivative of ln(x) is:", "a": "x", "b": "1/x^2", "c": "1/x", "d": "e^x", "ans": "c", "diff": 2},

    # ===== probability-statistics =====
    {"slug": "probability-statistics", "q": "If P(A) = 0.3 and P(B) = 0.5 and A, B are independent, P(A and B) = ?", "a": "0.80", "b": "0.15", "c": "0.20", "d": "0.35", "ans": "b", "diff": 2},
    {"slug": "probability-statistics", "q": "The mean of {2, 4, 6, 8, 10} is:", "a": "5", "b": "6", "c": "7", "d": "8", "ans": "b", "diff": 1},
    {"slug": "probability-statistics", "q": "Standard deviation measures:", "a": "Central tendency", "b": "Spread of data", "c": "Skewness", "d": "Kurtosis", "ans": "b", "diff": 2},
    {"slug": "probability-statistics", "q": "For a normal distribution, approximately what % of data lies within 1 standard deviation of the mean?", "a": "50%", "b": "68%", "c": "95%", "d": "99.7%", "ans": "b", "diff": 3},

    # ===== linear-algebra =====
    {"slug": "linear-algebra", "q": "The rank of a 3x3 identity matrix is:", "a": "0", "b": "1", "c": "2", "d": "3", "ans": "d", "diff": 2},
    {"slug": "linear-algebra", "q": "If A is a 2x3 matrix and B is a 3x4 matrix, the product AB has dimensions:", "a": "2x4", "b": "3x3", "c": "2x3", "d": "3x4", "ans": "a", "diff": 2},
    {"slug": "linear-algebra", "q": "The eigenvalues of a diagonal matrix are:", "a": "All zeros", "b": "All ones", "c": "The diagonal entries", "d": "The off-diagonal entries", "ans": "c", "diff": 3},
    {"slug": "linear-algebra", "q": "A matrix A is singular if:", "a": "det(A) = 1", "b": "det(A) = 0", "c": "A is symmetric", "d": "A is diagonal", "ans": "b", "diff": 2},

    # ===== python-programming =====
    {"slug": "python-programming", "q": "What is the output of: print(type([]))?", "a": "<class 'tuple'>", "b": "<class 'list'>", "c": "<class 'dict'>", "d": "<class 'set'>", "ans": "b", "diff": 1},
    {"slug": "python-programming", "q": "Which keyword is used to define a function in Python?", "a": "func", "b": "define", "c": "def", "d": "function", "ans": "c", "diff": 1},
    {"slug": "python-programming", "q": "What does 'len([1,2,3])' return?", "a": "1", "b": "2", "c": "3", "d": "Error", "ans": "c", "diff": 1},
    {"slug": "python-programming", "q": "Which of the following is immutable in Python?", "a": "list", "b": "dict", "c": "set", "d": "tuple", "ans": "d", "diff": 1},

    # ===== ml-fundamentals =====
    {"slug": "ml-fundamentals", "q": "Which of the following is a supervised learning algorithm?", "a": "K-Means", "b": "PCA", "c": "Random Forest", "d": "DBSCAN", "ans": "c", "diff": 3},
    {"slug": "ml-fundamentals", "q": "Overfitting occurs when:", "a": "Model performs well on training and test data", "b": "Model performs well on training but poorly on test data", "c": "Model performs poorly on all data", "d": "Model has too few parameters", "ans": "b", "diff": 3},
    {"slug": "ml-fundamentals", "q": "The bias-variance tradeoff refers to:", "a": "Balancing speed and accuracy", "b": "Balancing underfitting and overfitting", "c": "Choosing learning rate", "d": "Selecting features", "ans": "b", "diff": 3},
    {"slug": "ml-fundamentals", "q": "Cross-validation is primarily used to:", "a": "Train the model faster", "b": "Reduce dataset size", "c": "Estimate model generalisation performance", "d": "Increase training accuracy", "ans": "c", "diff": 3},

    # ===== operating-systems =====
    {"slug": "operating-systems", "q": "Which scheduling algorithm can cause starvation?", "a": "FCFS", "b": "Round Robin", "c": "SJF (non-preemptive)", "d": "FIFO", "ans": "c", "diff": 3},
    {"slug": "operating-systems", "q": "A deadlock requires all of the following conditions EXCEPT:", "a": "Mutual exclusion", "b": "Hold and wait", "c": "Preemption", "d": "Circular wait", "ans": "c", "diff": 3},
    {"slug": "operating-systems", "q": "Virtual memory uses which hardware support?", "a": "Cache", "b": "MMU (Memory Management Unit)", "c": "ALU", "d": "GPU", "ans": "b", "diff": 3},

    # ===== strength-of-materials =====
    {"slug": "strength-of-materials", "q": "Stress is defined as:", "a": "Force x Area", "b": "Force / Area", "c": "Force / Length", "d": "Force x Length", "ans": "b", "diff": 2},
    {"slug": "strength-of-materials", "q": "Young's modulus is the ratio of:", "a": "Shear stress to shear strain", "b": "Lateral strain to longitudinal strain", "c": "Longitudinal stress to longitudinal strain", "d": "Volumetric stress to volumetric strain", "ans": "c", "diff": 2},
    {"slug": "strength-of-materials", "q": "Poisson's ratio is the ratio of:", "a": "Longitudinal strain to lateral strain", "b": "Lateral strain to longitudinal strain", "c": "Stress to strain", "d": "Shear stress to normal stress", "ans": "b", "diff": 3},

    # ===== thermodynamics =====
    {"slug": "thermodynamics", "q": "The first law of thermodynamics is essentially the law of:", "a": "Conservation of mass", "b": "Conservation of energy", "c": "Conservation of momentum", "d": "Entropy", "ans": "b", "diff": 2},
    {"slug": "thermodynamics", "q": "In an isothermal process:", "a": "Pressure is constant", "b": "Volume is constant", "c": "Temperature is constant", "d": "Entropy is constant", "ans": "c", "diff": 2},
    {"slug": "thermodynamics", "q": "The efficiency of a Carnot engine operating between 500K and 300K is:", "a": "20%", "b": "40%", "c": "60%", "d": "80%", "ans": "b", "diff": 3},
    {"slug": "thermodynamics", "q": "Entropy of an isolated system:", "a": "Always decreases", "b": "Remains constant or increases", "c": "Always remains constant", "d": "Can decrease or increase", "ans": "b", "diff": 3},

    # ===== control-systems =====
    {"slug": "control-systems", "q": "The transfer function of a system is the ratio of:", "a": "Input to output in time domain", "b": "Laplace transform of output to input (zero initial conditions)", "c": "Output to input in frequency domain only", "d": "Steady state output to input", "ans": "b", "diff": 3},
    {"slug": "control-systems", "q": "A system is stable if all poles of its transfer function lie in the:", "a": "Right half of s-plane", "b": "Left half of s-plane", "c": "On the imaginary axis", "d": "At the origin", "ans": "b", "diff": 3},
    {"slug": "control-systems", "q": "The Routh-Hurwitz criterion is used to determine:", "a": "Gain margin", "b": "Phase margin", "c": "Stability without finding roots", "d": "Steady state error", "ans": "c", "diff": 4},
]


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_quiz_schema(seed_questions: bool = True):
    """Create quiz tables and optionally seed questions."""
    conn = _get_conn()
    conn.executescript(QUIZ_SCHEMA)
    conn.commit()

    if seed_questions:
        cur = conn.cursor()
        for q in SEED_QUESTIONS:
            cur.execute("""
                INSERT OR IGNORE INTO quiz_questions
                    (concept_slug, question_text, option_a, option_b,
                     option_c, option_d, correct_option, difficulty)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (q["slug"], q["q"], q["a"], q["b"],
                  q["c"], q["d"], q["ans"], q["diff"]))
        conn.commit()
        count = cur.execute("SELECT COUNT(*) FROM quiz_questions").fetchone()[0]
        print(f"    Quiz questions seeded: {count} total")

    conn.close()


def get_questions_for_concept(slug: str, limit: int = 3) -> list:
    """Return up to `limit` questions for a single concept."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM quiz_questions WHERE concept_slug=? LIMIT ?",
        (slug, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_questions_for_concepts(slugs: list, per_concept: int = 3) -> list:
    """Batch-fetch questions for multiple concepts."""
    all_qs = []
    for slug in slugs:
        all_qs.extend(get_questions_for_concept(slug, per_concept))
    return all_qs


def save_attempt(student_id: str, concept_slug: str, question_id: int,
                 selected_option: str, is_correct: bool,
                 time_taken_sec: int = 30, hint_used: bool = False) -> int:
    """Save a quiz attempt and return the row id."""
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO quiz_attempts
            (student_id, concept_slug, question_id, selected_option,
             is_correct, time_taken_sec, hint_used)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (student_id, concept_slug, question_id, selected_option,
          1 if is_correct else 0, time_taken_sec, 1 if hint_used else 0))
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_attempts(student_id: str, concept_slug: str = None) -> list:
    """
    Retrieve all attempts for a student, optionally filtered by concept.
    Ordered by attempted_at ascending so BKT processes in chronological order.
    """
    conn = _get_conn()
    if concept_slug:
        rows = conn.execute(
            """SELECT * FROM quiz_attempts
               WHERE student_id=? AND concept_slug=?
               ORDER BY attempted_at ASC""",
            (student_id, concept_slug)
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT * FROM quiz_attempts
               WHERE student_id=?
               ORDER BY attempted_at ASC""",
            (student_id,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def upsert_mastery(student_id: str, concept_slug: str, score: float) -> bool:
    """
    Write mastery score to the EXISTING mastery table from module 1.
    Looks up concept id via slug, then does INSERT OR REPLACE.
    Returns True on success, False if slug not found.
    """
    conn = _get_conn()
    cur = conn.cursor()

    row = cur.execute(
        "SELECT id FROM concepts WHERE slug=?", (concept_slug,)
    ).fetchone()

    if not row:
        conn.close()
        return False

    concept_id = row["id"]

    # Use INSERT OR REPLACE on the UNIQUE(student_id, concept_id) constraint
    # We need to handle the id column since it's autoincrement
    existing = cur.execute(
        "SELECT id FROM mastery WHERE student_id=? AND concept_id=?",
        (student_id, concept_id)
    ).fetchone()

    if existing:
        cur.execute(
            """UPDATE mastery SET score=?, updated_at=CURRENT_TIMESTAMP
               WHERE student_id=? AND concept_id=?""",
            (score, student_id, concept_id)
        )
    else:
        cur.execute(
            """INSERT INTO mastery (student_id, concept_id, score)
               VALUES (?, ?, ?)""",
            (student_id, concept_id, score)
        )

    conn.commit()
    conn.close()
    return True


def get_all_mastery(student_id: str) -> list:
    """
    Join mastery + concepts + subjects.
    Returns slug, name, difficulty, semester, subject, score, updated_at.
    """
    conn = _get_conn()
    rows = conn.execute("""
        SELECT c.slug, c.name, c.difficulty, c.semester,
               s.name AS subject, m.score, m.updated_at
        FROM mastery m
        JOIN concepts c ON c.id = m.concept_id
        JOIN subjects s ON s.id = c.subject_id
        WHERE m.student_id = ?
        ORDER BY s.name, c.name
    """, (student_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]
