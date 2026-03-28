import { supabase } from '../supabase/client.js'
import { recordAttempts, generateResult } from '../services/diagnosticEngine.js'

export async function submitTest(req, res) {
    const { userId, userProfile, answers, testType } = req.body

    if (!userId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'userId and answers[] are required' })
    }

    // ── 1. Upsert user profile if provided (Test 1 data) ─────────────────────
    if (userProfile) {
        // Strip out 'semester' or other extra frontend fields not in 'users' table
        const { error: userErr } = await supabase
            .from('users')
            .upsert({ 
                id: userId, 
                name: userProfile.name || 'Anonymous',
                year: userProfile.year,
                branch: userProfile.branch,
                roll_no: userProfile.roll_no,
                email: userProfile.email 
            }, { onConflict: 'id' })
        
        if (userErr) {
            console.error('[DEBUG] Failed to upsert user profile:', userErr.message)
        }
    }

    // Ensure testType fits database constraints
    const validTypes = {
        'profile': 'profile',
        'subject': 'subject',
        'diagnostic': 'diagnostic',
        'deep_diagnostic': 'diagnostic'
    };
    const safeTestType = validTypes[testType] || 'diagnostic';
    console.log("[DEBUG] TEST TYPE BEING SENT TO DB:", safeTestType);

    // ── 2. Create test attempt record ──────────────────────────────────────────
    let attemptId = null
    const { data: attempt, error: attemptErr } = await supabase
        .from('test_attempts')
        .insert({ 
            user_id: userId, 
            test_type: safeTestType, 
            submitted_at: new Date().toISOString() 
        })
        .select('id')
        .single()

    if (!attemptErr && attempt) {
        attemptId = attempt.id

        // ── 3. Save individual answers ─────────────────────────────────────────
        const rows = answers.map(a => ({
            attempt_id:      attemptId,
            concept_slug:    a.concept_slug  || a.slug || null,          // ✅ new name, old fallback
            question_id:     a.question_id  || null,
            selected_option: a.selected_option || a.selectedOption || null, // ✅ new name, old fallback
            is_correct:      a.is_correct    ?? (a.selectedOption === a.correctOption) // ✅ new name, old fallback
        }))
        console.log('[DEBUG] Saving answers rows:', JSON.stringify(rows, null, 2))
        await supabase.from('user_answers').insert(rows)
    } else {
        console.warn('[Test] Could not save attempt to Supabase:', attemptErr?.message)
    }

    // ── 4. Run diagnostic engine ───────────────────────────────────────────────
    recordAttempts(userId, answers)
    const result = await generateResult(userId, userProfile)

    // ── 5. Persist result to Supabase ──────────────────────────────────────────
    await supabase.from('results').upsert({
        user_id:       userId,
        weak_topics:   result.weak_topics,
        strong_topics: result.strong_topics,
        root_causes:   result.root_causes, // New column handling
        mastery_pct:   result.mastery_summary.overall_pct,
        analysis_text: result.analysis_text,
        generated_at:  result.generatedAt
    }, { onConflict: 'user_id' })

    return res.json({
        success:          true,
        testType:         testType || 'diagnostic',
        attempt_id:       attemptId,
        answersRecorded:  answers.length,
        // ✅ Return full objects so frontend can render without a second GET
        weak_topics:      result.weak_topics,
        strong_topics:    result.strong_topics,
        root_causes:      result.root_causes,
        books:            result.weak_topics.map(t => t.books).flat(),
        ai_analysis:      result.analysis_text,
        analysis_text:    result.analysis_text,
        mastery_summary:  result.mastery_summary,
        result_summary: {
            weak_count:   result.weak_topics.length,
            strong_count: result.strong_topics.length,
            mastery_pct:  result.mastery_summary.overall_pct
        },
        message: `Test saved. ${result.weak_topics.length} weak topic(s) identified.`
    })
}
