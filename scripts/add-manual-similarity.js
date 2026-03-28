import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { error } = await supabase
    .from('concept_similarity')
    .upsert([
        { concept_a: 'complex-numbers', concept_b: 'trigonometry', weight: 0.7 },
        { concept_a: 'arithmetic', concept_b: 'matrices-determinants', weight: 0.6 },
        { concept_a: 'trigonometry', concept_b: 'matrices-determinants', weight: 0.65 }
    ], { onConflict: 'concept_a,concept_b' });
  if (error) {
    console.error('Failed to insert manual similarity:', error);
  } else {
    console.log('✅ Successfully added manual similarity pairs');
  }
}
run();
