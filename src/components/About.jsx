import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function About() {
    const sectionRef = useRef(null)
    const spotlightRef = useRef(null)

    // Mouse spotlight effect
    useEffect(() => {
        const section = spotlightRef.current
        if (!section) return

        const onMove = (e) => {
            section.style.setProperty('--mouse-x', `${e.clientX}px`)
            section.style.setProperty('--mouse-y', `${e.clientY}px`)
        }

        window.addEventListener('mousemove', onMove)
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    // Dot grid visibility
    useEffect(() => {
        const section = sectionRef.current
        if (!section) return

        const dotGrid = section.querySelector('.dot-grid')
        if (!dotGrid) return

        const onMove = (e) => {
            const rect = section.getBoundingClientRect()
            dotGrid.style.setProperty('--mx', `${e.clientX - rect.left}px`)
            dotGrid.style.setProperty('--my', `${e.clientY - rect.top}px`)
        }

        const onEnter = () => { dotGrid.style.opacity = '0.2' }
        const onLeave = () => { dotGrid.style.opacity = '0' }

        section.addEventListener('mousemove', onMove)
        section.addEventListener('mouseenter', onEnter)
        section.addEventListener('mouseleave', onLeave)

        return () => {
            section.removeEventListener('mousemove', onMove)
            section.removeEventListener('mouseenter', onEnter)
            section.removeEventListener('mouseleave', onLeave)
        }
    }, [])

    // GSAP scroll animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.about-label', {
                scrollTrigger: {
                    trigger: '.about-label',
                    start: 'top 85%',
                },
                x: -30,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
            })

            gsap.from('.about-heading-text', {
                scrollTrigger: {
                    trigger: '.about-heading-text',
                    start: 'top 80%',
                },
                y: 60,
                opacity: 0,
                stagger: 0.15,
                duration: 1,
                ease: 'power3.out',
            })

            gsap.from('.about-body', {
                scrollTrigger: {
                    trigger: '.about-body',
                    start: 'top 80%',
                },
                y: 30,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: 0.2,
            })

            gsap.from('.about-stat', {
                scrollTrigger: {
                    trigger: '.about-stat',
                    start: 'top 85%',
                },
                y: 40,
                opacity: 0,
                stagger: 0.1,
                duration: 0.8,
                ease: 'power2.out',
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    const stats = [
        { value: '99.7%', label: 'Uptime' },
        { value: '< 5ms', label: 'Response' },
        { value: '256-bit', label: 'Encryption' },
        { value: '24/7', label: 'Monitoring' },
    ]

    return (
        <section
            ref={sectionRef}
            id="about"
            className="relative py-32 md:py-44 overflow-hidden"
        >
            {/* Spotlight background */}
            <div ref={spotlightRef} className="spotlight-section absolute inset-0" />

            {/* Dot grid overlay */}
            <div className="dot-grid" />

            {/* Cross-pattern background */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle, #eef2f9 1px, transparent 1px)`,
                    backgroundSize: '48px 48px',
                }}
            />

            <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-16">
                {/* Section label */}
                <div className="about-label flex items-center gap-3 mb-12">
                    <div className="heading-rect">
                        <div className="w-3 h-3" />
                        <div className="w-2 h-2" />
                        <div className="w-1.5 h-1.5" />
                    </div>
                    <span className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
                        [ About Us ]
                    </span>
                </div>

                {/* Heading */}
                <div className="max-w-4xl">
                    <div className="overflow-hidden">
                        <h2 className="about-heading-text font-mono text-3xl md:text-5xl lg:text-7xl font-bold text-text-primary uppercase leading-[1.05]">
                            Built For
                        </h2>
                    </div>
                    <div className="overflow-hidden">
                        <h2 className="about-heading-text font-mono text-3xl md:text-5xl lg:text-7xl font-bold uppercase leading-[1.05]">
                            <span className="text-accent">Precision</span>{' '}
                            <span className="text-text-muted">Operations</span>
                        </h2>
                    </div>
                </div>

                {/* Body text */}
                <div className="about-body mt-10 max-w-2xl">
                    <p className="font-mono text-sm md:text-base text-text-muted leading-relaxed">
                        We architect digital infrastructure engineered for extreme reliability.
                        Every system is battle-tested, hardened against threats, and optimized
                        for peak performance under the most demanding conditions.
                    </p>
                    <p className="font-mono text-sm md:text-base text-text-muted leading-relaxed mt-4">
                        Our platform combines advanced threat detection, real-time analytics, and
                        autonomous response systems to create an impenetrable digital defense layer.
                    </p>
                </div>

                {/* Stats row */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    {stats.map((stat, i) => (
                        <div key={i} className="about-stat glass p-6 group hover:border-accent/20 transition-all duration-500">
                            <div className="font-mono text-2xl md:text-3xl font-bold text-accent mb-2">
                                {stat.value}
                            </div>
                            <div className="font-mono text-xs text-text-muted tracking-wider uppercase">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Decorative line */}
                <div className="mt-20 h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            </div>
        </section>
    )
}
