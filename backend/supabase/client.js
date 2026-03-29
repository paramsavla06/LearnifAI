/**
 * Supabase client for LearnifAI backend
 * Credentials loaded from .env
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env from parent directory (clone2/)
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] ⚠️  Missing SUPABASE_URL or SUPABASE_ANON_KEY — DB features will fail')
}

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null

if (supabase) console.log(`[Supabase] ✅ Connected → ${supabaseUrl}`)
else console.warn('[Supabase] ⚠️  Running without database — set env vars on Render')
