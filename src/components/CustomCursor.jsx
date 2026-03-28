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
            {/* Dot Cursor */}
            <div
                ref={cursorRef}
                className="absolute"
                style={{ transform: 'translate(0px, 0px)' }}
            >
                <div className="w-2 h-2 -ml-1 -mt-1 border border-accent/60 rotate-45" />
            </div>
        </div>
    )
}
