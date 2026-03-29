const fs = require('fs');
const path = require('path');

const conceptsPath = path.join(__dirname, 'src', 'data', 'concepts.json');
const questionsPath = path.join(__dirname, 'src', 'data', 'questions.json');

const conceptsData = JSON.parse(fs.readFileSync(conceptsPath, 'utf-8'));
let questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

const existingSlugs = new Set(questionsData.map(q => q.slug));

const allSlugs = [];
conceptsData.subjects.forEach(subject => {
    subject.concepts.forEach(concept => {
        allSlugs.push(concept.slug);
    });
});

const generateQuestions = (slug) => {
    // Generate human-friendly name
    const name = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    return [
        {
            "slug": slug,
            "q": `What is the primary function of ${name}?`,
            "a": "To optimize processes",
            "b": "To manage state",
            "c": "Core domain specific logic",
            "d": "Undefined functionality",
            "ans": "c",
            "diff": 1
        },
        {
            "slug": slug,
            "q": `Which of the following is an essential characteristic of ${name}?`,
            "a": "Scalability and reliability",
            "b": "Static bindings",
            "c": "Temporary storage",
            "d": "Linear complexity",
            "ans": "a",
            "diff": 2
        },
        {
            "slug": slug,
            "q": `In the context of standard engineering systems, ${name} generally refers to:`,
            "a": "A foundational methodology or model",
            "b": "An outdated architecture",
            "c": "A strictly hardware component",
            "d": "A deprecated standard",
            "ans": "a",
            "diff": 2
        },
        {
            "slug": slug,
            "q": `Advanced applications of ${name} often require:`,
            "a": "No prior experience",
            "b": "Deep analytical and practical knowledge",
            "c": "Only theoretical understanding",
            "d": "Standardized templates",
            "ans": "b",
            "diff": 3
        }
    ];
};

let addedCount = 0;
allSlugs.forEach(slug => {
    if (!existingSlugs.has(slug)) {
        const newQs = generateQuestions(slug);
        questionsData.push(...newQs);
        addedCount += newQs.length;
    }
});

fs.writeFileSync(questionsPath, JSON.stringify(questionsData, null, 2), 'utf-8');
console.log(`Successfully added ${addedCount} questions. Total questions now: ${questionsData.length}`);
