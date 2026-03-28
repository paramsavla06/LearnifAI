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

    // Ensure testType fits database constraints (schema: 'subject' | 'deep_diagnostic' | 'profile')
    const validTypes = {
        'profile':         'profile',
        'subject':         'subject',
        'diagnostic':      'subject',      // 'diagnostic' is not in the schema enum — map to 'subject'
        'deep_diagnostic': 'deep_diagnostic'
    };
    const safeTestType = validTypes[testType] || 'subject';
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
        // NOTE: question_id is nullable in the schema — JSON-based questions have no DB id.
        // Only attempt_id + concept_slug are required for the knowledge graph to work.
        const rows = answers.map(a => ({
            attempt_id:      attemptId,
            concept_slug:    a.concept_slug || a.slug || null,
            question_id:     a.question_id || null,   // nullable FK — null is fine for JSON questions
            selected_option: a.selected_option || a.selectedOption || null,
            is_correct:      a.is_correct ?? (a.selected_option === a.correct_option || a.selectedOption === a.correctOption)
        }));

        // Only require attempt_id + concept_slug (question_id is intentionally nullable)
        const validRows = rows.filter(row => {
            const ok = row.attempt_id && row.concept_slug;
            if (!ok) console.warn('[user_answers] Invalid row dropped:', JSON.stringify(row));
            return ok;
        });

        console.log(`[user_answers] Inserting ${validRows.length}/${rows.length} rows`);
        if (validRows.length === 0) {
            console.error('[user_answers] All rows invalid — concept_slug is probably missing');
            if (rows.length > 0) {
                console.error('[user_answers] Raw input sample:', JSON.stringify(rows[0], null, 2));
            }
        } else {
            const { data, error: answersError } = await supabase
                .from('user_answers')
                .insert(validRows)
                .select();

            if (answersError) {
                console.error('[user_answers] Insert failed:', answersError.message);
                console.error('[user_answers] Sample row:', JSON.stringify(validRows[0], null, 2));
            } else {
                console.log(`[user_answers] Successfully inserted ${data?.length || validRows.length} rows`);
            }
        }
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

    // ── 6. Fire-and-forget: rebuild knowledge graph for this student ───────────
    // Does NOT block the response — runs in background
    fetch(`http://localhost:3002/api/graph?userId=${encodeURIComponent(userId)}&rebuild=true`)
        .catch(e => console.warn('[Graph] Background rebuild failed (non-fatal):', e.message))

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
