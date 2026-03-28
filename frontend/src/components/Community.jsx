import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const marqueeText = 'DARKNODE • COMMAND THE FRONTIER • TACTICAL OPS • DEPLOY NOW • PRECISION SYSTEMS • '

const communityStats = [
    { value: 12400, suffix: '+', label: 'Operators' },
    { value: 47, suffix: '', label: 'Countries' },
    { value: 200, suffix: '+', label: 'Edge Nodes' },
    { value: 99, suffix: '.97%', label: 'Satisfaction' },
]

function AnimatedCounter({ target, suffix, inView }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!inView) return

        let start = 0
        const duration = 2000
        const startTime = performance.now()

        function animate(now) {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
            setCount(Math.floor(eased * target))

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                setCount(target)
            }
        }

        requestAnimationFrame(animate)
    }, [inView, target])

    return (
        <span>
            {count.toLocaleString()}{suffix}
        </span>
    )
}

export default function Community() {
    const sectionRef = useRef(null)
    const [statsInView, setStatsInView] = useState(false)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.community-label', {
                scrollTrigger: {
                    trigger: '.community-label',
                    start: 'top 85%',
                },
                x: -30,
                opacity: 0,
                duration: 0.8,
            })

            gsap.from('.community-heading', {
                scrollTrigger: {
                    trigger: '.community-heading',
                    start: 'top 80%',
                },
                y: 60,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
            })

            ScrollTrigger.create({
                trigger: '.stats-grid',
                start: 'top 80%',
                onEnter: () => setStatsInView(true),
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section ref={sectionRef} id="community" className="relative py-32 md:py-44 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-surface" />

            {/* Marquee */}
            <div className="absolute top-0 left-0 w-full overflow-hidden border-b border-border-subtle py-3">
                <div className="marquee-track animate-marquee">
                    {[...Array(4)].map((_, i) => (
                        <span key={i} className="font-mono text-xs tracking-[0.3em] text-text-muted/20 uppercase whitespace-nowrap px-4">
                            {marqueeText}
                        </span>
                    ))}
                </div>
            </div>

            <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-16">
                {/* Section label */}
                <div className="community-label flex items-center gap-3 mb-12">
                    <div className="heading-rect">
                        <div className="w-3 h-3" />
                        <div className="w-2 h-2" />
                        <div className="w-1.5 h-1.5" />
                    </div>
                    <span className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
                        [ Network ]
                    </span>
                </div>

                {/* Heading + CTA */}
                <div className="community-heading max-w-3xl mb-16">
                    <h2 className="font-mono text-3xl md:text-5xl lg:text-6xl font-bold text-text-primary uppercase leading-[1.05]">
                        Join The{' '}
                        <span className="text-accent">Collective</span>
                    </h2>
                    <p className="font-mono text-sm text-text-muted mt-4 max-w-lg">
                        Connect with operators worldwide. Access classified briefings.
                        Contribute to next-gen defense systems.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <a href="#" className="skew-btn">
                            <span>Enlist Now</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M4.16 4.4V3.5H8.5V7.84H7.6V5.03L4.13 8.5L3.5 7.87L6.97 4.4H4.16Z" fill="currentColor" />
                            </svg>
                        </a>
                        <a
                            href="#"
                            className="font-mono text-xs tracking-wider text-text-muted hover:text-text-primary transition-colors uppercase border-b border-border-subtle hover:border-accent pb-1"
                        >
                            View Operations
                        </a>
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-6">
                    {communityStats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: 40, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
                            className="glass p-6 text-center group hover:border-accent/20 transition-all duration-500"
                        >
                            <div className="font-mono text-3xl md:text-4xl font-bold text-accent mb-2">
                                <AnimatedCounter target={stat.value} suffix={stat.suffix} inView={statsInView} />
                            </div>
                            <div className="font-mono text-xs text-text-muted tracking-wider uppercase">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom marquee */}
                <div className="mt-20 overflow-hidden border-t border-border-subtle pt-3">
                    <div className="marquee-track animate-marquee" style={{ animationDirection: 'reverse' }}>
                        {[...Array(4)].map((_, i) => (
                            <span key={i} className="font-mono text-[10rem] md:text-[14rem] font-bold text-text-primary/[0.02] uppercase whitespace-nowrap tracking-tight">
                                DARKNODE{' '}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
