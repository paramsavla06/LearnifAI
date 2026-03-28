import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Brain, ArrowRight, User, Mail, GraduationCap, Building2, Lock, Loader2, AlertTriangle } from 'lucide-react'
import { ScrollReveal } from '../components/ui/ScrollReveal'

const API_BASE = 'http://localhost:3002/api'

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState('')
    const navigate = useNavigate()

    const [form, setForm] = useState({
        roll_no: '',
        password: '',
        name: '',
        email: '',
        year: 'FE',
        branch: 'Computer Science'
    })

    const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const endpoint = isLogin ? '/auth/login' : '/auth/register'
        
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Authentication failed')
                setLoading(false)
                return
            }

            // Success! Save full session profile
            localStorage.setItem('learnifai_user_id', data.user.id)
            localStorage.setItem('learnifai_user_name', data.user.name)
            localStorage.setItem('learnifai_user_year', data.user.year || 'FE')
            localStorage.setItem('learnifai_user_branch', data.user.branch || '')
            
            // Dispatch event for other tabs/components
            window.dispatchEvent(new Event('storage'))
            
            navigate('/dashboard')
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
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 bg-primary-accent rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,216,95,0.3)]">
                            <Brain className="w-7 h-7 text-black" />
                        </div>
                        <span className="text-3xl font-bold tracking-tight">Learnif<span className="text-white">AI</span></span>
                    </div>

                    <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tight mb-8">
                        The future of <br/>
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
                    <div className="lg:hidden flex justify-center mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-accent rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,216,95,0.3)]">
                                <Brain className="w-6 h-6 text-black" />
                            </div>
                            <span className="text-3xl font-bold tracking-tight">Learnif<span className="text-white">AI</span></span>
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-surface-elevation-1/80 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-accent/10 blur-[50px] rounded-full pointer-events-none" />

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Welcome back' : 'Create account'}</h2>
                            <p className="text-sm font-medium text-text-secondary">
                                {isLogin ? 'Enter your details to access your dashboard.' : 'Start your personalized learning journey today.'}
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
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                <input type="text" name="name" value={form.name} onChange={handleChange} required={!isLogin} className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3.5 text-sm font-medium text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-accent/50 focus:ring-1 focus:ring-primary-accent/40 transition-all" placeholder="John Doe" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Year</label>
                                                <div className="relative">
                                                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                    <select name="year" value={form.year} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3 text-sm font-medium text-white appearance-none focus:outline-none focus:border-primary-accent/50 transition-all">
                                                        {['FE','SE','TE','BE'].map(y => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Branch</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                    <select name="branch" value={form.branch} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3 text-sm font-medium text-white appearance-none focus:outline-none focus:border-primary-accent/50 transition-all">
                                                        {['Computer Science','Mathematics','IT','EXTC'].map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Roll Number</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                    <input type="text" name="roll_no" value={form.roll_no} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-full pl-11 pr-5 py-3.5 text-sm font-medium text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-accent/50 focus:ring-1 focus:ring-primary-accent/40 transition-all" placeholder="e.g. 23CS001" />
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
