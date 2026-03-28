import { useEffect, useRef, useState } from 'react'

export default function Preloader({ onComplete }) {
    const [percent, setPercent] = useState(0)
    const containerRef = useRef(null)
    const startRef = useRef(null)

    useEffect(() => {
        const duration = 2500

        function animate(now) {
            if (!startRef.current) startRef.current = now
            const elapsed = now - startRef.current

            // Fade out
            if (elapsed >= 2000 && containerRef.current) {
                const t = (elapsed - 2000) / 500
                containerRef.current.style.opacity = String(1 - Math.min(t, 1))
            }

            setPercent(Math.min(Math.round((elapsed / 1900) * 100), 100))

            if (elapsed < duration) {
                requestAnimationFrame(animate)
            } else {
                onComplete()
            }
        }

        requestAnimationFrame(animate)
    }, [onComplete])

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background-base transition-opacity duration-500"
        >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-accent/10 via-background-base to-background-base pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-8">
                <div className="relative">
                    <div className="w-14 h-14 border border-primary-accent/40 rotate-45 flex items-center justify-center bg-white/5 backdrop-blur-md">
                        <div className="w-4 h-4 bg-primary-accent shadow-[0_0_16px_rgba(255,216,95,0.8)]" />
                    </div>
                    <div className="absolute -inset-3 border border-primary-accent/10 rotate-45" />
                </div>

                <div className="font-bold text-sm tracking-[0.25em] text-white uppercase">
                    LearnifAI
                </div>

                <div className="w-48 flex flex-col gap-2 items-center">
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary-accent shadow-[0_0_8px_rgba(255,216,95,0.6)] transition-all duration-100 ease-linear"
                            style={{ width: `${percent}%` }} 
                        />
                    </div>
                    <span className="font-mono text-[11px] text-primary-accent tracking-[0.15em]">
                        {percent}%
                    </span>
                </div>
            </div>

            {/* Corner marks */}
            {[
                { top: 20, left: 20, borderTop: '1px solid rgba(255,216,95,0.3)', borderLeft: '1px solid rgba(255,216,95,0.3)' },
                { top: 20, right: 20, borderTop: '1px solid rgba(255,216,95,0.3)', borderRight: '1px solid rgba(255,216,95,0.3)' },
                { bottom: 20, left: 20, borderBottom: '1px solid rgba(255,216,95,0.3)', borderLeft: '1px solid rgba(255,216,95,0.3)' },
                { bottom: 20, right: 20, borderBottom: '1px solid rgba(255,216,95,0.3)', borderRight: '1px solid rgba(255,216,95,0.3)' },
            ].map((style, i) => (
                <div key={i} className="absolute w-5 h-5" style={style} />
            ))}
        </div>
    )
}
