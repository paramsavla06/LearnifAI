import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '..', '.env') });

async function generateWithOllama(prompt) {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    
    console.log(`[LLM] Calling Ollama on ${baseUrl} with model ${model}`);
    
    const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false,
            options: {
                // Keep generation long enough for detailed analysis
                num_predict: 800,
                temperature: 0.7
            }
        })
    });
    
    if (!res.ok) {
        throw new Error(`Ollama API error: ${res.statusText}`);
    }
    
    const data = await res.json();
    if (!data.response) throw new Error('Ollama returned empty response');
    
    return data.response.trim();
}

async function generateWithOpenRouter(prompt) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
    
    console.log(`[LLM] Calling OpenRouter`);
    
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

    if (data.error) {
        throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
        throw new Error('OpenRouter returned empty content');
    }
    
    return text.trim();
}

export async function generateAnalysis(prompt) {
    const useLocal = process.env.USE_LOCAL_LLM === 'true';
    
    try {
        if (useLocal) {
            return await generateWithOllama(prompt);
        } else {
            return await generateWithOpenRouter(prompt);
        }
    } catch (error) {
        console.warn(`[WARN] Primary LLM failed (${useLocal ? 'Ollama' : 'OpenRouter'}): ${error.message}`);
        console.log('[INFO] Attempting fallback...');
        
        try {
            // Fallback to the other one
            if (useLocal) {
                return await generateWithOpenRouter(prompt);
            } else {
                return await generateWithOllama(prompt);
            }
        } catch (fallbackError) {
            console.error(`[ERROR] Fallback LLM also failed: ${fallbackError.message}`);
            // If both fail, return a safe string
            return 'Analysis could not be generated at this time due to high server load. Please check back later or review your weak topics below.';
        }
    }
}
