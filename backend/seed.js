import { supabase } from './supabase/client.js'
import { conceptsData, questionsData, recommendedBooks } from './services/dataLoader.js'

async function seed() {
    console.log('🌱 Starting database seed...')

    // 1. Seed Subjects and Concepts
    console.log('\nSeeding Subjects & Concepts...')
    for (const subject of conceptsData.subjects) {
        // Insert subject
        const { data: subData, error: subErr } = await supabase
            .from('subjects')
            .upsert({ name: subject.name, description: subject.description, branch: subject.branch }, { onConflict: 'name' })
            .select()
            .single()
        
        if (subErr) {
            console.error(`Error inserting subject ${subject.name}:`, subErr.message)
            continue
        }

        // Insert concepts for this subject
        const conceptsToInsert = subject.concepts.map(c => ({
            slug: c.slug,
            name: c.name,
            subject_id: subData.id,
            difficulty: c.difficulty,
            semester: c.semester,
            library_section: c.library_section,
            shelf: c.shelf,
            book_title: c.book_title,
            book_isbn: c.book_isbn
        }))

        const { error: concErr } = await supabase
            .from('concepts')
            .upsert(conceptsToInsert, { onConflict: 'slug' })
        
        if (concErr) console.error(`Error inserting concepts for ${subject.name}:`, concErr.message)
    }

    // 2. Seed Questions
    console.log('\nSeeding Questions...')
    const questionsToInsert = questionsData.map(q => ({
        concept_slug: q.slug,
        question_text: q.q,
        option_a: q.a,
        option_b: q.b,
        option_c: q.c,
        option_d: q.d,
        correct_option: q.ans,
        difficulty: q.diff || 2
    }))

    // Insert in batches of 50 to avoid payload limits
    for (let i = 0; i < questionsToInsert.length; i += 50) {
        const batch = questionsToInsert.slice(i, i + 50)
        const { error: qErr } = await supabase.from('questions').upsert(batch, { onConflict: 'id' })
        if (qErr) console.error(`Error inserting questions batch ${i}:`, qErr.message)
    }

    // 3. Seed Books
    console.log('\nSeeding Books...')
    for (const entry of recommendedBooks) {
        // Find subject ID
        const { data: subData } = await supabase.from('subjects').select('id').eq('name', entry.subject).single()
        if (!subData) continue

        for (const book of entry.recommended_books) {
            const { data: bookData, error: bookErr } = await supabase
                .from('books')
                .upsert({ title: book.title, author: book.author, subject_id: subData.id }, { onConflict: 'id' })
                .select()
                .single()

            if (bookErr) {
                console.error(`Error inserting book ${book.title}:`, bookErr.message)
                continue
            }

            // Map books to all slugs under this subject
            if (entry.slugs && bookData) {
                const mapRows = entry.slugs.map(slug => ({ concept_slug: slug, book_id: bookData.id }))
                await supabase.from('concept_book_map').upsert(mapRows, { onConflict: 'concept_slug,book_id' })
            }
        }
    }

    console.log('\n✅ Database seed complete!')
    process.exit(0)
}

seed().catch(err => {
    console.error(err)
    process.exit(1)
})
