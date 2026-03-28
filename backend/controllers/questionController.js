import { questionsBySlug, conceptBySlug } from '../services/dataLoader.js'

export function getQuestions(req, res) {
    const { slug } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 3, 10)

    if (slug === 'all') {
        // Return all available slugs for test builder
        const slugs = Object.keys(questionsBySlug)
        return res.json({ slugs, total: slugs.length })
    }

    const allQs = questionsBySlug[slug]
    if (!allQs || allQs.length === 0) {
        return res.status(404).json({ error: `No questions found for slug: ${slug}` })
    }

    // Shuffle and limit
    const shuffled = [...allQs].sort(() => Math.random() - 0.5).slice(0, limit)

    // Return questions WITHOUT the answer (for frontend)
    const questions = shuffled.map(q => ({
        slug: q.slug,
        question: q.q,
        options: { a: q.a, b: q.b, c: q.c, d: q.d },
        difficulty: q.diff,
        correct_option: q.ans   // Include for result checking
    }))

    const concept = conceptBySlug[slug]
    return res.json({
        slug,
        concept_name: concept?.name || slug,
        subject: concept?.subject_name || 'Unknown',
        library_section: concept?.library_section,
        shelf: concept?.shelf,
        questions,
        count: questions.length
    })
}
