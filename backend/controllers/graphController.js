import { supabase } from '../supabase/client.js';

function classifyAccuracy(accuracy) {
    if (accuracy >= 0.7) return 'strong';
    if (accuracy >= 0.4) return 'average';
    return 'weak';
}

// NEW: topological sort (Kahn's) on weak nodes only
function topoSort(weakSlugs, prereqEdges) {
    const slugSet = new Set(weakSlugs);
    const inDegree = Object.fromEntries(weakSlugs.map(s => [s, 0]));
    const adj = {};

    for (const e of prereqEdges) {
        if (!slugSet.has(e.source) || !slugSet.has(e.target)) continue;
        adj[e.target] = adj[e.target] || [];
        adj[e.target].push(e.source);
        inDegree[e.source] = (inDegree[e.source] || 0) + 1;
    }

    const queue = weakSlugs.filter(s => (inDegree[s] || 0) === 0);
    const order = [];
    while (queue.length) {
        const node = queue.shift();
        order.push(node);
        for (const dep of (adj[node] || [])) {
            inDegree[dep]--;
            if (inDegree[dep] === 0) queue.push(dep);
        }
    }
    const remaining = weakSlugs.filter(s => !order.includes(s));
    return [...order, ...remaining];
}

// NEW: called from testController after answers insert
export async function recordCooccurrence(userId, attemptId) {
    const { data: wrong, error } = await supabase
        .from('user_answers')
        .select('concept_slug')
        .eq('attempt_id', attemptId)
        .eq('is_correct', false);

    if (error || !wrong || wrong.length < 2) return;

    const slugs = [...new Set(wrong.map(w => w.concept_slug).filter(Boolean))];
    if (slugs.length < 2) return;

    for (let i = 0; i < slugs.length; i++) {
        for (let j = i + 1; j < slugs.length; j++) {
            await supabase.rpc('increment_cooccurrence', {
                p_user_id: userId,
                p_concept_a: slugs[i],
                p_concept_b: slugs[j]
            });
        }
    }
    console.log(`[CoOccur] Recorded pairs for attempt ${attemptId}`);
}

// GET /api/graph/study-plan?userId=
export async function getStudyPlan(req, res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Step 1: Fetch study plan with concept names
    const { data: plan, error: planErr } = await supabase
        .from('study_plan')
        .select('concept_slug, priority, status, due_date, concepts(name, subjects(name))')
        .eq('user_id', userId)
        .order('priority');

    if (planErr) return res.status(500).json({ error: planErr.message });
    if (!plan || plan.length === 0) return res.json([]);

    // Step 2: Fetch concept_performance for same user (separate query — no FK to study_plan)
    const conceptSlugs = plan.map(p => p.concept_slug);
    const { data: perf } = await supabase
        .from('concept_performance')
        .select('concept_slug, accuracy, bottleneck_score')
        .eq('user_id', userId)
        .in('concept_slug', conceptSlugs);

    // Step 3: Merge performance data into plan entries
    const perfMap = Object.fromEntries((perf || []).map(p => [p.concept_slug, p]));
    const result = plan.map(entry => ({
        ...entry,
        accuracy: perfMap[entry.concept_slug]?.accuracy ?? null,
        bottleneck_score: perfMap[entry.concept_slug]?.bottleneck_score ?? 0,
    }));

    return res.json(result);
}

// NEW: PATCH /api/study-plan
export async function updatePlanStatus(req, res) {
    const { userId, conceptSlug, status } = req.body;
    if (!userId || !conceptSlug || !status)
        return res.status(400).json({ error: 'userId, conceptSlug, status required' });

    const { error } = await supabase
        .from('study_plan')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('concept_slug', conceptSlug);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
}

// NEW: GET /api/cooccurrence?userId=
export async function getCooccurrence(req, res) {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { data, error } = await supabase
        .from('concept_cooccurrence')
        .select('concept_a, concept_b, wrong_together')
        .eq('user_id', userId)
        .order('wrong_together', { ascending: false })
        .limit(5);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
}

// UNCHANGED: rebuildPerformance
async function rebuildPerformance(userId) {
    const { data: answers, error } = await supabase
        .from('user_answers')
        .select(`
            concept_slug,
            is_correct,
            test_attempts!inner(user_id, test_type)
        `)
        .eq('test_attempts.user_id', userId);

    if (error) { console.error('[Graph] user_answers fetch error:', error.message); return; }
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
        user_id: userId,
        concept_slug: slug,
        attempts: p.attempts,
        accuracy: p.attempts > 0 ? parseFloat((p.correct / p.attempts).toFixed(3)) : 0,
        test_type: p.test_type === 'diagnostic' ? 'root' : 'surface',
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

// Exported helper — called directly from testController (no req/res)
export async function rebuildGraph(userId) {
    if (!userId) return;
    try {
        // Rebuild performance first
        await rebuildPerformance(userId);

        const { data: performances } = await supabase
            .from('concept_performance')
            .select(`concept_slug, accuracy, attempts, test_type, concepts!inner(name, subject_id, subjects(name))`)
            .eq('user_id', userId);

        if (!performances || performances.length === 0) return;

        const nodeIds = new Set(performances.map(p => p.concept_slug));
        const nodes = performances.map(p => ({
            id: p.concept_slug,
            label: p.concepts?.name || p.concept_slug,
            subject: p.concepts?.subjects?.name || 'Unknown',
            status: classifyAccuracy(p.accuracy ?? 0),
            accuracy: parseFloat((p.accuracy ?? 0).toFixed(3)),
            attempts: p.attempts,
            test_type: p.test_type || 'surface',
            bottleneck_score: 0
        }));

        const weakSlugs = nodes.filter(n => n.status === 'weak').map(n => n.id);
        let prereqEdges = [];
        if (weakSlugs.length > 0) {
            const { data: prereqs } = await supabase
                .from('concept_prerequisites')
                .select('concept_slug, prerequisite_slug')
                .in('concept_slug', weakSlugs);
            prereqEdges = (prereqs || []).map(p => ({
                id: `prereq-${p.concept_slug}-${p.prerequisite_slug}`,
                source: p.concept_slug,
                target: p.prerequisite_slug,
                type: 'prerequisite'
            }));
        }

        const rootCauseEdges = prereqEdges
            .filter(e => nodeIds.has(e.target))
            .map(e => ({ id: `rootcause-${e.source}-${e.target}`, source: e.source, target: e.target, type: 'root_cause' }));

        const slugArray = Array.from(nodeIds);
        let similarityEdges = [];
        if (slugArray.length > 0) {
            const { data: similarities } = await supabase
                .from('concept_similarity')
                .select('concept_a, concept_b, weight')
                .in('concept_a', slugArray);
            similarityEdges = (similarities || [])
                .filter(s => nodeIds.has(s.concept_b))
                .map(s => ({ id: `similar-${s.concept_a}-${s.concept_b}`, source: s.concept_a, target: s.concept_b, type: 'similar', weight: s.weight }));
        }

        const bottleneckMap = {};
        for (const e of prereqEdges) {
            if (weakSlugs.includes(e.target)) bottleneckMap[e.target] = (bottleneckMap[e.target] || 0) + 1;
        }
        nodes.forEach(n => { n.bottleneck_score = bottleneckMap[n.id] || 0; });

        let cooccEdges = [];
        const { data: coocc } = await supabase
            .from('concept_cooccurrence')
            .select('concept_a, concept_b, wrong_together')
            .eq('user_id', userId);
        cooccEdges = (coocc || [])
            .filter(c => nodeIds.has(c.concept_a) && nodeIds.has(c.concept_b))
            .map(c => ({ id: `coocc-${c.concept_a}-${c.concept_b}`, source: c.concept_a, target: c.concept_b, type: 'cooccurrence', weight: c.wrong_together }));

        const edges = [...prereqEdges, ...rootCauseEdges, ...similarityEdges, ...cooccEdges];

        await supabase.from('user_graph').upsert(
            { user_id: userId, nodes, edges, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        );
        console.log(`[Graph] Rebuilt graph for user ${userId}: ${nodes.length} nodes, ${edges.length} edges`);
    } catch (err) {
        console.warn('[Graph] rebuildGraph error:', err.message);
    }
}

// MOSTLY UNCHANGED: buildGraph — additions marked NEW
export async function buildGraph(req, res) {
    const { userId, rebuild } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
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

        await rebuildPerformance(userId);

        const { data: performances, error: perfErr } = await supabase
            .from('concept_performance')
            .select(`
                concept_slug, accuracy, attempts, test_type,
                concepts!inner(name, subject_id, subjects(name))
            `)
            .eq('user_id', userId);

        if (perfErr) throw perfErr;
        if (!performances || performances.length === 0) {
            return res.json({ nodes: [], edges: [], message: 'No test data yet. Submit a test first.' });
        }

        const nodeIds = new Set(performances.map(p => p.concept_slug));

        // UNCHANGED node shape + NEW bottleneck_score default
        const nodes = performances.map(p => ({
            id: p.concept_slug,
            label: p.concepts?.name || p.concept_slug,
            subject: p.concepts?.subjects?.name || 'Unknown',
            status: classifyAccuracy(p.accuracy ?? 0),
            accuracy: parseFloat((p.accuracy ?? 0).toFixed(3)),
            attempts: p.attempts,
            test_type: p.test_type || 'surface',
            bottleneck_score: 0  // NEW — overwritten below
        }));

        const weakSlugs = nodes.filter(n => n.status === 'weak').map(n => n.id);

        // UNCHANGED prereq edges
        let prereqEdges = [];
        if (weakSlugs.length > 0) {
            const { data: prereqs } = await supabase
                .from('concept_prerequisites')
                .select('concept_slug, prerequisite_slug')
                .in('concept_slug', weakSlugs);
            prereqEdges = (prereqs || []).map(p => ({
                id: `prereq-${p.concept_slug}-${p.prerequisite_slug}`,
                source: p.concept_slug,
                target: p.prerequisite_slug,
                type: 'prerequisite'
            }));
        }

        // UNCHANGED root cause edges
        const rootCauseEdges = prereqEdges
            .filter(e => nodeIds.has(e.target))
            .map(e => ({
                id: `rootcause-${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                type: 'root_cause'
            }));

        // similarity edges
        const slugArray = Array.from(nodeIds);
        let similarityEdges = [];
        if (slugArray.length > 0) {
            try {
                const { data: similarities } = await supabase
                    .from('concept_similarity')
                    .select('concept_a, concept_b, weight')
                    .in('concept_a', slugArray);
                similarityEdges = (similarities || [])
                    .filter(s => nodeIds.has(s.concept_b))
                    .map(s => ({
                        id: `similar-${s.concept_a}-${s.concept_b}`,
                        source: s.concept_a,
                        target: s.concept_b,
                        type: 'similar',
                        weight: s.weight
                    }));
            } catch(e) { console.warn('[Graph] similarity fetch:', e.message); }
        }

        // bottleneck scores
        const bottleneckMap = {};
        for (const e of prereqEdges) {
            if (weakSlugs.includes(e.target)) {
                bottleneckMap[e.target] = (bottleneckMap[e.target] || 0) + 1;
            }
        }
        nodes.forEach(n => { n.bottleneck_score = bottleneckMap[n.id] || 0; });
        // fire-and-forget bottleneck updates
        Promise.all(
            Object.entries(bottleneckMap).map(([slug, score]) =>
                supabase.from('concept_performance')
                    .update({ bottleneck_score: score })
                    .eq('user_id', userId)
                    .eq('concept_slug', slug)
                    .then(() => null)
            )
        ).catch(e => console.warn('[Graph] bottleneck update:', e.message));

        // co-occurrence edges
        let cooccEdges = [];
        try {
            const { data: coocc } = await supabase
                .from('concept_cooccurrence')
                .select('concept_a, concept_b, wrong_together')
                .eq('user_id', userId);
            cooccEdges = (coocc || [])
                .filter(c => nodeIds.has(c.concept_a) && nodeIds.has(c.concept_b))
                .map(c => ({
                    id: `coocc-${c.concept_a}-${c.concept_b}`,
                    source: c.concept_a,
                    target: c.concept_b,
                    type: 'cooccurrence',
                    weight: c.wrong_together
                }));
        } catch(e) { console.warn('[Graph] cooccurrence fetch:', e.message); }

        // accuracy history snapshot (fire-and-forget, truly non-blocking)
        Promise.resolve().then(() =>
            supabase.from('concept_accuracy_history')
                .insert(nodes.map(n => ({
                    user_id: userId,
                    concept_slug: n.id,
                    accuracy: n.accuracy,
                    attempts: n.attempts,
                    snapshot_at: new Date().toISOString()
                })))
        ).catch(e => console.warn('[Graph] history snapshot:', e.message));

        // study plan from topo-sort
        if (weakSlugs.length > 0) {
            const sorted = topoSort(weakSlugs, prereqEdges);
            const planRows = sorted.map((slug, i) => ({
                user_id: userId,
                concept_slug: slug,
                priority: i + 1,
                status: 'pending',
                updated_at: new Date().toISOString()
            }));
            const { error: planErr } = await supabase
                .from('study_plan')
                .upsert(planRows, { onConflict: 'user_id,concept_slug' });
            if (planErr) console.warn('[Graph] study_plan upsert:', planErr.message);
            else console.log(`[Graph] Study plan updated: ${planRows.length} concepts (user: ${userId})`);
        }

        // CHANGED: spread cooccEdges in
        const edges = [...prereqEdges, ...rootCauseEdges, ...similarityEdges, ...cooccEdges];

        await supabase.from('user_graph').upsert(
            { user_id: userId, nodes, edges, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        );

        return res.json({ nodes, edges, cached: false, updated_at: new Date().toISOString() });

    } catch (err) {
        console.error('Graph API error:', err);
        return res.status(500).json({ error: err.message || 'Unknown error' });
    }
}