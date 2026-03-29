/**
 * LearnifAI Backend — Entry Point
 * Port 3002 (avoids conflict with HeyGen avatar server on 3001)
 *
 * Diagnostic Engine powered by param branch ML model (graph_db.py concepts)
 * Questions from ojayit branch (quiz_store.py)
 * Library data from ojayit (recommended_books.json + graph_db.py sections)
 * Database: Supabase (PostgreSQL) — project cshohdlkebswljqcvnsx
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import express from 'express'
import cors from 'cors'

// Load .env from parent directory (clone2/)
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })

import { supabase } from './supabase/client.js'
import { conceptsData, questionsData } from './services/dataLoader.js'

import usersRouter from './routes/users.js'
import subjectsRouter from './routes/subjects.js'
import questionsRouter from './routes/questions.js'
import testsRouter from './routes/tests.js'
import resultsRouter from './routes/results.js'
import authRouter from './routes/auth.js'
import dashboardRoutes from "./routes/dashboardRoutes.js";
import graphRouter from './routes/graph.js'
import programRoutes from './routes/programs.js'
import studyPlanRoutes from './routes/studyPlan.js'

const app = express()
const PORT = process.env.PORT || 3002

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
  ].filter(Boolean)
}))
app.use(express.json())

// ── Request logger ─────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
})

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/user', usersRouter)
app.use('/api/subjects', subjectsRouter)
app.use('/api/questions', questionsRouter)
app.use('/api', testsRouter)
app.use('/api', resultsRouter)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/graph', graphRouter)
app.use('/api/programs', programRoutes)
app.use('/api/study-plan', studyPlanRoutes)

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
    res.json({ status: 'ok', version: '1.0.0', engine: 'LearnifAI Diagnostic v1' })
)

// ── Activity Tracking ──────────────────────────────────────────────────────────
app.post('/api/activity/track', async (req, res) => {
    try {
        const { userId } = req.body
        if (!userId) return res.status(400).json({ error: 'userId required' })

        const { error } = await supabase.from('activity_pings').insert([{ user_id: userId }])
        if (error) throw error

        res.json({ success: true, timestamp: new Date().toISOString() })
    } catch (e) {
        console.error('Activity track error:', e.message)
        res.status(500).json({ error: 'Failed to log activity' })
    }
})

app.get('/api/health/llm', async (req, res) => {
    try {
        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) throw new Error('Ollama not responding properly');
        
        const data = await response.json();
        const models = data.models ? data.models.map(m => m.name) : [];
        
        res.json({ 
            ollama: true, 
            local_mode_enabled: process.env.USE_LOCAL_LLM === 'true',
            models 
        });
    } catch (e) {
        res.json({ 
            ollama: false, 
            local_mode_enabled: process.env.USE_LOCAL_LLM === 'true',
            error: e.message 
        });
    }
})

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Sync helpers ───────────────────────────────────────────────────────────────
async function syncSubjectsToSupabase(subjects) {
    console.log('[Sync] Syncing subjects to Supabase...')
    const rows = subjects.map(s => ({
        name: s.name,
        description: s.description ?? null,
        branch: s.branch ?? null
    }))
    const { error } = await supabase.from('subjects').upsert(rows, { onConflict: 'name' })
    if (error) console.error('[Sync] Subjects sync failed:', error.message)
    else console.log(`[Sync] ✅ Synced ${rows.length} subjects`)
}

async function syncConceptsToSupabase(subjects) {
    console.log('[Sync] Syncing concepts to Supabase...')

    // Fetch subject name→id map from Supabase (just inserted above)
    const { data: subjectRows, error: subErr } = await supabase.from('subjects').select('id, name')
    if (subErr) { console.error('[Sync] Could not fetch subject IDs:', subErr.message); return }

    const subjectIdMap = {}
    for (const s of subjectRows) subjectIdMap[s.name] = s.id

    const rows = []
    for (const subject of subjects) {
        const subject_id = subjectIdMap[subject.name]
        if (!subject_id) { console.warn(`[Sync] No subject_id for "${subject.name}", skipping concepts`); continue }
        for (const c of subject.concepts) {
            rows.push({
                slug: c.slug,
                name: c.name,
                subject_id,
                difficulty: c.difficulty ?? 2,
                semester: c.semester ?? null
            })
        }
    }

    const { error } = await supabase.from('concepts').upsert(rows, { onConflict: 'slug' })
    if (error) console.error('[Sync] Concepts sync failed:', error.message)
    else console.log(`[Sync] ✅ Synced ${rows.length} concepts`)
}

async function syncQuestionsToSupabase(questions) {
    console.log('[Sync] Syncing questions to Supabase...')

    // Fetch existing (concept_slug, question_text) pairs to avoid true duplicates
    const { data: existing } = await supabase.from('questions').select('concept_slug, question_text')
    const existingSet = new Set((existing || []).map(q => `${q.concept_slug}||${q.question_text}`))

    const rows = questions
        .filter(q => !existingSet.has(`${q.slug}||${q.q}`))
        .map(q => ({
            concept_slug: q.slug,
            question_text: q.q,
            option_a: q.a,
            option_b: q.b,
            option_c: q.c,
            option_d: q.d,
            correct_option: q.ans,
            difficulty: q.diff ?? 2,
            test_level: 'surface'
        }))

    if (rows.length === 0) {
        console.log('[Sync] ✅ Questions already up-to-date, nothing to insert')
        return
    }

    const { error } = await supabase.from('questions').insert(rows)
    if (error) console.error('[Sync] Questions sync failed:', error.message)
    else console.log(`[Sync] ✅ Synced ${rows.length} new questions`)
}

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅ LearnifAI API running → http://localhost:${PORT}`)
    
    // Run sync in background so server starts immediately
    (async () => {
        try {
            console.log('[Sync] Starting background synchronization...')
            await syncSubjectsToSupabase(conceptsData.subjects)
            await syncConceptsToSupabase(conceptsData.subjects)
            await syncQuestionsToSupabase(questionsData)
            console.log('[Sync] ✅ Background sync complete')
        } catch (e) {
            console.error('[Sync] ❌ Background sync failed:', e.message)
        }
    })()
})

