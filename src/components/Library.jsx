import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Book } from 'lucide-react'
import { GlassCard } from './ui/GlassCard'
import { ScrollReveal } from './ui/ScrollReveal'
import { GlassButton } from './ui/GlassButton'
import curriculum from '../data/curriculum.json'

// Gather all unique library sections from subjects
const allSections = [...new Set(curriculum.subjects.flatMap((s) => s.library_sections))].sort()

export default function Library() {
    const [activeSection, setActiveSection] = useState(allSections[0])
    const [selectedYear, setSelectedYear] = useState('All')
    const [searchQuery, setSearchQuery] = useState('')

    const years = ['All', 'FE', 'SE', 'TE', 'BE']

    // Subjects that belong to the active section
    const sectionSubjects = useMemo(() => {
        return curriculum.subjects.filter(
            (s) =>
                s.library_sections.includes(activeSection) &&
                (selectedYear === 'All' || s.year === selectedYear)
        )
    }, [activeSection, selectedYear])

    // Topics for those subjects
    const results = useMemo(() => {
        const subIds = sectionSubjects.map((s) => s.id)
        let topics = curriculum.topics.filter((t) => subIds.includes(t.subject_id))

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            topics = topics.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.description.toLowerCase().includes(q)
            )
        }

        return topics.map((topic) => {
            const subject = curriculum.subjects.find((s) => s.id === topic.subject_id)
            const maps = curriculum.topic_book_map.filter((m) => m.topic_id === topic.id)
            const books = maps.map((m) => {
                const book = curriculum.books.find((b) => b.id === m.book_id)
                return { ...book, chapter: m.chapter, priority: m.priority }
            })
            return { topic, subject, books }
        })
    }, [sectionSubjects, searchQuery])

    // Subjects in active section for overview strip
    const sectionSubjectNames = sectionSubjects.map((s) => `${s.name} (${s.code})`).join(' • ')

    return (
        <section id="library" className="relative py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-accent/5 via-background-base to-background-base pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-6 md:px-8">

                <ScrollReveal className="mb-12 origin-left">
                    <div className="text-primary-accent font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-primary-accent" />
                        Library Resources
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        Books and Sections
                    </h2>
                    <p className="text-text-secondary mt-4 max-w-xl text-lg font-medium tracking-wide">
                        The library is divided into physical sections based on subject area.
                        Select a section to browse the books shelved there, mapped to specific topics and chapters.
                    </p>
                </ScrollReveal>

                <div className="mb-8">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">
                        Library Sections
                    </p>
                    <div className="flex gap-3 flex-wrap">
                        {allSections.map((sec) => (
                            <button
                                key={sec}
                                onClick={() => {
                                    setActiveSection(sec)
                                    setSearchQuery('')
                                }}
                                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 border ${
                                    activeSection === sec
                                        ? 'bg-primary-accent text-black border-primary-accent shadow-[0_0_20px_rgba(255,216,95,0.3)]'
                                        : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>
                </div>

                {sectionSubjectNames && (
                    <div className="mb-8 px-6 py-4 rounded-xl border border-white/5 bg-black/40 overflow-hidden flex items-center gap-4">
                        <Book className="w-5 h-5 text-primary-accent shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
                                Subjects in {activeSection}
                            </p>
                            <p className="text-sm font-medium text-white line-clamp-1">{sectionSubjectNames}</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search topic or keyword..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface-elevation-1 border border-white/10 rounded-full pl-12 pr-6 py-3.5 text-sm font-medium text-white placeholder:text-text-secondary focus:outline-none focus:border-primary-accent/50 focus:ring-1 focus:ring-primary-accent/50 transition-all shadow-lg"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {years.map((y) => (
                            <button
                                key={y}
                                onClick={() => setSelectedYear(y)}
                                className={`px-5 py-3 rounded-full font-bold text-xs transition-colors border ${
                                    selectedYear === y 
                                    ? 'bg-white/10 text-white border-white/20' 
                                    : 'bg-transparent text-text-secondary border-transparent hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                <p className="text-sm font-bold text-text-secondary mb-8 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-accent animate-pulse" />
                    {results.length} topic{results.length !== 1 ? 's' : ''} in {activeSection}
                    {selectedYear !== 'All' ? ` — ${selectedYear}` : ''}
                </p>

                <div className="flex flex-col gap-6">
                    {results.map(({ topic, subject, books }, i) => (
                        <motion.div
                            key={topic.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
                        >
                            <GlassCard className="!p-8 group hover:border-primary-accent/30 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 pb-6 border-b border-white/5 group-hover:border-white/10 transition-colors">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-2">{topic.name}</h3>
                                        <p className="text-text-secondary text-sm font-medium leading-relaxed max-w-3xl">{topic.description}</p>
                                    </div>
                                    {subject && (
                                        <div className="shrink-0 text-left md:text-right px-4 py-3 rounded-xl bg-black/40 border border-white/5">
                                            <span className="text-[10px] font-bold text-primary-accent uppercase tracking-widest block mb-1">{subject.year} • {subject.code}</span>
                                            <span className="text-sm font-bold text-white">{subject.name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-4">
                                    {books.map((book) => (
                                        <div
                                            key={book.id + book.chapter}
                                            className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-surface-elevation-1 border border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <p className="text-base font-bold text-white relative pl-4 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-primary-accent before:rounded-full">{book.title}</p>
                                                <p className="text-sm font-medium text-text-secondary ml-4">{book.author}</p>
                                                <p className="text-xs font-semibold text-text-secondary/60 ml-4 pt-1">{book.publisher}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 flex-wrap ml-4 md:ml-0">
                                                <span className="text-sm font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">Chapter {book.chapter}</span>
                                                <span className="text-xs font-bold text-primary-accent uppercase tracking-widest bg-primary-accent/10 px-3 py-1.5 rounded-lg border border-primary-accent/20">
                                                    {activeSection}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                                                    book.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                                    book.priority === 'medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                                                    'bg-green-500/10 text-green-400 border-green-500/20'
                                                }`}>
                                                    {book.priority} Priority
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}

                    {results.length === 0 && (
                        <div className="text-center py-20">
                            <Book className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
                            <p className="text-lg font-bold text-white mb-2">No topics found</p>
                            <p className="text-text-secondary font-medium">
                                No topics found in {activeSection}
                                {selectedYear !== 'All' ? ` for ${selectedYear}` : ''}.
                                {searchQuery ? ' Try clearing the search.' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
