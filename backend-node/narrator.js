/**
 * Module 4 — LLM Narration
 * Gemini API client + prompt builder for educational narratives.
 * Gracefully falls back to structured offline narratives when API is unavailable.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MODEL_NAME = 'gemini-2.0-flash';
const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.log('[INFO] GEMINI_API_KEY not set — narration will use offline fallback.');
} else {
  console.log(`[OK] GEMINI_API_KEY loaded (ends ...${apiKey.slice(-4)})`);
}

async function callGemini(prompt) {
  if (!apiKey) return '';
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
    });
    if (!resp.ok) { console.warn(`[WARN] Gemini API HTTP ${resp.status}`); return ''; }
    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (e) {
    console.warn(`[WARN] Gemini API call failed: ${e.message}`);
    return '';
  }
}

export async function narrateRootCause(failedConcept, gapChain, masteryScores, studentId = 'Student') {
  if (!gapChain.length) return `No prerequisite gaps found. ${studentId} is ready for ${failedConcept}.`;

  const chainText = gapChain.map((g, i) => `${i + 1}. ${g.name} (mastery: ${Math.round((g.mastery_score ?? -1) * 100)}%)`).join('\n');
  const rootCauseName = gapChain[0].name;

  const prompt = `You are an expert engineering tutor at Mumbai University.
A student is currently looking to improve their understanding of the concept: '${failedConcept}'.
Their prerequisite study sequence (in the order they must learn):
${chainText}
The fundamental starting point (what to study first): ${rootCauseName}
Write a friendly, encouraging 3-sentence diagnosis:
Sentence 1: Explain WHY the student should review ${failedConcept} in simple terms, referencing the starting point.
Sentence 2: Name the exact sequence of concepts they must study first.
Sentence 3: End with an encouraging, motivating statement.
Keep it under 100 words. Use simple language, no jargon. No bullet points. Write in paragraph form only.`;

  const result = await callGemini(prompt);
  if (result) return result;

  const pathNames = gapChain.map(g => g.name).join(' → ');
  return `To master ${failedConcept}, you first need a solid foundation in ${rootCauseName}. Follow this study path: ${pathNames}. Take it one concept at a time — you've got this!`;
}

export async function narrateLearningPath(targetConcept, pathSlugs, conceptNames) {
  if (!pathSlugs.length) return `Student is already prepared for ${targetConcept}.`;

  const namesList = pathSlugs.map((slug, i) => `${i + 1}. ${conceptNames[slug] || slug}`).join('\n');
  const prompt = `You are an engineering tutor. A student wants to master: '${targetConcept}'.
They must study these concepts in order:
${namesList}
Write 2 sentences:
Sentence 1: Describe the learning journey from start to target in an encouraging way.
Sentence 2: Give one practical study tip specific to the first concept in the path.
Under 60 words. No bullet points.`;

  const result = await callGemini(prompt);
  if (result) return result;

  const firstName = conceptNames[pathSlugs[0]] || pathSlugs[0];
  return `Your journey to ${targetConcept} starts with ${firstName} and covers ${pathSlugs.length} concepts. Begin by reviewing ${firstName} — try working through practice problems to build confidence.`;
}

export async function narrateMasteryReport(studentId, totalAssessed, gaps, strongConcepts, subjectSummary) {
  const strongNames = strongConcepts.length ? strongConcepts.map(g => g.name).join(', ') : 'none yet';
  const gapNames = gaps.length ? gaps.map(g => g.name).join(', ') : 'none';
  const subjText = Object.entries(subjectSummary).map(([s, m]) => `${s}: ${Math.round(m.avg_score * 100)}%`).join(', ');

  const prompt = `You are an academic advisor reviewing a student's performance across Mumbai University engineering subjects.
Student ID: ${studentId}
Concepts assessed: ${totalAssessed}
Strong areas: ${strongNames}
Gaps requiring attention: ${gapNames}
Subject performance: ${subjText}
Write a 4-sentence academic progress report:
Sentence 1: Overall performance summary.
Sentence 2: Highlight strengths.
Sentence 3: Address the most critical gaps.
Sentence 4: Concrete next step recommendation.
Under 100 words. Formal but encouraging tone.`;

  const result = await callGemini(prompt);
  if (result) return result;

  const lines = [`Student ${studentId} has been assessed on ${totalAssessed} concepts across ${Object.keys(subjectSummary).length} subjects.`];
  lines.push(strongConcepts.length ? `Strong performance in: ${strongNames}.` : 'No strong mastery areas identified yet.');
  lines.push(gaps.length ? `Priority gaps to address: ${gapNames}.` : 'No significant gaps detected — great work!');
  lines.push('Focus on the weakest areas first, then revisit to reinforce understanding.');
  return lines.join(' ');
}

export { callGemini };
