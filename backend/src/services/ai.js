const { GoogleGenerativeAI } = require('@google/generative-ai');

function buildPrompt(text) {
  return `You are an expert exam setter. Extract multiple-choice questions from the provided content.
Return ONLY valid JSON with this exact shape:
{
  "questions": [
    { "text": string, "options": string[4], "correctOptionIndex": number (0..3) }
  ]
}
Rules:
- If fewer than 4 options, pad remaining options with plausible distractors.
- Ensure correctOptionIndex matches one of the options (0..3).
- Remove any labels like A), B), 1. from option text.
- Do not include explanations.
- Keep JSON under 200KB.

CONTENT START\n${text}\nCONTENT END`;
}

async function extractQuestionsFromTextGemini(text) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);

  // Prefer a known-good default; allow override via env
  const preferred = (process.env.GEMINI_MODEL || '').trim() || 'gemini-1.5-flash-latest';
  const fallbacks = [
    // Try a couple of widely available models in descending preference
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-8b-latest',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ].filter(m => m !== preferred);

  const prompt = buildPrompt(text);

  async function tryModel(modelId) {
    const model = genAI.getGenerativeModel({ model: modelId });
    const res = await model.generateContent(prompt);
    const out = await res.response.text();
    return out;
  }

  let rawOut;
  let lastErr;
  const candidates = [preferred, ...fallbacks];
  for (const m of candidates) {
    try {
      rawOut = await tryModel(m);
      // If we had to switch models, remember for logs
      if (m !== preferred) {
        // eslint-disable-next-line no-console
        console.warn(`[AI] Fallback model used: ${m}`);
      }
      break;
    } catch (e) {
      lastErr = e;
      // If it looks like a 404 Not Found for model id or unsupported method, keep trying
      const msg = (e && e.message) ? String(e.message) : '';
      if (e && (e.status === 404 || /not\s*found|unsupported/i.test(msg))) {
        continue; // try next candidate
      }
      // Other errors (auth/quota/network) – stop early
      break;
    }
  }

  if (!rawOut) {
    const detail = lastErr && (lastErr.status || lastErr.statusText || lastErr.message) ? `: ${lastErr.status || ''} ${lastErr.statusText || lastErr.message}` : '';
    throw new Error(`Gemini generateContent failed${detail}`.trim());
  }

  // Strip fences like ```json ... ``` or ``` ... ```
  const cleaned = String(rawOut)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let json = null;
  try {
    json = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('AI returned non-JSON output');
  }
  if (!json || !Array.isArray(json.questions)) throw new Error('AI output missing questions');

  // Normalize
  const normalized = json.questions
    .filter(q => q && q.text && Array.isArray(q.options) && q.options.length > 0)
    .map(q => {
      const opts = q.options.slice(0, 4).map(o => String(o).trim()).filter(Boolean);
      while (opts.length < 4) opts.push('Option');
      let idx = Number.isInteger(q.correctOptionIndex) ? q.correctOptionIndex : 0;
      if (idx < 0 || idx > 3) idx = 0;
      return { text: String(q.text).trim(), options: opts, correctOptionIndex: idx };
    });
  return normalized;
}

module.exports = { extractQuestionsFromTextGemini };
