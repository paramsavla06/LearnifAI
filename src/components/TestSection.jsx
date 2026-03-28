import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { GlassButton } from './ui/GlassButton'
import { ScrollReveal } from './ui/ScrollReveal'
import curriculum from '../data/curriculum.json'

const timetable = [
    { subject: 'Engineering Physics', date: '10 Apr', time: '10:00', sem: 'FE SEM I' },
    { subject: 'Data Structures', date: '12 Apr', time: '10:00', sem: 'SE SEM III' },
    { subject: 'Discrete Mathematics', date: '14 Apr', time: '10:00', sem: 'SE SEM III' },
    { subject: 'DBMS', date: '16 Apr', time: '10:00', sem: 'TE SEM V' },
    { subject: 'Operating Systems', date: '18 Apr', time: '10:00', sem: 'TE SEM V' },
    { subject: 'Machine Learning', date: '21 Apr', time: '10:00', sem: 'BE SEM VII' },
]

const YEARS = ['FE', 'SE', 'TE', 'BE']

export default function TestSection() {
    const [selectedYear, setSelectedYear] = useState('SE')
    const [expandedSubject, setExpandedSubject] = useState(null)

    const yearSubjects = useMemo(
        () => curriculum.subjects.filter((s) => s.year === selectedYear),
        [selectedYear]
    )

    const getTopics = (subjectId) =>
        curriculum.topics.filter((t) => t.subject_id === subjectId)

    function toggleSubject(id) {
        setExpandedSubject(expandedSubject === id ? null : id)
    }

    return (
        <section id="tests" className="relative py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-accent/5 via-background-base to-background-base pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-6 md:px-8">

                <ScrollReveal className="mb-12 origin-left">
                    <div className="text-primary-accent font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-primary-accent" />
                        Diagnostic Tests
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        Tests and Timetable
                    </h2>
                    <p className="text-text-secondary mt-4 max-w-xl text-lg font-medium">
                        Select a year, pick a subject, and expand to see its topics and start a diagnostic.
                    </p>
                </ScrollReveal>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    <div className="lg:col-span-7">
                        <div className="flex gap-3 flex-wrap mb-8">
                            {YEARS.map((y) => (
                                <button
                                    key={y}
                                    onClick={() => {
                                        setSelectedYear(y)
                                        setExpandedSubject(null)
                                    }}
                                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 border ${
                                        selectedYear === y 
                                        ? 'bg-primary-accent text-black border-primary-accent shadow-[0_0_20px_rgba(255,216,95,0.3)]' 
                                        : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>

                        <p className="text-sm text-text-secondary font-medium mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary-accent animate-pulse" />
                            {yearSubjects.length} subjects found
                        </p>

                        <div className="flex flex-col gap-4">
                            {yearSubjects.map((sub) => {
                                const isOpen = expandedSubject === sub.id
                                const topics = getTopics(sub.id)

                                return (
                                    <div
                                        key={sub.id}
                                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                                            isOpen
                                                ? 'border-primary-accent/50 bg-white/5'
                                                : 'border-white/10 bg-surface-elevation-1 hover:border-white/20'
                                        }`}
                                    >
                                        <button
                                            onClick={() => toggleSubject(sub.id)}
                                            className="w-full flex items-center justify-between px-6 py-5 text-left group"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-primary-accent' : 'text-white group-hover:text-primary-accent'}`}>
                                                    {sub.name}
                                                </span>
                                                <span className="text-xs text-text-secondary font-medium tracking-wide">
                                                    {sub.code} • Sem {sub.semester} • {topics.length} topics
                                                </span>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isOpen ? 'border-primary-accent/50 text-primary-accent' : 'border-white/10 text-white'}`}>
                                                {isOpen ? '−' : '+'}
                                            </div>
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                                >
                                                    <div className="border-t border-white/10 mx-6 mb-4 mt-0" />
                                                    <div className="px-6 pb-6 flex flex-col gap-3">
                                                        {topics.map((topic, i) => (
                                                            <div
                                                                key={topic.id}
                                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                                                        {i + 1}
                                                                    </span>
                                                                    <span className="text-sm font-medium text-text-primary">{topic.name}</span>
                                                                </div>
                                                                <button className="px-4 py-1.5 rounded-full bg-primary-accent/10 text-primary-accent text-xs font-bold hover:bg-primary-accent hover:text-black transition-colors shrink-0 whitespace-nowrap">
                                                                    Start Test
                                                                </button>
                                                            </div>
                                                        ))}

                                                        <div className="mt-4 pt-4 border-t border-white/5">
                                                            <GlassButton className="!py-2 !text-sm">
                                                                Start Full Diagnostic
                                                            </GlassButton>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <GlassCard className="!p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-accent/10 blur-[60px] rounded-full" />
                            <h3 className="text-sm font-bold tracking-widest text-text-secondary uppercase mb-6 relative z-10">
                                Upcoming Exams
                            </h3>
                            
                            <div className="flex flex-col gap-3 relative z-10">
                                {timetable.map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1, duration: 0.4 }}
                                        className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary-accent/30 transition-colors"
                                    >
                                        <div>
                                            <p className="font-bold text-sm text-white mb-1">{item.subject}</p>
                                            <p className="text-[10px] text-text-secondary tracking-widest uppercase font-medium">{item.sem}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-sm text-primary-accent mb-1">{item.date}</p>
                                            <p className="text-[10px] text-text-secondary font-medium">{item.time}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </GlassCard>

                        <GlassCard className="!p-6 border-dashed border-white/20">
                            <h3 className="text-sm font-bold tracking-widest text-text-secondary uppercase mb-3">
                                Knowledge Gap Map
                            </h3>
                            <p className="text-sm text-text-secondary font-medium leading-relaxed mb-6">
                                Complete a diagnostic test to generate your personalized gap map. Root causes and specific book references will appear here dynamically.
                            </p>
                            <GlassButton variant="secondary" className="w-full !opacity-50 !cursor-not-allowed">
                                Awaiting Diagnostic
                            </GlassButton>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </section>
    )
}
