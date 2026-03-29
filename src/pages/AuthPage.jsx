import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Brain, ArrowRight, User, Mail, GraduationCap, Building2, Lock, Loader2, AlertTriangle, BookOpen, Layers } from 'lucide-react'
import { ScrollReveal } from '../components/ui/ScrollReveal'

const API_BASE = 'http://localhost:3002/api'

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    // Program list — static fallback
    const FALLBACK_PROGRAMS = [
        { value: 'btech', label: 'B.Tech / B.E.', years: 4, field: 'Science', branches: ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT', 'Chemical', 'Civil'] },
        { value: 'bsc', label: 'B.Sc', years: 3, field: 'Science', branches: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'CS'] },
        { value: 'bcom', label: 'B.Com', years: 3, field: 'Commerce', branches: ['General', 'Hons', 'Banking'] },
        { value: 'ba', label: 'B.A.', years: 3, field: 'Arts', branches: ['History', 'Economics', 'Political Science', 'Psychology', 'Sociology'] },
        { value: 'bba', label: 'BBA', years: 3, field: 'Commerce', branches: ['General', 'Finance', 'Marketing', 'HR'] },
        { value: 'bca', label: 'BCA', years: 3, field: 'Science', branches: ['General'] },
        { value: 'mba', label: 'MBA', years: 2, field: 'Commerce', branches: ['Finance', 'Marketing', 'HR', 'Operations', 'IT'] },
    ]
    const [programs, setPrograms] = useState(FALLBACK_PROGRAMS)

    const [form, setForm] = useState({
        roll_no: '',
        email: '',
        password: '',
        name: '',
        year: '1',
        branch: '',
        program: 'btech',
        field: 'Science'
    })

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

    // When program changes: update field, reset branch + year
    const handleProgramChange = (e) => {
        const prog = programs.find(p => p.value === e.target.value)
        if (!prog) return
        setForm(p => ({
            ...p,
            program: prog.value,
            field: prog.field,
            year: '1',
            branch: prog.branches[0] === 'General' ? '' : prog.branches[0]
        }))
    }

    const selectedProgram = programs.find(p => p.value === form.program)
    const branchOptions = selectedProgram?.branches || []
    const yearCount = selectedProgram?.years || 4
    const fieldColor = {
        Science: 'text-blue-400  bg-blue-400/10  border-blue-400/20',
        Commerce: 'text-green-400 bg-green-400/10 border-green-400/20',
        Arts: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        General: 'text-gray-400  bg-gray-400/10  border-gray-400/20',
    }[form.field] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Admin Email Validation
        if (isAdmin && !isLogin) {
            if (!form.email.toLowerCase().endsWith('@mu.ac.in')) {
                setError('Staff registration requires a valid @mu.ac.in email address.')
                setLoading(false)
                return
            }
        }

        const endpoint = isLogin ? '/auth/login' : '/auth/register'

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    role: isAdmin ? 'admin' : 'student'
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Authentication failed')
                setLoading(false)
                return
            }

            // Success! Save full session profile
            localStorage.setItem('learnifai_user_id', data.user.id)
            const resolvedRole = data.user.role || (isAdmin ? 'admin' : 'student')
            localStorage.setItem('learnifai_user_role', resolvedRole)
            localStorage.setItem('learnifai_user_name', data.user.name)
            
            if (resolvedRole === 'admin') {
                navigate('/admin')
            } else {
                localStorage.setItem('learnifai_user_year', data.user.year || '1')
                localStorage.setItem('learnifai_user_branch', data.user.branch || '')
                localStorage.setItem('learnifai_user_program', data.user.program || 'btech')
                localStorage.setItem('learnifai_user_field', data.user.field || 'Science')
                navigate('/dashboard')
            }
        } catch (err) {
            setError('Network error. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background-base flex relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-accent/10 rounded-full blur-[120px] mix-blend-screen mix-blend-color-dodge opacity-50" />
                <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] mix-blend-screen opacity-30" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_40%,transparent_100%)] opacity-20 pointer-events-none" />
            </div>

            {/* Left Col - Brand Info */}
            <div className="hidden lg:flex flex-1 relative z-10 flex-col justify-center px-16 xl:px-24">
                <ScrollReveal>
                    <div 
                        onClick={() => navigate('/')}
                        className="flex items-center gap-3 mb-12 cursor-pointer group"
                    >
                        <div className="w-12 h-12 bg-primary-accent rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,216,95,0.3)] transition-transform group-hover:scale-105">
                            <Brain className="w-7 h-7 text-black" />
                        </div>
                        <span className="text-3xl font-bold tracking-tight transition-colors group-hover:text-primary-accent">Learnif<span className="text-white group-hover:text-white">AI</span></span>
                    </div>


                    <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tight mb-8">
                        The future of <br />
                        <span className="text-primary-accent">personalised</span> learning.
                    </h1>

                    <p className="text-text-secondary text-xl font-medium max-w-lg mb-12 leading-relaxed">
                        Our Bayesian Knowledge Tracing engine identifies your exact weak points and guides you to the right physical book in the library.
                    </p>

                    <div className="space-y-6">
                        {[
                            { title: 'AI Diagnostics', desc: 'Pinpoint knowledge gaps in minutes' },
                            { title: 'Physical Library Map', desc: 'Locate books down to the exact shelf' },
                            { title: 'Gamified Syllabus', desc: 'Visualize the dependencies between subjects' }
                        ].map((ft, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className="flex items-center gap-4"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <ArrowRight className="w-4 h-4 text-primary-accent rotate-45" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm mb-0.5">{ft.title}</h3>
                                    <p className="text-text-secondary text-xs">{ft.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </ScrollReveal>
            </div>

            {/* Right Col - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 lg:px-16 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md mx-auto"
                >
                    {/* Mobile logo */}
                    <div 
                        onClick={() => navigate('/')}
                        className="lg:hidden flex justify-center mb-10 cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-accent rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,216,95,0.3)] transition-transform group-hover:scale-105">
                                <Brain className="w-6 h-6 text-black" />
                            </div>
                            <span className="text-3xl font-bold tracking-tight transition-colors group-hover:text-primary-accent">Learnif<span className="text-white group-hover:text-white">AI</span></span>
                        </div>
                    </div>


                    <div className="p-8 rounded-3xl bg-surface-elevation-1/80 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-accent/10 blur-[50px] rounded-full pointer-events-none" />

                        <div className="mb-8 p-1.5 bg-white/5 rounded-2xl border border-white/10 flex gap-1">
                            <button 
                                onClick={() => setIsAdmin(false)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${!isAdmin ? 'bg-primary-accent text-black shadow-lg shadow-primary-accent/20' : 'text-text-secondary hover:text-white'}`}
                            >
                                Student
                            </button>
                            <button 
                                onClick={() => setIsAdmin(true)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isAdmin ? 'bg-primary-accent text-black shadow-lg shadow-primary-accent/20' : 'text-text-secondary hover:text-white'}`}
                            >
                                Professor Portal
                            </button>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {isAdmin ? (isLogin ? 'Staff Login' : 'Faculty Access') : (isLogin ? 'Welcome back' : 'Create account')}
                            </h2>
                            <p className="text-sm font-medium text-text-secondary">
                                {isAdmin 
                                    ? 'Access and manage your subject specialized modules.' 
                                    : (isLogin ? 'Enter your details to access your dashboard.' : 'Start your personalized learning journey today.')}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-red-300">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                            <AnimatePresence mode="popLayout">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-5 overflow-hidden"
                                    >
                                        {/* Full Name */}
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                <input type="text" name="name" value={form.name} onChange={handleChange} required={!isLogin} className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3.5 text-sm font-medium text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-accent/50 focus:ring-1 focus:ring-primary-accent/40 transition-all" placeholder="John Doe" />
                                            </div>
                                        </div>

                                        {/* Program, Branch, Year - only for students */}
                                        {!isAdmin && (
                                            <>
                                                {/* Program dropdown */}
                                                <div>
                                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Program</label>
                                                    <div className="relative">
                                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                        <select
                                                            name="program"
                                                            value={form.program}
                                                            onChange={handleProgramChange}
                                                            className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3 text-sm font-medium text-white appearance-none focus:outline-none focus:border-primary-accent/50 transition-all"
                                                        >
                                                            {programs.map(p => (
                                                                <option key={p.value} value={p.value}>{p.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Branch + Year row */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Branch — hidden if only 'General' */}
                                                    {!(branchOptions.length === 1 && branchOptions[0] === 'General') && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Branch</label>
                                                            <div className="relative">
                                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                                <select name="branch" value={form.branch} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3 text-sm font-medium text-white appearance-none focus:outline-none focus:border-primary-accent/50 transition-all">
                                                                    {branchOptions.map(b => (
                                                                        <option key={b} value={b}>{b}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Year */}
                                                    <div className={(branchOptions.length === 1 && branchOptions[0] === 'General') ? 'col-span-2' : ''}>
                                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Year</label>
                                                        <div className="relative">
                                                            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                            <select name="year" value={form.year} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3 text-sm font-medium text-white appearance-none focus:outline-none focus:border-primary-accent/50 transition-all">
                                                                {Array.from({ length: yearCount }, (_, i) => i + 1).map(y => (
                                                                    <option key={y} value={String(y)}>Year {y} of {yearCount}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Field badge — read-only */}
                                                <div className="flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-text-secondary shrink-0" />
                                                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Field:</span>
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${fieldColor}`}>
                                                        {form.field}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                    {isAdmin ? 'Email ID' : 'Roll Number'}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                    <input 
                                        type={isAdmin ? "email" : "text"} 
                                        name={isAdmin ? "email" : "roll_no"} 
                                        value={isAdmin ? form.email : form.roll_no} 
                                        onChange={handleChange} 
                                        required 
                                        className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3.5 text-sm font-medium text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-accent/50 focus:ring-1 focus:ring-primary-accent/40 transition-all" 
                                        placeholder={isAdmin ? "professor@mu.ac.in" : "e.g. 23CS001"} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                    <input type="password" name="password" value={form.password} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3.5 text-sm font-medium text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-accent/50 focus:ring-1 focus:ring-primary-accent/40 transition-all" placeholder="••••••••" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-primary-accent text-black font-bold text-sm hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(255,216,95,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <p className="text-sm font-medium text-text-secondary">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={() => { setIsLogin(!isLogin); setError('') }}
                                    className="ml-2 text-primary-accent font-bold hover:underline"
                                >
                                    {isLogin ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
