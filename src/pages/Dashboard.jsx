import React from 'react'
import { motion, useScroll, useTransform, useMotionValue, useAnimationFrame } from 'framer-motion'
import { Link } from 'react-router-dom'
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
  MousePointer2, 
  Sparkles, 
  Target, 
  Terminal, 
  Zap 
} from "lucide-react"

const subjects = [
  { name: "Calculus", icon: Sparkles, face: "front", color: "bg-blue-500/20", textColor: "text-blue-400", progress: 75, lessons: 12, hours: 4.5 },
  { name: "Algebra", icon: BookOpen, face: "front", color: "bg-orange-500/20", textColor: "text-orange-400", progress: 45, lessons: 8, hours: 3.2 },
  { name: "Physics", icon: Cpu, face: "front", color: "bg-purple-500/20", textColor: "text-purple-400", progress: 90, lessons: 15, hours: 6.8 },
  { name: "Logic", icon: Brain, face: "front", color: "bg-green-500/20", textColor: "text-green-400", progress: 60, lessons: 10, hours: 4.0 },
  
  { name: "Geometry", icon: Compass, face: "right", color: "bg-pink-500/20", textColor: "text-pink-400", progress: 30, lessons: 6, hours: 2.5 },
  { name: "Statistics", icon: LineChart, face: "right", color: "bg-indigo-500/20", textColor: "text-indigo-400", progress: 85, lessons: 14, hours: 5.5 },
  { name: "Biology", icon: Activity, face: "right", color: "bg-red-500/20", textColor: "text-red-400", progress: 55, lessons: 9, hours: 3.8 },
  { name: "Chemistry", icon: Zap, face: "right", color: "bg-yellow-500/20", textColor: "text-yellow-400", progress: 70, lessons: 11, hours: 4.2 },
  
  { name: "Economics", icon: LineChart, face: "back", color: "bg-teal-500/20", textColor: "text-teal-400", progress: 40, lessons: 7, hours: 3.0 },
  { name: "Psychology", icon: Brain, face: "back", color: "bg-rose-500/20", textColor: "text-rose-400", progress: 95, lessons: 16, hours: 7.2 },
  { name: "Sociology", icon: Target, face: "back", color: "bg-cyan-500/20", textColor: "text-cyan-400", progress: 50, lessons: 8, hours: 3.5 },
  { name: "Linguistics", icon: BookOpen, face: "back", color: "bg-amber-500/20", textColor: "text-amber-400", progress: 65, lessons: 10, hours: 4.5 },
  
  { name: "Comp Sci", icon: Terminal, face: "left", color: "bg-slate-500/20", textColor: "text-slate-400", progress: 80, lessons: 13, hours: 6.0 },
  { name: "Robotics", icon: Cpu, face: "left", color: "bg-emerald-500/20", textColor: "text-emerald-400", progress: 35, lessons: 6, hours: 2.8 },
  { name: "Astronomy", icon: Compass, face: "left", color: "bg-violet-500/20", textColor: "text-violet-400", progress: 75, lessons: 12, hours: 5.0 },
  { name: "Genetics", icon: Activity, face: "left", color: "bg-fuchsia-500/20", textColor: "text-fuchsia-400", progress: 60, lessons: 10, hours: 4.2 },
  
  { name: "Music", icon: Sparkles, face: "top", color: "bg-sky-500/20", textColor: "text-sky-400", progress: 25, lessons: 5, hours: 2.0 },
  { name: "Art", icon: Target, face: "top", color: "bg-lime-500/20", textColor: "text-lime-400", progress: 90, lessons: 15, hours: 6.5 },
  { name: "Philosophy", icon: Brain, face: "top", color: "bg-orange-500/20", textColor: "text-orange-400", progress: 50, lessons: 8, hours: 3.5 },
  { name: "Ethics", icon: CheckCircle2, face: "top", color: "bg-blue-500/20", textColor: "text-blue-400", progress: 70, lessons: 11, hours: 4.8 },
  
  { name: "Literature", icon: BookOpen, face: "bottom", color: "bg-pink-500/20", textColor: "text-pink-400", progress: 45, lessons: 7, hours: 3.2 },
  { name: "History", icon: Compass, face: "bottom", color: "bg-yellow-500/20", textColor: "text-yellow-400", progress: 85, lessons: 14, hours: 5.8 },
  { name: "Geography", icon: Compass, face: "bottom", color: "bg-green-500/20", textColor: "text-green-400", progress: 65, lessons: 10, hours: 4.0 },
  { name: "Matrices", icon: LineChart, face: "bottom", color: "bg-indigo-500/20", textColor: "text-indigo-400", progress: 55, lessons: 9, hours: 3.5 },
]

const faces = ["front", "right", "back", "left", "top", "bottom"]

const faceOffsets = {
  front: 150,
  right: 150,
  back: 150,
  left: 150,
  top: 150,
  bottom: 150,
}

const faceRotations = {
  front: "rotateY(0deg)",
  right: "rotateY(90deg)",
  back: "rotateY(180deg)",
  left: "rotateY(-90deg)",
  top: "rotateX(90deg)",
  bottom: "rotateX(-90deg)",
}

const learningHours = [
  { day: "Mon", hours: 4 },
  { day: "Tue", hours: 6 },
  { day: "Wed", hours: 3 },
  { day: "Thu", hours: 8 },
  { day: "Fri", hours: 5 },
  { day: "Sat", hours: 2 },
  { day: "Sun", hours: 4 },
]

export default function Dashboard() {
  const { scrollYProgress } = useScroll()
  const rotateX = useMotionValue(-20)
  const rotateY = useMotionValue(25)

  useAnimationFrame((t, delta) => {
    rotateY.set(rotateY.get() + delta * 0.015)
  })

  const handleDrag = (e, info) => {
    rotateX.set(rotateX.get() - info.delta.y * 0.5)
    rotateY.set(rotateY.get() + info.delta.x * 0.5)
  }

  return (
    <>
      <div className="mb-10 pt-10">
        <ScrollReveal className="origin-left">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, Nafis! 👋</h1>
          <p className="text-text-secondary font-medium">Ready to learn something new today?</p>
        </ScrollReveal>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <GlassCard className="!p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold mb-1">Learning Hours</h3>
                <p className="text-sm text-text-secondary font-medium">Your progress this week</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">32.5h</span>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Mathematics</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Lesson 8 of 12</span>
                  </div>
                  <h4 className="text-2xl font-bold mb-2">Advanced Calculus: Integration Techniques</h4>
                  <p className="text-text-secondary text-sm mb-6 line-clamp-2">Master the art of integration with our AI-guided step-by-step breakdown of complex problems.</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "65%" }}
                        className="h-full bg-primary-accent"
                      />
                    </div>
                    <span className="text-sm font-bold">65%</span>
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
                      {subjects.filter(s => s.face === faceName).map((subject, j) => (
                        <motion.div 
                          key={j} 
                          className="cuboid-tile group"
                          whileHover={{ 
                            z: 40,
                            backgroundColor: "rgba(255, 216, 95, 1)",
                            transition: { type: "spring", stiffness: 300, damping: 20 }
                          }}
                        >
                          <subject.icon className="w-8 h-8 text-white/20 group-hover:text-black mb-2 transition-all duration-300" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-white/40 group-hover:text-black">{subject.name}</span>
                        </motion.div>
                      ))}
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
            {subjects.slice(0, 4).map((subject, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="subject-tile group cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${subject.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <subject.icon className={`w-6 h-6 ${subject.textColor}`} />
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
            ))}
          </div>

          <GlassCard className="!p-6 bg-surface-elevation-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-accent/10 blur-[60px] rounded-full" />
            <h3 className="text-lg font-bold mb-4 relative z-10">Top Mentors</h3>
            <div className="space-y-4 relative z-10">
              {[
                { name: "Dr. Sarah Chen", role: "Quantum Physics", img: "https://i.pravatar.cc/150?u=sarah" },
                { name: "Prof. James Wilson", role: "Pure Mathematics", img: "https://i.pravatar.cc/150?u=james" },
              ].map((mentor, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-pointer">
                  <img src={mentor.img} alt={mentor.name} className="w-10 h-10 rounded-full border-2 border-white/10 group-hover:border-primary-accent transition-colors" />
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
          {subjects.map((subject, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.1 }}
              className="subject-tile group cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl ${subject.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <subject.icon className={`w-6 h-6 ${subject.textColor}`} />
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
          ))}
        </div>
      </section>
    </>
  )
}
