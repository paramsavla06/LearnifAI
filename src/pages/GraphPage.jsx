import KnowledgeGraph from '../components/KnowledgeGraph'
import { ScrollReveal } from '../components/ui/ScrollReveal'
import { GitBranch } from 'lucide-react'

export default function GraphPage() {
    const userId = localStorage.getItem('learnifai_user_id') || undefined
    return (
        <section className="relative pt-28 pb-16 min-h-screen">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FFD85F]/5 via-background-base to-background-base pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-6 md:px-8">

                <ScrollReveal className="mb-8 origin-left">
                    <div className="text-[#FFD85F] font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-[#FFD85F]" />
                        Knowledge Graph
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#FFD85F]/10 border border-[#FFD85F]/20 flex items-center justify-center">
                            <GitBranch className="w-5 h-5 text-[#FFD85F]" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                Your Knowledge Graph
                            </h1>
                            <p className="text-gray-400 font-medium mt-1 text-sm">
                                Visualise concept mastery, prerequisites, and cross-subject connections
                            </p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-6">
                        {[
                            { color: '#639922', label: 'Strong (≥70%)' },
                            { color: '#EF9F27', label: 'Average (40–70%)' },
                            { color: '#E24B4A', label: 'Weak (<40%)' },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                                <span className="text-xs text-gray-400 font-medium">{l.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-0.5 bg-gray-500" />
                            <span className="text-xs text-gray-400 font-medium">Prerequisite</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-0.5 border-t-2 border-dashed border-red-400" />
                            <span className="text-xs text-gray-400 font-medium">Root cause</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-0.5 border-t-2 border-dotted border-blue-400" />
                            <span className="text-xs text-gray-400 font-medium">Similar concept</span>
                        </div>
                    </div>
                </ScrollReveal>

                <KnowledgeGraph userId={userId} />
            </div>
        </section>
    )
}
