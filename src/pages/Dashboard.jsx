import React, { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useAnimationFrame } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { ScrollReveal } from '../components/ui/ScrollReveal'
import curriculumData from '../../curriculum.json'
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
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
  Pause,
  Play
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
  const [data, setData] = useState({ learningHours: [], totalHoursThisWeek: 0, subjects: [], mentors: [] })
  const navigate = useNavigate()

  const [selectedConcept, setSelectedConcept] = useState(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)

  useAnimationFrame((t, delta) => {
    if (autoRotate) {
      rotateY.set(rotateY.get() + delta * 0.035)
      rotateX.set(rotateX.get() + delta * 0.015) // Faster tumbling effect
    }
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
  const subjects = data.subjects || []
  
  // To ensure the 6-sided 3D Concept Cube (4 slots per face = 24 total) looks dense and premium, 
  // we'll fill any missing items with real concepts from the curriculum.
  const curriculumConcepts = []
  const subConcepts = []
  
  Object.values(curriculumData.subjects_by_field || {}).forEach(fieldSubjects => {
    fieldSubjects.forEach(sub => {
      if (sub.name && !curriculumConcepts.includes(sub.name)) {
        curriculumConcepts.push(sub.name)
      }
      (sub.concepts || []).forEach(concept => {
        const name = concept.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        if (!subConcepts.includes(name)) subConcepts.push(name)
      })
    })
  })
  
  // Keep main subjects first, then pad the remaining slots with randomized sub-concepts
  const shuffledSubConcepts = subConcepts.sort(() => 0.5 - Math.random())
  const dummyTopics = [...curriculumConcepts, ...shuffledSubConcepts]
  
  const dummyIcons = ["Sparkles", "Brain", "Cpu", "LineChart", "Activity", "Target", "Compass", "Terminal", "Zap", "CheckCircle2"]
  const dummyColors = [
    { bg: "bg-blue-500/20", text: "text-blue-400" }, { bg: "bg-purple-500/20", text: "text-purple-400" },
    { bg: "bg-green-500/20", text: "text-green-400" }, { bg: "bg-yellow-500/20", text: "text-yellow-400" },
    { bg: "bg-red-500/20", text: "text-red-400" }, { bg: "bg-orange-500/20", text: "text-orange-400" }
  ]

  let activeSubjects = [...subjects]
  const existingNames = new Set(activeSubjects.map(s => s.name.toLowerCase()))
  
  // Fill remaining slots using unique curriculum subjects (no duplicates)
  let i = 0;
  for (const topicName of dummyTopics) {
    if (activeSubjects.length >= 24) break; // Optional cap just in case
    if (!existingNames.has(topicName.toLowerCase())) {
      existingNames.add(topicName.toLowerCase())
      const colorSet = dummyColors[i % dummyColors.length]
      
      activeSubjects.push({
        name: topicName,
        iconStr: dummyIcons[i % dummyIcons.length],
        color: colorSet.bg,
        textColor: colorSet.text,
        progress: Math.floor(Math.random() * 80) + 10,
        lessons: Math.floor(Math.random() * 20) + 3,
        hours: Math.floor(Math.random() * 15) + 1
      })
      i++;
    }
  }

  // Strictly enforce 4 tiles per face regardless of underlying array shifts
  activeSubjects = activeSubjects.map((sub, idx) => ({
    ...sub,
    face: faces[Math.floor(idx / 4) % 6]
  }))

  const mentors = data.mentors && data.mentors.length > 0 ? data.mentors : [
    { name: "Dr. Sarah Chen", role: "Quantum Physics", img: "https://i.pravatar.cc/150?u=sarah" },
    { name: "Prof. James Wilson", role: "Pure Mathematics", img: "https://i.pravatar.cc/150?u=james" },
  ]

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
                <span className="text-xs font-bold text-green-500 bg-green-100/20 px-2 py-1 rounded-full">+12%</span>
              </div>
            </div>
            
            <div className="flex items-end justify-between h-48 gap-2">
              {learningHours.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full relative flex items-end justify-center h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      whileInView={{ height: `${(item.hours / 8) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 ${item.day === "Thu" ? "bg-primary-accent" : "bg-white/5 group-hover:bg-primary-accent/30"}`}
                    />
                    {item.day === "Thu" && (
                      <div className="absolute -top-8 bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                        8h
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-text-secondary">{item.day}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <section className="py-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-2xl font-bold mb-2">Concept Explorer</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setAutoRotate(!autoRotate)}
                  className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                  title={autoRotate ? "Pause Rotation" : "Play Rotation"}
                >
                  {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex bg-white/5 border border-white/10 rounded-full overflow-hidden">
                  <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} className="p-2 hover:bg-white/10 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                  <div className="flex items-center px-2 text-xs font-bold text-text-secondary w-12 justify-center">{Math.round(zoomLevel * 100)}%</div>
                  <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.2))} className="p-2 hover:bg-white/10 transition-colors"><ZoomIn className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="relative h-[600px] flex items-center justify-center bg-surface-elevation-1 rounded-[40px] border border-white/5 shadow-sm overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,216,95,0.05)_0%,transparent_70%)]" />
              
              <div style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.3s ease-out' }} className="w-full h-full flex items-center justify-center z-10">
                <motion.div 
                  className="cuboid-scene relative"
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
                            onClick={() => setSelectedConcept(subject)}
                            className="cuboid-tile group cursor-pointer"
                            whileHover={{ 
                              z: 40,
                              backgroundColor: "rgba(255, 216, 95, 1)",
                              transition: { type: "spring", stiffness: 300, damping: 20 }
                            }}
                          >
                            <Icon className="w-8 h-8 text-[#FFD85F]/80 group-hover:text-black mb-2 transition-all duration-300" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-[#FFD85F] group-hover:text-black text-center">{subject.name}</span>
                          </motion.div>
                        )})}
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              </div>
              
              {/* Contextual Side Panel */}
              <motion.div 
                initial={false}
                animate={{ 
                  x: selectedConcept ? 0 : 400,
                  opacity: selectedConcept ? 1 : 0
                }}
                className="absolute top-4 bottom-4 right-4 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 flex flex-col z-50 pointer-events-auto"
              >
                {selectedConcept && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-10 h-10 rounded-xl ${selectedConcept.color} flex items-center justify-center`}>
                        {React.createElement(ICON_MAP[selectedConcept.iconStr] || Sparkles, { className: `w-5 h-5 ${selectedConcept.textColor}` })}
                      </div>
                      <button 
                        onClick={() => setSelectedConcept(null)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    
                    <h4 className="text-xl font-bold mb-1">{selectedConcept.name}</h4>
                    <p className="text-sm text-text-secondary mb-8">{selectedConcept.lessons} Lessons • {selectedConcept.hours}h Spent</p>
                    
                    <div className="space-y-6 flex-1">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold mb-2">
                          <span className="text-white/60">MASTERY LEVEL</span>
                          <span className="text-primary-accent">{selectedConcept.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedConcept.progress}%` }}
                            className="h-full bg-primary-accent"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-primary-accent/10 border border-primary-accent/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-primary-accent" />
                          <span className="text-xs font-bold text-primary-accent">AI RECOMMENDATION</span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">
                          Your mastery in {selectedConcept.name} could be improved. We recommend visiting the Library to review your recent topic.
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-xs font-bold text-white/60 mb-3 block">RELATED TOPICS</span>
                        <div className="flex flex-wrap gap-2">
                          {dummyTopics.filter(t => t !== selectedConcept.name).slice(0, 3).map(t => (
                            <span key={t} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>

              <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row items-start md:items-center justify-between pointer-events-none gap-4">
                <div className="flex items-center gap-2">
                  <MousePointer2 className="w-4 h-4 text-text-secondary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Click tiles to inspect • Drag to rotate</span>
                </div>
                <div className="bg-black/60 backdrop-blur-md border border-primary-accent/30 pl-3 pr-4 py-2 rounded-full flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-accent"></span>
                  </div>
                  <span className="text-xs font-bold text-primary-accent line-clamp-1 max-w-[200px] sm:max-w-xs transition-all">
                    {selectedConcept ? `Analyzing ${selectedConcept.name} dependencies...` : "AI Analysis Active: Monitoring concept graph..."}
                  </span>
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

      <section className="mt-24 mb-12">
        <ScrollReveal className="origin-left mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Daily Quests</h2>
          <p className="text-text-secondary font-medium">
            AI-generated tasks to strengthen your knowledge graph. Completing them boosts your overall mastery.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quest 1 */}
          <GlassCard className="!p-6 group hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
            <div className="flex justify-between items-start mb-5">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-green-400 bg-green-500/10 px-2.5 py-1 rounded">NEW</span>
            </div>
            <h4 className="font-bold text-xl mb-2">Master Algebra Basics</h4>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">You missed 2 questions here in your diagnostic. Let's fix that with a tailored review session.</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-white flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />+50 XP</span>
              <button className="text-xs font-bold text-white bg-white/5 border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors">Start Quest</button>
            </div>
          </GlassCard>

          {/* Quest 2 */}
          <GlassCard className="!p-6 group hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary-accent" />
            <div className="flex justify-between items-start mb-5">
              <div className="w-12 h-12 rounded-2xl bg-primary-accent/10 flex items-center justify-center border border-primary-accent/20 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-primary-accent" />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-text-secondary bg-white/5 border border-white/5 px-2.5 py-1 rounded">IN PROGRESS</span>
            </div>
            <h4 className="font-bold text-xl mb-2">Physics Challenge</h4>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">Complete a 5-minute timed quiz on Motion & Kinematics to jump up a mastery level.</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-white flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />+120 XP</span>
              <button className="text-xs font-bold bg-primary-accent text-black px-5 py-2.5 rounded-full shadow-lg shadow-primary-accent/20 hover:opacity-90 transition-opacity">Resume</button>
            </div>
          </GlassCard>

          {/* Quest 3 */}
          <GlassCard className="!p-6 group hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
            <div className="flex justify-between items-start mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-text-secondary bg-white/5 border border-white/5 px-2.5 py-1 rounded">DAILY SPINS: 1</span>
            </div>
            <h4 className="font-bold text-xl mb-2">AI Discovery</h4>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">Watch an AI-generated bite-sized video on a random curriculum topic from your field.</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-white flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />+30 XP</span>
              <button className="text-xs font-bold text-white bg-white/5 border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors">Discover</button>
            </div>
          </GlassCard>
        </div>
      </section>
    </>
  )
}
