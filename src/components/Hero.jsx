import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/* ─── Stat Cards Data ─────────────────────────────────── */
const stats = [
    { value: '4', label: 'Academic Years', sub: 'FE · SE · TE · BE' },
    { value: '24+', label: 'Core Subjects', sub: 'CE Curriculum' },
    { value: '180+', label: 'Topics Mapped', sub: 'With root causes' },
    { value: '3', label: 'Diagnostic Levels', sub: 'Per subject' },
]

/* ─── Platform feature chips ─────────────────────────── */
const features = [
    { icon: TestIcon, label: 'Diagnostic Tests' },
    { icon: BookIcon, label: 'Library Sections' },
    { icon: MapIcon, label: '3D Campus Map' },
    { icon: AiIcon, label: 'AI Consultant' },
]

/* ─── Thin monoline icons (1.5px stroke, viewBox 24×24) ─ */
function TestIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <path d="M9 12h6M9 16h4" />
        </svg>
    )
}
function BookIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
    )
}
function MapIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
    )
}
function AiIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V12h-4V9.5A4 4 0 0 1 12 2z" />
            <path d="M8 12H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-3" />
            <circle cx="12" cy="17" r="1" />
        </svg>
    )
}

/* ─── Layered floating glass panels (CSS 3D) ─────────── */
function FloatingGlassPanels() {
    const panels = [
        { z: 0, x: 0, y: 0, w: 200, h: 140, label: 'Knowledge Graph', sub: '180+ topics mapped', delay: 0 },
        { z: 1, x: 30, y: -30, w: 170, h: 110, label: 'Gap Analysis', sub: 'Root cause drill', delay: 0.5 },
        { z: 2, x: 60, y: -55, w: 150, h: 90, label: 'Book Match', sub: 'Chapter-level', delay: 1 },
    ]

    return (
        <div className="relative flex items-center justify-center w-full h-full" style={{ perspective: '800px' }}>
            <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX(18deg) rotateY(-20deg)' }}>
                {panels.map((p, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: [0, -10, 0] }}
                        transition={{
                            opacity: { delay: p.delay, duration: 0.6 },
                            y: { delay: p.delay, duration: 5 + i, repeat: Infinity, ease: 'easeInOut' },
                        }}
                        style={{
                            position: 'absolute',
                            width: p.w,
                            height: p.h,
                            left: p.x - p.w / 2,
                            top: p.y - p.h / 2,
                            transform: `translateZ(${i * 28}px)`,
                            background: 'rgba(255,255,255,0.04)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderTop: '1px solid rgba(255,255,255,0.18)',
                            borderLeft: '1px solid rgba(255,255,255,0.12)',
                            borderRight: '1px solid rgba(255,255,255,0.04)',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: 16,
                            padding: 20,
                            boxShadow: i === 0
                                ? '0 8px 32px rgba(255,0,0,0.12), 0 2px 8px rgba(0,0,0,0.4)'
                                : '0 4px 20px rgba(0,0,0,0.3)',
                        }}
                    >
                        {/* Red indicator dot */}
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#FF0000',
                            boxShadow: '0 0 8px rgba(255,0,0,0.8)',
                            marginBottom: 10,
                        }} />
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.015em', fontFamily: 'Inter', lineHeight: 1.3 }}>
                            {p.label}
                        </p>
                        <p style={{ color: 'rgba(155,161,176,0.8)', fontSize: 11, marginTop: 4, fontFamily: 'Inter' }}>
                            {p.sub}
                        </p>

                        {/* Mini progress bar on bottom panel */}
                        {i === 0 && (
                            <div style={{ marginTop: 'auto', paddingTop: 28 }}>
                                {[70, 45, 88].map((w, j) => (
                                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                                            <div style={{ width: `${w}%`, height: '100%', background: j === 2 ? '#FF0000' : 'rgba(255,255,255,0.3)', borderRadius: 2, boxShadow: j === 2 ? '0 0 6px rgba(255,0,0,0.6)' : 'none' }} />
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Inter' }}>{w}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

/* ─── Main Hero ───────────────────────────────────────── */
export default function Hero() {
    const gridRef = useRef(null)

    // Subtle mouse parallax on the grid
    useEffect(() => {
        const onMove = (e) => {
            if (!gridRef.current) return
            const x = (e.clientX / window.innerWidth - 0.5) * 20
            const y = (e.clientY / window.innerHeight - 0.5) * 10
            gridRef.current.style.transform = `translate(${x}px, ${y}px)`
        }
        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    return (
        <section
            id="hero"
            style={{
                minHeight: '100vh',
                background: '#1B1D24',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Structural grid overlay */}
            <div
                ref={gridRef}
                style={{
                    position: 'absolute',
                    inset: '-20px',
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    pointerEvents: 'none',
                    transition: 'transform 0.1s ease',
                }}
            />

            {/* Red radial glow — top right */}
            <div style={{
                position: 'absolute',
                top: '-120px',
                right: '-80px',
                width: 500,
                height: 500,
                background: 'radial-gradient(circle, rgba(255,0,0,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Red radial glow — bottom left */}
            <div style={{
                position: 'absolute',
                bottom: '-100px',
                left: '-80px',
                width: 400,
                height: 400,
                background: 'radial-gradient(circle, rgba(255,0,0,0.07) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Bento grid content */}
            <div style={{
                flex: 1,
                maxWidth: 1440,
                width: '100%',
                margin: '0 auto',
                padding: 'clamp(90px,10vw,120px) clamp(20px,5vw,64px) 60px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: 'auto auto',
                gap: 16,
            }}
                className="hero-bento"
            >
                {/* ── CARD 1: Headline (top-left, large) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
                    style={{
                        gridColumn: '1',
                        gridRow: '1',
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderTop: '1px solid rgba(255,255,255,0.15)',
                        borderLeft: '1px solid rgba(255,255,255,0.12)',
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 24,
                        padding: 40,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 340,
                    }}
                >
                    {/* Overline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF0000', boxShadow: '0 0 10px rgba(255,0,0,0.8)' }} />
                        <span style={{
                            fontFamily: 'Inter',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#FF0000',
                        }}>
                            LearnifAI — Mumbai University CE
                        </span>
                    </div>

                    {/* Main headline */}
                    <div>
                        <h1 style={{
                            fontFamily: 'Inter',
                            fontSize: 'clamp(36px,4vw,58px)',
                            fontWeight: 700,
                            letterSpacing: '-0.03em',
                            color: '#FFFFFF',
                            lineHeight: 1.08,
                            marginBottom: 20,
                        }}>
                            Know Your Gaps.{' '}
                            <span style={{ color: '#FF0000', textShadow: '0 0 40px rgba(255,0,0,0.4)' }}>
                                Fill Them Fast.
                            </span>
                        </h1>
                        <p style={{
                            fontFamily: 'Inter',
                            fontSize: 15,
                            fontWeight: 400,
                            lineHeight: 1.6,
                            color: '#9BA1B0',
                            maxWidth: 380,
                        }}>
                            Three-level diagnostic tests map your knowledge gaps to root causes.
                            Find the exact book, chapter, and library shelf — instantly.
                        </p>
                    </div>

                    {/* CTAs */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
                        <motion.a
                            href="#tests"
                            whileHover={{ scale: 1.03, boxShadow: '0 8px 40px rgba(255,0,0,0.4)' }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '13px 28px',
                                background: '#FF0000',
                                color: '#FFFFFF',
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: 600,
                                letterSpacing: '-0.01em',
                                borderRadius: 999,
                                textDecoration: 'none',
                                boxShadow: '0 8px 32px rgba(255,0,0,0.25)',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Start Diagnostic
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </motion.a>

                        <motion.a
                            href="#library"
                            whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.25)' }}
                            transition={{ duration: 0.15 }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '13px 28px',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#FFFFFF',
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: 500,
                                letterSpacing: '-0.01em',
                                borderRadius: 999,
                                textDecoration: 'none',
                                border: '1px solid rgba(255,255,255,0.12)',
                                backdropFilter: 'blur(10px)',
                                cursor: 'pointer',
                            }}
                        >
                            Browse Library
                        </motion.a>
                    </div>
                </motion.div>

                {/* ── CARD 2: 3D floating glass visual (top-right) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.215, 0.61, 0.355, 1] }}
                    style={{
                        gridColumn: '2',
                        gridRow: '1 / 3',
                        background: 'rgba(255,255,255,0.025)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderTop: '1px solid rgba(255,255,255,0.15)',
                        borderLeft: '1px solid rgba(255,255,255,0.12)',
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        minHeight: 480,
                        position: 'relative',
                    }}
                >
                    {/* Top label */}
                    <div style={{
                        position: 'absolute', top: 24, left: 28, right: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9BA1B0' }}>
                            Knowledge Architecture
                        </span>
                        <div style={{ display: 'flex', gap: 5 }}>
                            {['#FF0000', '#9BA1B0', '#363840'].map((c, i) => (
                                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: i === 0 ? 1 : 0.6 }} />
                            ))}
                        </div>
                    </div>

                    {/* 3D glass panels */}
                    <div style={{ width: '100%', height: 340 }}>
                        <FloatingGlassPanels />
                    </div>

                    {/* Bottom status */}
                    <div style={{
                        position: 'absolute', bottom: 24, left: 28, right: 28,
                        display: 'flex', alignItems: 'center', gap: 8,
                        borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16,
                    }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
                        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#9BA1B0' }}>System active</span>
                        <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#3d4058', marginLeft: 'auto' }}>MU CE // 2026</span>
                    </div>
                </motion.div>

                {/* ── CARD 3: Stats row (bottom-left) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
                    style={{
                        gridColumn: '1',
                        gridRow: '2',
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderTop: '1px solid rgba(255,255,255,0.15)',
                        borderLeft: '1px solid rgba(255,255,255,0.12)',
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 24,
                        padding: 32,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 24,
                    }}
                >
                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {stats.map((stat, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.18)' }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 16,
                                    padding: '18px 20px',
                                }}
                            >
                                <p style={{
                                    fontFamily: 'Inter',
                                    fontSize: 28,
                                    fontWeight: 700,
                                    letterSpacing: '-0.03em',
                                    color: '#FFFFFF',
                                    lineHeight: 1,
                                    marginBottom: 4,
                                }}>
                                    {stat.value}
                                </p>
                                <p style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: '#9BA1B0' }}>{stat.label}</p>
                                <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#4a4f5e', marginTop: 2 }}>{stat.sub}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Feature chips */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {features.map((feat, i) => (
                            <motion.a
                                key={i}
                                href={`#${feat.label.toLowerCase().replace(/\s/g, '-')}`}
                                whileHover={{ scale: 1.03, borderColor: 'rgba(255,0,0,0.35)' }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    padding: '8px 16px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 999,
                                    textDecoration: 'none',
                                    color: '#9BA1B0',
                                    fontFamily: 'Inter',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                <span style={{ color: '#FF0000' }}>
                                    <feat.icon />
                                </span>
                                {feat.label}
                            </motion.a>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    bottom: 32,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    opacity: 0.4,
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#9BA1B0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Scroll
                </span>
            </motion.div>

            {/* Responsive styles */}
            <style>{`
                @media (max-width: 768px) {
                    .hero-bento {
                        grid-template-columns: 1fr !important;
                        grid-template-rows: auto !important;
                    }
                    .hero-bento > *:nth-child(2) {
                        grid-column: 1 !important;
                        grid-row: auto !important;
                        min-height: 320px !important;
                    }
                    .hero-bento > *:nth-child(3) {
                        grid-column: 1 !important;
                        grid-row: auto !important;
                    }
                }
            `}</style>
        </section>
    )
}
