import { supabase } from '../supabase/client.js'

// ─── POST /api/user ────────────────────────────────────────────────────────────
export async function createUser(req, res) {
    const { name, roll_no, year, branch, email } = req.body
    if (!name || !year) {
        return res.status(400).json({ error: 'name and year are required' })
    }

    const userId = roll_no || `user_${Date.now()}`

    const { data, error } = await supabase
        .from('users')
        .upsert({ id: userId, name, roll_no, year, branch, email }, { onConflict: 'id' })
        .select()
        .single()

    if (error) {
        console.error('[User] Supabase error:', error.message)
        // Fallback: return success with generated data even if DB unavailable
        return res.status(201).json({
            success: true,
            user: { userId, name, roll_no, year, branch, email },
            message: 'Profile created (offline mode). Proceed to Subject Test.'
        })
    }

    return res.status(201).json({
        success: true,
        user: data,
        message: 'Profile saved to Supabase. Proceed to Subject Test.'
    })
}

// ─── GET /api/user/:userId ──────────────────────────────────────────────────────
export async function getUser(req, res) {
    const { userId } = req.params

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

    if (error || !data) {
        return res.status(404).json({ error: 'User not found' })
    }

    return res.json(data)
}
