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

import usersRouter from './routes/users.js'
import subjectsRouter from './routes/subjects.js'
import questionsRouter from './routes/questions.js'
import testsRouter from './routes/tests.js'
import resultsRouter from './routes/results.js'
import authRouter from './routes/auth.js'
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express()
const PORT = 3002

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors())
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
app.use("/api/dashboard", dashboardRoutes);

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
    res.json({ status: 'ok', version: '1.0.0', engine: 'LearnifAI Diagnostic v1' })
)

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅ LearnifAI API running → http://localhost:${PORT}`)
    console.log(`   - Subjects:  GET  /api/subjects`)
    console.log(`   - User:      POST /api/user`)
    console.log(`   - Questions: GET  /api/questions/:testId`)
    console.log(`   - Submit:    POST /api/submit-test`)
    console.log(`   - Result:    GET  /api/result/:userId`)
    console.log(`   - Books:     GET  /api/books/:slug`)
    console.log(`   - Library:   GET  /api/library/:slug\n`)
})
