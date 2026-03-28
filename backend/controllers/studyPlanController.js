import { supabase } from '../supabase/client.js'

// GET /api/study-plan?userId=
export async function getStudyPlan(req, res) {
    try {
        const { userId } = req.query
        if (!userId) return res.status(400).json({ error: 'userId required' })

        // 1. Fetch user to get field
        const { data: user, error: userErr } = await supabase
            .from('users')
            .select('id, field')
            .eq('id', userId)
            .single()

        if (userErr) return res.status(500).json({ error: userErr.message })
        const userField = user?.field || 'Science'

        // 2. Fetch concept_performance for userId, join concepts + subjects
        const { data: perf, error: perfErr } = await supabase
            .from('concept_performance')
            .select(`
                concept_slug, accuracy, attempts,
                bottleneck_score, next_review_at,
                concepts!inner(name, subject_id, subjects(name, branch))
            `)
            .eq('user_id', userId)

        if (perfErr) return res.status(500).json({ error: perfErr.message })

        // 3. Fetch concept_prerequisites for all user concept slugs
        const allSlugs = (perf || []).map(p => p.concept_slug)
        let prereqEdges = []
        if (allSlugs.length > 0) {
            const { data: prereqs } = await supabase
                .from('concept_prerequisites')
                .select('concept_slug, prerequisite_slug')
                .in('concept_slug', allSlugs)
            prereqEdges = (prereqs || []).map(p => ({
                from: p.concept_slug,
                to: p.prerequisite_slug,
                type: 'prerequisite'
            }))
        }

        // 4. If no performance data, seed study_plan from field-matching concepts
        if (!perf || perf.length === 0) {
            const { data: fieldConcepts } = await supabase
                .from('concepts')
                .select('slug, name, difficulty, subjects!inner(name, branch)')
                .eq('subjects.branch', userField)

            if (fieldConcepts && fieldConcepts.length > 0) {
                const seedRows = fieldConcepts.map(c => ({
                    user_id: userId,
                    concept_slug: c.slug,
                    priority: c.difficulty || 2,
                    status: 'pending'
                }))
                await supabase.from('study_plan').upsert(seedRows, { onConflict: 'user_id,concept_slug' })
            }

            return res.json({
                total: fieldConcepts?.length || 0,
                strong: 0, average: 0, weak: 0,
                weakConcepts: [],
                nodes: (fieldConcepts || []).map(c => ({
                    concept_slug: c.slug,
                    name: c.name,
                    subject: c.subjects?.name || '',
                    accuracy: 0,
                    attempts: 0,
                    bottleneck_score: 0,
                    next_review_at: null,
                    status: 'pending',
                    priority: c.difficulty || 2,
                    mastery: 'weak'
                })),
                edges: []
            })
        }

        // 5. Classify nodes
        const classify = (acc) => {
            if (acc >= 0.7) return 'strong'
            if (acc >= 0.4) return 'average'
            return 'weak'
        }

        // 6. Fetch study plan statuses
        const { data: plan } = await supabase
            .from('study_plan')
            .select('concept_slug, status, priority')
            .eq('user_id', userId)

        const planMap = Object.fromEntries((plan || []).map(p => [p.concept_slug, p]))

        const nodes = perf.map(p => {
            const acc = parseFloat((p.accuracy ?? 0).toFixed(3))
            const mastery = classify(acc)
            const planEntry = planMap[p.concept_slug] || {}
            return {
                concept_slug: p.concept_slug,
                name: p.concepts?.name || p.concept_slug,
                subject: p.concepts?.subjects?.name || '',
                accuracy: acc,
                attempts: p.attempts || 0,
                bottleneck_score: p.bottleneck_score || 0,
                next_review_at: p.next_review_at || null,
                status: planEntry.status || 'pending',
                priority: planEntry.priority || 99,
                mastery
            }
        })

        const strong  = nodes.filter(n => n.mastery === 'strong').length
        const average = nodes.filter(n => n.mastery === 'average').length
        const weak    = nodes.filter(n => n.mastery === 'weak').length

        const weakConcepts = nodes
            .filter(n => n.mastery === 'weak')
            .map(n => ({ slug: n.concept_slug, name: n.name, subject: n.subject }))

        return res.json({
            total: nodes.length,
            strong, average, weak,
            weakConcepts,
            nodes,
            edges: prereqEdges
        })
    } catch (e) {
        console.error('[StudyPlan] getStudyPlan error:', e)
        return res.status(500).json({ error: e.message })
    }
}

// POST /api/study-plan/update
export async function updateStudyPlan(req, res) {
    try {
        const { userId, conceptSlug, status } = req.body
        if (!userId || !conceptSlug || !status)
            return res.status(400).json({ error: 'userId, conceptSlug, status required' })

        // 1. Update study_plan status
        const { error: updateErr } = await supabase
            .from('study_plan')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('concept_slug', conceptSlug)

        if (updateErr) return res.status(500).json({ error: updateErr.message })

        let next_review_at = null

        // 2. If done, apply SM-2 spaced repetition
        if (status === 'done') {
            const { data: cp } = await supabase
                .from('concept_performance')
                .select('ease_factor, interval_days, review_count')
                .eq('user_id', userId)
                .eq('concept_slug', conceptSlug)
                .single()

            const ease_factor   = cp?.ease_factor   ?? 2.5
            const interval_days = cp?.interval_days ?? 1
            const review_count  = cp?.review_count  ?? 0

            const new_interval = Math.round(interval_days * ease_factor)
            const new_ease     = Math.max(1.3, ease_factor - 0.1)
            next_review_at     = new Date(Date.now() + new_interval * 86400000).toISOString()

            await supabase
                .from('concept_performance')
                .update({
                    next_review_at,
                    interval_days: new_interval,
                    ease_factor:   new_ease,
                    review_count:  review_count + 1
                })
                .eq('user_id', userId)
                .eq('concept_slug', conceptSlug)
        }

        return res.json({ success: true, next_review_at })
    } catch (e) {
        console.error('[StudyPlan] updateStudyPlan error:', e)
        return res.status(500).json({ error: e.message })
    }
}
