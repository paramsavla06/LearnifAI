/**
 * generate-root-questions.js
 * One-time script: generates foundational MCQ questions for prerequisite
 * concepts that have fewer than 5 questions with test_level = 'root'.
 *
 * Run with: node backend/scripts/generate-root-questions.js
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
const MIN_ROOT_QUESTIONS = 5

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
            max_tokens: 2500,
            temperature: 0.4
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
    console.log('\n🌱 Starting root question generation...\n')

    // 1. Get all unique prereq_slug values (these are the "root" concepts)
    const { data: prereqs, error: prereqErr } = await supabase
        .from('concept_prerequisites')
        .select('prereq_slug')

    if (prereqErr) { console.error('Failed to fetch prerequisites:', prereqErr.message); process.exit(1) }
    if (!prereqs?.length) {
        console.error('No prerequisites found. Run seed-prerequisites.js first.')
        process.exit(1)
    }

    const rootSlugs = [...new Set(prereqs.map(p => p.prereq_slug))]
    console.log(`📚 Found ${rootSlugs.length} unique prerequisite (root) concepts\n`)

    // 2. Fetch concept metadata for each root slug
    const { data: concepts } = await supabase
        .from('concepts')
        .select('slug, name, subjects(name)')
        .in('slug', rootSlugs)

    const conceptMeta = {}
    for (const c of (concepts || [])) {
        conceptMeta[c.slug] = { name: c.name, subject: c.subjects?.name || 'General' }
    }

    let totalGenerated = 0

    // 3. For each root concept, check existing root questions
    for (const slug of rootSlugs) {
        const meta = conceptMeta[slug]
        if (!meta) { console.log(`⏭️  Skipping ${slug} (no concept metadata found)`); continue }

        // Check how many root questions already exist
        const { count } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('concept_slug', slug)
            .eq('test_level', 'root')

        if ((count || 0) >= MIN_ROOT_QUESTIONS) {
            console.log(`✅ ${slug} already has ${count} root questions — skipping`)
            continue
        }

        const needed = MIN_ROOT_QUESTIONS - (count || 0)
        console.log(`🤖 Generating ${needed} root questions for: ${meta.name} (${meta.subject})`)

        const prompt = `You are an exam question writer. Generate ${needed} multiple choice questions for this concept:

Concept: ${meta.name}
Subject: ${meta.subject}
Difficulty: foundational (this is a prerequisite concept — test basic understanding only)

Return ONLY a JSON array. Each object must have exactly these keys:
- question_text: string (the question)
- option_a: string
- option_b: string
- option_c: string
- option_d: string
- correct_option: exactly one of "a", "b", "c", or "d"
- difficulty: 1

No markdown, no explanation, no code fences — ONLY the raw JSON array.`

        try {
            const raw = await callAI(prompt)
            const questions = extractJSON(raw)

            if (!Array.isArray(questions) || questions.length === 0) {
                console.log(`  ⚠️  No questions returned`)
                continue
            }

            // Validate each question
            const validQuestions = questions
                .filter(q =>
                    q.question_text && q.option_a && q.option_b &&
                    q.option_c && q.option_d &&
                    ['a', 'b', 'c', 'd'].includes(q.correct_option)
                )
                .slice(0, needed)
                .map(q => ({
                    concept_slug:  slug,
                    question_text: String(q.question_text),
                    option_a:      String(q.option_a),
                    option_b:      String(q.option_b),
                    option_c:      String(q.option_c),
                    option_d:      String(q.option_d),
                    correct_option: String(q.correct_option),
                    difficulty:    1,
                    test_level:    'root'
                }))

            if (validQuestions.length === 0) {
                console.log(`  ⚠️  No valid questions after validation`)
                continue
            }

            const { error: insertErr } = await supabase
                .from('questions')
                .insert(validQuestions)

            if (insertErr) {
                console.error(`  ❌ Insert failed for ${slug}:`, insertErr.message)
            } else {
                console.log(`  ✅ Inserted ${validQuestions.length} questions`)
                totalGenerated += validQuestions.length
            }

        } catch (err) {
            console.error(`  ❌ Error for ${slug}:`, err.message)
            // Continue to next concept — do not crash
        }

        // Rate limit between concepts
        await new Promise(r => setTimeout(r, 1200))
    }

    console.log(`\n✅ Done! Total root questions generated: ${totalGenerated}`)
    process.exit(0)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
