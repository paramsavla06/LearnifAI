/**
 * Data Loader — loads all JSON data files once at startup
 * Sources:
 *   concepts.json  — from param/graph_db.py (library section+shelf per concept)
 *   questions.json — from ojayit/quiz_store.py (MCQ question bank)
 *   recommended_books.json — from ojayit (books per subject)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', '..', 'src', 'data')
const localDir = join(__dirname, '..', 'data')

function load(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
}

// ─── Load data ────────────────────────────────────────────────────────────────
export const conceptsData   = load(join(dataDir, 'concepts.json'))
export const questionsData  = load(join(dataDir, 'questions.json'))
export const recommendedBooks = load(join(localDir, 'recommended_books.json'))

// ─── Build flat lookup maps ────────────────────────────────────────────────────

// slug → concept object (with library section + shelf)
export const conceptBySlug = {}
for (const subject of conceptsData.subjects) {
    for (const concept of subject.concepts) {
        conceptBySlug[concept.slug] = {
            ...concept,
            subject_name: subject.name,
            branch: subject.branch
        }
    }
}

// slug → [questions]
export const questionsBySlug = {}
for (const q of questionsData) {
    if (!questionsBySlug[q.slug]) questionsBySlug[q.slug] = []
    questionsBySlug[q.slug].push(q)
}

// subject name → recommended books entry
export const booksBySubject = {}
for (const entry of recommendedBooks) {
    booksBySubject[entry.subject] = entry
}

// slug → recommended books (via subject match)
export const booksBySlug = {}
for (const entry of recommendedBooks) {
    for (const slug of entry.slugs) {
        booksBySlug[slug] = entry.recommended_books
    }
}

console.log(`[DataLoader] Loaded ${Object.keys(conceptBySlug).length} concepts`)
console.log(`[DataLoader] Loaded ${questionsData.length} questions across ${Object.keys(questionsBySlug).length} slugs`)
console.log(`[DataLoader] Loaded ${recommendedBooks.length} subject book entries`)
