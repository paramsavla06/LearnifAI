import { supabase } from '../supabase/client.js'

export const getDashboardData = async (req, res) => {
    try {
        const { userId } = req.params

        // Fetch user data
        const { data: user, error: _errUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

        if (!user) return res.status(404).json({ error: 'User not found' })

        // 1. Learning Hours (Calculate from test_attempts table)
        // For a hackathon/school project, we can just assign an average time per test or compute difference between started_at and submitted_at.
        const { data: attempts } = await supabase
            .from('test_attempts')
            .select('started_at, submitted_at, test_type')
            .eq('user_id', userId)

        let totalSeconds = 0
        const attemptsByDay = {} // e.g. "Mon": X hours, "Tue": Y hours
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        // Initialize days
        daysOfWeek.forEach(d => attemptsByDay[d] = 0)

        if (attempts) {
            for (const att of attempts) {
                if (att.started_at && att.submitted_at) {
                    const start = new Date(att.started_at)
                    const end = new Date(att.submitted_at)
                    let diffSeconds = (end - start) / 1000
                    if (diffSeconds < 0 || diffSeconds > 7200) diffSeconds = 900 // bounds check, assume 15 min if invalid/too long

                    totalSeconds += diffSeconds
                    const dayString = daysOfWeek[start.getDay()]
                    attemptsByDay[dayString] += (diffSeconds / 3600) // convert to hours
                }
            }
        }
        
        let learningHours = Object.keys(attemptsByDay).map(day => ({
            day,
            hours: parseFloat(attemptsByDay[day].toFixed(1))
        }))
        // Shift array so it starts on Monday
        const sun = learningHours.shift()
        learningHours.push(sun)

        // 2. My Courses and Concept Explorer (Mastery per subject from results)
        // To build the course list, we look at the results table.
        const { data: result } = await supabase
            .from('results')
            .select('*')
            .eq('user_id', userId)
            .single()

        const subjectsMap = {}
        const enrolledSubjects = []

        if (result && (result.weak_topics || result.strong_topics)) {
            const allTopics = [...(result.weak_topics || []), ...(result.strong_topics || [])]
            for (const topic of allTopics) {
                if (!topic.subject) continue
                if (!subjectsMap[topic.subject]) {
                    subjectsMap[topic.subject] = {
                        name: topic.subject,
                        total_score: 0,
                        concept_count: 0
                    }
                }
                subjectsMap[topic.subject].total_score += (topic.mastery_pct || 0)
                subjectsMap[topic.subject].concept_count += 1
            }
        }

        // Map to standard layout attributes
        const icons = ["Sparkles", "BookOpen", "Cpu", "Brain", "Compass", "LineChart", "Activity", "Target"]
        const colors = ["bg-blue-500/20", "bg-orange-500/20", "bg-purple-500/20", "bg-emerald-500/20", "bg-pink-500/20", "bg-indigo-500/20", "bg-yellow-500/20", "bg-cyan-500/20"]
        const textColors = ["text-blue-400", "text-orange-400", "text-purple-400", "text-emerald-400", "text-pink-400", "text-indigo-400", "text-yellow-400", "text-cyan-400"]
        const faces = ["front", "right", "back", "left", "top", "bottom"]

        let i = 0
        for (const [subjName, data] of Object.entries(subjectsMap)) {
            const progress = Math.round(data.total_score / data.concept_count)
            enrolledSubjects.push({
                name: subjName,
                iconStr: icons[i % icons.length],
                face: faces[i % faces.length],
                color: colors[i % colors.length],
                textColor: textColors[i % textColors.length],
                progress,
                lessons: data.concept_count * 2,
                hours: parseFloat((data.concept_count * 1.5).toFixed(1))
            })
            i++
        }

        // 3. Fallback: If no tests taken, suggest courses based on user branch
        if (enrolledSubjects.length === 0 && user.branch) {
            const { data: branchSubjects } = await supabase
                .from('subjects')
                .select('name')
                .eq('branch', user.branch)
                .limit(4)
                
            if (branchSubjects) {
                branchSubjects.forEach((sub, idx) => {
                    enrolledSubjects.push({
                        name: sub.name,
                        iconStr: icons[idx % icons.length],
                        face: faces[idx % faces.length],
                        color: colors[idx % colors.length],
                        textColor: textColors[idx % textColors.length],
                        progress: 0,
                        lessons: 10,
                        hours: 5
                    })
                })
            }
        }

        const { data: mentorsData } = await supabase
            .from('mentors')
            .select('*')
            .limit(4)

        const mentors = mentorsData || []

        res.json({
            learningHours,
            totalHoursThisWeek: parseFloat((totalSeconds / 3600).toFixed(1)),
            subjects: enrolledSubjects,
            mentors
        })

    } catch (e) {
        console.error('Dashboard data error:', e)
        res.status(500).json({ error: 'Failed to fetch dashboard data' })
    }
}
