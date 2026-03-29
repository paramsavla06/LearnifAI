import { supabase } from '../supabase/client.js'
import { conceptBySlug } from '../services/dataLoader.js'

const ICONS      = ["Sparkles","BookOpen","Cpu","Brain","Compass","LineChart","Activity","Target"]
const COLORS     = ["bg-blue-500/20","bg-orange-500/20","bg-purple-500/20","bg-emerald-500/20","bg-pink-500/20","bg-indigo-500/20","bg-yellow-500/20","bg-cyan-500/20"]
const TEXT_COLORS= ["text-blue-400","text-orange-400","text-purple-400","text-emerald-400","text-pink-400","text-indigo-400","text-yellow-400","text-cyan-400"]
const CUBE_FACES = ["front","right","back","left","top","bottom"]
const DAYS       = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export const getDashboardData = async (req, res) => {
    try {
        const { userId } = req.params

        // ── 1. User ──────────────────────────────────────────────────────────────
        const { data: user } = await supabase
            .from('users').select('*').eq('id', userId).single()
        if (!user) return res.status(404).json({ error: 'User not found' })

        // ── 2. Learning Hours from real test_attempts ────────────────────────────
        const { data: attempts } = await supabase
            .from('test_attempts')
            .select('started_at, submitted_at, subject')
            .eq('user_id', userId)

        const attemptsByDay = Object.fromEntries(DAYS.map(d => [d, 0]))
        const hoursPerSubject = {}
        let totalSeconds = 0

        for (const att of (attempts || [])) {
            if (!att.started_at || !att.submitted_at) continue
            const start = new Date(att.started_at)
            const end   = new Date(att.submitted_at)
            let   diff  = Math.max(0, (end - start) / 1000)
            if (diff > 7200) diff = 900          // cap at 15 min if invalid

            totalSeconds += diff
            attemptsByDay[DAYS[start.getDay()]] += diff / 3600

            const subj = att.subject || 'General'
            hoursPerSubject[subj] = (hoursPerSubject[subj] || 0) + diff / 3600
        }

        // If no hours, add small mock seed data for "Activity" for new users
        if (totalSeconds === 0) {
            DAYS.forEach(d => { attemptsByDay[d] = 0.5 + Math.random() * 2 })
            totalSeconds = 3600 * 5 // Mock 5h total
        }

        // Shift so week starts Monday
        let learningHours = DAYS.map(d => ({ day: d, hours: parseFloat(attemptsByDay[d].toFixed(2)) }))
        learningHours.push(learningHours.shift())

        // Peak day
        const peakDay = learningHours.reduce(
            (max, cur) => cur.hours > max.hours ? cur : max,
            { day: '', hours: 0 }
        ).day || ''

        // ── 3. Per-subject mastery from concept_performance (real data) ───────────
        const { data: perfData } = await supabase
            .from('concept_performance')
            .select('concept_slug, accuracy, attempts, concepts!inner(name, description, subjects!inner(name))')
            .eq('user_id', userId)

        const subjectsMap = {}

        for (const p of (perfData || [])) {
            const subjName = p.concepts?.subjects?.name || 'Unknown'
            if (!subjectsMap[subjName]) {
                subjectsMap[subjName] = { totalAccuracy: 0, count: 0, totalAttempts: 0 }
            }
            subjectsMap[subjName].totalAccuracy  += (p.accuracy || 0)
            subjectsMap[subjName].count          += 1
            subjectsMap[subjName].totalAttempts  += (p.attempts || 0)
        }

        let enrolledSubjects = []
        let idx = 0
        for (const [subjName, sd] of Object.entries(subjectsMap)) {
            const mastery       = sd.count > 0 ? Math.round((sd.totalAccuracy / sd.count) * 100) : 0
            const subjHours     = parseFloat((hoursPerSubject[subjName] || 0).toFixed(1))
            enrolledSubjects.push({
                name:       subjName,
                iconStr:    ICONS[idx % ICONS.length],
                face:       CUBE_FACES[idx % CUBE_FACES.length],
                color:      COLORS[idx % COLORS.length],
                textColor:  TEXT_COLORS[idx % TEXT_COLORS.length],
                progress:   mastery,
                lessons:    sd.count,         // actual number of concepts tested
                hours:      subjHours,        // actual hours spent on this subject
                attempts:   sd.totalAttempts
            })
            idx++
        }

        // ── 4. Explorer Concepts (2x2 per face = 24 max) ─────────────────────────
        let explorerConcepts = []
        
        try {
            // Priority 1: Supabase
            const { data: eData } = await supabase
                .from('concepts')
                .select(`name, description, subjects ( name )`)
                .limit(24)

            if (eData && eData.length > 0) {
                eData.forEach((c, i) => {
                    explorerConcepts.push({
                        name: c.name,
                        description: c.description || 'Quick summary of the topic',
                        subjectName: c.subjects?.name || 'Curriculum',
                        iconStr: ICONS[i % ICONS.length],
                        face: CUBE_FACES[Math.floor(i / 4) % 6],
                        color: COLORS[i % COLORS.length],
                        textColor: TEXT_COLORS[i % TEXT_COLORS.length]
                    })
                })
            } else {
                // Priority 2: Local data memory fallback
                const fallbackSlugs = Object.keys(conceptBySlug).slice(0, 24)
                fallbackSlugs.forEach((slug, i) => {
                    const c = conceptBySlug[slug]
                    explorerConcepts.push({
                        name: c.name,
                        description: c.description || 'Quick summary of the topic',
                        subjectName: c.subject_name || 'Curriculum',
                        iconStr: ICONS[i % ICONS.length],
                        face: CUBE_FACES[Math.floor(i / 4) % 6],
                        color: COLORS[i % COLORS.length],
                        textColor: TEXT_COLORS[i % TEXT_COLORS.length]
                    })
                })
            }
        } catch (e) {
            console.error('[Dashboard] Explorer fetch failed, using local fallback:', e.message)
            const fallbackSlugs = Object.keys(conceptBySlug).slice(0, 24)
            fallbackSlugs.forEach((slug, i) => {
                const c = conceptBySlug[slug]
                explorerConcepts.push({
                    name: c.name,
                    description: c.description || 'Quick summary of the topic',
                    subjectName: c.subject_name || 'Curriculum',
                    iconStr: ICONS[i % ICONS.length],
                    face: CUBE_FACES[Math.floor(i / 4) % 6],
                    color: COLORS[i % COLORS.length],
                    textColor: TEXT_COLORS[i % TEXT_COLORS.length]
                })
            })
        }


        // ── 5. Mentors (Synced with Professors page) ─────────────────────────────
        const mentorsData = [
            { name: "Dr. Anjali Sharma", role: "Verified Professor", img: "AS" },
            { name: "Prof. Rajan Kulkarni", role: "Verified Professor", img: "RK" },
            { name: "Dr. Priya Mehta", role: "Verified Professor", img: "PM" },
            { name: "Prof. Suresh Patil", role: "Verified Professor", img: "SP" },
            { name: "Dr. Kavita Joshi", role: "Verified Professor", img: "KJ" }
        ]

        res.json({
            learningHours,
            totalHoursThisWeek: parseFloat((totalSeconds / 3600).toFixed(1)),
            peakDay,
            subjects:  enrolledSubjects,
            explorerConcepts,
            mentors:   mentorsData
        })

    } catch (e) {
        console.error('Dashboard data error:', e)
        res.status(500).json({ error: 'Failed to fetch dashboard data' })
    }
}

export const getCourseDetail = async (req, res) => {
    try {
        const { userId, subjectName } = req.params

        // 1. Get the subject first to ensure it exists
        const { data: subject } = await supabase
            .from('subjects')
            .select('id, name')
            .ilike('name', subjectName)
            .single()

        if (!subject) return res.status(404).json({ error: 'Subject not found' })

        // 2. Fetch all concepts for this subject
        const { data: concepts } = await supabase
            .from('concepts')
            .select('slug, name, difficulty, semester')
            .eq('subject_id', subject.id)

        if (!concepts || concepts.length === 0) {
            return res.json({ subjectName: subject.name, concepts: [] })
        }

        const conceptSlugs = concepts.map(c => c.slug)

        // 3. Fetch user's concept_performance for these concepts
        const { data: perfData } = await supabase
            .from('concept_performance')
            .select('concept_slug, accuracy, attempts')
            .eq('user_id', userId)
            .in('concept_slug', conceptSlugs)

        const perfMap = Object.fromEntries((perfData || []).map(p => [p.concept_slug, p]))

        // 4. Merge
        const mergedConcepts = concepts.map(c => {
            const perf = perfMap[c.slug]
            return {
                ...c,
                accuracy: perf?.accuracy ?? 0,
                attempts: perf?.attempts ?? 0,
                progress: perf?.accuracy ? Math.round(perf.accuracy * 100) : 0
            }
        })

        // Sort by progress desc or default order
        mergedConcepts.sort((a, b) => b.progress - a.progress)

        res.json({
            subjectName: subject.name,
            totalConcepts: concepts.length,
            completedConcepts: mergedConcepts.filter(c => c.progress > 70).length,
            concepts: mergedConcepts
        })

    } catch (e) {
        console.error('Dashboard course detail error:', e)
        res.status(500).json({ error: 'Failed to fetch course details' })
    }
}

export const getAdminStats = async (req, res) => {
    try {
        // 1. Total Students
        const { count: studentCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            // .eq('role', 'student') // Fallback if role doesn't exist yet

        // 2. Active Now (Pings in last 5 mins)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString()
        const { data: activeNow } = await supabase
            .from('activity_pings')
            .select('user_id', { count: 'exact', head: false })
            .gt('created_at', fiveMinsAgo)
        
        const uniqueActive = new Set((activeNow || []).map(p => p.user_id)).size

        // 3. Subject Mastery Distribution (Aggregate)
        const { data: perfData } = await supabase
            .from('concept_performance')
            .select('accuracy, concepts!inner(subjects!inner(name))')
        
        const subjMastery = {}
        const colors = ['#FFD85F', '#60A5FA', '#4ADE80', '#F87171', '#A78BFA']
        
        ;(perfData || []).forEach(p => {
            const name = p.concepts?.subjects?.name || 'Unknown'
            if (!subjMastery[name]) subjMastery[name] = { total: 0, count: 0 }
            subjMastery[name].total += p.accuracy
            subjMastery[name].count++
        })

        const masteryData = Object.entries(subjMastery).map(([name, d], idx) => ({
            subject: name,
            mastery: Math.round((d.total / d.count) * 100),
            color: colors[idx % colors.length]
        })).slice(0, 5)

        // 4. Recent Activity
        const { data: recentTests } = await supabase
            .from('test_attempts')
            .select('user_id, subject, submitted_at, score, users(name)')
            .order('submitted_at', { ascending: false })
            .limit(5)

        const recentActivity = (recentTests || []).map(t => ({
            user: t.users?.name || 'Unknown',
            action: `Completed ${t.subject} (${t.score}%)`,
            time: 'Recently',
            status: t.score > 70 ? 'success' : 'info'
        }))

        res.json({
            stats: [
                { label: 'Total Students', value: studentCount || 0, change: '+0%', color: '#FFD85F' },
                { label: 'Active Now', value: uniqueActive || 0, change: '+0', color: '#4ADE80' },
                { label: 'AI Chats', value: '0', change: '+0', color: '#60A5FA' }, // Placeholder
                { label: 'Book Requests', value: '0', change: '+0', color: '#F87171' }, // Placeholder
            ],
            masteryData,
            recentActivity
        })
    } catch (e) {
        console.error('Admin stats error:', e)
        res.status(500).json({ error: 'Failed to fetch admin stats' })
    }
}
