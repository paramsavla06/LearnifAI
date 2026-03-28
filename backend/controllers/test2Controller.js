import { supabase } from '../supabase/client.js'

// GET /api/test2?userId=
export async function getTest2Questions(req, res) {
    try {
        const { userId } = req.query
        if (!userId) return res.status(400).json({ error: 'userId required' })

        // 1. Fetch weak concepts (accuracy < 0.4) for this user
        const { data: weakPerf, error: weakErr } = await supabase
            .from('concept_performance')
            .select('concept_slug, accuracy')
            .eq('user_id', userId)
            .lt('accuracy', 0.4)

        if (weakErr) return res.status(500).json({ error: weakErr.message })

        const weakSlugs = (weakPerf || []).map(p => p.concept_slug)

        // 2. If no weak concepts, return early
        if (weakSlugs.length === 0) {
            return res.json({
                questions: [],
                weakConcepts: [],
                rootConcepts: [],
                weakToRootMap: {},
                totalQuestions: 0,
                message: 'No Test 2 needed — no weak concepts found'
            })
        }

        // 3. Find prerequisites of weak concepts
        const { data: prereqLinks, error: prereqErr } = await supabase
            .from('concept_prerequisites')
            .select('concept_slug, prerequisite_slug')
            .in('concept_slug', weakSlugs)

        if (prereqErr) return res.status(500).json({ error: prereqErr.message })

        // 4. Build weakToRootMap: { weakSlug: [rootSlugs] }
        const weakToRootMap = {}
        const rootSlugSet = new Set()

        for (const link of (prereqLinks || [])) {
            const weakSlug = link.concept_slug
            const rootSlug = link.prerequisite_slug
            if (!weakToRootMap[weakSlug]) weakToRootMap[weakSlug] = []
            weakToRootMap[weakSlug].push(rootSlug)
            rootSlugSet.add(rootSlug)
        }

        // 5. Weak concepts with NO prerequisites → they ARE the root (test them directly)
        const selfRootSlugs = []
        for (const slug of weakSlugs) {
            if (!weakToRootMap[slug]) {
                weakToRootMap[slug] = [slug]
                rootSlugSet.add(slug)
                selfRootSlugs.push(slug)
            }
        }

        const rootConcepts = [...rootSlugSet]
        const prereqOnlyRoots = rootConcepts.filter(s => !selfRootSlugs.includes(s))

        // 6a. Fetch root-level questions for proper prerequisite roots
        const { data: rootQuestions } = prereqOnlyRoots.length > 0
            ? await supabase
                .from('questions')
                .select('id, concept_slug, question_text, option_a, option_b, option_c, option_d, correct_option, difficulty, test_level')
                .in('concept_slug', prereqOnlyRoots)
                .eq('test_level', 'root')
                .order('difficulty', { ascending: true })
            : { data: [] }

        // 6b. For self-root (no prerequisites) concepts — fetch ANY questions ordered easiest first
        //     Prefer test_level='root' questions; fall back to surface-level difficulty 1-2 (foundational)
        let selfRootQuestions = []
        if (selfRootSlugs.length > 0) {
            const { data: srRootQ } = await supabase
                .from('questions')
                .select('id, concept_slug, question_text, option_a, option_b, option_c, option_d, correct_option, difficulty, test_level')
                .in('concept_slug', selfRootSlugs)
                .eq('test_level', 'root')
                .order('difficulty', { ascending: true })

            const srRootBySlug = {}
            for (const q of (srRootQ || [])) {
                if (!srRootBySlug[q.concept_slug]) srRootBySlug[q.concept_slug] = []
                srRootBySlug[q.concept_slug].push(q)
            }

            // For concepts that had no root questions, fall back to surface-level (easiest difficulty)
            const missingRootSlugs = selfRootSlugs.filter(s => !srRootBySlug[s]?.length)
            let fallbackQ = []
            if (missingRootSlugs.length > 0) {
                const { data: surfaceQ } = await supabase
                    .from('questions')
                    .select('id, concept_slug, question_text, option_a, option_b, option_c, option_d, correct_option, difficulty, test_level')
                    .in('concept_slug', missingRootSlugs)
                    .lte('difficulty', 2)                   // foundational surface questions
                    .order('difficulty', { ascending: true })
                fallbackQ = surfaceQ || []
            }

            selfRootQuestions = [...Object.values(srRootBySlug).flat(), ...fallbackQ]
        }

        // 7. Merge all questions and cap at 5 per concept_slug
        const allCandidates = [...(rootQuestions || []), ...selfRootQuestions]
        const countByConcept = {}
        const cappedQuestions = []
        for (const q of allCandidates) {
            const count = countByConcept[q.concept_slug] || 0
            if (count < 5) {
                cappedQuestions.push(q)
                countByConcept[q.concept_slug] = count + 1
            }
        }

        // 8. Strip correct_option before returning
        const safeQuestions = cappedQuestions.map(({ correct_option, ...rest }) => rest)

        const covered = new Set(safeQuestions.map(q => q.concept_slug))
        const missing  = rootConcepts.filter(s => !covered.has(s))

        return res.json({
            questions:      safeQuestions,
            weakConcepts:   weakSlugs,
            rootConcepts,
            weakToRootMap,
            totalQuestions: safeQuestions.length,
            missingQuestions: missing,   // root concepts with no questions at all (debug info)
            message: safeQuestions.length > 0
                ? `Test 2 ready — ${weakSlugs.length} weak concept(s), ${rootConcepts.length} root concept(s), ${safeQuestions.length} question(s)`
                : `No questions found for ${rootConcepts.length} root concept(s). Please seed root-level or surface questions for: ${rootConcepts.join(', ')}`
        })
    } catch (e) {
        console.error('[Test2] getTest2Questions error:', e)
        return res.status(500).json({ error: e.message })
    }
}
