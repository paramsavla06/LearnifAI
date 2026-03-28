import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'
import { config } from 'dotenv'

// Load .env variables
config()

const app = express()
const PORT = 3001 // Different from Vite's 5173/5174

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))
app.use(express.json())

app.post('/avatar-session', async (req, res) => {
  try {
    // Read the HeyGen embed ID from .env — NO hardcoded fallback to prevent using the wrong account.
    const heygenKey = process.env.HEYGEN_API_KEY
    if (!heygenKey) {
      return res.status(500).json({ error: 'HEYGEN_API_KEY is not set in .env' })
    }

    const iframeUrl = `https://app.heygen.com/embeds/${heygenKey}`

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
