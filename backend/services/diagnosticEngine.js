/**
 * Diagnostic Engine
 * Implements a simplified BKT (Bayesian Knowledge Tracing) inspired scoring system
 * matching the ML model logic in param/module 2/mastery.py
 *
 * Core flow:
 *   submitAnswers(userId, answers) →
 *     per-slug score →
 *     classify weak/strong →
 *     generate analysis text →
 *     map weak slugs → books + library locations
 */

import { conceptBySlug, booksBySlug } from './dataLoader.js'

// In-memory store (replace with Supabase in production)
const attemptStore = {}   // userId → { slug → [{ correct, diff }] }
const resultStore  = {}   // userId → result object

// ─── BKT Parameters (from mastery.py) ─────────────────────────────────────────
const P_KNOW_PRIOR = 0.3
const P_LEARN       = 0.2
const P_SLIP        = 0.1
const P_GUESS       = 0.25
const MASTERY_THRESHOLD = 0.65  // >= this → strong topic

// ─── Root Cause Mapping ───────────────────────────────────────────────────────
const ROOT_CAUSE_MAPPING = {
  "Linked List": ["Pointers"],
  "Trees": ["Recursion"],
  "DBMS Normalization": ["Functional Dependency"],
  "Operating Systems": ["Process Management"],
  "Machine Learning": ["Statistics"],
  "Data Structures & Algorithms": ["Time Complexity"],
  "Computer Networks": ["OSI Model"],
  "Engineering Mathematics": ["Calculus"],
  "Automata Theory": ["Logic"],
  "Artificial Intelligence": ["Search Algorithms"],
  "Software Engineering": ["System Design"],
  "Web Development": ["Client-Server Architecture"]
};

function getRootCause(topicName) {
    if (ROOT_CAUSE_MAPPING[topicName]) return ROOT_CAUSE_MAPPING[topicName];
    // try partial match
    for (const [key, value] of Object.entries(ROOT_CAUSE_MAPPING)) {
        if (topicName.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return ["Core Fundamentals"]; // default fallback
}

function bktUpdate(priorKnow, correct) {
    const pCorrect = priorKnow * (1 - P_SLIP) + (1 - priorKnow) * P_GUESS
    const posterior = correct
        ? (priorKnow * (1 - P_SLIP)) / pCorrect
        : (priorKnow * P_SLIP) / (1 - pCorrect)
    return posterior + (1 - posterior) * P_LEARN
}

function scoreForSlug(attempts) {
    let p = P_KNOW_PRIOR
    for (const { correct } of attempts) {
        p = bktUpdate(p, correct)
    }
    return parseFloat(p.toFixed(3))
}

// ─── Store attempts ────────────────────────────────────────────────────────────
export function recordAttempts(userId, answers) {
    if (!attemptStore[userId]) attemptStore[userId] = {}
    for (const ans of answers) {
        // Support both new field names (concept_slug, selected_option, is_correct)
        // and old names (slug, selectedOption, correctOption) as fallback
        const slug        = ans.concept_slug    || ans.slug
        const isCorrect   = ans.is_correct      ?? (ans.selectedOption === ans.correctOption)
        const difficulty  = ans.difficulty || 2

        if (!slug) continue   // skip if slug is completely missing
        if (!attemptStore[userId][slug]) attemptStore[userId][slug] = []
        attemptStore[userId][slug].push({ correct: isCorrect, diff: difficulty })
    }
    console.log('[DEBUG] attemptStore for', userId, ':', JSON.stringify(attemptStore[userId], null, 2))
}

// ─── Generate result ───────────────────────────────────────────────────────────
export async function generateResult(userId, userProfile = {}) {
    const slugAttempts = attemptStore[userId] || {}

    const weakTopics   = []
    const strongTopics = []
    const rootCauses   = []

    for (const [slug, attempts] of Object.entries(slugAttempts)) {
        const score   = scoreForSlug(attempts)
        const concept = conceptBySlug[slug]
        if (!concept) continue

        // Get books for this slug + library location from concepts.json
        const books = (booksBySlug[slug] || []).map(book => ({
            title:   book.title,
            chapter: book.chapter || "1",
            location: `Shelf ${concept.shelf}`,
            author:  book.author,
            sections: book.sections,
            // Physical library location from param/graph_db.py data:
            library: {
                section: concept.library_section,
                shelf:   concept.shelf,
                floor:   inferFloor(concept.library_section)
            }
        }))

        const entry = {
            slug,
            name:    concept.name,
            subject: concept.subject_name,
            branch:  concept.branch,
            semester: concept.semester,
            score,
            mastery_pct: Math.round(score * 100),
            books
        }

        if (score < MASTERY_THRESHOLD) {
            weakTopics.push(entry)
            const rcList = getRootCause(concept.name)
            rcList.forEach(rc => {
                if (!rootCauses.includes(rc)) rootCauses.push(rc)
            })
        } else {
            strongTopics.push(entry)
        }
    }

    // Sort weak topics by score ascending (most critical first)
    weakTopics.sort((a, b) => a.score - b.score)
    strongTopics.sort((a, b) => b.score - a.score)

    // Build subject summary
    const subjectSummary = {}
    weakTopics.forEach(t => subjectSummary[t.subject] = true)
    strongTopics.forEach(t => subjectSummary[t.subject] = true)

    let analysisText = ''
    try {
        const { generateAnalysis } = await import('./llmService.js')
        
        const studentName = userProfile?.name || 'Student';
        const semester = userProfile?.year || 'Unknown Year'; // using year as semester proxy if missing
        
        let weakText = weakTopics.map(t => {
            const bookInfo = t.books.length > 0 
                ? `(Recommended Book: "${t.books[0].title}", Location: ${t.books[0].library.floor} -> ${t.books[0].library.section} -> ${t.books[0].library.shelf})` 
                : '';
            return `- ${t.name} (${t.mastery_pct}% mastery) ${bookInfo}`;
        }).join('\n');
        
        let strongText = strongTopics.map(t => `- ${t.name}`).join('\n');

        const prompt = `You are a Technical Learning Diagnostic System. Provide a high-precision ROOT CAUSE ANALYSIS and SOLUTION REPORT for the student below. 
        Format the output as a professional technical assessment, not a letter. 
        Structure:
        1. DIAGNOSTIC SUMMARY (A brief technical overview of knowledge gaps)
        2. CRITICAL BOTTLENECK (Identify the primary prerequisite causing failure)
        3. PATH TO MASTERY (Exactly what to do first, including the specific book and library coordinates provided)
        4. ACCELERATION TIPS (Next steps)

        Student Profile: ${studentName} (${semester})
        
        STRONG CONCEPTS:
        ${strongText || 'None recorded'}
        
        WEAK CONCEPTS & BOTTLENECKS:
        ${weakText || 'None recorded'}
        
        Ensure you mention the exact library floor, section, and shelf for the top-priority weak topic. Be professional and data-driven.`;

        analysisText = await generateAnalysis(prompt)
    } catch (e) {
        console.warn('Failed to load llmService or generate analysis:', e)
        analysisText = buildAnalysisText(weakTopics, strongTopics, userProfile)
    }

    // ✅ Fix: Calculate mastery as weighted average of actual scores
    const scores = [...weakTopics, ...strongTopics].map(t => t.mastery_pct || 0)
    const avgPct = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    const result = {
        userId,
        generatedAt:  new Date().toISOString(),
        totalConcepts: weakTopics.length + strongTopics.length,
        weak_topics:  weakTopics,
        strong_topics: strongTopics,
        root_causes:  rootCauses,
        analysis_text: analysisText,
        ai_analysis: analysisText, 
        mastery_summary: {
            overall_pct: avgPct,
            weak_count:   weakTopics.length,
            strong_count: strongTopics.length
        }
    }

    resultStore[userId] = result
    return result
}

export function getResult(userId) {
    return resultStore[userId] || null
}

// ─── Library floor inference from section letter ───────────────────────────────
function inferFloor(section) {
    if (!section) return 'Ground Floor'
    const letter = section.replace('Section ', '').trim().toUpperCase()
    const code = letter.charCodeAt(0) - 65  // A=0, B=1, ...
    if (code <= 5)  return 'Ground Floor'    // A-F
    if (code <= 11) return 'First Floor'     // G-L
    if (code <= 17) return 'Second Floor'    // M-R
    return 'Third Floor'
}

// ─── Analysis text generator ───────────────────────────────────────────────────
function buildAnalysisText(weak, strong, profile) {
    const name = profile?.name || 'Student'
    const year = profile?.year || ''

    if (weak.length === 0 && strong.length === 0) {
        return `${name}, no test data found yet. Complete a diagnostic to see your analysis.`
    }

    const weakNames   = weak.slice(0, 3).map(t => t.name).join(', ')
    const strongNames = strong.slice(0, 3).map(t => t.name).join(', ')

    let text = `${name}${year ? ` (${year})` : ''}, here is your diagnostic summary:\n\n`

    if (weak.length > 0) {
        text += `⚠️ **Concepts needing attention (${weak.length}):** ${weakNames}${weak.length > 3 ? ` and ${weak.length - 3} more` : ''}.\n`
        const topWeak = weak[0]
        if (topWeak.books.length > 0) {
            const b = topWeak.books[0]
            text += `   → Focus on "${topWeak.name}" first. Refer to "${b.title}" by ${b.author} `
            text += `[ ${b.library.section}, ${b.library.shelf}, ${b.library.floor} ]\n`
        }
    }

    if (strong.length > 0) {
        text += `\n✅ **Strong areas (${strong.length}):** ${strongNames}${strong.length > 3 ? ` and ${strong.length - 3} more` : ''}.\n`
    }

    const overallPct = weak.length + strong.length > 0
        ? Math.round((strong.length / (weak.length + strong.length)) * 100)
        : 0
    text += `\n📊 Overall mastery: **${overallPct}%** (${strong.length}/${weak.length + strong.length} concepts cleared).`

    return text
}
