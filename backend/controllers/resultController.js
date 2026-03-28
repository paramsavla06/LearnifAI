import { supabase } from '../supabase/client.js'
import { getResult as fetchMemResult } from '../services/diagnosticEngine.js'
import { booksBySlug, conceptBySlug } from '../services/dataLoader.js'

// ─── GET /api/result/:userId ────────────────────────────────────────────────────
export async function getResult(req, res) {
    const { userId } = req.params

    // Check in-memory first (freshest — just submitted this session)
    const memResult = fetchMemResult(userId)

    // Also check Supabase for persisted results
    const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

    // Prefer in-memory if available (it always has fresh analysis_text)
    if (memResult) {
        return res.json(memResult)
    }

    // Use Supabase result if it has analysis text
    if (!error && data) {
        const weakTopics   = data.weak_topics   || []
        const strongTopics = data.strong_topics || []

        // Build fallback analysis if Supabase stored null/empty
        let analysisText = data.analysis_text
        if (!analysisText || analysisText.trim() === '') {
            analysisText = buildFallbackAnalysis(weakTopics, strongTopics)
        }

        return res.json({
            userId,
            generatedAt:   data.generated_at,
            weak_topics:   weakTopics,
            strong_topics: strongTopics,
            root_causes:   data.root_causes || [], // New
            analysis_text: analysisText,
            ai_analysis:   analysisText, // Alias for UI
            books:         weakTopics.map(w => w.books || []).flat(), // Aggregated books
            mastery_summary: {
                overall_pct:  data.mastery_pct || 0,
                weak_count:   weakTopics.length,
                strong_count: strongTopics.length
            }
        })
    }

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

// ─── Fallback analysis builder (for old Supabase rows with null analysis) ────────
function buildFallbackAnalysis(weakTopics, strongTopics) {
    if (weakTopics.length === 0 && strongTopics.length === 0) {
        return 'No test data found yet. Complete a diagnostic to see your analysis.'
    }

    const total   = weakTopics.length + strongTopics.length
    const pct     = total > 0 ? Math.round((strongTopics.length / total) * 100) : 0
    const weakNames   = weakTopics.slice(0, 3).map(t => t.name || t.slug).join(', ')
    const strongNames = strongTopics.slice(0, 3).map(t => t.name || t.slug).join(', ')

    let text = ''

    if (weakTopics.length > 0) {
        text += `⚠️ Concepts needing attention (${weakTopics.length}): ${weakNames}`
        if (weakTopics.length > 3) text += ` and ${weakTopics.length - 3} more`
        text += '.\n'
        // Add top book recommendation if available
        const top = weakTopics[0]
        if (top?.books?.length > 0) {
            const b = top.books[0]
            text += `   → Focus on "${top.name}" first. Refer to "${b.title}" by ${b.author}`
            if (b.library) text += ` [ ${b.library.section}, ${b.library.shelf}, ${b.library.floor} ]`
            text += '.\n'
        }
    }

    if (strongTopics.length > 0) {
        text += `\n✅ Strong areas (${strongTopics.length}): ${strongNames}`
        if (strongTopics.length > 3) text += ` and ${strongTopics.length - 3} more`
        text += '.\n'
    }

    text += `\n📊 Overall mastery: ${pct}% (${strongTopics.length}/${total} concepts cleared).`
    return text.trim()
}
