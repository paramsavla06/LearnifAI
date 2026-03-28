-- =============================================
-- LearnifAI Supabase Setup Guide
-- =============================================
-- STEP 1: Go to your Supabase project → SQL Editor
-- STEP 2: Paste this entire file and click RUN
-- STEP 3: After tables are created, run: npm run seed
-- =============================================

-- Enable UUID extension (usually on by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- DROP existing tables (safe re-run)
-- =============================================
DROP TABLE IF EXISTS concept_book_map  CASCADE;
DROP TABLE IF EXISTS book_sections     CASCADE;
DROP TABLE IF EXISTS books             CASCADE;
DROP TABLE IF EXISTS user_answers      CASCADE;
DROP TABLE IF EXISTS test_attempts     CASCADE;
DROP TABLE IF EXISTS results           CASCADE;
DROP TABLE IF EXISTS questions         CASCADE;
DROP TABLE IF EXISTS concept_prerequisites CASCADE;
DROP TABLE IF EXISTS concepts          CASCADE;
DROP TABLE IF EXISTS subjects          CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

-- =============================================
-- TABLES
-- =============================================

-- Users (student profiles — collected in Test 1)
CREATE TABLE users (
    id           TEXT PRIMARY KEY,           -- roll number or generated id
    name         TEXT NOT NULL,
    roll_no      TEXT,
    email        TEXT,
    year         TEXT,                       -- FE / SE / TE / BE
    branch       TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    description  TEXT,
    branch       TEXT
);

-- Concepts / Topics
CREATE TABLE concepts (
    slug             TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    subject_id       INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    difficulty       INTEGER DEFAULT 2,
    semester         TEXT,
    library_section  TEXT,
    shelf            TEXT,
    book_title       TEXT,
    book_isbn        TEXT
);

-- Concept prerequisites (knowledge graph edges)
CREATE TABLE concept_prerequisites (
    concept_slug     TEXT REFERENCES concepts(slug) ON DELETE CASCADE,
    prereq_slug      TEXT REFERENCES concepts(slug) ON DELETE CASCADE,
    PRIMARY KEY (concept_slug, prereq_slug)
);

-- Questions (MCQ bank)
CREATE TABLE questions (
    id               SERIAL PRIMARY KEY,
    concept_slug     TEXT REFERENCES concepts(slug) ON DELETE CASCADE,
    question_text    TEXT NOT NULL,
    option_a         TEXT NOT NULL,
    option_b         TEXT NOT NULL,
    option_c         TEXT NOT NULL,
    option_d         TEXT NOT NULL,
    correct_option   CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
    difficulty       INTEGER DEFAULT 2
);

-- Test attempts
CREATE TABLE test_attempts (
    id               SERIAL PRIMARY KEY,
    user_id          TEXT REFERENCES users(id) ON DELETE CASCADE,
    test_type        TEXT CHECK (test_type IN ('subject','deep_diagnostic','profile')),
    started_at       TIMESTAMPTZ DEFAULT NOW(),
    submitted_at     TIMESTAMPTZ
);

-- Individual answers per attempt
CREATE TABLE user_answers (
    id               SERIAL PRIMARY KEY,
    attempt_id       INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
    concept_slug     TEXT REFERENCES concepts(slug),
    question_id      INTEGER REFERENCES questions(id),
    selected_option  CHAR(1),
    is_correct       BOOLEAN,
    answered_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnostic results
CREATE TABLE results (
    id               SERIAL PRIMARY KEY,
    user_id          TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    weak_topics      JSONB,
    strong_topics    JSONB,
    mastery_pct      INTEGER,
    analysis_text    TEXT,
    generated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Books
CREATE TABLE books (
    id               SERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    author           TEXT,
    subject_id       INTEGER REFERENCES subjects(id)
);

-- Book chapter sections
CREATE TABLE book_sections (
    id               SERIAL PRIMARY KEY,
    book_id          INTEGER REFERENCES books(id) ON DELETE CASCADE,
    section_label    TEXT
);

-- Concept → Book mapping
CREATE TABLE concept_book_map (
    concept_slug     TEXT REFERENCES concepts(slug) ON DELETE CASCADE,
    book_id          INTEGER REFERENCES books(id) ON DELETE CASCADE,
    PRIMARY KEY (concept_slug, book_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_concepts_subject ON concepts(subject_id);
CREATE INDEX idx_questions_slug   ON questions(concept_slug);
CREATE INDEX idx_answers_attempt  ON user_answers(attempt_id);
CREATE INDEX idx_results_user     ON results(user_id);
CREATE INDEX idx_attempts_user    ON test_attempts(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Allows anon key to read/write all tables
-- =============================================
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE books           ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_sections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_book_map ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon role (development mode)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','subjects','concepts','questions','test_attempts','user_answers','results','books','book_sections','concept_book_map','concept_prerequisites'])
  LOOP
    EXECUTE 'CREATE POLICY allow_all_' || t || ' ON ' || t || ' FOR ALL TO anon USING (true) WITH CHECK (true)';
  END LOOP;
END $$;
