import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Book, MapPin, Layers, ChevronDown, ChevronUp, GraduationCap, Zap } from 'lucide-react'
import { GlassCard } from './ui/GlassCard'
import { ScrollReveal } from './ui/ScrollReveal'
import conceptsData from '../data/concepts.json'
import recommendedBooksRaw from '../data/recommended_books.json'

// ─── Data prep ────────────────────────────────────────────────────────────────
const booksBySlug = {}
for (const entry of recommendedBooksRaw) {
    for (const slug of entry.slugs) {
        booksBySlug[slug] = entry.recommended_books
    }
}

const allConcepts = []
for (const subject of conceptsData.subjects) {
    for (const concept of subject.concepts) {
        allConcepts.push({
            ...concept,
            subject_name: subject.name,
            branch: subject.branch,
            recommended_books: booksBySlug[concept.slug] || []
        })
    }
}

const allSections  = [...new Set(allConcepts.map(c => c.library_section))].sort()
const allSubjectNames = ['All', ...conceptsData.subjects.map(s => s.name)]

function inferFloor(section) {
    if (!section) return 'Ground Floor'
    const code = section.replace('Section ', '').trim().toUpperCase().charCodeAt(0) - 65
    if (code <= 5)  return 'Ground Floor'
    if (code <= 11) return 'First Floor'
    if (code <= 17) return 'Second Floor'
    return 'Third Floor'
}

function floorColor(section) {
    if (!section) return 'text-text-secondary'
    const code = section.replace('Section ', '').trim().toUpperCase().charCodeAt(0) - 65
    if (code <= 5)  return 'text-emerald-400'
    if (code <= 11) return 'text-blue-400'
    if (code <= 17) return 'text-violet-400'
    return 'text-orange-400'
}

// ─── Concept Card ──────────────────────────────────────────────────────────────
function ConceptCard({ concept, idx }) {
    const [open, setOpen] = useState(false)
    const floor = inferFloor(concept.library_section)
    const fc    = floorColor(concept.library_section)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.4 }}
        >
            <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${open ? 'border-primary-accent/40 bg-white/5' : 'border-white/10 bg-surface-elevation-1 hover:border-white/20'}`}>
                {/* Header row */}
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left group"
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className={`text-base font-bold transition-colors ${open ? 'text-primary-accent' : 'text-white group-hover:text-primary-accent'}`}>
                                {concept.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-bold text-primary-accent bg-primary-accent/10 border border-primary-accent/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                                {concept.semester}
                            </span>
                            <span className="text-[10px] text-text-secondary font-medium">
                                {concept.subject_name}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-text-secondary/70">
                                <MapPin className="w-3 h-3" />
                                <span className={`font-bold ${fc}`}>{floor}</span>
                                <span>→ {concept.library_section} → {concept.shelf}</span>
                            </span>
                        </div>
                    </div>
                    <div className="shrink-0 ml-4">
                        {open
                            ? <ChevronUp className="w-5 h-5 text-primary-accent" />
                            : <ChevronDown className="w-5 h-5 text-text-secondary group-hover:text-white" />
                        }
                    </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                    {open && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="border-t border-white/10 mx-6" />
                            <div className="px-6 pb-6 pt-4 flex flex-col gap-4">
                                {/* Primary book */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Book className="w-5 h-5 text-primary-accent shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-white">{concept.book_title}</p>
                                            <p className="text-xs text-text-secondary mt-0.5">ISBN: {concept.book_isbn}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-primary-accent" />
                                            <span className={`text-xs font-bold ${fc}`}>{floor}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{concept.library_section} → {concept.shelf}</span>
                                    </div>
                                </div>

                                {/* Difficulty bar */}
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest w-20 shrink-0">Difficulty</span>
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(n => (
                                            <div key={n} className={`w-5 h-1.5 rounded-full ${n <= concept.difficulty ? 'bg-primary-accent' : 'bg-white/10'}`} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-text-secondary">{concept.difficulty}/5</span>
                                </div>

                                {/* Recommended books */}
                                {concept.recommended_books.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">
                                            Recommended Study Books
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            {concept.recommended_books.map((book, bi) => (
                                                <div key={bi} className="p-4 rounded-xl bg-surface-elevation-1 border border-white/5 hover:bg-white/5 transition-colors">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div>
                                                            <p className="text-sm font-bold text-white relative pl-4 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-primary-accent before:rounded-full">
                                                                {book.title}
                                                            </p>
                                                            <p className="text-xs text-text-secondary ml-4 mt-0.5">by {book.author}</p>
                                                        </div>
                                                        <div className="shrink-0 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-right">
                                                            <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Found at</p>
                                                            <p className={`text-xs font-bold mt-0.5 ${fc}`}>{concept.library_section}</p>
                                                            <p className="text-[10px] text-text-secondary">{concept.shelf}</p>
                                                        </div>
                                                    </div>
                                                    {book.sections && book.sections.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 ml-4">
                                                            {book.sections.slice(0, 4).map((sec, si) => (
                                                                <span key={si} className="text-[10px] text-text-secondary bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                                                                    {sec}
                                                                </span>
                                                            ))}
                                                            {book.sections.length > 4 && (
                                                                <span className="text-[10px] text-text-secondary/60 px-2.5 py-1">
                                                                    +{book.sections.length - 4} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                <a href="/tests" className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary-accent/10 border border-primary-accent/20 text-primary-accent text-sm font-bold hover:bg-primary-accent hover:text-black transition-colors w-full sm:w-auto">
                                    <Zap className="w-4 h-4" />
                                    Take a Diagnostic on this Concept
                                </a>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

// ─── Floor legend ──────────────────────────────────────────────────────────────
const FLOORS = [
    { label: 'Ground Floor', color: 'text-emerald-400', bg: 'bg-emerald-400' },
    { label: 'First Floor',  color: 'text-blue-400',    bg: 'bg-blue-400' },
    { label: 'Second Floor', color: 'text-violet-400',  bg: 'bg-violet-400' },
    { label: 'Third Floor',  color: 'text-orange-400',  bg: 'bg-orange-400' },
]

// ─── Main Library ──────────────────────────────────────────────────────────────
export default function Library() {
    const [activeSection,   setActiveSection]   = useState(allSections[0])
    const [selectedSubject, setSelectedSubject] = useState('All')
    const [searchQuery,     setSearchQuery]     = useState('')

    const results = useMemo(() => {
        let filtered = allConcepts.filter(c => c.library_section === activeSection)
        if (selectedSubject !== 'All') filtered = filtered.filter(c => c.subject_name === selectedSubject)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.book_title.toLowerCase().includes(q) ||
                c.subject_name.toLowerCase().includes(q) ||
                c.slug.toLowerCase().includes(q)
            )
        }
        return filtered
    }, [activeSection, selectedSubject, searchQuery])

    const floor   = inferFloor(activeSection)
    const fc      = floorColor(activeSection)

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
                        Books &amp; Sections
                    </h2>
                    <p className="text-text-secondary mt-4 max-w-xl text-lg font-medium">
                        Every concept maps to a physical book. Navigate by section, then
                        find the exact floor, section, and shelf in the library.
                    </p>
                </ScrollReveal>

                {/* Floor legend */}
                <div className="flex flex-wrap gap-4 mb-8">
                    {FLOORS.map(f => (
                        <div key={f.label} className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${f.bg}`} />
                            <span className={`text-xs font-bold ${f.color}`}>{f.label}</span>
                        </div>
                    ))}
                </div>

                {/* Section tabs */}
                <div className="mb-6">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Library Sections</p>
                    <div className="flex gap-2 flex-wrap">
                        {allSections.map(sec => {
                            const secFloorColor = floorColor(sec)
                            const active = activeSection === sec
                            return (
                                <button
                                    key={sec}
                                    onClick={() => { setActiveSection(sec); setSearchQuery('') }}
                                    className={`px-5 py-2 rounded-full font-bold text-xs transition-all duration-300 border ${
                                        active
                                            ? 'bg-primary-accent text-black border-primary-accent shadow-[0_0_20px_rgba(255,216,95,0.25)]'
                                            : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {sec}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Location info bar */}
                <div className="mb-6 px-6 py-4 rounded-xl border border-primary-accent/20 bg-primary-accent/5 flex items-center gap-4">
                    <MapPin className="w-5 h-5 text-primary-accent shrink-0" />
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-primary-accent uppercase tracking-widest mb-1">Physical Location</p>
                        <p className="text-sm font-bold text-white">
                            <span className={fc}>{floor}</span> → {activeSection}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs font-bold text-text-secondary">{results.length} book{results.length !== 1 ? 's' : ''} here</span>
                    </div>
                </div>

                {/* Filters row */}
                <div className="flex flex-col gap-6 mb-10">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-accent/60" />
                        <input
                            type="text"
                            placeholder="Find a specific concept, the main solution, or a book…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-surface-elevation-1 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-base font-medium text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-accent/60 focus:ring-1 focus:ring-primary-accent/40 transition-all shadow-xl"
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <Layers className="w-4 h-4 text-primary-accent" />
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Quick Filters by Subject</span>
                        </div>
                        <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto pr-2 custom-scrollbar p-1">
                            {allSubjectNames.map(b => {
                                const active = selectedSubject === b
                                return (
                                    <button
                                        key={b}
                                        onClick={() => setSelectedSubject(b)}
                                        className={`px-4 py-2 rounded-full font-bold text-[10px] transition-all border uppercase tracking-widest ${
                                            active
                                                ? 'bg-primary-accent text-black border-primary-accent shadow-lg scale-105'
                                                : 'bg-white/5 text-text-secondary border-white/10 hover:border-white/30 hover:text-white'
                                        }`}
                                    >
                                        {b}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Result count */}
                <p className="text-sm font-bold text-text-secondary mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-accent animate-pulse" />
                    {results.length} concept{results.length !== 1 ? 's' : ''} in {activeSection}
                    {selectedSubject !== 'All' ? ` — ${selectedSubject}` : ''}
                </p>

                {/* Cards */}
                <div className="flex flex-col gap-4">
                    {results.map((concept, i) => (
                        <ConceptCard key={concept.slug} concept={concept} idx={i} />
                    ))}
                    {results.length === 0 && (
                        <div className="text-center py-20">
                            <Book className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
                            <p className="text-lg font-bold text-white mb-2">No books found</p>
                            <p className="text-text-secondary font-medium">
                                No concepts in {activeSection}{selectedSubject !== 'All' ? ` for ${selectedSubject}` : ''}.
                                {searchQuery ? ' Try clearing the search.' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
