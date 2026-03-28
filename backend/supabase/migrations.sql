-- ============================================================
-- LearnifAI — Knowledge Graph Migrations
-- Run in: Supabase → SQL Editor → Paste → RUN
-- These are NON-DESTRUCTIVE — no existing tables are dropped.
-- ============================================================

-- 1. Add test_level column to questions (surface = normal test, root = prereq test)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS test_level TEXT
    CHECK (test_level IN ('surface', 'root'))
    DEFAULT 'surface';

-- 2. Fix test_attempts.test_type constraint to include 'diagnostic','surface','root'
ALTER TABLE test_attempts
  DROP CONSTRAINT IF EXISTS test_attempts_test_type_check;
ALTER TABLE test_attempts
  ADD CONSTRAINT test_attempts_test_type_check
    CHECK (test_type IN ('subject','deep_diagnostic','profile','diagnostic','surface','root'));

-- 3. Create concept_performance table (per-student per-concept running accuracy)
CREATE TABLE IF NOT EXISTS concept_performance (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  concept_slug TEXT REFERENCES concepts(slug) ON DELETE CASCADE,
  attempts    INTEGER DEFAULT 0,
  correct     INTEGER DEFAULT 0,
  accuracy    FLOAT   DEFAULT 0,
  test_type   TEXT CHECK (test_type IN ('surface', 'root')),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, concept_slug)
);

-- 4. Create concept_similarity table (cross-subject similarity edges)
CREATE TABLE IF NOT EXISTS concept_similarity (
  concept_a TEXT REFERENCES concepts(slug) ON DELETE CASCADE,
  concept_b TEXT REFERENCES concepts(slug) ON DELETE CASCADE,
  weight    FLOAT CHECK (weight >= 0 AND weight <= 1),
  PRIMARY KEY (concept_a, concept_b)
);

-- 5. Create user_graph table (persisted per-student graph)
CREATE TABLE IF NOT EXISTS user_graph (
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  nodes      JSONB NOT NULL DEFAULT '[]',
  edges      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS for new tables
ALTER TABLE concept_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_similarity  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_graph          ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='concept_performance' AND policyname='allow_all_concept_performance') THEN
    CREATE POLICY allow_all_concept_performance ON concept_performance FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='concept_similarity' AND policyname='allow_all_concept_similarity') THEN
    CREATE POLICY allow_all_concept_similarity ON concept_similarity FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_graph' AND policyname='allow_all_user_graph') THEN
    CREATE POLICY allow_all_user_graph ON user_graph FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_concept_perf_user   ON concept_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_perf_slug   ON concept_performance(concept_slug);
CREATE INDEX IF NOT EXISTS idx_similarity_a        ON concept_similarity(concept_a);
CREATE INDEX IF NOT EXISTS idx_similarity_b        ON concept_similarity(concept_b);
CREATE INDEX IF NOT EXISTS idx_user_graph          ON user_graph(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_level     ON questions(test_level);
