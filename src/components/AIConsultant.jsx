import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { ScrollReveal } from './ui/ScrollReveal'
import { Bot, Wifi, AlertTriangle, Play } from 'lucide-react'

const features = [
    { id: 'gap-map',     title: 'Knowledge Gap Map',    description: 'Three-level diagnostic tests trace where your understanding breaks down at the concept level.' },
    { id: 'book-rec',    title: 'Book Recommendations', description: 'After identifying gaps, the system surfaces the right book and the exact chapter to read.' },
    { id: 'library-loc', title: 'Library Section',      description: 'Every book is mapped to a physical section and shelf. Walk in and find it immediately.' },
    { id: 'advisor',     title: 'Subject Advisor',       description: 'Ask any subject-related question. The AI gives structured, course-relevant guidance.' },
]

// ─── Avatar session config ────────────────────────────────────────────────────
// Credits are consumed only when a session starts — do NOT auto-load on mount.
const EMBED_ID = import.meta.env.VITE_HEYGEN_EMBED_ID || ''
const EMBED_URL = EMBED_ID ? `https://embed.liveavatar.com/v1/${EMBED_ID}` : ''
// ─────────────────────────────────────────────────────────────────────────────

function AvatarFrame() {
    const iframeRef = useRef(null)
    // idle = not started yet | loading | live | error
    const [status, setStatus] = useState('idle')

    function startSession() {
        if (!EMBED_URL) { setStatus('error'); return }
        setStatus('loading')
        if (iframeRef.current) {
            iframeRef.current.src = EMBED_URL
        }
    }

    function handleLoad() {
        setStatus('live')
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-surface-elevation-1">

            {/* Status bar — only shown once session is active */}
            {(status === 'loading' || status === 'live') && (
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                            status === 'live'
                                ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
                                : 'bg-primary-accent opacity-50 animate-pulse'
                        }`} />
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${
                            status === 'live' ? 'text-green-500' : 'text-primary-accent'
                        }`}>
                            {status === 'live' ? 'AVATAR LIVE' : 'STARTING SESSION…'}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-text-secondary tracking-widest hidden sm:block">LIVEAVATAR ENGINE</span>
                </div>
            )}

            {/* iframe — always in DOM so onLoad fires, but src only set when started */}
            <iframe
                ref={iframeRef}
                allow="microphone"
                onLoad={handleLoad}
                className={`w-full h-full border-none transition-opacity duration-500 bg-background-base ${
                    status === 'loading' || status === 'live' ? 'pt-[45px] opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                title="LiveAvatar Embed"
            />

            {/* ── IDLE state: click-to-start gate ── */}
            {status === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-base z-20 px-6">
                    {/* Animated ring */}
                    <div className="relative mb-8">
                        <div className="w-24 h-24 rounded-full bg-primary-accent/10 border border-primary-accent/20 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-primary-accent/20 animate-ping opacity-30" />
                            <Bot className="w-10 h-10 text-primary-accent" />
                        </div>
                    </div>
                    <p className="text-white font-bold text-lg mb-2 tracking-tight">AI Avatar Consultant</p>
                    <p className="text-text-secondary text-sm text-center max-w-xs mb-8">
                        Start a live session to talk with your AI tutor. Each session uses one credit from your LiveAvatar account.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={startSession}
                        className="flex items-center gap-3 px-8 py-3 rounded-full bg-primary-accent text-black font-bold text-sm shadow-lg shadow-primary-accent/30 hover:brightness-110 transition-all"
                    >
                        <Play className="w-4 h-4 fill-black" />
                        Start Chat Session
                    </motion.button>
                </div>
            )}

            {/* ── ERROR state ── */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-base/95 backdrop-blur-sm z-20">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <Wifi className="w-8 h-8 text-red-500 opacity-50" />
                    </div>
                    <p className="text-sm font-bold text-red-500 tracking-wider mb-2 uppercase">Avatar Load Failed</p>
                    <p className="text-sm text-text-secondary text-center max-w-xs mb-6">
                        Check <code className="text-primary-accent bg-primary-accent/10 px-1 py-0.5 rounded">VITE_HEYGEN_EMBED_ID</code> in your <code className="text-primary-accent bg-primary-accent/10 px-1 py-0.5 rounded">.env</code> file.
                    </p>
                    <button
                        onClick={() => setStatus('idle')}
                        className="px-6 py-2 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
                    >
                        Back
                    </button>
                </div>
            )}
        </div>
    )
}

export default function AIConsultant() {
    return (
        <section id="ai-consultant" className="relative py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-accent/5 via-background-base to-background-base pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-6 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    <div className="order-2 lg:order-1">
                        <ScrollReveal className="origin-left">
                            <div className="text-primary-accent font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-3">
                                <span className="w-8 h-[2px] bg-primary-accent" />
                                Interactive Tutoring
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                                AI Knowledge Consultant
                            </h2>
                            <p className="text-text-secondary text-lg font-medium tracking-wide mb-10 leading-relaxed">
                                Our AI consultant analyzes your diagnostic test results to provide tailored, contextual guidance.
                                Powered by a real-time conversational avatar that dynamically visualizes your next learning steps.
                            </p>
                        </ScrollReveal>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            {features.map((feat, i) => (
                                <motion.div
                                    key={feat.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.4 }}
                                >
                                    <GlassCard className="!p-5 h-full group hover:border-primary-accent/30 transition-colors">
                                        <h3 className="text-sm font-bold text-white mb-2 group-hover:text-primary-accent transition-colors">
                                            {feat.title}
                                        </h3>
                                        <p className="text-xs text-text-secondary font-medium leading-relaxed">
                                            {feat.description}
                                        </p>
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </div>

                        {/* Info notice */}
                        <div className="p-4 rounded-xl border border-primary-accent/20 bg-primary-accent/5 flex items-start gap-4">
                            <AlertTriangle className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-primary-accent uppercase tracking-widest mb-2">Session Info</p>
                                <ol className="text-xs font-medium text-text-secondary/80 space-y-1.5 list-decimal list-inside">
                                    <li>Click <strong className="text-white">Start Chat Session</strong> to launch the avatar</li>
                                    <li>Each session consumes <strong className="text-white">1 credit</strong> from your LiveAvatar account</li>
                                    <li>Sessions are <strong className="text-white">not auto-started</strong> to preserve your credits</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="relative h-[480px] lg:h-[600px] w-full rounded-[32px] overflow-hidden border border-white/10 shadow-2xl shadow-primary-accent/5 group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none z-10" />

                            <div className="absolute top-6 right-6 z-20 flex gap-2">
                                <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                                    <Bot className="w-3.5 h-3.5 text-primary-accent" />
                                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">LiveAvatar Engine</span>
                                </div>
                            </div>

                            <AvatarFrame />
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}
