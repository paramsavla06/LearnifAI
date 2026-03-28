import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const features = [
    {
        icon: '⬡',
        title: 'Threat Detection',
        description: 'Real-time AI-powered surveillance that identifies and neutralizes cyber threats before they infiltrate your perimeter.',
        tag: 'DEFENSE',
    },
    {
        icon: '◈',
        title: 'Autonomous Ops',
        description: 'Self-healing infrastructure that automatically adapts, reroutes, and recovers — zero human intervention required.',
        tag: 'AUTOMATION',
    },
    {
        icon: '⬢',
        title: 'Quantum Encryption',
        description: '256-bit post-quantum encryption protocol. Future-proof your communications against next-gen decryption attacks.',
        tag: 'SECURITY',
    },
    {
        icon: '◇',
        title: 'Neural Analytics',
        description: 'Deep-learning analytics engine processing petabytes of data in milliseconds. Predictive intelligence at your fingertips.',
        tag: 'INTELLIGENCE',
    },
    {
        icon: '⬡',
        title: 'Edge Deploy',
        description: 'Deploy to 200+ edge nodes globally. Sub-5ms latency guaranteed with automatic failover and load distribution.',
        tag: 'INFRASTRUCTURE',
    },
    {
        icon: '◈',
        title: 'Command Center',
        description: 'Unified dashboard for monitoring all operations. Real-time telemetry, alerts, and tactical decision support.',
        tag: 'CONTROL',
    },
]

const cardVariants = {
    hidden: { y: 60, opacity: 0 },
    visible: (i) => ({
        y: 0,
        opacity: 1,
        transition: {
            delay: i * 0.1,
            duration: 0.6,
            ease: [0.215, 0.61, 0.355, 1],
        },
    }),
}

export default function Features() {
    const sectionRef = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.features-label', {
                scrollTrigger: {
                    trigger: '.features-label',
                    start: 'top 85%',
                },
                x: -30,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
            })

            gsap.from('.features-heading', {
                scrollTrigger: {
                    trigger: '.features-heading',
                    start: 'top 80%',
                },
                y: 60,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section ref={sectionRef} id="features" className="relative py-32 md:py-44 bg-primary">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(238,242,249,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(238,242,249,0.3) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-16">
                {/* Section label */}
                <div className="features-label flex items-center gap-3 mb-12">
                    <div className="heading-rect">
                        <div className="w-3 h-3" />
                        <div className="w-2 h-2" />
                        <div className="w-1.5 h-1.5" />
                    </div>
                    <span className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
                        [ Capabilities ]
                    </span>
                </div>

                {/* Heading */}
                <div className="features-heading max-w-3xl mb-16">
                    <h2 className="font-mono text-3xl md:text-5xl lg:text-6xl font-bold text-text-primary uppercase leading-[1.05]">
                        Platform{' '}
                        <span className="text-accent">Arsenal</span>
                    </h2>
                    <p className="font-mono text-sm text-text-muted mt-4 max-w-lg">
                        Every tool engineered for maximum impact. Every feature battle-tested and deployment-ready.
                    </p>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-50px' }}
                            className="glass glass-hover p-7 md:p-8 group cursor-default relative overflow-hidden"
                        >
                            {/* Tag */}
                            <div className="font-mono text-[10px] tracking-[0.2em] text-accent/60 mb-4 uppercase">
                                {feature.tag}
                            </div>

                            {/* Icon */}
                            <div className="text-3xl text-accent/30 group-hover:text-accent/60 transition-colors duration-500 mb-5">
                                {feature.icon}
                            </div>

                            {/* Title */}
                            <h3 className="font-mono text-base font-semibold text-text-primary mb-3 uppercase tracking-wide">
                                {feature.title}
                            </h3>

                            {/* Description */}
                            <p className="font-mono text-xs text-text-muted leading-relaxed">
                                {feature.description}
                            </p>

                            {/* Bottom line accent */}
                            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-accent/0 group-hover:bg-accent/30 transition-all duration-500" />

                            {/* Corner marker */}
                            <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-accent/0 group-hover:border-accent/30 transition-colors duration-500" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
