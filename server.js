import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'

const app = express()
const PORT = 3001 // Different from Vite's 5173/5174

// ─── CONFIG (replace with real values before deploy) ─────────────────────────
const LIVEAVATAR_API = 'https://api.liveavatar.com/v1/session'
const API_KEY = '86ff6908-2a7c-11f1-8d28-066a7fa2e369'
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))
app.use(express.json())

app.post('/avatar-session', async (req, res) => {
  try {
    // The api.liveavatar.com endpoint from earlier was returning a 404 Not Found.
    // Since you provided a HeyGen Avatar ID and an iframe frontend, we will directly
    // return the HeyGen shareable interactive avatar link.
    const avatarId = 'b4fc2d60-3b82-4694-b243-93e9d2bb0242'
    const iframeUrl = `https://app.heygen.com/embeds/${avatarId}`

    // Added CORS headers explicitly for proxy logic debugging
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json({ url: iframeUrl })

  } catch (err) {
    console.error('[avatar-session]', err.message)
    res.status(500).json({ error: 'Failed to create avatar session' })
  }
})

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`✅ Avatar session server running → http://localhost:${PORT}`)
})
