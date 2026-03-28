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
        const { name, roll_no, email, year, branch, password } = req.body
        if (!name || !roll_no || !password) {
            return res.status(400).json({ error: 'Name, roll number, and password are required' })
        }

        const { data: existing } = await supabase
            .from('users')
            .select('*')
            .eq('roll_no', roll_no)
            .maybeSingle() // Use maybeSingle to prevent error if not found

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        if (existing) {
            if (existing.password_hash) {
                return res.status(400).json({ error: 'User with this roll number already exists. Please log in.' })
            } else {
                // Legacy user exists but has no password (from old diagnostic tests)
                // Update them with full profile and password
                const { data: updatedUser, error } = await supabase
                    .from('users')
                    .update({
                        name,
                        email,
                        year,
                        branch,
                        password_hash: hashedPassword
                    })
                    .eq('roll_no', roll_no)
                    .select()
                    .single()

                if (error) {
                    console.error('Supabase error updating user:', error)
                    return res.status(500).json({ error: 'Failed to update legacy user account' })
                }
                
                const { password_hash, ...profile } = updatedUser
                return res.status(200).json({ user: profile })
            }
        }

        // Entirely new user
        const id = `user_${Date.now()}`
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                id,
                name,
                roll_no,
                email,
                year,
                branch,
                password_hash: hashedPassword
            }])
            .select()
            .single()

        if (error) {
            console.error('Supabase error inserting user:', error)
            return res.status(500).json({ error: 'Failed to create user' })
        }

        const { password_hash, ...profile } = newUser
        res.status(201).json({ user: profile })
    } catch (e) {
        console.error('Register error:', e)
        res.status(500).json({ error: 'Registration failed' })
    }
}
