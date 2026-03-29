import React, { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useAnimationFrame } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { ScrollReveal } from '../components/ui/ScrollReveal'
import curriculumData from '../data/curriculum.json'
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
  Plus,
  TrendingUp,
  Star,
  Heart,
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
  const [data, setData] = useState({ learningHours: [], totalHoursThisWeek: 0, peakDay: '', subjects: [], explorerConcepts: [], mentors: [] })
  const navigate = useNavigate()

  // Course Details State
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [courseDetails, setCourseDetails] = useState(null)
  const [loadingCourse, setLoadingCourse] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)

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

  const formatHours = (h) => {
    const hours = Math.floor(h)
    const mins  = Math.round((h - hours) * 60)
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const getInitials = (name) => {
    const parts = name.replace(/^(Dr\.|Prof\.)\s+/, '').split(' ')
    return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const currentDayName = days[new Date().getDay()]

  const baseHours = data.learningHours && data.learningHours.length > 0 ? data.learningHours : [
    { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
    { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 }
  ]

  const learningHours = baseHours.map(d => {
    // 1. Strictly hardcode Saturday to 5hr 6min (5.1 hours) at ALL times
    if (d.day === "Sat") return { ...d, hours: 5.1 }
    
    // 2. Clear Thursday as per request
    if (d.day === "Thu") return { ...d, hours: 0 }
    if (d.day === "Mon") return { ...d, hours: 0 }
    if (d.day === "Tue") return { ...d, hours: 0 }
    if (d.day === "Wed") return { ...d, hours: 0 }
    if (d.day === "Fri") return { ...d, hours: 0 }
    
    // 3. Count current time for Sunday time (today is Sunday)
    if (d.day === "Sun") {
       const now = new Date()
       const currentHours = now.getHours() + (now.getMinutes() / 60)
       return { ...d, hours: parseFloat(currentHours.toFixed(1)) }
    }

    
    return d
  })

  // Calculate local total to match our overrides
  const totalWeeklyHours = learningHours.reduce((sum, d) => sum + d.hours, 0)



  
  // Emergency Hard-coded Fallback to ensure yellow concepts are ALWAYS visible with detailed descriptions
  const coreTopics = [
    { 
      name: "Partial Differentiation", 
      desc: "Cornerstone of multivariable calculus used to analyze how a function changes with respect to one variable while others remain constant.",
      subjectName: "Engineering Mathematics"
    },
    { 
      name: "Complex Numbers", 
      desc: "Indispensable in electrical engineering for analyzing AC circuits. They simplify the calculation of impedance and phase shifts.",
      subjectName: "Applied Physics"
    },
    { 
      name: "Logic Circuits", 
      desc: "The basic building blocks of digital computers, logic circuits process binary information using gates like AND, OR, and NOT.",
      subjectName: "Electronics Engineering"
    },
    { 
      name: "Data Structures", 
      desc: "Efficient data organization involves managing memory through arrays, linked lists, and trees to optimize retrieval speeds.",
      subjectName: "Computer Science"
    },
    { 
      name: "Machine Learning", 
      desc: "Enables systems to learn patterns from data and improve over time without explicit programming.",
      subjectName: "Cybernetics & AI"
    },
    { 
      name: "Thermodynamics", 
      desc: "Studying the relationship between heat, work, and energy, governing the behavior of physical systems.",
      subjectName: "Thermal Engineering"
    },
    { name: "Fluid Mechanics", desc: "Laws of fluid flow and pressure.", subjectName: "Civil Engineering" },
    { name: "Power Systems", desc: "Grid management and power electronics.", subjectName: "Electrical Eng" },
    { name: "Digital Signal Processing", desc: "Analysis and filtration of digital signals.", subjectName: "EXTC" },
    { name: "Microprocessors", desc: "Instruction sets and hardware architecture.", subjectName: "Computer Science" },
    { name: "Artificial Intelligence", desc: "Modern algorithms and heuristic search.", subjectName: "AI & Data Science" },
    { name: "Control Systems", desc: "Closed-loop feedback and stabilitiy analysis.", subjectName: "Instrumentation" },
    { name: "Quantum Physics", desc: "Subatomic particles and probability wavefunctions.", subjectName: "Applied Physics" },
    { name: "Software Testing", desc: "Quality assurance and debugging strategies.", subjectName: "Software Engineering" },
    { name: "Cyber Security", desc: "Network preservation and threat analysis.", subjectName: "Information Tech" },
    { name: "Big Data", desc: "Management of huge datasets using Hadoop/Spark.", subjectName: "Data Engineering" },
    { name: "Cloud Computing", desc: "Virtualization and on-demand cloud services.", subjectName: "IT Infrastructure" },
    { name: "Robotics", desc: "Kinematics and robotic control systems.", subjectName: "Automation Eng" },
    { name: "Computer Graphics", desc: "Rasterization and 3D modeling pipelines.", subjectName: "CSE" },
    { name: "Cryptography", desc: "Mathematical security and blockchain basics.", subjectName: "Cyber Security" },
    { name: "Embedded Systems", desc: "Hardware-software integration in microcontrollers.", subjectName: "EXTC" },
    { name: "Natural Language Processing", desc: "Text analysis and transformer models.", subjectName: "AI" },
    { name: "Deep Learning", desc: "Neural networks and gradient descent.", subjectName: "AI" },
    { name: "VLSI Design", desc: "Large-scale circuit integration on silicon.", subjectName: "Electronics" }
  ]



  const dummyIcons = ["Sparkles", "Brain", "Cpu", "LineChart", "Activity", "Target", "Compass", "Terminal", "Zap", "CheckCircle2"]

  const curriculumConcepts = []
  Object.values(curriculumData.subjects || {}).forEach(sub => {
    if (sub.name) {
      curriculumConcepts.push({ name: sub.name, desc: "University Curriculum" })
    }
  })
  
  // Create final list starting with user-enrolled subjects, then curriculum, then fallback
  const allInitialData = [...(data.subjects || []), ...curriculumConcepts, ...coreTopics]
  
  const existingNames = new Set()
  let finalExplorerSet = []
  
  for (const topic of allInitialData) {
    if (finalExplorerSet.length >= 24) break; 
    const tName = topic.name
    const tDesc = topic.description || topic.desc || "Interactive Concept Module"

    if (!existingNames.has(tName.toLowerCase())) {
      existingNames.add(tName.toLowerCase())
      finalExplorerSet.push({
        ...topic,
        name: tName,
        description: tDesc,
        iconStr: topic.iconStr || dummyIcons[finalExplorerSet.length % dummyIcons.length],
        color: "bg-[#FFD85F]/20",
        textColor: "text-[#FFD85F]",
        progress: topic.progress || Math.floor(Math.random() * 20),
        lessons: topic.lessons || 4,
        hours: topic.hours || 1
      })
    }
  }

  // Assign to faces (strictly 4 per face)
  const activeSubjects = finalExplorerSet.map((sub, idx) => ({
    ...sub,
    face: faces[Math.floor(idx / 4) % 6]
  }))


  const mentors = [
    { name: "Dr. Anjali Sharma", role: "Machine Learning Specialist", department: "Computer Engineering", rating: 4.9, reviewCount: 124 },
    { name: "Prof. Rajan Kulkarni", role: "Cloud & Big Data Expert", department: "Computer Engineering", rating: 4.7, reviewCount: 89 },
    { name: "Dr. Priya Mehta", role: "Network Security Lead", department: "Computer Engineering", rating: 4.8, reviewCount: 112 },
    { name: "Prof. Suresh Patil", role: "Operating Systems Specialist", department: "Computer Engineering", rating: 4.5, reviewCount: 76 },
    { name: "Dr. Kavita Joshi", role: "Applied Mathematics Head", department: "Applied Sciences", rating: 4.6, reviewCount: 95 },
  ].sort((a, b) => b.rating - a.rating)

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
                <span className="text-2xl font-bold">{formatHours(totalWeeklyHours)}</span>
                {totalWeeklyHours > 0 && (
                  <span className="text-xs font-bold text-[#FFD85F] bg-[#FFD85F]/10 border border-[#FFD85F]/10 px-2 py-1 rounded-full">This Week</span>
                )}
              </div>

            </div>
            
            <div className="flex items-end justify-between h-48 gap-2">
              {(() => {
                const maxVal = Math.max(...learningHours.map(l => l.hours), 1)
                const localPeakDay = learningHours.reduce((a, b) => a.hours > b.hours ? a : b).day
                
                return learningHours.map((item, i) => {
                  const isPeak = item.day === localPeakDay
                  const hasActivity = item.hours > 0
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                      <div className="w-full relative flex items-end justify-center h-full">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(4, (item.hours / maxVal) * 100)}%` }}
                          transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 ${hasActivity ? 'bg-[#FFD85F] shadow-[0_4px_12px_rgba(255,216,95,0.2)]' : 'bg-white/5 group-hover:bg-[#FFD85F]/20'}`}
                        />
                        {hasActivity && (
                          <div className={`absolute -top-8 bg-white text-black text-[9px] font-black px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 ${isPeak ? 'scale-110' : 'scale-90 opacity-80'}`}>
                            {formatHours(item.hours)}
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold tracking-wider ${hasActivity ? 'text-[#FFD85F]' : 'text-white/30'}`}>{item.day}</span>
                    </div>
                  )
                })

              })()}
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
                        className={`cuboid-face cuboid-face-${faceName} grid grid-cols-2 grid-rows-2 gap-2 p-2`}
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
                            className="cuboid-tile group cursor-pointer p-4 flex flex-col items-center justify-center text-center overflow-hidden"
                            whileHover={{ 
                              z: 60,
                              scale: 1.15,
                              backgroundColor: "rgba(255, 216, 95, 1)",
                              transition: { type: "spring", stiffness: 400, damping: 25 }
                            }}
                          >
                            <Icon className="w-10 h-10 text-[#FFD85F] group-hover:text-black mb-2 transition-all duration-300" />
                            <span className="text-[10px] font-black uppercase tracking-tighter text-[#FFD85F] group-hover:text-black mb-1 line-clamp-1">{subject.name}</span>
                            <p className="text-[8px] font-bold text-white/40 group-hover:text-black/60 line-clamp-2 leading-tight">
                              {subject.description}
                            </p>
                          </motion.div>
                        )})}

                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              </div>
              
              {/* Concept Detail Popout Sidebar */}
              <motion.div 
                initial={false}
                animate={{ 
                  x: selectedConcept ? 0 : 450,
                  opacity: selectedConcept ? 1 : 0
                }}
                className="absolute top-4 bottom-4 right-4 w-[380px] bg-black/85 backdrop-blur-[24px] border border-[#FFD85F]/30 rounded-[40px] p-8 flex flex-col z-[100] pointer-events-auto shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
              >
                {selectedConcept && (
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex h-12 w-12 rounded-2xl bg-[#FFD85F]/10 border border-[#FFD85F]/20 items-center justify-center">
                        {React.createElement(ICON_MAP[selectedConcept.iconStr] || Sparkles, { className: "w-6 h-6 text-[#FFD85F]" })}
                      </div>
                      <button 
                        onClick={() => setSelectedConcept(null)}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors group"
                      >
                        <X className="w-5 h-5 text-white/50 group-hover:text-white" />
                      </button>
                    </div>
                    
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD85F] bg-[#FFD85F]/10 px-3 py-1 rounded-full border border-[#FFD85F]/10">
                           {selectedConcept.subjectName || "Engineering Core"}
                         </span>
                      </div>
                      <h4 className="text-2xl font-black text-white leading-tight">{selectedConcept.name}</h4>
                    </div>
                    
                    <div className="space-y-8 flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                      <div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-3">EXPLANATION</span>
                        <p className="text-sm text-white/70 leading-relaxed font-medium">
                          {selectedConcept.description || "This fundamental concept forms the backbone of digital systems and mathematical modeling within your engineering curriculum."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                          <span className="text-[10px] font-bold text-white/30 block mb-1">MASTERY</span>
                          <span className="text-lg font-black text-[#FFD85F]">{selectedConcept.progress || 0}%</span>
                        </div>
                        <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
                          <span className="text-[10px] font-bold text-white/30 block mb-1">LESSONS</span>
                          <span className="text-lg font-black text-white">{selectedConcept.lessons || 4}</span>
                        </div>
                      </div>

                      {/* NEW: Direct Recommended Books Section */}
                      <div>
                        <span className="text-[10px] font-bold text-[#FFD85F] uppercase tracking-widest block mb-4 flex items-center gap-2">
                          <BookOpen className="w-3 h-3" /> RECOMMENDED BOOKS
                        </span>
                        <div className="space-y-3">
                          {[
                            { title: `${selectedConcept.name} - Fundamentals`, author: "Prescribed University Text" },
                            { title: `Advanced ${selectedConcept.subjectName || "Concept"}`, author: "Reference Manual Vol 1" }
                          ].map((book, bi) => (
                            <div key={bi} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                              <div>
                                <p className="text-xs font-bold text-white line-clamp-1">{book.title}</p>
                                <p className="text-[10px] text-white/40">{book.author}</p>
                              </div>
                              <div className="p-2 rounded-full bg-white/10 group-hover:bg-[#FFD85F] transition-colors">
                                <ArrowRight className="w-3 h-3 text-white group-hover:text-black" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-4">MAP POSITION & HIERARCHY</span>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <MapPin className="w-4 h-4 text-[#FFD85F]" />
                            <div>
                               <p className="text-[10px] font-bold text-white/40 leading-none mb-1">BELONGS TO FIELD</p>
                               <p className="text-xs font-bold text-white">Computer Engineering / EXTC</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <Compass className="w-4 h-4 text-[#FFD85F]" />
                            <div>
                               <p className="text-[10px] font-bold text-white/40 leading-none mb-1">PARENT SUBJECT</p>
                               <p className="text-xs font-bold text-white">{selectedConcept.subjectName || "Engineering Sciences"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-white/5 space-y-3">
                      <button 
                        onClick={() => navigate(`/library?subject=${encodeURIComponent(selectedConcept.subjectName || "")}`)}
                        className="w-full py-4 bg-white text-black rounded-full font-black text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                      >
                        Find More Books <BookOpen className="w-4 h-4" />
                      </button>
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
            <button 
              onClick={() => navigate('/my-courses')}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
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
            <h3 className="text-lg font-bold mb-4 relative z-10 flex items-center gap-2">
              <div className="w-1.5 h-10 bg-primary-accent rounded-full shrink-0" />
              Subject Specialists
            </h3>
            <div className="space-y-4 relative z-10">
              {mentors.map((mentor, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 group relative cursor-pointer"
                  onClick={() => navigate('/professors')}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-accent/10 border border-primary-accent/20 flex items-center justify-center font-bold text-sm text-primary-accent shrink-0 group-hover:bg-primary-accent group-hover:text-black transition-all">
                    {getInitials(mentor.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold group-hover:text-primary-accent transition-colors truncate">{mentor.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-primary-accent text-primary-accent" />
                        <span className="text-[10px] font-bold text-primary-accent">{mentor.rating}</span>
                      </div>
                      <span className="text-[10px] text-white/30 truncate">{mentor.role}</span>
                    </div>
                  </div>
                  <div className="ml-auto flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-primary-accent border border-white/5">
                      <Heart className="w-3.5 h-3.5 fill-primary-accent/20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => navigate('/professors')}
              className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"
            >
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
          <GlassCard 
            onClick={() => navigate('/tests')}
            className="!p-6 group hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden"
          >
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
          <GlassCard 
            onClick={() => navigate('/tests')}
            className="!p-6 group hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden"
          >
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
          <GlassCard 
            onClick={() => setShowDiscovery(true)}
            className="!p-6 group hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden"
          >
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
      {/* AI Discovery Modal */}
      {showDiscovery && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
             onClick={() => setShowDiscovery(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-4xl bg-surface-elevation-1 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row h-full">
              {/* Video Player Side */}
              <div className="flex-1 bg-black relative group aspect-video md:aspect-auto">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-16 h-16 text-white/20 group-hover:text-primary-accent group-hover:scale-110 transition-all cursor-pointer" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
                  <div className="h-1 w-full bg-white/20 rounded-full mb-3">
                    <div className="h-full w-1/3 bg-primary-accent rounded-full" />
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-white/70">
                    <span>01:24 / 04:52</span>
                    <span className="ml-auto flex items-center gap-2">
                       <Zap className="w-3 h-3 text-yellow-400" />
                       Autogenerated for you
                    </span>
                  </div>
                </div>
              </div>

              {/* Discovery Info Side */}
              <div className="w-full md:w-80 p-8 border-l border-white/10 flex flex-col bg-white/5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4">
                  <Compass className="w-3 h-3" />
                  Daily Discovery
                </div>
                <h3 className="text-xl font-bold mb-3">Emerging Tech: Transformers in CV</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  Learn how attention mechanisms are revolutionizing Computer Vision architectures beyond traditional CNNs.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-white/70">Topic: Neural Networks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-white/70">Credits: +30 Knowledge XP</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowDiscovery(false)}
                  className="w-full mt-auto py-3 bg-primary-accent text-black rounded-xl font-bold text-sm shadow-xl shadow-primary-accent/20 hover:scale-[1.02] transition-transform"
                >
                  Mark as Complete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
