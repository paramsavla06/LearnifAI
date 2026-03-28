import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export default function CustomCursor() {
    const cursorRef = useRef(null)
    const lineVRef = useRef(null)
    const lineHRef = useRef(null)
    const coordRef = useRef(null)
    const [coords, setCoords] = useState({ x: 0, y: 0 })
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Don't show on touch devices
        if ('ontouchstart' in window) return

        const onMove = (e) => {
            const { clientX: x, clientY: y } = e

            gsap.to(cursorRef.current, {
                x, y,
                duration: 0.15,
                ease: 'power2.out',
            })

            if (lineVRef.current) {
                gsap.to(lineVRef.current, { x, duration: 0.1, ease: 'none' })
            }
            if (lineHRef.current) {
                gsap.to(lineHRef.current, { y, duration: 0.1, ease: 'none' })
            }

            setCoords({ x: Math.round(x), y: Math.round(y) })
        }

        const onEnter = () => setVisible(true)
        const onLeave = () => setVisible(false)

        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseenter', onEnter)
        document.addEventListener('mouseleave', onLeave)

        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseenter', onEnter)
            document.removeEventListener('mouseleave', onLeave)
        }
    }, [])

    // Don't render on touch devices
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return null

    return (
        <div className={`fixed inset-0 z-[9998] pointer-events-none transition-opacity duration-300 hide-mobile ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Vertical line */}
            <div
                ref={lineVRef}
                className="absolute top-0 h-full w-[1px] bg-accent/15"
                style={{ transform: 'translateX(0px)' }}
            />
            {/* Horizontal line */}
            <div
                ref={lineHRef}
                className="absolute left-0 w-full h-[1px] bg-accent/15"
                style={{ transform: 'translateY(0px)' }}
            />
            {/* Dot + Coords */}
            <div
                ref={cursorRef}
                className="absolute"
                style={{ transform: 'translate(0px, 0px)' }}
            >
                <div className="w-2 h-2 -ml-1 -mt-1 border border-accent/60 rotate-45" />
                <div
                    ref={coordRef}
                    className="absolute left-4 top-2 font-mono text-[10px] text-accent/60 whitespace-nowrap tracking-wider"
                >
                    <div>X: {String(coords.x).padStart(4, '0')}</div>
                    <div>Y: {String(coords.y).padStart(4, '0')}</div>
                </div>
            </div>
        </div>
    )
}
