import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const COLS = 30
const ROWS = 17

export default function SquareGrid({
    sectionRef,
    color = 'dark',
    triggerStart = 'top bottom',
    triggerEnd = 'bottom top',
}) {
    const gridRef = useRef(null)

    useEffect(() => {
        if (!gridRef.current || !sectionRef?.current) return

        const grid = gridRef.current
        // Clear any existing squares
        grid.innerHTML = ''

        // Create squares
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const square = document.createElement('div')
                square.className = `square square--${color}`
                square.dataset.row = row
                square.dataset.col = col
                grid.appendChild(square)
            }
        }

        const squares = grid.querySelectorAll('.square')
        const squareData = Array.from(squares).map((square) => {
            const row = parseInt(square.dataset.row)
            const col = parseInt(square.dataset.col)
            const distanceFromBottom = ROWS - 1 - row
            const basePriority = distanceFromBottom * 50
            const randomFactor = Math.random() * 300
            const waveEffect = Math.sin(col * 0.3) * 30

            return {
                element: square,
                priority: basePriority + randomFactor + waveEffect,
            }
        })

        squareData.sort((a, b) => a.priority - b.priority)

        const trigger = ScrollTrigger.create({
            trigger: sectionRef.current,
            start: triggerStart,
            end: triggerEnd,
            scrub: 1,
            onUpdate: (self) => {
                const progress = self.progress
                const totalSquares = squareData.length
                const visibleCount = Math.floor(totalSquares * progress)

                squareData.forEach((data, index) => {
                    if (index < visibleCount) {
                        gsap.to(data.element, {
                            opacity: 1,
                            duration: 0.4,
                            ease: 'power2.out',
                        })
                    } else {
                        gsap.to(data.element, {
                            opacity: 0,
                            duration: 0.4,
                            ease: 'power2.out',
                        })
                    }
                })
            },
        })

        return () => {
            trigger.kill()
        }
    }, [sectionRef, color, triggerStart, triggerEnd])

    return <div ref={gridRef} className="square-grid" />
}
