import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
    BookOpen, Sparkles, Cpu, Brain, Compass, 
    LineChart, Activity, Target, Terminal, 
    CheckCircle2, Zap, ArrowLeft, Search,
    Filter, LayoutGrid, List, Clock, TrendingUp
} from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { ScrollReveal } from '../components/ui/ScrollReveal'

const API_BASE = 'http://localhost:3002/api'

const ICON_MAP = {
    Sparkles, BookOpen, Cpu, Brain, Compass, 
    LineChart, Activity, Target, Terminal, 
    CheckCircle2, Zap
}

export default function MyCoursesPage() {
    const navigate = useNavigate()
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

    useEffect(() => {
        const userId = localStorage.getItem('learnifai_user_id')
        if (!userId) {
            navigate('/auth')
            return
        }

        fetch(`${API_BASE}/dashboard/${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.subjects) {
                    setCourses(data.subjects)
                }
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [navigate])

    const filteredCourses = courses.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background-base pt-24 pb-12 px-6 lg:px-12 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-accent/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-primary-accent transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> BACK TO DASHBOARD
                        </button>
                        <ScrollReveal>
                            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Academic <span className="text-primary-accent">Registry</span></h1>
                            <p className="text-text-secondary font-medium mt-2">Manage your specialized curriculum and progress.</p>
                        </ScrollReveal>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-surface-elevation-1 border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-3">
                            <Clock className="w-4 h-4 text-primary-accent" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-text-secondary uppercase">Average Mastery</span>
                                <span className="text-sm font-bold text-white tabular-nums">
                                    {courses.length > 0 ? Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input 
                            type="text" 
                            placeholder="Search among your courses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-elevation-1 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium text-white placeholder:text-text-secondary focus:outline-none focus:border-primary-accent/50 transition-all"
                        />
                    </div>
                    <div className="flex bg-surface-elevation-1 border border-white/5 rounded-2xl p-1">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary-accent text-black shadow-lg' : 'text-text-secondary hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary-accent text-black shadow-lg' : 'text-text-secondary hover:text-white'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="bg-surface-elevation-1 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white hover:bg-white/5 transition-all flex items-center gap-2">
                        <Filter className="w-4 h-4" /> FILTER
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-primary-accent border-r-transparent animate-spin" />
                        <span className="text-xs font-bold text-primary-accent animate-pulse uppercase tracking-[0.2em]">Syncing Syllabus...</span>
                    </div>
                ) : filteredCourses.length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                        {filteredCourses.map((course, i) => {
                            const Icon = ICON_MAP[course.iconStr] || BookOpen
                            return viewMode === 'grid' ? (
                                <motion.div
                                    key={course.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <GlassCard className="!p-8 group hover:border-primary-accent/30 transition-all h-full flex flex-col">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className={`w-14 h-14 rounded-2xl ${course.color || 'bg-white/5'} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                                                <Icon className={`w-7 h-7 ${course.textColor || 'text-white'}`} />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Syncing</span>
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                            </div>
                                        </div>

                                        <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{course.name}</h3>
                                        <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary mb-8">
                                            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {course.lessons} Units</span>
                                            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {course.hours}h Logged</span>
                                        </div>

                                        <div className="mt-auto space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-primary-accent" />
                                                    <span className="text-xs font-bold text-white uppercase tracking-widest">Mastery</span>
                                                </div>
                                                <span className="text-lg font-bold text-primary-accent">{course.progress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${course.progress}%` }}
                                                    transition={{ duration: 1.5, delay: 0.2, ease: "circOut" }}
                                                    className="h-full bg-primary-accent shadow-[0_0_15px_rgba(255,216,95,0.4)]"
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => navigate(`/dashboard?course=${encodeURIComponent(course.name)}`)} 
                                            className="w-full mt-8 py-4 bg-white/5 hover:bg-primary-accent hover:text-black rounded-2xl text-xs font-bold transition-all duration-300 uppercase tracking-widest"
                                        >
                                            View Intel
                                        </button>
                                    </GlassCard>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={course.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-surface-elevation-1 border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 group hover:border-white/10 transition-all"
                                >
                                    <div className={`w-12 h-12 rounded-xl ${course.color || 'bg-white/5'} flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-6 h-6 ${course.textColor || 'text-white'}`} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-lg font-bold text-white mb-1">{course.name}</h3>
                                        <p className="text-xs text-text-secondary font-medium">{course.lessons} Lessons • {course.hours}h Time Spent</p>
                                    </div>
                                    <div className="w-full md:w-48 space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase">
                                            <span>Mastery</span>
                                            <span className="text-white">{course.progress}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-accent" style={{ width: `${course.progress}%` }} />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/dashboard?course=${encodeURIComponent(course.name)}`)}
                                        className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
                                    >
                                        Details
                                    </button>
                                </motion.div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="py-24 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="w-8 h-8 text-text-secondary opacity-30" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Registry Empty</h3>
                        <p className="text-text-secondary max-w-sm mx-auto mb-8">You haven't enrolled in any courses yet. Take a diagnostic to get started.</p>
                        <button 
                            onClick={() => navigate('/tests')}
                            className="bg-primary-accent text-black px-8 py-4 rounded-full font-bold text-sm shadow-xl shadow-primary-accent/20 hover:scale-105 transition-transform"
                        >
                            Start Diagnostic
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
