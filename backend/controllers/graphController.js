import { supabase } from '../supabase/client.js';

// ── Classify accuracy into node status ──────────────────────────────────────────
function classifyAccuracy(accuracy) {
    if (accuracy >= 0.7) return 'strong';
    if (accuracy >= 0.4) return 'average';
    return 'weak';
}

// ── Build concept_performance from user_answers (per student) ─────────────────
async function rebuildPerformance(userId) {
    const { data: answers, error } = await supabase
        .from('user_answers')
        .select(`
            concept_slug,
            is_correct,
            test_attempts!inner(user_id, test_type)
        `)
        .eq('test_attempts.user_id', userId);

    if (error) {
        console.error('[Graph] user_answers fetch error:', error.message);
        return;
    }
    if (!answers || !answers.length) return;

    const perf = {};
    for (const a of answers) {
        const slug = a.concept_slug;
        if (!slug) continue;
        if (!perf[slug]) perf[slug] = { attempts: 0, correct: 0, test_type: a.test_attempts?.test_type || 'surface' };
        perf[slug].attempts++;
        if (a.is_correct) perf[slug].correct++;
    }

    const rows = Object.entries(perf).map(([slug, p]) => ({
        user_id:      userId,
        concept_slug: slug,
        attempts:     p.attempts,
        accuracy:     p.attempts > 0 ? parseFloat((p.correct / p.attempts).toFixed(3)) : 0,
        test_type:    p.test_type === 'diagnostic' ? 'root' : 'surface',
        last_updated: new Date().toISOString()
    }));

    if (rows.length > 0) {
        const { error: upsertErr } = await supabase
            .from('concept_performance')
            .upsert(rows, { onConflict: 'user_id,concept_slug' });

        if (upsertErr) console.error('[Graph] concept_performance upsert error:', upsertErr.message);
        else console.log(`[Graph] Rebuilt performance for ${rows.length} concepts (user: ${userId})`);
    }
}

// ── Main graph builder ────────────────────────────────────────────────────────
export async function buildGraph(req, res) {
    const { userId, rebuild } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        // If not rebuilding, try to return cached graph
        if (rebuild !== 'true') {
            const { data: cached } = await supabase
                .from('user_graph')
                .select('nodes, edges, updated_at')
                .eq('user_id', userId)
                .single();

            if (cached?.nodes?.length > 0) {
                return res.json({ nodes: cached.nodes, edges: cached.edges, cached: true, updated_at: cached.updated_at });
            }
        }

        // 1. Rebuild concept_performance from raw answers
        await rebuildPerformance(userId);

        // 2. Fetch concept_performance for this user
        const { data: performances, error: perfErr } = await supabase
            .from('concept_performance')
            .select(`
                concept_slug,
                accuracy,
                attempts,
                test_type,
                concepts!inner (
                    name,
                    subject_id,
                    subjects (name)
                )
            `)
            .eq('user_id', userId);

        if (perfErr) throw perfErr;

        if (!performances || performances.length === 0) {
            return res.json({ nodes: [], edges: [], message: 'No test data yet. Submit a test first.' });
        }

        const nodeIds = new Set(performances.map(p => p.concept_slug));

        // 3. Build nodes
        const nodes = performances.map(p => ({
            id:        p.concept_slug,
            label:     p.concepts?.name || p.concept_slug,
            subject:   p.concepts?.subjects?.name || 'Unknown',
            status:    classifyAccuracy(p.accuracy ?? 0),
            accuracy:  parseFloat((p.accuracy ?? 0).toFixed(3)),
            attempts:  p.attempts,
            test_type: p.test_type || 'surface'
        }));

        const weakSlugs = nodes.filter(n => n.status === 'weak').map(n => n.id);

        // 4. Prerequisite edges (weak concepts only)
        let prereqEdges = [];
        if (weakSlugs.length > 0) {
            const { data: prereqs } = await supabase
                .from('concept_prerequisites')
                .select('concept_slug, prerequisite_slug')
                .in('concept_slug', weakSlugs);

            prereqEdges = (prereqs || []).map(p => ({
                id:     `prereq-${p.concept_slug}-${p.prerequisite_slug}`,
                source: p.concept_slug,
                target: p.prerequisite_slug,
                type:   'prerequisite'
            }));
        }

        // 5. Root cause edges (weak → weak prerequisite)
        const rootCauseEdges = prereqEdges
            .filter(e => nodeIds.has(e.target))
            .map(e => ({
                id:     `rootcause-${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                type:   'root_cause'
            }));

        // 6. Similarity edges
        const slugArray = Array.from(nodeIds);
        let similarityEdges = [];
        if (slugArray.length > 0) {
            const { data: similarities } = await supabase
                .from('concept_similarity')
                .select('concept_a, concept_b, weight')
                .or(`concept_a.in.(${slugArray.join(',')}),concept_b.in.(${slugArray.join(',')})`);

            similarityEdges = (similarities || [])
                .filter(s => nodeIds.has(s.concept_a) && nodeIds.has(s.concept_b))
                .map(s => ({
                    id:     `similar-${s.concept_a}-${s.concept_b}`,
                    source: s.concept_a,
                    target: s.concept_b,
                    type:   'similar',
                    weight: s.weight
                }));
        }

        // 7. Combine all edges
        const edges = [...prereqEdges, ...rootCauseEdges, ...similarityEdges];

        // 8. Upsert into user_graph
        await supabase
            .from('user_graph')
            .upsert({
                user_id:    userId,
                nodes,
                edges,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        return res.json({ nodes, edges, cached: false, updated_at: new Date().toISOString() });

    } catch (err) {
        console.error('Graph API error:', err);
        return res.status(500).json({ error: err.message || 'Unknown error' });
    }
}