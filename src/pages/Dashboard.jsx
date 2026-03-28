import React, { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useAnimationFrame } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { ScrollReveal } from '../components/ui/ScrollReveal'
import { 
  Activity, 
  ArrowRight, 
  BookOpen, 
  Brain, 
  CheckCircle2, 
  ChevronRight, 
  Compass, 
  Cpu, 
  GraduationCap, 
  LineChart, 
  MapPin,
  MousePointer2, 
  Sparkles, 
  Target, 
  Terminal, 
  Zap,
  BarChart2,
  AlertTriangle
} from "lucide-react"

const API_BASE = 'http://localhost:3002/api'

// ── Diagnostic Banner ─────────────────────────────────────────────────────────
function DiagnosticBanner() {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('learnifai_user_id')
    if (!userId) { setLoading(false); return }
    fetch(`${API_BASE}/result/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setResult(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  if (!result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-5 rounded-2xl border border-primary-accent/20 bg-primary-accent/5 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary-accent/10 border border-primary-accent/20 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary-accent" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">No Diagnostic Yet</p>
            <p className="text-xs text-text-secondary mt-0.5">Take a diagnostic to see your personal knowledge gap map and library recommendations.</p>
          </div>
        </div>
        <Link
          to="/tests"
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-accent text-black font-bold text-xs hover:opacity-90 transition-opacity"
        >
          <Zap className="w-4 h-4" /> Start Diagnostic
        </Link>
      </motion.div>
    )
  }

  const pct   = result.mastery_summary?.overall_pct ?? 0
  const weak  = result.weak_topics  ?? []
  const strong = result.strong_topics ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-5 rounded-2xl border border-white/10 bg-surface-elevation-1 flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary-accent/10 border border-primary-accent/20 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-primary-accent" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Last Diagnostic Result</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {strong.length} concepts mastered · {weak.length} need attention · Overall <span className="text-primary-accent font-bold">{pct}%</span>
            </p>
          </div>
        </div>
        <Link
          to="/tests"
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-text-secondary font-bold text-xs hover:bg-white/5 hover:text-white transition-all"
        >
          Retake <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {weak.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {weak.slice(0, 4).map(t => (
            <Link
              key={t.slug}
              to="/library"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              {t.name}
              {t.mastery_pct !== undefined && <span className="opacity-70">{t.mastery_pct}%</span>}
            </Link>
          ))}
          {weak.length > 4 && (
            <span className="flex items-center px-3 py-1.5 rounded-full bg-white/5 text-xs font-bold text-text-secondary">
              +{weak.length - 4} more
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

const ICON_MAP = {
  Sparkles, BookOpen, Cpu, Brain, Compass, LineChart, Activity, Target, Terminal, CheckCircle2, Zap
}

const faces = ["front", "right", "back", "left", "top", "bottom"]

const faceOffsets = {
  front: 150, right: 150, back: 150, left: 150, top: 150, bottom: 150,
}

const faceRotations = {
  front: "rotateY(0deg)", right: "rotateY(90deg)", back: "rotateY(180deg)", left: "rotateY(-90deg)", top: "rotateX(90deg)", bottom: "rotateX(-90deg)",
}

export default function Dashboard() {
  const { scrollYProgress } = useScroll()
  const rotateX = useMotionValue(-20)
  const rotateY = useMotionValue(25)
  const [userName, setUserName] = useState('')
  const [data, setData] = useState({ learningHours: [], totalHoursThisWeek: 0, peakDay: '', subjects: [], mentors: [] })
  const navigate = useNavigate()

  // Course Details State
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [courseDetails, setCourseDetails] = useState(null)
  const [loadingCourse, setLoadingCourse] = useState(false)

  const handleCourseClick = async (courseName) => {
    setSelectedCourse(courseName)
    setLoadingCourse(true)
    setCourseDetails(null)
    const storedUserId = localStorage.getItem('learnifai_user_id')
    try {
      const res = await fetch(`${API_BASE}/dashboard/${storedUserId}/course/${encodeURIComponent(courseName)}`)
      const data = await res.json()
      setCourseDetails(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingCourse(false)
    }
  }

  useAnimationFrame((t, delta) => {
    rotateY.set(rotateY.get() + delta * 0.015)
  })

  const handleDrag = (e, info) => {
    rotateX.set(rotateX.get() - info.delta.y * 0.5)
    rotateY.set(rotateY.get() + info.delta.x * 0.5)
  }

  // Persist userId when found in result and load userName
  useEffect(() => {
    const storedUserId = localStorage.getItem('learnifai_user_id')
    const storedName = localStorage.getItem('learnifai_user_name')
    if (storedName) setUserName(storedName)

    if (storedUserId) {
      fetch(`${API_BASE}/dashboard/${storedUserId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && !d.error) setData(d) })
    } else {
      navigate('/auth')
    }
  }, [navigate])

  const learningHours = data.learningHours.length > 0 ? data.learningHours : [
    { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
    { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 }
  ]
  const subjects = data.subjects
  // Fallback demo subjects for empty state
  const demoFallback = [
    { name: "Take Diagnostic", iconStr: "Sparkles", face: "front", color: "bg-blue-500/20", textColor: "text-blue-400", progress: 0, lessons: 0, hours: 0 }
  ]
  const activeSubjects = subjects.length > 0 ? subjects : demoFallback

  const mentors = data.mentors && data.mentors.length > 0 ? data.mentors : [
    { name: "Dr. Sarah Chen", role: "Quantum Physics", img: "https://i.pravatar.cc/150?u=sarah" },
    { name: "Prof. James Wilson", role: "Pure Mathematics", img: "https://i.pravatar.cc/150?u=james" },
  ]

  const continueWatch = activeSubjects.length > 0 
    ? activeSubjects.reduce((prev, curr) => (prev.progress < curr.progress ? prev : curr)) 
    : demoFallback[0]

  return (
    <>
      <div className="mb-8 pt-10">
        <ScrollReveal className="origin-left">
          <h1 className="text-4xl font-bold tracking-tight mb-1">
            Welcome to LearnifAI{userName ? `, ${userName}` : ''} 👋
          </h1>
          <p className="text-text-secondary font-medium">Your AI-powered diagnostic learning platform.</p>
        </ScrollReveal>
      </div>
      <DiagnosticBanner />

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <GlassCard className="!p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold mb-1">Learning Hours</h3>
                <p className="text-sm text-text-secondary font-medium">Your progress this week</p>
              </div>
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{data.totalHoursThisWeek}h</span>
                {data.totalHoursThisWeek > 0 && (
                  <span className="text-xs font-bold text-green-500 bg-green-100/20 px-2 py-1 rounded-full">This Week</span>
                )}
              </div>
            </div>
            
            <div className="flex items-end justify-between h-48 gap-2">
              {learningHours.map((item, i) => {
                const isPeak = data.peakDay ? item.day === data.peakDay : false
                return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full relative flex items-end justify-center h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      whileInView={{ height: `${Math.max(2, (item.hours / Math.max(...learningHours.map(l => l.hours), 1)) * 100)}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 ${isPeak ? 'bg-primary-accent' : 'bg-white/5 group-hover:bg-primary-accent/30'}`}
                    />
                    {isPeak && item.hours > 0 && (
                      <div className="absolute -top-8 bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                        {item.hours}h
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-text-secondary">{item.day}</span>
                </div>
              )})}
            </div>
          </GlassCard>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Continue Watching</h3>
              <button className="text-sm font-bold text-text-secondary hover:text-white transition-colors">View All</button>
            </div>
            <GlassCard className="!p-0 overflow-hidden group cursor-pointer">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 aspect-video md:aspect-auto bg-black relative">
                  <img 
                    src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800" 
                    alt="Course" 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary-accent flex items-center justify-center shadow-xl shadow-primary-accent/40 group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-black fill-black" />
                    </div>
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                      {continueWatch.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                      Lesson {Math.max(1, Math.floor((continueWatch.progress / 100) * continueWatch.lessons))} of {Math.max(1, continueWatch.lessons)}
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold mb-2">Mastering {continueWatch.name}: Advanced Concepts</h4>
                  <p className="text-text-secondary text-sm mb-6 line-clamp-2">
                    Review your weakest areas in {continueWatch.name} with our AI-guided step-by-step breakdown of complex problems.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${continueWatch.progress}%` }}
                        className="h-full bg-primary-accent"
                      />
                    </div>
                    <span className="text-sm font-bold">{continueWatch.progress}%</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <section className="py-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-2xl font-bold mb-2">Concept Explorer</h3>
                <p className="text-text-secondary font-medium">Interact with the AI knowledge cube to discover connections</p>
              </div>
              <div className="flex gap-2">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold shadow-sm">
                  3D View
                </div>
              </div>
            </div>

            <div className="relative h-[500px] flex items-center justify-center bg-surface-elevation-1 rounded-[40px] border border-white/5 shadow-sm overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,216,95,0.05)_0%,transparent_70%)]" />
              
              <motion.div 
                className="cuboid-scene relative z-10"
                style={{ 
                  scale: useTransform(scrollYProgress, [0, 0.2], [0.8, 1]),
                  perspective: 1000,
                  transformStyle: "preserve-3d"
                }}
              >
                <motion.div 
                  className="w-full h-full relative cursor-grab active:cursor-grabbing"
                  style={{ 
                    transformStyle: "preserve-3d",
                    rotateX,
                    rotateY
                  }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0}
                  onDrag={handleDrag}
                >
                  {faces.map((faceName) => (
                    <motion.div 
                      key={faceName} 
                      className={`cuboid-face cuboid-face-${faceName}`}
                      style={{
                        transform: `${faceRotations[faceName]} translateZ(${faceOffsets[faceName]}px)`,
                      }}
                    >
                      {activeSubjects.filter(s => s.face === faceName).map((subject, j) => {
                        const Icon = ICON_MAP[subject.iconStr] || Sparkles
                        return (
                        <motion.div 
                          key={j} 
                          className="cuboid-tile group"
                          whileHover={{ 
                            z: 40,
                            backgroundColor: "rgba(255, 216, 95, 1)",
                            transition: { type: "spring", stiffness: 300, damping: 20 }
                          }}
                        >
                          <Icon className="w-8 h-8 text-white/20 group-hover:text-black mb-2 transition-all duration-300" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-white/40 group-hover:text-black">{subject.name}</span>
                        </motion.div>
                      )})}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              
              <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  <MousePointer2 className="w-4 h-4 text-text-secondary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Hover to expand tiles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">AI Analysis Active</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">My Courses</h3>
            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {activeSubjects.slice(0, 4).map((subject, i) => {
              const Icon = ICON_MAP[subject.iconStr] || Sparkles
              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="subject-tile group cursor-pointer"
                onClick={() => handleCourseClick(subject.name)}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${subject.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Icon className={`w-6 h-6 ${subject.textColor}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg leading-none mb-1">{subject.name}</h4>
                    <p className="text-xs text-text-secondary font-medium">{subject.lessons} Lessons • {subject.hours}h</p>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-primary-accent group-hover:border-primary-accent transition-colors">
                    <ChevronRight className="w-4 h-4 group-hover:text-black" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-text-secondary">Mastery Level</span>
                    <span>{subject.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${subject.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className="h-full bg-primary-accent"
                    />
                  </div>
                </div>
              </motion.div>
            )})}
          </div>

          <GlassCard className="!p-6 bg-surface-elevation-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-accent/10 blur-[60px] rounded-full" />
            <h3 className="text-lg font-bold mb-4 relative z-10">Top Mentors</h3>
            <div className="space-y-4 relative z-10">
              {mentors.map((mentor, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                  <img src={mentor.img} alt={mentor.name} className="w-10 h-10 rounded-full border-2 border-white/10 group-hover:border-primary-accent object-cover transition-colors" />
                  <div>
                    <p className="text-sm font-bold">{mentor.name}</p>
                    <p className="text-[10px] text-white/50">{mentor.role}</p>
                  </div>
                  <div className="ml-auto w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-white/10 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors">
              View All Mentors
            </button>
          </GlassCard>
        </div>
      </div>

      <section className="mt-48">
        <ScrollReveal className="text-center mb-20 origin-left">
          <h2 className="text-5xl font-bold tracking-tight mb-6">Full Curriculum</h2>
          <p className="text-text-secondary max-w-2xl mx-auto text-lg font-medium">
            Our AI traces your understanding across 24 core subjects, identifying the hidden links between them.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeSubjects.map((subject, i) => {
            const Icon = ICON_MAP[subject.iconStr] || Sparkles
            return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.1 }}
              className="subject-tile group cursor-pointer"
              onClick={() => handleCourseClick(subject.name)}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl ${subject.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <Icon className={`w-6 h-6 ${subject.textColor}`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg leading-none mb-1">{subject.name}</h4>
                  <p className="text-xs text-text-secondary font-medium">{subject.lessons} Lessons • {subject.hours}h</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-text-secondary">Mastery</span>
                  <span>{subject.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${subject.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-primary-accent"
                  />
                </div>
              </div>
            </motion.div>
          )})}
        </div>
      </section>

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
             onClick={() => setSelectedCourse(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl max-h-[80vh] bg-surface-elevation-1 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-2xl font-bold">{selectedCourse}</h2>
                <p className="text-sm text-text-secondary mt-1">Course Concepts and Your Progress</p>
              </div>
              <button 
                onClick={() => setSelectedCourse(null)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {loadingCourse ? (
                <div className="py-20 flex justify-center items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-primary-accent border-r-transparent animate-spin"></div>
                </div>
              ) : courseDetails ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Total Concepts</p>
                      <p className="text-2xl font-bold">{courseDetails.totalConcepts}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Mastered</p>
                      <p className="text-2xl font-bold text-green-400">{courseDetails.completedConcepts}</p>
                    </div>
                  </div>

                  {courseDetails.concepts && courseDetails.concepts.length > 0 ? (
                    <div className="space-y-3">
                      {courseDetails.concepts.map((c, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                          <div className={`w-2 h-10 rounded-full ${c.progress > 70 ? 'bg-green-500' : c.progress > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          <div className="flex-1">
                            <h4 className="font-bold">{c.name}</h4>
                            <p className="text-xs text-text-secondary mt-1">Semester: {c.semester} • Difficulty: {c.difficulty}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{c.progress}%</p>
                            <p className="text-[10px] text-text-secondary uppercase">Mastery</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-text-secondary">
                      No concepts found for this subject.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-text-secondary">
                  Failed to load course details.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
