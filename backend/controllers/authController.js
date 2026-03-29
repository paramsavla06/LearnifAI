import { supabase } from '../supabase/client.js'
import bcrypt from 'bcryptjs'

export const login = async (req, res) => {
    try {
        const { roll_no, email, password } = req.body
        const identifier = email || roll_no

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Credentials and password required' })
        }

        const query = supabase.from('users').select('*')
        if (email) query.eq('email', email)
        else query.eq('roll_no', roll_no)

        const { data: user, error } = await query.single()

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
        const { name, roll_no, email, year, branch, password, program, field, role } = req.body
        const isAdmin = role === 'admin'

        if (!name || (!roll_no && !isAdmin) || (isAdmin && !email) || !password) {
            return res.status(400).json({ error: 'Name, credentials (roll/email), and password are required' })
        }

        // Domain check for admins
        if (isAdmin && !email.toLowerCase().endsWith('@mu.ac.in')) {
            return res.status(400).json({ error: 'Staff registration requires a @mu.ac.in email.' })
        }

        const query = supabase.from('users').select('*')
        if (isAdmin) query.eq('email', email)
        else query.eq('roll_no', roll_no)

        const { data: existing } = await query.maybeSingle()

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        // Helper: tries upsert with role/program/field; if column missing retries without
        async function safeInsertOrUpdate(payload) {
            const { data, error } = await payload
            if (error) {
                console.log('[Auth] Attempting safe insert with error:', error.code, error.message)
                
                // Check for missing columns (PostgREST or Postgres codes)
                const isColumnMissing = error.code === '42703' || error.code === 'PGRST204' ||
                    (error.message && error.message.includes('column') && error.message.includes('role') || error.message.includes('program') || error.message.includes('field'))
                    
                if (isColumnMissing) {
                    console.warn(`[Auth] columns (role/program/field) not yet migrated — retrying basic profile`)
                    return { retryWithoutNewCols: true }
                }
                return { data: null, error }
            }
            return { data, error: null }
        }

        if (existing) {
            if (existing.password_hash) {
                return res.status(400).json({ error: 'User already exists. Please log in.' })
            }

            // Legacy user — update
            const baseUpdate = { name, email, year, branch, password_hash: hashedPassword }
            const fullUpdate = { ...baseUpdate, role: role || 'student', program: program || 'btech', field: field || 'Science' }

            const updQuery = supabase.from('users').update(fullUpdate)
            if (isAdmin) updQuery.eq('email', email)
            else updQuery.eq('roll_no', roll_no)

            let result = await safeInsertOrUpdate(updQuery.select().single())

            if (result.retryWithoutNewCols) {
                const retryQuery = supabase.from('users').update(baseUpdate)
                if (isAdmin) retryQuery.eq('email', email)
                else retryQuery.eq('roll_no', roll_no)
                result = await safeInsertOrUpdate(retryQuery.select().single())
            }

            if (result.error) {
                console.error('Supabase error updating user:', result.error)
                return res.status(500).json({ error: 'Failed to update user account' })
            }

            const { password_hash, ...profile } = result.data
            return res.status(200).json({ user: profile })
        }

        // Entirely new user
        const id = `user_${Date.now()}`
        const identifier = isAdmin ? (roll_no || email) : roll_no
        const baseInsert = { id, name, roll_no: identifier, email, year, branch, password_hash: hashedPassword }
        const fullInsert = { ...baseInsert, role: role || 'student', program: program || 'btech', field: field || 'Science' }

        let result = await safeInsertOrUpdate(
            supabase.from('users').insert([fullInsert]).select().single()
        )

        if (result.retryWithoutNewCols) {
            result = await safeInsertOrUpdate(
                supabase.from('users').insert([baseInsert]).select().single()
            )
        }

        if (result.error) {
            console.error('[Auth] Supabase error inserting user:', JSON.stringify(result.error, null, 2))
            return res.status(500).json({ error: 'Failed to create user' })
        }

        const { password_hash, ...profile } = result.data
        res.status(201).json({ user: profile })
    } catch (e) {
        console.error('[Auth] Register crash:', e)
        res.status(500).json({ error: 'Registration failed' })
    }
}
