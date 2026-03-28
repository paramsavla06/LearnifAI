import { supabase } from '../supabase/client.js'
import { getResult as fetchMemResult } from '../services/diagnosticEngine.js'
import { booksBySlug, conceptBySlug } from '../services/dataLoader.js'

// ─── GET /api/result/:userId ────────────────────────────────────────────────────
export async function getResult(req, res) {
    const { userId } = req.params

    // Try Supabase first
    const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

    if (!error && data) {
        return res.json({
            userId,
            generatedAt:   data.generated_at,
            weak_topics:   data.weak_topics   || [],
            strong_topics: data.strong_topics || [],
            analysis_text: data.analysis_text,
            mastery_summary: {
                overall_pct:  data.mastery_pct,
                weak_count:   (data.weak_topics  || []).length,
                strong_count: (data.strong_topics || []).length
            }
        })
    }

    // Fallback to in-memory (if Supabase tables not yet seeded)
    const memResult = fetchMemResult(userId)
    if (memResult) return res.json(memResult)

    return res.status(404).json({
        error: 'No result found. Submit a test first via POST /api/submit-test'
    })
}

// ─── GET /api/books/:slug ────────────────────────────────────────────────────────
// Returns recommended books for a concept slug with physical library location
export function getBooks(req, res) {
    const { slug } = req.params
    const concept = conceptBySlug[slug]

    if (!concept) {
        return res.status(404).json({ error: `Concept not found: ${slug}` })
    }

    const books = (booksBySlug[slug] || []).map(book => ({
        title:    book.title,
        author:   book.author,
        sections: book.sections,
        library: {
            floor:         inferFloor(concept.library_section),
            section:       concept.library_section,
            shelf:         concept.shelf,
            full_location: `${inferFloor(concept.library_section)} → ${concept.library_section} → ${concept.shelf}`
        }
    }))

    return res.json({
        slug,
        concept_name: concept.name,
        subject:      concept.subject_name,
        semester:     concept.semester,
        primary_book: {
            title: concept.book_title,
            isbn:  concept.book_isbn,
            library: {
                floor:         inferFloor(concept.library_section),
                section:       concept.library_section,
                shelf:         concept.shelf,
                full_location: `${inferFloor(concept.library_section)} → ${concept.library_section} → ${concept.shelf}`
            }
        },
        total_books: books.length,
        books
    })
}

// ─── GET /api/library/:slug ──────────────────────────────────────────────────────
// Returns just the physical library location for a concept slug
export function getLibraryLocation(req, res) {
    const { slug } = req.params
    const concept = conceptBySlug[slug]

    if (!concept) {
        return res.status(404).json({ error: `Concept not found: ${slug}` })
    }

    const floor = inferFloor(concept.library_section)
    return res.json({
        slug,
        concept_name: concept.name,
        subject:      concept.subject_name,
        book_title:   concept.book_title,
        book_isbn:    concept.book_isbn,
        location: {
            floor,
            section:       concept.library_section,
            shelf:         concept.shelf,
            full_location: `${floor} → ${concept.library_section} → ${concept.shelf}`
        }
    })
}

// ─── Helper ──────────────────────────────────────────────────────────────────────
function inferFloor(section) {
    if (!section) return 'Ground Floor'
    const code = section.replace('Section ', '').trim().toUpperCase().charCodeAt(0) - 65
    if (code <= 5)  return 'Ground Floor'
    if (code <= 11) return 'First Floor'
    if (code <= 17) return 'Second Floor'
    return 'Third Floor'
}
