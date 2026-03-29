import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from parent directory
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '..', '.env') });

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.log('[INFO] OPENROUTER_API_KEY not set — narration will use offline fallback.');
} else {
    console.log(`[OK] OpenRouter API Key loaded (ends ...${apiKey.slice(-4)})`);
}

export async function narrateMasteryReport(studentId, subjectSummary, strongConcepts, gaps, rootCauses = [], score = 0) {
    const defaultResponse = buildOfflineFallback(studentId, subjectSummary, strongConcepts, gaps);

    if (!apiKey) return defaultResponse;

    const strongNames = strongConcepts.map(c => c.name).join(', ') || 'None';
    const weakNames = gaps.map(c => c.name).join(', ') || 'None';
    const subjects = Object.keys(subjectSummary).join(', ');
    const rootCauseNames = rootCauses.join(', ') || 'None';

    const prompt = `
You are LearnifAI's Diagnostic Advisor — a master professor who performs ROOT CAUSE ANALYSIS on student knowledge gaps.

A student just completed an adaptive diagnostic test. Your job is to:
1. Identify the EXACT basic/foundational concept the student misunderstood for each weak topic.
2. Explain WHY that foundational concept matters and how it connects to the topic they failed.
3. Recommend specific textbooks and chapters they should study from their university library.
4. Provide a clear, step-by-step remediation plan with priorities.

Student Data:
* Subject(s): ${subjects}
* Weak Topics (failed): ${weakNames}
* Strong Topics (passed): ${strongNames}
* Root Cause Prerequisites: ${rootCauseNames}
* Overall Mastery Score: ${score}%

CRITICAL INSTRUCTIONS:
* For each weak topic, trace back to the EXACT prerequisite concept they likely misunderstand.
  Example: If they failed "Laplace Transforms", the root cause might be "Complex Numbers" or "Integration by Parts".
* Be specific about what textbook chapter/section to read. Use standard engineering textbook references.
* Include the library search terms they should use to find the book.
* Be concise, structured, and highly encouraging.
* Do NOT invent topics outside their stated syllabus.

Output format (plain text, structured):

🔍 Root Cause Diagnosis:
[For each weak topic: "You failed X because your understanding of [foundational concept Y] is weak. Y is the prerequisite because..."]

📚 Books You Need (Library Directions):
[For each weak area:
- Book Title by Author
- Chapter/Section to focus on
- Library search keyword: "keyword"]

🗺️ Step-by-Step Recovery Plan:
1. [First thing to do - most urgent foundational gap]
2. [Second priority]
3. [Third priority]

💡 Key Insight:
[One clear, encouraging sentence about their biggest blind spot and how fixing it will unlock multiple topics]
`;


    try {
        const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
                'X-Title': 'LearnifAI',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.7
            })
        });

        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('OpenRouter API timeout after 20s')), 20000)
        );

        const res = await Promise.race([fetchPromise, timeout]);
        const data = await res.json();

        // Handle specific API errors like payment issues (402)
        if (data.error) {
            console.log(`[WARN] OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
            return defaultResponse;
        }

        const text = data?.choices?.[0]?.message?.content;
        
        if (text && typeof text === 'string' && text.trim().length > 0) {
            return text.trim();
        }
        console.log('[WARN] OpenRouter returned empty text, using offline fallback.');
    } catch (e) {
        console.log(`[WARN] OpenRouter API call failed: ${e.message}`);
    }

    return defaultResponse;
}

function buildOfflineFallback(studentId, subjectSummary, strongConcepts, gaps) {
    const subjectsCount = Object.keys(subjectSummary).length;
    let lines = `Student ${studentId} has been successfully assessed across ${subjectsCount} subjects.\n\n`;

    if (strongConcepts.length > 0) {
        lines += `Strong performance in: ${strongConcepts.map(c => c.name).join(', ')}.\n`;
    } else {
        lines += `No strong mastery areas identified yet.\n`;
    }

    if (gaps.length > 0) {
        lines += `Priority gaps to address: ${gaps.map(c => c.name).join(', ')}.\n`;
    } else {
        lines += `No significant gaps detected — great work!\n`;
    }

    lines += `\nFocus on the weakest areas first, then revisit to reinforce your understanding.`;
    return lines.trim();
}
