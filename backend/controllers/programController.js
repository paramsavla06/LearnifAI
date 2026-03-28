import { supabase } from '../supabase/client.js'

const PROGRAMS = [
    { value: 'btech',   label: 'B.Tech / B.E.',  years: 4, field: 'Science',  branches: ['CSE','ECE','ME','CE','EE','IT','Chemical','Civil'] },
    { value: 'bsc',     label: 'B.Sc',            years: 3, field: 'Science',  branches: ['Physics','Chemistry','Mathematics','Biology','CS'] },
    { value: 'bcom',    label: 'B.Com',            years: 3, field: 'Commerce', branches: ['General','Hons','Banking'] },
    { value: 'ba',      label: 'B.A.',             years: 3, field: 'Arts',     branches: ['History','Economics','Political Science','Psychology','Sociology'] },
    { value: 'bba',     label: 'BBA',              years: 3, field: 'Commerce', branches: ['General','Finance','Marketing','HR'] },
    { value: 'bca',     label: 'BCA',              years: 3, field: 'Science',  branches: ['General'] },
    { value: 'mba',     label: 'MBA',              years: 2, field: 'Commerce', branches: ['Finance','Marketing','HR','Operations','IT'] },
    { value: 'mtech',   label: 'M.Tech / M.E.',   years: 2, field: 'Science',  branches: ['CSE','ECE','ME','CE','EE','IT'] },
    { value: 'msc',     label: 'M.Sc',             years: 2, field: 'Science',  branches: ['Physics','Chemistry','Mathematics','Biology','CS'] },
    { value: 'mca',     label: 'MCA',              years: 2, field: 'Science',  branches: ['General'] },
    { value: 'diploma', label: 'Diploma',          years: 3, field: 'General',  branches: ['CSE','ECE','ME','CE','EE'] },
    { value: 'general', label: 'General / Other',  years: 4, field: 'General',  branches: ['General'] },
]

export async function getPrograms(req, res) {
    try {
        return res.json(PROGRAMS)
    } catch (e) {
        return res.status(500).json({ error: e.message })
    }
}

export async function getSubjectsForUser(req, res) {
    try {
        const { field } = req.query
        if (!field) return res.status(400).json({ error: 'field query param required' })

        const { data, error } = await supabase
            .from('subjects')
            .select('id, name, slug_prefix')
            .eq('branch', field)

        if (error) return res.status(500).json({ error: error.message })
        return res.json(data || [])
    } catch (e) {
        return res.status(500).json({ error: e.message })
    }
}
