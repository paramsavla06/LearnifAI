import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { ScrollReveal } from './ui/ScrollReveal'
import { Mail, MapPin, Star, Heart, CheckCircle2 } from 'lucide-react'

const professorsData = [
    { id: 'prof_01', name: 'Dr. Anjali Sharma', designation: 'Professor and Head', department: 'Computer Engineering', specializations: ['Machine Learning', 'Neural Networks', 'Computer Vision'], email: 'a.sharma@mu.edu.in', cabin: 'Room 301, CE Block', initialRating: 4.9 },
    { id: 'prof_02', name: 'Prof. Rajan Kulkarni', designation: 'Associate Professor', department: 'Computer Engineering', specializations: ['Database Systems', 'Big Data', 'Cloud Computing'], email: 'r.kulkarni@mu.edu.in', cabin: 'Room 305, CE Block', initialRating: 4.7 },
    { id: 'prof_03', name: 'Dr. Priya Mehta', designation: 'Assistant Professor', department: 'Computer Engineering', specializations: ['Computer Networks', 'Network Security', 'IoT'], email: 'p.mehta@mu.edu.in', cabin: 'Room 308, CE Block', initialRating: 4.8 },
    { id: 'prof_04', name: 'Prof. Suresh Patil', designation: 'Associate Professor', department: 'Computer Engineering', specializations: ['Operating Systems', 'Embedded Systems', 'RTOS'], email: 's.patil@mu.edu.in', cabin: 'Room 302, CE Block', initialRating: 4.5 },
    { id: 'prof_05', name: 'Dr. Kavita Joshi', designation: 'Professor', department: 'Applied Sciences', specializations: ['Engineering Mathematics', 'Numerical Methods', 'Optimization'], email: 'k.joshi@mu.edu.in', cabin: 'Room 112, Science Block', initialRating: 4.6 },
    { id: 'prof_06', name: 'Prof. Nikhil Desai', designation: 'Assistant Professor', department: 'Computer Engineering', specializations: ['Algorithms', 'Data Structures', 'Theory of Computation'], email: 'n.desai@mu.edu.in', cabin: 'Room 310, CE Block', initialRating: 4.4 },
    { id: 'prof_07', name: 'Dr. Smita Ghosh', designation: 'Associate Professor', department: 'Computer Engineering', specializations: ['Information Security', 'Cryptography', 'Cyber Forensics'], email: 's.ghosh@mu.edu.in', cabin: 'Room 306, CE Block', initialRating: 4.5 },
    { id: 'prof_08', name: 'Prof. Arun Rane', designation: 'Assistant Professor', department: 'Applied Sciences', specializations: ['Engineering Physics', 'Quantum Mechanics', 'Photonics'], email: 'a.rane@mu.edu.in', cabin: 'Room 105, Science Block', initialRating: 4.3 },
]

const initials = (name) => {
    const parts = name.replace(/^(Dr\.|Prof\.)\s+/, '').split(' ')
    return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function Professors() {
    const [ratings, setRatings] = useState({})
    const [hoveredStar, setHoveredStar] = useState({ id: null, val: 0 })

    const handleRate = (profId, rating) => {
        setRatings(prev => ({ ...prev, [profId]: rating }))
    }

    return (
        <section id="professors" className="relative py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-accent/5 via-background-base to-background-base pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-6 md:px-8">

                <ScrollReveal className="mb-12 origin-left">
                    <div className="text-primary-accent font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-primary-accent" />
                        Faculty Directory
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        Subject Specialists
                    </h2>
                    <p className="text-text-secondary mt-4 max-w-xl text-lg font-medium tracking-wide">
                        Find faculty by domain expertise. Rate your mentors anonymously to help the community find the best feedback.
                    </p>
                </ScrollReveal>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {professorsData.map((prof, i) => {
                        const userRating = ratings[prof.id]
                        
                        return (
                            <motion.div
                                key={prof.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ delay: i * 0.05, duration: 0.4 }}
                            >
                                <GlassCard className="!p-6 h-full flex flex-col group hover:border-primary-accent/30 transition-all duration-500 relative overflow-hidden">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary-accent/10 border border-primary-accent/20 flex items-center justify-center font-bold text-xl text-primary-accent shrink-0 group-hover:scale-110 group-hover:bg-primary-accent group-hover:text-black transition-all">
                                            {initials(prof.name)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg text-white leading-tight mb-1 group-hover:text-primary-accent transition-colors">{prof.name}</p>
                                            <p className="text-xs font-medium text-text-secondary">{prof.designation}</p>
                                        </div>
                                    </div>

                                    {/* Rating Section */}
                                    <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Community Rating</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-primary-accent text-primary-accent" />
                                                <span className="text-sm font-bold text-primary-accent">{prof.initialRating}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 justify-center py-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onMouseEnter={() => setHoveredStar({ id: prof.id, val: star })}
                                                    onMouseLeave={() => setHoveredStar({ id: null, val: 0 })}
                                                    onClick={() => handleRate(prof.id, star)}
                                                    className="transition-transform active:scale-90"
                                                >
                                                    <Star 
                                                        className={`w-5 h-5 transition-colors ${
                                                            (hoveredStar.id === prof.id ? hoveredStar.val : (userRating || 0)) >= star
                                                            ? 'fill-primary-accent text-primary-accent' 
                                                            : 'text-white/20'
                                                        }`} 
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <AnimatePresence>
                                            {userRating && (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-green-500 uppercase tracking-tighter"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Feedback Submitted
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="mb-4">
                                        <span className="text-[10px] font-bold text-primary-accent uppercase tracking-widest bg-primary-accent/10 px-2.5 py-1 rounded inline-block">
                                            {prof.department}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-2 flex-1 mb-6">
                                        {prof.specializations.map((spec) => (
                                            <div key={spec} className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-accent shrink-0 opacity-50" />
                                                <span className="text-sm font-medium text-text-secondary">{spec}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex flex-col gap-2 mt-auto group-hover:border-white/10 transition-colors">
                                        <a href={`mailto:${prof.email}`}
                                            className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-white transition-colors truncate">
                                            <Mail className="w-4 h-4 text-primary-accent shrink-0" />
                                            {prof.email}
                                        </a>
                                        <div className="flex items-center gap-2 text-xs font-medium text-text-secondary/70">
                                            <MapPin className="w-4 h-4 text-primary-accent/50 shrink-0" />
                                            {prof.cabin}
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
