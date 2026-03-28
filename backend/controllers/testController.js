import { supabase } from '../supabase/client.js'
import { recordAttempts, generateResult } from '../services/diagnosticEngine.js'

export async function submitTest(req, res) {
    const { userId, userProfile, answers, testType } = req.body

    if (!userId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'userId and answers[] are required' })
    }

    // ── 1. Upsert user profile if provided (Test 1 data) ─────────────────────
    if (userProfile) {
        await supabase
            .from('users')
            .upsert({ id: userId, ...userProfile }, { onConflict: 'id' })
    }

    // ── 2. Create test attempt record ──────────────────────────────────────────
    let attemptId = null
    const { data: attempt, error: attemptErr } = await supabase
        .from('test_attempts')
        .insert({ user_id: userId, test_type: testType || 'diagnostic', submitted_at: new Date().toISOString() })
        .select('id')
        .single()

    if (!attemptErr && attempt) {
        attemptId = attempt.id

        // ── 3. Save individual answers ─────────────────────────────────────────
        const rows = answers.map(a => ({
            attempt_id:     attemptId,
            concept_slug:   a.slug,
            question_id:    a.question_id || null,
            selected_option: a.selectedOption,
            is_correct:     a.selectedOption === a.correctOption
        }))

        await supabase.from('user_answers').insert(rows)
    } else {
        console.warn('[Test] Could not save attempt to Supabase:', attemptErr?.message)
    }

    // ── 4. Run diagnostic engine ───────────────────────────────────────────────
    recordAttempts(userId, answers)
    const result = generateResult(userId, userProfile)

    // ── 5. Persist result to Supabase ──────────────────────────────────────────
    await supabase.from('results').upsert({
        user_id:       userId,
        weak_topics:   result.weak_topics,
        strong_topics: result.strong_topics,
        mastery_pct:   result.mastery_summary.overall_pct,
        analysis_text: result.analysis_text,
        generated_at:  result.generatedAt
    }, { onConflict: 'user_id' })

    return res.json({
        success: true,
        testType:         testType || 'diagnostic',
        attempt_id:       attemptId,
        answersRecorded:  answers.length,
        result_summary: {
            weak_count:  result.weak_topics.length,
            strong_count: result.strong_topics.length,
            mastery_pct: result.mastery_summary.overall_pct
        },
        message: `Test saved. ${result.weak_topics.length} weak topic(s) identified. GET /api/result/${userId}`
    })
}
