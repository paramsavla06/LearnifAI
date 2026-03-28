import 'dotenv/config'
import { supabase } from './supabase/client.js'

const tables = ['subjects', 'concepts', 'questions', 'books', 'users', 'results', 'test_attempts', 'user_answers']
for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(2)
    if (error) {
        console.log(`❌ ${t}: ${error.message}`)
    } else {
        console.log(`✅ ${t}: ${data.length} rows returned`)
    }
}
process.exit(0)
