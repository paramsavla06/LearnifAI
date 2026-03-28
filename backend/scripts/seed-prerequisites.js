/**
 * seed-prerequisites.js
 * One-time script: generates prerequisite relationships between concepts
 * using OpenRouter AI, then inserts into concept_prerequisites table.
 *
 * Run with: node backend/scripts/seed-prerequisites.js
 *
 * Dependencies (already in package.json):
 *   @supabase/supabase-js, dotenv, node-fetch
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '..', '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = 'google/gemini-flash-1.5'

// ── Helper: call OpenRouter ───────────────────────────────────────────────────
async function callAI(prompt) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'LearnifAI'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.2
        })
    })
    const data = await res.json()
    if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`)
    return data.choices?.[0]?.message?.content?.trim() || ''
}

// ── Helper: extract JSON array from AI response ───────────────────────────────
function extractJSON(text) {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array found in response')
    return JSON.parse(match[0])
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🌱 Starting concept_prerequisites seeding...\n')

    // 1. Fetch all concepts with their subject names
    const { data: concepts, error } = await supabase
        .from('concepts')
        .select('slug, name, subject_id, subjects(name)')

    if (error) { console.error('Failed to fetch concepts:', error.message); process.exit(1) }
    if (!concepts?.length) { console.error('No concepts found. Run npm run seed first.'); process.exit(1) }

    // 2. Group by subject
    const bySubject = {}
    for (const c of concepts) {
        const subjectName = c.subjects?.name || 'Unknown'
        if (!bySubject[subjectName]) bySubject[subjectName] = []
        bySubject[subjectName].push({ slug: c.slug, name: c.name })
    }

    let totalInserted = 0

    // 3. For each subject, generate prerequisite pairs
    for (const [subjectName, subjectConcepts] of Object.entries(bySubject)) {
        if (subjectConcepts.length < 2) {
            console.log(`⏭️  Skipping "${subjectName}" (< 2 concepts)`)
            continue
        }

        console.log(`🤖 Generating prerequisites for: ${subjectName} (${subjectConcepts.length} concepts)`)

        const conceptList = subjectConcepts
            .map(c => `- slug: "${c.slug}", name: "${c.name}"`)
            .join('\n')

        const prompt = `You are a curriculum expert. Given these concepts from the subject "${subjectName}":
${conceptList}

Return a JSON array of prerequisite relationships. Each object must have:
- concept_slug: the concept that DEPENDS ON something (must learn prereq first)
- prerequisite_slug: the concept that must be understood FIRST

Rules:
- Only include relationships that are genuinely foundational, not superficial
- Do not create circular dependencies
- Only use slugs from the list above exactly as given
- Return ONLY valid JSON array, no explanation, no markdown

Example output:
[
  { "concept_slug": "integration", "prerequisite_slug": "differentiation" }
]`

        try {
            const raw = await callAI(prompt)
            const pairs = extractJSON(raw)

            if (!Array.isArray(pairs) || pairs.length === 0) {
                console.log(`  ⚠️  No pairs returned for ${subjectName}`)
                continue
            }

            // Validate slugs exist in this subject
            const validSlugs = new Set(subjectConcepts.map(c => c.slug))
            const validPairs = pairs.filter(p =>
                p.concept_slug && p.prerequisite_slug &&
                validSlugs.has(p.concept_slug) &&
                validSlugs.has(p.prerequisite_slug) &&
                p.concept_slug !== p.prerequisite_slug
            )

            if (validPairs.length === 0) {
                console.log(`  ⚠️  No valid pairs after slug validation for ${subjectName}`)
                continue
            }

            // Map to DB column names (prereq_slug, not prerequisite_slug)
            const rows = validPairs.map(p => ({
                concept_slug: p.concept_slug,
                prereq_slug: p.prerequisite_slug
            }))

            const { error: insertErr, count } = await supabase
                .from('concept_prerequisites')
                .upsert(rows, { onConflict: 'concept_slug,prereq_slug', ignoreDuplicates: true })

            const inserted = rows.length
            totalInserted += inserted
            console.log(`  ✅ Inserted ${inserted} prerequisite pairs for "${subjectName}"`)

        } catch (err) {
            console.error(`  ❌ Failed for "${subjectName}":`, err.message)
            // Continue to next subject — do not crash
        }

        // Rate limit: wait 1s between subjects
        await new Promise(r => setTimeout(r, 1000))
    }

    console.log(`\n✅ Done! Total prerequisite pairs inserted: ${totalInserted}`)
    process.exit(0)
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1) })
