import { supabase } from '../supabase/client.js'

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
            .select('concept_slug, accuracy, attempts, concepts!inner(name, subjects!inner(name))')
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

        // ── 4. Fallback: if no tests taken yet, show subjects for user's branch ───
        if (enrolledSubjects.length === 0) {
            const filter = user.branch
                ? supabase.from('subjects').select('name').eq('branch', user.branch).limit(4)
                : supabase.from('subjects').select('name').limit(4)
            const { data: branchSubjects } = await filter

            ;(branchSubjects || []).forEach((sub, i) => {
                enrolledSubjects.push({
                    name:       sub.name,
                    iconStr:    ICONS[i % ICONS.length],
                    face:       CUBE_FACES[i % CUBE_FACES.length],
                    color:      COLORS[i % COLORS.length],
                    textColor:  TEXT_COLORS[i % TEXT_COLORS.length],
                    progress:   0,
                    lessons:    0,
                    hours:      0,
                    attempts:   0
                })
            })
        }

        // ── 5. Mentors (Synced with Professors page) ─────────────────────────────
        const mentorsData = [
            { name: "Dr. Anjali Sharma", role: "Machine Learning Specialist", img: "AS" },
            { name: "Prof. Rajan Kulkarni", role: "Cloud & Big Data Expert", img: "RK" },
            { name: "Dr. Priya Mehta", role: "Network Security Lead", img: "PM" },
            { name: "Prof. Suresh Patil", role: "Operating Systems Specialist", img: "SP" },
            { name: "Dr. Kavita Joshi", role: "Applied Mathematics Head", img: "KJ" }
        ]

        res.json({
            learningHours,
            totalHoursThisWeek: parseFloat((totalSeconds / 3600).toFixed(1)),
            peakDay,
            subjects:  enrolledSubjects,
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
