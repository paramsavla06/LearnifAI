/**
 * LearnifAI API — Main Server (Node.js / Express)
 * Modules:
 *   1. Concept Knowledge Graph
 *   2. Mastery Estimator (BKT)
 *   3. Root Cause Tracer
 *   4. LLM Narration (Gemini)
 *   5. Cross-Subject Linking
 *
 * Run: node server.js   (or npm run dev for --watch mode)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import Database from 'better-sqlite3';

// ── Module imports ──────────────────────────────────────────────────────────────
import { buildDatabase, exportD3Graph, DB_PATH } from './graphDb.js';
import {
  initQuizSchema, getQuestionsForConcept, getQuestionsForConcepts,
  saveAttempt, getAttempts, upsertMastery, getAllMastery,
} from './quizStore.js';
import { estimateMastery, estimateBatch, GAP_THRESHOLD } from './mastery.js';
import { loadGraph, loadMastery, findRootGaps, batchTrace, getLearningPath } from './tracer.js';
import { narrateRootCause, narrateLearningPath, narrateMasteryReport, callGemini } from './narrator.js';
import { initCrossLinksSchema, getLinksForConcept, getAllLinks, getLinksForSubjectPair, getConceptBridgeScore } from './crossLinks.js';
import { initUserSchema, registerUser, loginUser } from './userStore.js';

// ── Startup / DB initialization ─────────────────────────────────────────────────
if (!fs.existsSync(DB_PATH)) {
  console.log('[startup] Building database...');
  buildDatabase(true);
} else {
  console.log('[startup] Database already exists, skipping seed.');
}

console.log('[startup] Initialising quiz schema (Module 2)...');
initQuizSchema(true);

console.log('[startup] Initialising cross-subject links (Module 5)...');
initCrossLinksSchema(true);

console.log('[startup] Initialising users schema (Auth)...');
initUserSchema(false);

// ── Express app ─────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

// ─── Helpers ────────────────────────────────────────────────────────────────────
function scoreLabel(score) {
  if (score >= 0.80) return 'Strong';
  if (score >= 0.60) return 'Good';
  if (score >= 0.40) return 'Partial';
  return 'Gap';
}

function recommendationText(score) {
  if (score >= 0.80) return 'Strong mastery. Ready to advance to dependent concepts.';
  if (score >= 0.60) return 'Good understanding. Attempt 1-2 more practice problems to solidify.';
  if (score >= 0.40) return 'Partial mastery. Review concept notes and retry the quiz.';
  return 'Significant gap detected. Study prerequisite concepts first, then revisit.';
}


// ═════════════════════════════════════════════════════════════════════════════════
// ROOT
// ═════════════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    status: 'ok', version: '5.0.0',
    modules: [
      'Module 1: Concept Knowledge Graph',
      'Module 2: Mastery Estimator (BKT)',
      'Module 3: Root Cause Tracer',
      'Module 4: LLM Narration (Gemini)',
      'Module 5: Cross-Subject Linking',
    ],
    runtime: 'Node.js / Express',
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═════════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', (req, res) => {
  const { roll_no, password, name, email, year, branch } = req.body;
  
  if (!roll_no || !password) {
    return res.status(400).json({ error: 'Roll number and password are required' });
  }

  try {
    const user = registerUser(req.body);
    res.json({ user });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'User with this roll number already exists' });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { roll_no, password } = req.body;

  if (!roll_no || !password) {
    return res.status(400).json({ error: 'Roll number and password are required' });
  }

  try {
    const user = loginUser(roll_no, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid roll number or password' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════════
// MODULE 1 — KNOWLEDGE GRAPH
// ═════════════════════════════════════════════════════════════════════════════════

app.get('/api/graph', (req, res) => {
  res.json(exportD3Graph(req.query.student_id || null));
});

app.get('/api/concept/:slug', (req, res) => {
  const db = new Database(DB_PATH, { readonly: true });
  const concept = db.prepare(`SELECT c.*, s.name AS subject FROM concepts c JOIN subjects s ON s.id=c.subject_id WHERE c.slug=?`).get(req.params.slug);
  if (!concept) { db.close(); return res.status(404).json({ detail: `Concept '${req.params.slug}' not found` }); }

  if (req.query.student_id) {
    const row = db.prepare('SELECT score FROM mastery WHERE student_id=? AND concept_id=?').get(req.query.student_id, concept.id);
    concept.mastery = row ? row.score : -1;
  }

  concept.prerequisites = db.prepare(`SELECT c.slug, c.name, p.strength FROM prerequisites p JOIN concepts c ON c.id=p.prerequisite_id WHERE p.concept_id=?`).all(concept.id);
  concept.unlocks = db.prepare(`SELECT c.slug, c.name, p.strength FROM prerequisites p JOIN concepts c ON c.id=p.concept_id WHERE p.prerequisite_id=?`).all(concept.id);

  db.close();
  res.json(concept);
});

app.get('/api/subjects', (req, res) => {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`SELECT s.id, s.name, s.description, COUNT(c.id) AS concept_count FROM subjects s LEFT JOIN concepts c ON c.subject_id=s.id GROUP BY s.id`).all();
  db.close();
  res.json(rows);
});

app.get('/api/library/navigate', (req, res) => {
  const studentId = req.query.student_id;
  if (!studentId) return res.status(400).json({ detail: 'student_id query param required' });

  const db = new Database(DB_PATH, { readonly: true });
  const concepts = db.prepare(`
    SELECT c.slug, c.name, c.difficulty, c.library_section, c.shelf_number, c.book_title, c.book_isbn,
           s.name AS subject, COALESCE(m.score, -1) AS mastery
    FROM concepts c JOIN subjects s ON s.id=c.subject_id
    LEFT JOIN mastery m ON m.concept_id=c.id AND m.student_id=?
    ORDER BY c.library_section, c.shelf_number, c.difficulty
  `).all(studentId);

  const nav = {};
  for (const c of concepts) {
    const section = c.library_section || 'Uncategorised';
    const shelf = c.shelf_number || 'Shelf 1';
    if (!nav[section]) nav[section] = {};
    if (!nav[section][shelf]) nav[section][shelf] = [];
    nav[section][shelf].push({
      slug: c.slug, name: c.name, subject: c.subject, difficulty: c.difficulty,
      book_title: c.book_title, book_isbn: c.book_isbn, mastery: c.mastery,
      is_gap: c.mastery !== -1 && c.mastery < 0.4, not_assessed: c.mastery === -1,
    });
  }
  db.close();
  res.json({ student_id: studentId, library: nav });
});


// ═════════════════════════════════════════════════════════════════════════════════
// MODULE 2 — MASTERY ESTIMATOR
// ═════════════════════════════════════════════════════════════════════════════════

app.post('/api/quiz/submit', (req, res) => {
  const { student_id, answers } = req.body;
  if (!student_id || !answers?.length) return res.status(400).json({ detail: 'student_id and answers required' });

  // 1. Save each answer
  for (const ans of answers) {
    const isCorrect = ans.selected_option === ans.correct_option;
    saveAttempt(student_id, ans.concept_slug, ans.question_id || 0, ans.selected_option, isCorrect, ans.time_taken_sec || 30, ans.hint_used || false);
  }

  // 2. Unique concepts
  const conceptSlugs = [...new Set(answers.map(a => a.concept_slug))];

  // 3. Load full history and build QuizAttempts
  const slugDiffMap = {};
  for (const ans of answers) slugDiffMap[ans.concept_slug] = ans.difficulty || 3;

  const allQuizAttempts = [];
  for (const slug of conceptSlugs) {
    const history = getAttempts(student_id, slug);
    for (const row of history) {
      allQuizAttempts.push({
        conceptSlug: row.concept_slug,
        isCorrect: !!row.is_correct,
        difficulty: slugDiffMap[row.concept_slug] || 3,
        timeTakenSec: row.time_taken_sec,
        hintUsed: !!row.hint_used,
      });
    }
  }

  // 4. Run BKT batch
  const results = estimateBatch(allQuizAttempts);

  // 5. Upsert mastery
  for (const [slug, result] of Object.entries(results)) {
    upsertMastery(student_id, slug, result.masteryScore);
  }

  // 6. Build response
  const resultList = [];
  const gaps = [];
  for (const slug of conceptSlugs) {
    const r = results[slug];
    if (r) {
      resultList.push({
        concept_slug: r.conceptSlug, mastery_score: r.masteryScore,
        confidence: r.confidence, attempts: r.attempts, correct: r.correct,
        method: r.method, is_gap: r.isGap, recommendation: r.recommendation,
      });
      if (r.isGap) gaps.push(slug);
    }
  }

  res.json({ student_id, session_answers: answers.length, concepts_assessed: conceptSlugs.length, results: resultList, gaps_detected: gaps });
});

app.get('/api/mastery/:student_id', (req, res) => {
  const rows = getAllMastery(req.params.student_id);
  const bySubject = {};
  const gaps = [];
  for (const r of rows) {
    const label = scoreLabel(r.score);
    const isGap = r.score < GAP_THRESHOLD;
    const entry = { slug: r.slug, name: r.name, difficulty: r.difficulty, semester: r.semester, score: r.score, label, is_gap: isGap, updated_at: r.updated_at };
    if (!bySubject[r.subject]) bySubject[r.subject] = [];
    bySubject[r.subject].push(entry);
    if (isGap) gaps.push({ slug: r.slug, name: r.name, score: r.score });
  }
  res.json({ student_id: req.params.student_id, total_assessed: rows.length, gaps, by_subject: bySubject });
});

app.get('/api/mastery/:student_id/:concept_slug', (req, res) => {
  const { student_id, concept_slug } = req.params;
  const allMast = getAllMastery(student_id);
  const masteryEntry = allMast.find(m => m.slug === concept_slug);
  const attempts = getAttempts(student_id, concept_slug);

  if (!masteryEntry && !attempts.length) {
    return res.status(404).json({ detail: `No mastery data or attempts found for student '${student_id}' on concept '${concept_slug}'` });
  }

  const score = masteryEntry ? masteryEntry.score : 0.0;
  const quizAttempts = attempts.map(a => ({
    conceptSlug: a.concept_slug, isCorrect: !!a.is_correct,
    difficulty: 3, timeTakenSec: a.time_taken_sec, hintUsed: !!a.hint_used,
  }));
  const estimation = quizAttempts.length ? estimateMastery(quizAttempts) : null;

  res.json({
    student_id, concept_slug, score, label: scoreLabel(score),
    is_gap: score < GAP_THRESHOLD, recommendation: recommendationText(score),
    method: estimation?.method || 'none', confidence: estimation?.confidence || 'low',
    attempt_count: attempts.length,
    attempts: attempts.map(a => ({
      question_id: a.question_id, selected_option: a.selected_option,
      is_correct: !!a.is_correct, time_taken_sec: a.time_taken_sec,
      hint_used: !!a.hint_used, attempted_at: a.attempted_at,
    })),
  });
});

app.post('/api/mastery/:student_id/:concept_slug/update', (req, res) => {
  const { score } = req.body;
  if (score === undefined || score < 0 || score > 1) return res.status(400).json({ detail: 'score (0.0-1.0) required' });
  const success = upsertMastery(req.params.student_id, req.params.concept_slug, score);
  if (!success) return res.status(404).json({ detail: `Concept slug '${req.params.concept_slug}' not found` });
  res.json({ student_id: req.params.student_id, concept_slug: req.params.concept_slug, score, label: scoreLabel(score), updated: true });
});

app.get('/api/quiz/questions/:concept_slug', (req, res) => {
  const limit = parseInt(req.query.limit) || 3;
  const hideAnswers = req.query.hide_answers !== 'false';
  const questions = getQuestionsForConcept(req.params.concept_slug, limit);
  if (!questions.length) return res.status(404).json({ detail: `No questions found for concept '${req.params.concept_slug}'` });
  if (hideAnswers) questions.forEach(q => delete q.correct_option);
  res.json({ concept_slug: req.params.concept_slug, question_count: questions.length, questions });
});

app.get('/api/quiz/questions', (req, res) => {
  const slugs = req.query.slugs;
  if (!slugs) return res.status(400).json({ detail: 'No slugs provided' });
  const slugList = slugs.split(',').map(s => s.trim()).filter(Boolean);
  const perConcept = parseInt(req.query.per_concept) || 3;
  const hideAnswers = req.query.hide_answers !== 'false';
  const questions = getQuestionsForConcepts(slugList, perConcept);
  if (hideAnswers) questions.forEach(q => delete q.correct_option);
  res.json({ requested_concepts: slugList, question_count: questions.length, questions });
});

app.get('/api/quiz/subject/:subject_name', (req, res) => {
  const perConcept = parseInt(req.query.per_concept) || 3;
  const hideAnswers = req.query.hide_answers === 'true';
  const db = new Database(DB_PATH, { readonly: true });

  const concepts = db.prepare(`SELECT c.slug, c.name, c.difficulty FROM concepts c JOIN subjects s ON s.id=c.subject_id WHERE s.name=? ORDER BY c.difficulty, c.name`).all(req.params.subject_name);
  if (!concepts.length) { db.close(); return res.status(404).json({ detail: `No concepts found for subject '${req.params.subject_name}'` }); }

  const questionsByConcept = {};
  for (const c of concepts) {
    const qs = db.prepare('SELECT * FROM quiz_questions WHERE concept_slug=? LIMIT ?').all(c.slug, perConcept);
    if (qs.length) {
      if (hideAnswers) qs.forEach(q => delete q.correct_option);
      questionsByConcept[c.slug] = { concept_name: c.name, difficulty: c.difficulty, questions: qs };
    }
  }
  db.close();

  const allQuestions = [];
  for (const [slug, data] of Object.entries(questionsByConcept)) {
    for (const q of data.questions) { q.concept_name = data.concept_name; allQuestions.push(q); }
  }

  res.json({ subject: req.params.subject_name, concepts_with_questions: Object.keys(questionsByConcept).length, total_questions: allQuestions.length, by_concept: questionsByConcept, questions: allQuestions });
});


// ═════════════════════════════════════════════════════════════════════════════════
// MODULE 3 — ROOT CAUSE TRACER
// ═════════════════════════════════════════════════════════════════════════════════

app.get('/api/trace/:student_id/:concept_slug', (req, res) => {
  try {
    const G = loadGraph(req.query.subject_filter || null);
    if (!G.has(req.params.concept_slug)) return res.status(404).json({ detail: 'Concept not found in graph.' });
    const mastery = loadMastery(req.params.student_id);
    const threshold = parseFloat(req.query.threshold) || 0.4;
    const includeRecommended = req.query.include_recommended !== 'false';
    const result = findRootGaps(G, req.params.concept_slug, mastery, threshold, includeRecommended);

    const summary = result.totalGaps > 0
      ? `Student has ${result.totalGaps} prerequisite gaps. Start with: ${result.rootCauses[0]?.slug}.`
      : 'No prerequisite gaps found. Student is ready for this concept.';

    res.json({
      student_id: req.params.student_id,
      failed_concept: { slug: req.params.concept_slug, name: result.failedConceptName },
      total_gaps: result.totalGaps, max_depth: result.maxDepth,
      root_causes: result.rootCauses, gap_chain: result.gapChain,
      required_gaps: result.requiredGaps, recommended_gaps: result.recommendedGaps,
      learning_path: result.learningPath, summary,
    });
  } catch (e) {
    res.status(404).json({ detail: e.message });
  }
});

app.get('/api/trace/:student_id', (req, res) => {
  const G = loadGraph(req.query.subject_filter || null);
  const mastery = loadMastery(req.params.student_id);
  if (!Object.keys(mastery).length) return res.json({ failing_concepts: 0, traces: [], message: 'No mastery data found.' });

  const threshold = parseFloat(req.query.threshold) || 0.4;
  const results = batchTrace(G, mastery, threshold);
  if (!results.length) return res.json({ failing_concepts: 0, traces: [], message: 'No gaps detected.' });

  const traces = results.map(r => ({
    failed_concept_slug: r.failedConceptSlug, failed_concept_name: r.failedConceptName,
    total_gaps: r.totalGaps, root_causes: r.rootCauses.map(n => n.slug), learning_path: r.learningPath,
    summary: `Student has ${r.totalGaps} prerequisite gaps. Start with: ${r.rootCauses[0]?.slug}.`,
  }));

  res.json({ student_id: req.params.student_id, failing_concepts: results.length, traces });
});

app.get('/api/learning-path/:student_id/:target_slug', (req, res) => {
  const G = loadGraph();
  const mastery = loadMastery(req.params.student_id);
  const threshold = parseFloat(req.query.threshold) || 0.4;
  const pathResult = getLearningPath(G, req.params.target_slug, mastery, threshold);
  res.json({
    student_id: req.params.student_id, target_concept: req.params.target_slug,
    steps: pathResult.length, path: pathResult,
    message: `Master these ${pathResult.length} concepts in order to reach ${req.params.target_slug}.`,
  });
});


// ═════════════════════════════════════════════════════════════════════════════════
// MODULE 4 — NARRATOR
// ═════════════════════════════════════════════════════════════════════════════════

app.get('/api/narrate/diagnosis/:student_id/:concept_slug', async (req, res) => {
  const G = loadGraph();
  const mastery = loadMastery(req.params.student_id);
  const threshold = parseFloat(req.query.threshold) || 0.4;
  const result = findRootGaps(G, req.params.concept_slug, mastery, threshold);

  const gapList = result.gapChain.map(g => ({ slug: g.slug, name: g.name, mastery_score: g.mastery_score, depth: g.depth }));
  const narrative = await narrateRootCause(req.params.concept_slug, gapList, mastery, req.params.student_id);

  res.json({
    student_id: req.params.student_id, failed_concept: req.params.concept_slug,
    gap_count: result.totalGaps, root_causes: result.rootCauses.map(r => r.slug),
    learning_path: result.learningPath, narrative,
  });
});

app.get('/api/narrate/report/:student_id', async (req, res) => {
  const records = getAllMastery(req.params.student_id);
  if (!records.length) return res.status(404).json({ detail: 'No mastery data for student.' });

  const gaps = records.filter(r => r.score < 0.4);
  const strong = records.filter(r => r.score >= 0.8);
  const subjSummary = {};
  for (const r of records) {
    if (!subjSummary[r.subject]) subjSummary[r.subject] = { total_score: 0, count: 0 };
    subjSummary[r.subject].total_score += r.score;
    subjSummary[r.subject].count += 1;
  }
  for (const subj of Object.keys(subjSummary)) {
    subjSummary[subj].avg_score = subjSummary[subj].total_score / subjSummary[subj].count;
  }

  const narrative = await narrateMasteryReport(req.params.student_id, records.length, gaps, strong, subjSummary);
  res.json({ student_id: req.params.student_id, total_assessed: records.length, gap_count: gaps.length, strong_count: strong.length, subject_summary: subjSummary, narrative });
});

app.post('/api/narrate/custom', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || prompt.length < 10) return res.status(400).json({ detail: 'prompt (min 10 chars) required' });
  const systemPrefix = 'You are an expert engineering tutor at Mumbai University. ';
  let result = await callGemini(systemPrefix + prompt);
  if (!result) result = 'AI narration is temporarily unavailable. Please try again later.';
  res.json({ narrative: result });
});


// ═════════════════════════════════════════════════════════════════════════════════
// MODULE 5 — CROSS-SUBJECT LINKING
// ═════════════════════════════════════════════════════════════════════════════════

app.get('/api/cross-links', (req, res) => {
  const links = getAllLinks();
  res.json({ total: links.length, links });
});

app.get('/api/cross-links/concept/:slug', (req, res) => {
  const links = getLinksForConcept(req.params.slug);
  if (!links.length) return res.status(404).json({ detail: `No links found for concept '${req.params.slug}'.` });
  res.json({ concept_slug: req.params.slug, bridge_score: getConceptBridgeScore(req.params.slug), links });
});

app.get('/api/cross-links/subjects', (req, res) => {
  const { subject_a, subject_b } = req.query;
  if (!subject_a || !subject_b) return res.status(400).json({ detail: 'subject_a and subject_b query params required' });
  const links = getLinksForSubjectPair(subject_a, subject_b);
  res.json({ subject_a, subject_b, link_count: links.length, links });
});

app.get('/api/cross-links/bridge-concepts', (req, res) => {
  const db = new Database(DB_PATH, { readonly: true });
  const slugCounts = {};
  for (const row of db.prepare('SELECT slug_a AS slug FROM cross_subject_links').all()) slugCounts[row.slug] = (slugCounts[row.slug] || 0) + 1;
  for (const row of db.prepare('SELECT slug_b AS slug FROM cross_subject_links').all()) slugCounts[row.slug] = (slugCounts[row.slug] || 0) + 1;

  const topSlugs = Object.entries(slugCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const bridgeConcepts = topSlugs.map(([slug, count]) => {
    const concept = db.prepare('SELECT c.name, s.name AS subject_name FROM concepts c JOIN subjects s ON s.id=c.subject_id WHERE c.slug=?').get(slug);
    const linkedSubjects = new Set();
    for (const lnk of getLinksForConcept(slug)) { linkedSubjects.add(lnk.subject_a); linkedSubjects.add(lnk.subject_b); }
    const subject = concept?.subject_name || 'Unknown';
    linkedSubjects.delete(subject);
    return { slug, name: concept?.name || slug, subject, bridge_score: count, linked_subjects: [...linkedSubjects] };
  });
  db.close();
  res.json({ bridge_concepts: bridgeConcepts });
});

app.get('/api/cross-links/student/:student_id', (req, res) => {
  const db = new Database(DB_PATH, { readonly: true });
  const mastery = db.prepare('SELECT c.slug, m.score FROM mastery m JOIN concepts c ON c.id=m.concept_id WHERE m.student_id=?').all(req.params.student_id);

  const strengths = {};
  const gaps = {};
  for (const r of mastery) {
    if (r.score >= 0.7) strengths[r.slug] = r.score;
    if (r.score < 0.4) gaps[r.slug] = r.score;
  }

  const strengthOpportunities = [];
  const gapImpact = [];

  for (const slug of Object.keys(strengths)) {
    for (const l of getLinksForConcept(slug)) {
      if (l.slug_a === slug) strengthOpportunities.push({ mastered_concept: slug, unlocks_in_subject: l.subject_b, linked_concept: l.slug_b, insight: l.insight });
      else strengthOpportunities.push({ mastered_concept: slug, unlocks_in_subject: l.subject_a, linked_concept: l.slug_a, insight: l.insight });
    }
  }

  for (const slug of Object.keys(gaps)) {
    for (const l of getLinksForConcept(slug)) {
      if (l.slug_a === slug) gapImpact.push({ gap_concept: slug, also_affects: `${l.subject_b} -> ${l.slug_b}`, insight: l.insight });
      else gapImpact.push({ gap_concept: slug, also_affects: `${l.subject_a} -> ${l.slug_a}`, insight: l.insight });
    }
  }

  db.close();
  res.json({ student_id: req.params.student_id, strength_opportunities: strengthOpportunities, gap_impact: gapImpact });
});


// ═════════════════════════════════════════════════════════════════════════════════
// FRONTEND SUBMIT (compatibility with existing frontend TestSection)
// ═════════════════════════════════════════════════════════════════════════════════
app.post('/api/submit-test', (req, res) => {
  // Forward to the quiz/submit handler for compatibility
  const { student_id, answers } = req.body;
  if (!student_id || !answers?.length) return res.status(400).json({ detail: 'student_id and answers required' });

  for (const ans of answers) {
    const isCorrect = ans.selected_option === ans.correct_option;
    saveAttempt(student_id, ans.concept_slug, ans.question_id || 0, ans.selected_option, isCorrect, ans.time_taken_sec || 30, ans.hint_used || false);
  }

  const conceptSlugs = [...new Set(answers.map(a => a.concept_slug))];
  const slugDiffMap = {};
  for (const ans of answers) slugDiffMap[ans.concept_slug] = ans.difficulty || 3;

  const allQuizAttempts = [];
  for (const slug of conceptSlugs) {
    for (const row of getAttempts(student_id, slug)) {
      allQuizAttempts.push({
        conceptSlug: row.concept_slug, isCorrect: !!row.is_correct,
        difficulty: slugDiffMap[row.concept_slug] || 3,
        timeTakenSec: row.time_taken_sec, hintUsed: !!row.hint_used,
      });
    }
  }

  const results = estimateBatch(allQuizAttempts);
  for (const [slug, result] of Object.entries(results)) upsertMastery(student_id, slug, result.masteryScore);

  const resultList = [];
  const gapsDetected = [];
  for (const slug of conceptSlugs) {
    const r = results[slug];
    if (r) {
      resultList.push({
        concept_slug: r.conceptSlug, mastery_score: r.masteryScore,
        confidence: r.confidence, attempts: r.attempts, correct: r.correct,
        method: r.method, is_gap: r.isGap, recommendation: r.recommendation,
      });
      if (r.isGap) gapsDetected.push(slug);
    }
  }

  res.json({ student_id, session_answers: answers.length, concepts_assessed: conceptSlugs.length, results: resultList, gaps_detected: gapsDetected });
});


// ── Start server ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n[LearnifAI] Server running at http://localhost:${PORT}`);
  console.log(`    API docs: http://localhost:${PORT}/`);
});
