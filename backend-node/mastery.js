/**
 * Module 2 — Mastery Estimator Engine
 * Bayesian Knowledge Tracing (BKT) with weighted-ratio fallback.
 * Pure logic — no database, no Express imports.
 */

// BKT default parameters by difficulty level (1-5)
const BKT_DEFAULTS = {
  1: { p_l0: 0.50, p_t: 0.30, p_s: 0.10, p_g: 0.20 },
  2: { p_l0: 0.35, p_t: 0.25, p_s: 0.12, p_g: 0.18 },
  3: { p_l0: 0.25, p_t: 0.20, p_s: 0.15, p_g: 0.15 },
  4: { p_l0: 0.15, p_t: 0.15, p_s: 0.18, p_g: 0.12 },
  5: { p_l0: 0.10, p_t: 0.10, p_s: 0.20, p_g: 0.10 },
};

const DIFFICULTY_PENALTY = { 1: 1.0, 2: 0.95, 3: 0.90, 4: 0.85, 5: 0.80 };
export const GAP_THRESHOLD = 0.4;


// BKT core update
function bktUpdate(p_l, isCorrect, p_s, p_g, p_t) {
  const p_obs_given_l = isCorrect ? (1.0 - p_s) : p_s;
  const p_obs_given_nl = isCorrect ? p_g : (1.0 - p_g);

  const numerator = p_obs_given_l * p_l;
  const denominator = numerator + p_obs_given_nl * (1.0 - p_l);
  const p_l_posterior = denominator === 0 ? p_l : numerator / denominator;
  const p_l_new = p_l_posterior + (1.0 - p_l_posterior) * p_t;

  return Math.max(0.0, Math.min(1.0, p_l_new));
}

function runBkt(attempts) {
  if (!attempts.length) return 0.0;
  const params = BKT_DEFAULTS[attempts[0].difficulty] || BKT_DEFAULTS[3];
  let p_l = params.p_l0;
  for (const a of attempts) {
    const ap = BKT_DEFAULTS[a.difficulty] || BKT_DEFAULTS[3];
    p_l = bktUpdate(p_l, a.isCorrect, ap.p_s, ap.p_g, ap.p_t);
  }
  return Math.round(p_l * 10000) / 10000;
}

// Weighted ratio fallback (for < 3 attempts)
function speedBonus(timeSec) {
  if (timeSec <= 20) return 1.0;
  if (timeSec <= 60) return 1.0 - 0.5 * (timeSec - 20) / 40.0;
  return 0.0;
}

function weightedRatioScore(attempts) {
  if (!attempts.length) return 0.0;
  const scores = attempts.map(a => {
    const correctness = a.isCorrect ? 1.0 : 0.0;
    const speed = speedBonus(a.timeTakenSec);
    const hint = a.hintUsed ? 0.0 : 1.0;
    const raw = 0.70 * correctness + 0.15 * speed + 0.15 * hint;
    return raw * (DIFFICULTY_PENALTY[a.difficulty] || 0.90);
  });
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10000) / 10000;
}

function recommendation(score) {
  if (score >= 0.80) return 'Strong mastery. Ready to advance to dependent concepts.';
  if (score >= 0.60) return 'Good understanding. Attempt 1-2 more practice problems to solidify.';
  if (score >= 0.40) return 'Partial mastery. Review concept notes and retry the quiz.';
  return 'Significant gap detected. Study prerequisite concepts first, then revisit.';
}

export function estimateMastery(attempts) {
  if (!attempts.length) {
    return {
      conceptSlug: 'unknown', masteryScore: 0.0, confidence: 'low',
      attempts: 0, correct: 0, method: 'weighted_ratio',
      isGap: true, recommendation: recommendation(0.0),
    };
  }

  const slug = attempts[0].conceptSlug;
  const n = attempts.length;
  const correctCount = attempts.filter(a => a.isCorrect).length;
  const score = n >= 3 ? runBkt(attempts) : weightedRatioScore(attempts);
  const method = n >= 3 ? 'bkt' : 'weighted_ratio';
  const confidence = n >= 5 ? 'high' : n >= 2 ? 'medium' : 'low';

  return {
    conceptSlug: slug, masteryScore: score, confidence,
    attempts: n, correct: correctCount, method,
    isGap: score < GAP_THRESHOLD, recommendation: recommendation(score),
  };
}

export function estimateBatch(allAttempts) {
  const groups = {};
  for (const a of allAttempts) {
    if (!groups[a.conceptSlug]) groups[a.conceptSlug] = [];
    groups[a.conceptSlug].push(a);
  }
  const results = {};
  for (const [slug, attList] of Object.entries(groups)) {
    results[slug] = estimateMastery(attList);
  }
  return results;
}
