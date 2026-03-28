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
You are an academic diagnostic advisor.

A student has completed multiple levels of diagnostic tests.

Your job is to:
1. Analyze their weaknesses
2. Identify root causes of their mistakes
3. Suggest improvement strategy
4. Recommend what to study next

Input data:
* Subject: ${subjects}
* Weak Topics: ${weakNames}
* Strong Topics: ${strongNames}
* Root Cause Topics: ${rootCauseNames}
* Score: ${score}%

Instructions:
* Clearly explain WHY the student is weak
* Connect weak topics to root causes
* Provide step-by-step learning advice
* Be concise and structured
* Do NOT hallucinate new topics
* Only use provided data

Output format:
Please provide your response in plain text, nicely structured exactly like this:

Analysis:
[Your analysis here]

Root Cause Explanation:
[Your explanation connecting weak topics to root causes here]

Improvement Plan:
[Your step-by-step learning advice here]

Next Topics To Study:
- [Topic 1]
- [Topic 2]
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
                model: 'google/gemini-flash-1.5',
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
