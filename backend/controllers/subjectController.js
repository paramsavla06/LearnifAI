import { conceptsData } from '../services/dataLoader.js'

export function getSubjects(req, res) {
    const { branch, year } = req.query

    let subjects = conceptsData.subjects

    // Filter by branch if provided
    if (branch) {
        subjects = subjects.filter(s =>
            s.name.toLowerCase().includes(branch.toLowerCase()) ||
            s.branch.toLowerCase().includes(branch.toLowerCase())
        )
    }

    // Build response: each subject with its concepts filtered by semester year if provided
    const result = subjects.map(subject => {
        let concepts = subject.concepts
        if (year) {
            concepts = concepts.filter(c => c.semester.startsWith(year.toUpperCase()))
        }
        return {
            subject_name: subject.name,
            branch: subject.branch,
            description: subject.description,
            concept_count: concepts.length,
            concepts: concepts.map(c => ({
                slug: c.slug,
                name: c.name,
                difficulty: c.difficulty,
                semester: c.semester,
                library_section: c.library_section,
                shelf: c.shelf
            }))
        }
    }).filter(s => s.concept_count > 0)

    return res.json({ subjects: result, total: result.length })
}
