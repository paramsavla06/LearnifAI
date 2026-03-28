import { supabase } from '../supabase/client.js'
import bcrypt from 'bcryptjs'

export const login = async (req, res) => {
    try {
        const { roll_no, password } = req.body
        if (!roll_no || !password) {
            return res.status(400).json({ error: 'Roll number and password required' })
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('roll_no', roll_no)
            .single()

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        if (!user.password_hash) {
            return res.status(401).json({ error: 'Please re-register your account to set a password.' })
        }

        const isMatch = await bcrypt.compare(password, user.password_hash)
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        // Exclude password hash from response
        const { password_hash, ...profile } = user
        res.status(200).json({ user: profile })
    } catch (e) {
        console.error('Login error:', e)
        res.status(500).json({ error: 'Login failed' })
    }
}

export const register = async (req, res) => {
    try {
        const { name, roll_no, email, year, branch, password, program, field } = req.body
        if (!name || !roll_no || !password) {
            return res.status(400).json({ error: 'Name, roll number, and password are required' })
        }

        const { data: existing } = await supabase
            .from('users')
            .select('*')
            .eq('roll_no', roll_no)
            .maybeSingle()

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        // Helper: tries upsert with program/field; if column missing (code 42703) retries without
        async function safeInsertOrUpdate(payload) {
            const { data, error } = await payload
            if (error) {
                // Supabase wraps Postgres error — check for "column does not exist" (code 42703)
                const isColumnMissing = error.code === '42703' ||
                    (error.message && error.message.includes('column') && error.message.includes('does not exist'))
                if (isColumnMissing) {
                    console.warn('[Auth] program/field columns not yet migrated — retrying without them')
                    // Return a sentinel to indicate retry needed
                    return { retryWithoutNewCols: true }
                }
                return { data: null, error }
            }
            return { data, error: null }
        }

        if (existing) {
            if (existing.password_hash) {
                return res.status(400).json({ error: 'User with this roll number already exists. Please log in.' })
            }

            // Legacy user — update
            const baseUpdate = { name, email, year, branch, password_hash: hashedPassword }
            const fullUpdate = { ...baseUpdate, program: program || 'btech', field: field || 'Science' }

            let result = await safeInsertOrUpdate(
                supabase.from('users').update(fullUpdate).eq('roll_no', roll_no).select().single()
            )

            if (result.retryWithoutNewCols) {
                result = await safeInsertOrUpdate(
                    supabase.from('users').update(baseUpdate).eq('roll_no', roll_no).select().single()
                )
            }

            if (result.error) {
                console.error('Supabase error updating user:', result.error)
                return res.status(500).json({ error: 'Failed to update legacy user account' })
            }

            const { password_hash, ...profile } = result.data
            return res.status(200).json({ user: profile })
        }

        // Entirely new user
        const id = `user_${Date.now()}`
        const baseInsert = { id, name, roll_no, email, year, branch, password_hash: hashedPassword }
        const fullInsert = { ...baseInsert, program: program || 'btech', field: field || 'Science' }

        let result = await safeInsertOrUpdate(
            supabase.from('users').insert([fullInsert]).select().single()
        )

        if (result.retryWithoutNewCols) {
            result = await safeInsertOrUpdate(
                supabase.from('users').insert([baseInsert]).select().single()
            )
        }

        if (result.error) {
            console.error('Supabase error inserting user:', result.error)
            return res.status(500).json({ error: 'Failed to create user' })
        }

        const { password_hash, ...profile } = result.data
        res.status(201).json({ user: profile })
    } catch (e) {
        console.error('Register error:', e)
        res.status(500).json({ error: 'Registration failed' })
    }
}
