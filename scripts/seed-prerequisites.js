// Required: dotenv, @supabase/supabase-js
// Run with: node scripts/seed-prerequisites.js

import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedPrerequisites() {
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

Return a JSON array of prerequisite pairs. Each object must have:
- concept_slug: the advanced concept
- prerequisite_slug: the foundational concept that must be learned FIRST

Rules:
- Include prerequisites within the SAME subject and ACROSS subjects where applicable.
- Focus on foundational topics that are truly required for the advanced concepts.
- Return ONLY a valid JSON array, no markdown, no explanation

Example:
[{"concept_slug":"ml-probability","prerequisite_slug":"probability"}]`
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
    console.log(`AI returned ${pairs.length} prerequisite pairs`);
  } catch (e) {
    console.error('Failed to parse AI response:', text.slice(0, 300));
    return;
  }

  // 5. Filter to only valid slugs
  const validSlugs = new Set(concepts.map(c => c.slug));
  const validPairs = pairs.filter(p => {
    const ok = validSlugs.has(p.concept_slug) && validSlugs.has(p.prerequisite_slug) && p.concept_slug !== p.prerequisite_slug;
    if (!ok) console.warn(`Skipping invalid pair: ${p.prerequisite_slug} -> ${p.concept_slug}`);
    return ok;
  });

  console.log(`${validPairs.length} valid pairs after filtering`);

  // 6. Upsert into Supabase
  const { error: insertErr } = await supabase
    .from('concept_prerequisites')
    .upsert(validPairs, { onConflict: 'concept_slug,prerequisite_slug' });

  if (insertErr) {
    console.error('Insert failed:', insertErr.message);
  } else {
    console.log(`✅ Seeded ${validPairs.length} prerequisite pairs into concept_prerequisites`);
  }
}

seedPrerequisites();
