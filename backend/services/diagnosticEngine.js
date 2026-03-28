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
        const { slug, selectedOption, correctOption, difficulty } = ans
        if (!attemptStore[userId][slug]) attemptStore[userId][slug] = []
        attemptStore[userId][slug].push({
            correct: selectedOption === correctOption,
            diff: difficulty || 2
        })
    }
}

// ─── Generate result ───────────────────────────────────────────────────────────
export function generateResult(userId, userProfile) {
    const slugAttempts = attemptStore[userId] || {}

    const weakTopics   = []
    const strongTopics = []

    for (const [slug, attempts] of Object.entries(slugAttempts)) {
        const score   = scoreForSlug(attempts)
        const concept = conceptBySlug[slug]
        if (!concept) continue

        // Get books for this slug + library location from concepts.json
        const books = (booksBySlug[slug] || []).map(book => ({
            title:   book.title,
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
        } else {
            strongTopics.push(entry)
        }
    }

    // Sort weak topics by score ascending (most critical first)
    weakTopics.sort((a, b) => a.score - b.score)
    strongTopics.sort((a, b) => b.score - a.score)

    const analysisText = buildAnalysisText(weakTopics, strongTopics, userProfile)

    const result = {
        userId,
        generatedAt:  new Date().toISOString(),
        totalConcepts: weakTopics.length + strongTopics.length,
        weak_topics:  weakTopics,
        strong_topics: strongTopics,
        analysis_text: analysisText,
        mastery_summary: {
            overall_pct: weakTopics.length + strongTopics.length > 0
                ? Math.round((strongTopics.length / (weakTopics.length + strongTopics.length)) * 100)
                : 0,
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
