import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export default function CustomCursor() {
    const cursorRef = useRef(null)
    const lineVRef = useRef(null)
    const lineHRef = useRef(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Don't show on touch devices
        if ('ontouchstart' in window) return

        const onMove = (e) => {
            const { clientX: x, clientY: y } = e

            gsap.to(cursorRef.current, {
                x, y,
                duration: 0,
                ease: 'none',
            })

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
            {/* Center pointer */}
            <div
                ref={cursorRef}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary-accent"
                style={{ transform: 'translate(0px, 0px)' }}
            />
        </div>
    )
}
