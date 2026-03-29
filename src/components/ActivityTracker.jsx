import { useEffect } from 'react'

export const ActivityTracker = () => {
    useEffect(() => {
        const userId = localStorage.getItem('learnifai_user_id')
        if (!userId) return

        // Initial track
        const track = async () => {
            try {
                await fetch('http://localhost:3002/api/activity/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                })
            } catch (e) {
                console.warn('Silent activity track fail')
            }
        }

        track()
        
        // Track every 60 seconds
        const interval = setInterval(track, 60000)
        
        return () => clearInterval(interval)
    }, [])

    return null
}
