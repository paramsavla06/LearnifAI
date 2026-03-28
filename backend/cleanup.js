import { supabase } from './supabase/client.js'

async function cleanup() {
    console.log('🧹 Cleaning up bad user test data from Supabase...')

    // Delete all records from transactional tables to reset the Knowledge Graph
    // (Supabase cascading deletes might handle some of this, but we do it manually to be safe)
    
    console.log('Clearing user_answers...')
    await supabase.from('user_answers').delete().neq('attempt_id', '00000000-0000-0000-0000-000000000000')

    console.log('Clearing test_attempts...')
    await supabase.from('test_attempts').delete().neq('user_id', '0')

    console.log('Clearing concept_performance...')
    await supabase.from('concept_performance').delete().neq('user_id', '0')

    console.log('Clearing results...')
    await supabase.from('results').delete().neq('user_id', '0')

    console.log('Clearing study_plan...')
    await supabase.from('study_plan').delete().neq('user_id', '0')

    console.log('Clearing user_graph...')
    await supabase.from('user_graph').delete().neq('user_id', '0')

    console.log('✅ Graph and Test data has been completely reset!')
    process.exit(0)
}

cleanup().catch(err => {
    console.error(err)
    process.exit(1)
})
