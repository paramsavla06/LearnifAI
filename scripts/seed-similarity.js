// Required: dotenv, @supabase/supabase-js
// Run with: node scripts/seed-similarity.js

import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedSimilarity() {
  // 1. Fetch all concepts with subject names
  const { data: concepts, error } = await supabase
    .from('concepts')
    .select('slug, name, subjects(name)');

  if (error || !concepts?.length) {
    console.error('Failed to fetch concepts:', error?.message);
    return;
  }

  console.log(`Loaded ${concepts.length} concepts`);

  // 2. Format for prompt
  const conceptList = concepts
    .map(c => `${c.slug} | ${c.name} | ${c.subjects?.name || 'Unknown'}`)
    .join('\n');

  // 3. Call OpenRouter
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3002',
      'X-Title': 'LearnifAI'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are a curriculum expert. Given these concepts from different subjects:

${conceptList}

Return a JSON array of cross-subject similarity pairs. Each object must have:
- concept_a: slug of first concept
- concept_b: slug of second concept
- weight: float 0.0 to 1.0 (0.8+ nearly identical, 0.5 = related, below 0.5 skip)

Rules:
- Only pairs from DIFFERENT subjects
- Only pairs with weight >= 0.5
- No duplicate pairs (if a→b exists, skip b→a)
- Return ONLY valid JSON array, no markdown, no explanation

Example:
[{"concept_a":"probability","concept_b":"ml-probability","weight":0.95}]`
      }]
    })
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('OpenRouter error:', result.error?.message || JSON.stringify(result));
    return;
  }

  const text = result.choices?.[0]?.message?.content || '';
  console.log('AI response preview:', text.slice(0, 200));

  // 4. Parse response
  let pairs;
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    pairs = JSON.parse(clean);
    console.log(`AI returned ${pairs.length} similarity pairs`);
  } catch (e) {
    console.error('Failed to parse AI response:', text.slice(0, 300));
    return;
  }

  // 5. Filter to only valid slugs
  const validSlugs = new Set(concepts.map(c => c.slug));
  const validPairs = pairs.filter(p => {
    const ok = validSlugs.has(p.concept_a) && validSlugs.has(p.concept_b) && p.concept_a !== p.concept_b;
    if (!ok) console.warn(`Skipping invalid pair: ${p.concept_a} -> ${p.concept_b}`);
    return ok;
  });

  console.log(`${validPairs.length} valid pairs after filtering`);

  // 6. Upsert into Supabase
  const { error: insertErr } = await supabase
    .from('concept_similarity')
    .upsert(validPairs, { onConflict: 'concept_a,concept_b' });

  if (insertErr) {
    console.error('Insert failed:', insertErr.message);
  } else {
    console.log(`✅ Seeded ${validPairs.length} similarity pairs into concept_similarity`);
  }
}

seedSimilarity();
