/**
 * seed-similarity.js
 * One-time script: generates cross-subject concept similarity pairs using
 * OpenRouter AI, then inserts into concept_similarity table.
 *
 * Run with: node backend/scripts/seed-similarity.js
 *
 * Dependencies (already in package.json):
 *   @supabase/supabase-js, dotenv
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '..', '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const MODEL = 'google/gemini-flash-1.5'

async function callAI(prompt) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'LearnifAI'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 3000,
            temperature: 0.2
        })
    })
    const data = await res.json()
    if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`)
    return data.choices?.[0]?.message?.content?.trim() || ''
}

function extractJSON(text) {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array found in response')
    return JSON.parse(match[0])
}

async function main() {
    console.log('\n🌱 Starting concept_similarity seeding...\n')

    // 1. Fetch all concepts with subject names
    const { data: concepts, error } = await supabase
        .from('concepts')
        .select('slug, name, subject_id, subjects(name)')

    if (error) { console.error('Failed to fetch concepts:', error.message); process.exit(1) }
    if (!concepts?.length) { console.error('No concepts found. Run npm run seed first.'); process.exit(1) }

    // 2. Build concept list for the prompt (limit to 150 to stay within token limits)
    const conceptList = concepts.slice(0, 150)
        .map(c => `${c.slug} | ${c.name} | ${c.subjects?.name || 'Unknown'}`)
        .join('\n')

    console.log(`🤖 Sending ${Math.min(concepts.length, 150)} concepts to AI for similarity analysis...`)

    const prompt = `You are a curriculum expert. Given this list of concepts from different subjects:
(format: slug | concept_name | subject_name)

${conceptList}

Return a JSON array of cross-subject similarity pairs. Each object must have:
- concept_a: slug of first concept
- concept_b: slug of second concept
- weight: float from 0.0 to 1.0 (0.8+ = nearly identical, 0.5 = related)

Rules:
- Only include pairs from DIFFERENT subjects
- Only include pairs with weight >= 0.5
- Do not duplicate pairs (if a→b exists, skip b→a)
- Only use slugs from the list above exactly as given
- Return ONLY valid JSON array, no markdown

Example:
[
  { "concept_a": "probability-statistics", "concept_b": "ml-probability", "weight": 0.95 }
]`

    try {
        const raw = await callAI(prompt)
        const pairs = extractJSON(raw)

        if (!Array.isArray(pairs) || pairs.length === 0) {
            console.error('No similarity pairs returned.')
            process.exit(0)
        }

        // Validate: only valid slugs, different subjects, weight >= 0.5
        const validSlugs = new Set(concepts.map(c => c.slug))
        const slugToSubject = {}
        for (const c of concepts) slugToSubject[c.slug] = c.subjects?.name

        const validPairs = pairs.filter(p =>
            p.concept_a && p.concept_b &&
            validSlugs.has(p.concept_a) &&
            validSlugs.has(p.concept_b) &&
            p.concept_a !== p.concept_b &&
            slugToSubject[p.concept_a] !== slugToSubject[p.concept_b] &&
            typeof p.weight === 'number' && p.weight >= 0.5
        )

        console.log(`\n📊 ${pairs.length} pairs returned, ${validPairs.length} valid after filtering`)

        if (validPairs.length === 0) { console.log('Nothing to insert.'); process.exit(0) }

        // Insert in batches of 50
        let inserted = 0
        const BATCH = 50
        for (let i = 0; i < validPairs.length; i += BATCH) {
            const batch = validPairs.slice(i, i + BATCH)
            const { error: insertErr } = await supabase
                .from('concept_similarity')
                .upsert(batch, { onConflict: 'concept_a,concept_b', ignoreDuplicates: true })
            if (insertErr) console.error(`  Insert error:`, insertErr.message)
            else inserted += batch.length
        }

        console.log(`\n✅ Done! Inserted ${inserted} similarity pairs.`)
    } catch (err) {
        console.error('❌ Failed:', err.message)
    }

    process.exit(0)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
