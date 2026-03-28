import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { ScrollReveal } from './ui/ScrollReveal'
import {
    MapPin, BookOpen, Zap, User, ChevronRight, ChevronLeft,
    CheckCircle, XCircle, BarChart2, Brain, AlertTriangle, Star, Loader2, Hash
} from 'lucide-react'
import conceptsData from '../data/concepts.json'
import questionsRaw from '../data/questions.json'

const API_BASE = 'http://localhost:3002/api'

// ─── Semester map ──────────────────────────────────────────────────────────────
const SEMS_BY_YEAR = {
    FE: ['FE SEM 1', 'FE SEM 2'],
    SE: ['SE SEM 3', 'SE SEM 4'],
    TE: ['TE SEM 5', 'TE SEM 6'],
    BE: ['BE SEM 7', 'BE SEM 8'],
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
const questionsBySlug = {}
for (const q of questionsRaw) {
    if (!questionsBySlug[q.slug]) questionsBySlug[q.slug] = []
    questionsBySlug[q.slug].push(q)
}

const conceptBySlug = {}
for (const subj of conceptsData.subjects) {
    for (const c of subj.concepts) {
        conceptBySlug[c.slug] = { ...c, subject_name: subj.name }
    }
}

// Returns subjects that have at least 1 concept in the given semester
function getSubjectsForSem(sem) {
    return conceptsData.subjects.filter(s =>
        s.concepts.some(c => c.semester === sem)
    )
}

function inferFloor(section) {
    if (!section) return 'Ground Floor'
    const code = section.replace('Section ', '').trim().toUpperCase().charCodeAt(0) - 65
    if (code <= 5) return 'Ground Floor'
    if (code <= 11) return 'First Floor'
    if (code <= 17) return 'Second Floor'
    return 'Third Floor'
}

function pickQuestions(subjectName, sem, count = 5) {
    const subj = conceptsData.subjects.find(s => s.name === subjectName)
    if (!subj) return []
    const pool = []
    for (const concept of subj.concepts) {
        if (concept.semester !== sem) continue
        const qs = questionsBySlug[concept.slug] || []
        for (const q of qs) pool.push({ ...q, concept_name: concept.name })
    }
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, count)
}

// ─── STEP indicator ────────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Setup', icon: User },
    { id: 2, label: 'Diagnostic', icon: Brain },
    { id: 3, label: 'Results', icon: BarChart2 },
]

function StepBar({ current }) {
    return (
        <div className="flex items-center gap-0 mb-10">
            {STEPS.map((s, i) => {
                const Icon = s.icon
                const done = current > s.id
                const active = current === s.id
                return (
                    <div key={s.id} className="flex items-center flex-1">
                        <div className={`flex flex-col items-center gap-1.5 flex-1`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                done ? 'bg-primary-accent border-primary-accent text-black'
                                     : active ? 'border-primary-accent text-primary-accent bg-primary-accent/10'
                                              : 'border-white/20 text-text-secondary bg-white/5'
                            }`}>
                                {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-primary-accent' : done ? 'text-white' : 'text-text-secondary'}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`h-[2px] flex-1 transition-all duration-700 ${done ? 'bg-primary-accent' : 'bg-white/10'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Step 1 — Setup (pre-filled from session) ─────────────────────────────────
function SetupStep({ profile, setProfile, onNext }) {
    const [err, setErr] = useState('')
    const sems = SEMS_BY_YEAR[profile.year] || []
    const availableSubjects = getSubjectsForSem(profile.semester)

    // Auto-update semester when year changes
    const handleYearChange = (y) => {
        const newSems = SEMS_BY_YEAR[y] || []
        setProfile(p => ({ ...p, year: y, semester: newSems[0] || '' }))
    }

    function handleNext() {
        if (!profile.name?.trim() || !profile.roll_no?.trim()) {
            setErr('Name and Roll Number are required.')
            return
        }
        if (availableSubjects.length === 0) {
            setErr('No subjects found for this semester. Try a different semester.')
            return
        }
        setErr('')
        onNext()
    }

    const isLoggedIn = !!(profile._fromSession)

    return (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {isLoggedIn ? (
                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-white">Signed in as <span className="text-primary-accent">{profile.name}</span></p>
                        <p className="text-xs text-text-secondary">Roll No: {profile.roll_no} · {profile.year}</p>
                    </div>
                </div>
            ) : (
                <>
                    <h3 className="text-2xl font-bold text-white mb-2">Your Profile</h3>
                    <p className="text-text-secondary font-medium mb-6">Tell us about yourself to personalise your diagnostic.</p>
                </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                {!isLoggedIn && [
                    { key: 'name', label: 'Full Name', placeholder: 'e.g. Param Savla', type: 'text' },
                    { key: 'roll_no', label: 'Roll Number', placeholder: 'e.g. 23CS001', type: 'text' },
                ].map(f => (
                    <div key={f.key}>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">{f.label}</label>
                        <input
                            type={f.type}
                            placeholder={f.placeholder}
                            value={profile[f.key] || ''}
                            onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full bg-surface-elevation-1 border border-white/10 rounded-xl px-5 py-3.5 text-sm font-medium text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-accent/60 focus:ring-1 focus:ring-primary-accent/40 transition-all"
                        />
                    </div>
                ))}

                <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Year</label>
                    <select
                        value={profile.year || 'FE'}
                        onChange={e => handleYearChange(e.target.value)}
                        disabled={isLoggedIn}
                        className="w-full bg-surface-elevation-1 border border-white/10 rounded-xl px-5 py-3.5 text-sm font-medium text-white focus:outline-none focus:border-primary-accent/60 transition-all disabled:opacity-60"
                    >
                        {['FE', 'SE', 'TE', 'BE'].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Semester</label>
                    <select
                        value={profile.semester || sems[0]}
                        onChange={e => setProfile(p => ({ ...p, semester: e.target.value }))}
                        className="w-full bg-surface-elevation-1 border border-white/10 rounded-xl px-5 py-3.5 text-sm font-medium text-white focus:outline-none focus:border-primary-accent/60 transition-all"
                    >
                        {sems.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Number of Questions */}
            <div className="mb-6">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">
                    Number of Questions per Subject
                </label>
                <div className="flex gap-3">
                    {[5, 10, 15].map(n => (
                        <button
                            key={n}
                            onClick={() => setProfile(p => ({ ...p, questionCount: n }))}
                            className={`flex-1 flex flex-col items-center gap-1 py-3.5 rounded-xl border font-bold text-sm transition-all ${
                                profile.questionCount === n
                                    ? 'bg-primary-accent/10 border-primary-accent text-primary-accent shadow-[0_0_20px_rgba(255,216,95,0.15)]'
                                    : 'border-white/10 text-text-secondary bg-white/5 hover:border-white/20 hover:text-white'
                            }`}
                        >
                            <Hash className="w-4 h-4" />
                            <span>{n} Qs</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Subject preview */}
            {availableSubjects.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                        Subjects in {profile.semester} ({availableSubjects.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableSubjects.map(s => (
                            <span key={s.name} className="text-[10px] font-bold text-primary-accent bg-primary-accent/10 border border-primary-accent/20 px-2.5 py-1 rounded-full">
                                {s.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {err && <p className="text-red-400 text-sm font-medium mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{err}</p>}
            <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-primary-accent text-black font-bold text-sm hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(255,216,95,0.3)]"
            >
                Start Diagnostic <ChevronRight className="w-5 h-5" />
            </button>
        </motion.div>
    )
}

// ─── Step 2 — MCQ Quiz ─────────────────────────────────────────────────────────
function DiagnosticStep({ profile, onFinish }) {
    const qCount = profile.questionCount || 5
    const sem = profile.semester

    const subjects = useMemo(() => getSubjectsForSem(sem).map(s => s.name), [sem])
    const totalSubjects = Math.min(subjects.length, 3)

    const [subjectIdx, setSubjectIdx]   = useState(0)
    const [questions, setQuestions]     = useState(() => pickQuestions(subjects[0], sem, qCount))
    const [qIdx, setQIdx]               = useState(0)
    const [selected, setSelected]       = useState(null)
    const [answered, setAnswered]       = useState(false)
    const [allAnswers, setAllAnswers]   = useState([])
    const [wrongAnswers, setWrongAnswers] = useState([])
    const [loading, setLoading]         = useState(false)

    const currentSubject = subjects[subjectIdx]
    const q = questions[qIdx]

    function chooseOption(opt) {
        if (answered) return
        setSelected(opt)
        setAnswered(true)
        const isCorrect = opt === q.ans
        const answerRecord = {
            slug:           q.slug,
            question_id:    null,
            question_text:  q.q,
            selectedOption: opt,
            correctOption:  q.ans,
            selectedText:   q[opt],
            correctText:    q[q.ans],
            concept_name:   q.concept_name,
            difficulty:     q.diff || 2,
            isCorrect
        }
        setAllAnswers(prev => [...prev, answerRecord])
        if (!isCorrect) setWrongAnswers(prev => [...prev, answerRecord])
    }

    function nextQuestion() {
        if (qIdx < questions.length - 1) {
            setQIdx(i => i + 1); setSelected(null); setAnswered(false)
        } else if (subjectIdx < totalSubjects - 1) {
            const next = subjectIdx + 1
            setSubjectIdx(next)
            setQuestions(pickQuestions(subjects[next], sem, qCount))
            setQIdx(0); setSelected(null); setAnswered(false)
        } else {
            submitAll()
        }
    }

    async function submitAll() {
        setLoading(true)
        const userId = profile.roll_no || `user_${Date.now()}`
        localStorage.setItem('learnifai_user_id', userId)
        localStorage.setItem('learnifai_user_name', profile.name || 'Student')
        try {
            await fetch(`${API_BASE}/submit-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userProfile: { name: profile.name, year: profile.year, branch: profile.branch, roll_no: profile.roll_no, email: profile.email, semester: profile.semester },
                    answers: allAnswers,
                    testType: 'deep_diagnostic'
                })
            })
            const res = await fetch(`${API_BASE}/result/${userId}`)
            const result = await res.json()
            onFinish({ userId, result, wrongAnswers })
        } catch (e) {
            onFinish({ userId, result: localScore(allAnswers, profile), wrongAnswers })
        }
        setLoading(false)
    }

    const optionLabels = ['a', 'b', 'c', 'd']
    const optionTexts = q ? [q.a, q.b, q.c, q.d] : []
    const globalQNum  = subjectIdx * qCount + qIdx + 1
    const totalQs     = totalSubjects * qCount
    const progress    = (globalQNum - 1) / totalQs * 100

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary-accent animate-spin" />
            <p className="text-text-secondary font-medium">Analysing your answers…</p>
        </div>
    )

    return (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="mb-6">
                <div className="flex justify-between text-xs font-bold text-text-secondary mb-2">
                    <span>Q{globalQNum} of {totalQs} — <span className="text-primary-accent">{currentSubject}</span></span>
                    <span>{Math.round((globalQNum - 1) / totalQs * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div className="h-full bg-primary-accent rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                </div>
            </div>

            <div className="mb-4">
                <span className="text-[10px] font-bold text-primary-accent bg-primary-accent/10 border border-primary-accent/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    {q?.concept_name || q?.slug}
                </span>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={`${subjectIdx}-${qIdx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                    <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">{q?.q}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        {optionTexts.map((text, i) => {
                            const label = optionLabels[i]
                            const isCorrect = label === q?.ans
                            const isSelected = label === selected
                            let variant = 'default'
                            if (answered) {
                                if (isCorrect) variant = 'correct'
                                else if (isSelected) variant = 'wrong'
                            } else if (isSelected) { variant = 'selected' }
                            const styles = {
                                default:  'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:border-white/20 hover:text-white cursor-pointer',
                                selected: 'border-primary-accent/60 bg-primary-accent/10 text-white cursor-pointer',
                                correct:  'border-emerald-500/60 bg-emerald-500/10 text-emerald-300',
                                wrong:    'border-red-500/60 bg-red-500/10 text-red-300',
                            }
                            return (
                                <button key={label} onClick={() => chooseOption(label)} disabled={answered}
                                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 text-left ${styles[variant]}`}>
                                    <span className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5 ${
                                        variant === 'correct' ? 'border-emerald-500 text-emerald-300' :
                                        variant === 'wrong'   ? 'border-red-500 text-red-300' :
                                        variant === 'selected' ? 'border-primary-accent text-primary-accent' :
                                        'border-white/20 text-text-secondary'
                                    }`}>{label.toUpperCase()}</span>
                                    <span className="text-sm font-medium leading-relaxed">{text}</span>
                                    {answered && isCorrect && <CheckCircle className="shrink-0 w-5 h-5 text-emerald-400 ml-auto mt-0.5" />}
                                    {answered && isSelected && !isCorrect && <XCircle className="shrink-0 w-5 h-5 text-red-400 ml-auto mt-0.5" />}
                                </button>
                            )
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            {answered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <button onClick={nextQuestion}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-primary-accent text-black font-bold text-sm hover:opacity-90 transition-opacity">
                        {subjectIdx < totalSubjects - 1 || qIdx < questions.length - 1
                            ? <><span>Next Question</span><ChevronRight className="w-5 h-5" /></>
                            : <><span>View My Results</span><BarChart2 className="w-5 h-5" /></>
                        }
                    </button>
                </motion.div>
            )}
        </motion.div>
    )
}

// ─── Step 3 — Results ─────────────────────────────────────────────────────────
function ResultsStep({ result, profile, wrongAnswers = [], onRetake }) {
    const { weak_topics = [], strong_topics = [], mastery_summary = {}, analysis_text = '' } = result || {}
    const pct = mastery_summary.overall_pct ?? 0
    const [activeTab, setActiveTab] = useState('analysis')

    return (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-1">Diagnostic Complete</h3>
                <p className="text-text-secondary font-medium">
                    Here's your personalised knowledge gap analysis, {profile.name || 'Student'}.
                </p>
            </div>

            {/* Mastery ring */}
            <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <GlassCard className="!p-6 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="relative w-24 h-24 mb-4">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                            <motion.circle cx="48" cy="48" r="40" fill="none" stroke="#FFD85F" strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - pct / 100) }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-black text-white">{pct}%</span>
                        </div>
                    </div>
                    <p className="text-sm font-bold text-white">Overall Mastery</p>
                    <p className="text-xs text-text-secondary mt-1">{strong_topics.length} strong · {weak_topics.length} weak</p>
                </GlassCard>

                <GlassCard className="!p-6 flex-[2]">
                    <p className="text-[10px] font-bold text-primary-accent uppercase tracking-widest mb-3">Analysis</p>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed whitespace-pre-line">
                        {analysis_text || 'Complete more tests to get a detailed analysis.'}
                    </p>
                </GlassCard>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-0">
                {[
                    { id: 'analysis', label: `Weak Topics (${weak_topics.length})` },
                    { id: 'strong', label: `Strong Areas (${strong_topics.length})` },
                    { id: 'mistakes', label: `Mistakes (${wrongAnswers.length})` },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all ${
                            activeTab === tab.id ? 'text-primary-accent border-primary-accent' : 'text-text-secondary border-transparent hover:text-white'
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Weak Topics Tab */}
            {activeTab === 'analysis' && (
                <div className="mb-6">
                    {weak_topics.length === 0 ? (
                        <div className="text-center py-10">
                            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                            <p className="text-white font-bold">All concepts above mastery threshold!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {weak_topics.map((t, i) => {
                                const concept = conceptBySlug[t.slug]
                                const floor = inferFloor(concept?.library_section)
                                return (
                                    <motion.div key={t.slug} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                                        <GlassCard className="!p-5 border-red-500/20 hover:border-red-500/40 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                                        <h4 className="font-bold text-white text-base">{t.name}</h4>
                                                    </div>
                                                    <p className="text-xs text-text-secondary ml-6">
                                                        {t.subject} · Mastery: <span className="text-red-400 font-bold">{t.mastery_pct}%</span>
                                                    </p>
                                                </div>
                                                <div className="sm:w-32 shrink-0">
                                                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                        <motion.div className="h-full bg-red-400/70 rounded-full"
                                                            initial={{ width: 0 }} animate={{ width: `${t.mastery_pct}%` }}
                                                            transition={{ delay: i * 0.08 + 0.3 }} />
                                                    </div>
                                                </div>
                                            </div>
                                            {concept && (
                                                <div className="mt-4 p-3 rounded-xl bg-black/40 border border-primary-accent/20 flex flex-col sm:flex-row sm:items-start gap-3">
                                                    <div className="flex items-start gap-2 flex-1">
                                                        <MapPin className="w-4 h-4 text-primary-accent shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-bold text-primary-accent uppercase tracking-widest">📚 Recommended Book</p>
                                                            <p className="text-sm font-bold text-white mt-0.5">{concept.book_title}</p>
                                                            <p className="text-[10px] font-bold text-primary-accent uppercase tracking-widest mt-2">📍 Library Location</p>
                                                            <p className="text-sm font-bold text-white mt-0.5">
                                                                {floor} → {concept.library_section} → {concept.shelf}
                                                            </p>
                                                            <p className="text-xs text-text-secondary mt-0.5">ISBN: {concept.book_isbn}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </GlassCard>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Strong Areas Tab */}
            {activeTab === 'strong' && (
                <div className="mb-6">
                    {strong_topics.length === 0 ? (
                        <p className="text-center text-text-secondary py-8">No topics above mastery threshold yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {strong_topics.map(t => (
                                <div key={t.slug} className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-300">{t.name}</span>
                                    <span className="text-[10px] text-emerald-400/70">{t.mastery_pct}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Mistakes Tab */}
            {activeTab === 'mistakes' && (
                <div className="mb-6">
                    {wrongAnswers.length === 0 ? (
                        <div className="text-center py-10">
                            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                            <p className="text-white font-bold">Perfect score — no mistakes!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {wrongAnswers.map((w, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                    <GlassCard className="!p-5 border-red-500/20">
                                        <p className="text-[10px] font-bold text-primary-accent uppercase tracking-widest mb-2">{w.concept_name}</p>
                                        <p className="text-sm font-bold text-white mb-4 leading-relaxed">{w.question_text}</p>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Your Answer ({w.selectedOption?.toUpperCase()})</p>
                                                    <p className="text-sm text-red-300">{w.selectedText}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Correct Answer ({w.correctOption?.toUpperCase()})</p>
                                                    <p className="text-sm text-emerald-300">{w.correctText}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Study tip */}
                                        {conceptBySlug[w.slug] && (
                                            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                                                <BookOpen className="w-3.5 h-3.5 text-primary-accent shrink-0" />
                                                <span>Study tip: Refer to <span className="text-primary-accent font-bold">{conceptBySlug[w.slug].book_title}</span> — {inferFloor(conceptBySlug[w.slug].library_section)} → {conceptBySlug[w.slug].library_section} → {conceptBySlug[w.slug].shelf}</span>
                                            </div>
                                        )}
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <button onClick={onRetake}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-white/20 text-text-secondary font-bold text-sm hover:bg-white/5 hover:text-white transition-all">
                <ChevronLeft className="w-5 h-5" /> Retake Diagnostic
            </button>
        </motion.div>
    )
}

// ─── Local BKT fallback ────────────────────────────────────────────────────────
const P_KNOW = 0.3, P_LEARN = 0.2, P_SLIP = 0.1, P_GUESS = 0.25, MASTERY_THRESH = 0.65
function bktUpdate(p, correct) {
    const pC = p * (1 - P_SLIP) + (1 - p) * P_GUESS
    const post = correct ? (p * (1 - P_SLIP)) / pC : (p * P_SLIP) / (1 - pC)
    return post + (1 - post) * P_LEARN
}
function localScore(answers, profile) {
    const bySlug = {}
    for (const a of answers) {
        if (!bySlug[a.slug]) bySlug[a.slug] = []
        bySlug[a.slug].push(a.isCorrect ?? (a.selectedOption === a.correctOption))
    }
    const weak = [], strong = []
    for (const [slug, corrects] of Object.entries(bySlug)) {
        let p = P_KNOW
        for (const c of corrects) p = bktUpdate(p, c)
        const score = parseFloat(p.toFixed(3))
        const concept = conceptBySlug[slug]
        const entry = { slug, name: concept?.name || slug, subject: concept?.subject_name, mastery_pct: Math.round(score * 100), score, books: [] }
        if (score < MASTERY_THRESH) weak.push(entry)
        else strong.push(entry)
    }
    weak.sort((a, b) => a.score - b.score)
    const pct = weak.length + strong.length > 0 ? Math.round(strong.length / (weak.length + strong.length) * 100) : 0
    const name = profile.name || 'Student'
    const weakNames = weak.slice(0, 3).map(t => t.name).join(', ')
    const text = `${name} (${profile.semester || profile.year}), your diagnostic is complete.\n\n${
        weak.length > 0
            ? `⚠️ Focus on: ${weakNames}${weak.length > 3 ? ` and ${weak.length - 3} more` : ''}.\n\nFor each weak topic, visit the library using the book and location shown below.`
            : '✅ Great — all concepts above mastery threshold!'
    }\n\n📊 Overall mastery: ${pct}% (${strong.length}/${weak.length + strong.length} concepts cleared).`
    return {
        weak_topics: weak, strong_topics: strong,
        mastery_summary: { overall_pct: pct, weak_count: weak.length, strong_count: strong.length },
        analysis_text: text
    }
}

// ─── Timetable sidebar ─────────────────────────────────────────────────────────
const timetable = [
    { subject: 'Engineering Mathematics III', date: '10 Apr', time: '10:00', sem: 'SE SEM 3' },
    { subject: 'Data Structures & Algorithms', date: '12 Apr', time: '10:00', sem: 'SE SEM 3' },
    { subject: 'Engineering Mathematics IV', date: '14 Apr', time: '10:00', sem: 'SE SEM 4' },
    { subject: 'Operating Systems', date: '16 Apr', time: '10:00', sem: 'TE SEM 5' },
    { subject: 'Machine Learning', date: '18 Apr', time: '10:00', sem: 'BE SEM 7' },
    { subject: 'Computer Networks', date: '21 Apr', time: '10:00', sem: 'TE SEM 6' },
]

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TestSection() {
    const [step, setStep]         = useState(1)
    const [resultData, setResult] = useState(null)

    // Try to load session from localStorage
    const [profile, setProfile] = useState(() => {
        const id   = localStorage.getItem('learnifai_user_id') || ''
        const name = localStorage.getItem('learnifai_user_name') || ''
        const year = localStorage.getItem('learnifai_user_year') || 'FE'
        const branch = localStorage.getItem('learnifai_user_branch') || ''
        const fromSession = !!(id && name)
        const defaultSem = (SEMS_BY_YEAR[year] || ['FE SEM 1'])[0]
        return {
            name,
            roll_no: id,
            email: '',
            year,
            branch,
            semester: defaultSem,
            questionCount: 5,
            _fromSession: fromSession
        }
    })

    // If logged in, skip Step 1
    useEffect(() => {
        if (profile._fromSession) setStep(2)
    }, [])

    function handleDiagnosticFinish(data) { setResult(data); setStep(3) }
    function handleRetake() {
        setStep(profile._fromSession ? 2 : 1)
        setResult(null)
    }
    function handleGoToSetup() { setStep(1) }

    return (
        <section id="tests" className="relative py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-accent/5 via-background-base to-background-base pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-6 md:px-8">

                <ScrollReveal className="mb-12 origin-left">
                    <div className="text-primary-accent font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-primary-accent" />
                        AI Diagnostic
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        Know Your Knowledge Gaps
                    </h2>
                    <p className="text-text-secondary mt-4 max-w-xl text-lg font-medium">
                        Take an adaptive diagnostic (5, 10, or 15 Qs). Our BKT engine scores each concept
                        and maps weak areas to the exact book, floor, section, and shelf in your library.
                    </p>
                </ScrollReveal>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8">
                        <GlassCard className="!p-8">
                            <StepBar current={step} />
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <SetupStep key="setup" profile={profile} setProfile={setProfile} onNext={() => setStep(2)} />
                                )}
                                {step === 2 && (
                                    <DiagnosticStep key="diagnostic" profile={profile} onFinish={handleDiagnosticFinish} />
                                )}
                                {step === 3 && (
                                    <ResultsStep key="results" result={resultData?.result} profile={profile} wrongAnswers={resultData?.wrongAnswers || []} onRetake={handleRetake} />
                                )}
                            </AnimatePresence>
                            {step === 2 && profile._fromSession && (
                                <button onClick={handleGoToSetup} className="mt-4 text-xs text-text-secondary hover:text-primary-accent transition-colors flex items-center gap-1">
                                    <ChevronLeft className="w-3 h-3" /> Change semester / question count
                                </button>
                            )}
                        </GlassCard>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <GlassCard className="!p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-accent/10 blur-[60px] rounded-full" />
                            <h3 className="text-sm font-bold tracking-widest text-text-secondary uppercase mb-6 relative z-10">
                                Upcoming Exams
                            </h3>
                            <div className="flex flex-col gap-3 relative z-10">
                                {timetable.map((item, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary-accent/30 transition-colors">
                                        <div>
                                            <p className="font-bold text-xs text-white mb-0.5">{item.subject}</p>
                                            <p className="text-[10px] text-text-secondary tracking-widest uppercase">{item.sem}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-xs text-primary-accent mb-0.5">{item.date}</p>
                                            <p className="text-[10px] text-text-secondary">{item.time}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </GlassCard>

                        <GlassCard className="!p-6">
                            <h3 className="text-sm font-bold tracking-widest text-text-secondary uppercase mb-3">How It Works</h3>
                            {[
                                { icon: User, label: 'Setup', desc: 'Choose your semester & question count' },
                                { icon: Brain, label: 'Diagnostic', desc: `Adaptive MCQs across up to 3 subjects` },
                                { icon: BarChart2, label: 'Results', desc: 'Weak topics + book + library location' },
                            ].map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="flex items-start gap-3 mb-4 last:mb-0">
                                    <div className="w-8 h-8 rounded-full bg-primary-accent/10 border border-primary-accent/20 flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-primary-accent" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">{label}</p>
                                        <p className="text-xs text-text-secondary">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </GlassCard>
                    </div>
                </div>
            </div>
        </section>
    )
}
