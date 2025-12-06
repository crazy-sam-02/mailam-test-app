const { GoogleGenerativeAI } = require('@google/generative-ai');
// Optional import for OpenAI to avoid hard crash if not installed yet
let OpenAI;
try { OpenAI = require('openai'); } catch (e) { }

// --- generic prompt builder ---
function buildPrompt(text, difficulty = 'Medium', questionType = 'Multiple Choice') {
  return `You are an intelligent quiz parser and generator.

  INPUT CONTEXT:
  The user has provided text that needs to be converted into a structured JSON quiz.
  
  INSTRUCTIONS:
  1. ANALYZE the content:
     - CASE A: Does it contain a list of questions (e.g., "1. What is...?", "Q1...", etc.)?
       -> ACTION: Extract these questions verbatim. Preserve the options/choices if available. Identify the correct answer if marked (e.g. bolded, *, "Ans:", or at the end). If no answer is marked, logically infer the correct answer.
     - CASE B: Is it informational text (articles, notes, chapters)?
       -> ACTION: Generate new ${difficulty} level questions of type "${questionType}" based on this text.

  2. STRICT JSON OUTPUT FORMAT:
  {
    "questions": [
      {
        "text": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctOptionIndex": 0, 
        "answer": "Answer text or keyword", 
        "explanation": "Brief reasoning",
        "type": "multiple-choice" 
      }
    ]
  }

  CONSTRAINT RULES:
  - "correctOptionIndex" must be 0, 1, 2, or 3 for Multiple Choice.
  - For True/False, use options ["True", "False"] and index 0 or 1.
  - For Short Answer, use options [] and correctOptionIndex -1.
  - Remove numbering (1., A)) from the start of question text or options.
  - Ensure the JSON is valid and parsable. Do not include markdown keys (like \`\`\`json).

  CONTENT TO PROCESS:
  ${text.substring(0, 30000)} 
  (Content truncated if too long)
  `;
}

// --- Providers ---

class MockProvider {
  async generate(text, difficulty, type) {
    console.log('[AI] Using MOCK configuration');
    return [
      {
        text: "Sample collected question (Mock Mode)",
        options: ["True", "False"],
        correctOptionIndex: 0,
        type: "true-false",
        explanation: "Mock mode is active. Check AI_PROVIDER in .env."
      }
    ];
  }
}

class GeminiProvider {
  constructor() {
    if (!process.env.GOOGLE_API_KEY) throw new Error('Missing GOOGLE_API_KEY for Gemini Provider');
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    // Prioritize free-tier friendly models
    this.preferred = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.fallbacks = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-001'];
  }

  async generate(text, difficulty, type) {
    const candidates = [this.preferred, ...this.fallbacks];
    const unique = [...new Set(candidates)];
    const prompt = buildPrompt(text, difficulty, type);

    for (const m of unique) {
      if (!m) continue;
      try {
        const model = this.genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const txt = await response.text();
        if (txt) return this.parse(txt);
      } catch (e) {
        console.warn(`[Gemini] Model ${m} failed:`, e.message);
        if (e.message && (e.message.includes('404') || e.message.includes('not found') || e.message.includes('429'))) continue;
        throw e; // Rethrow other errors
      }
    }
    throw new Error('All Gemini models failed. Check Usage/Quota.');
  }

  parse(raw) {
    const cleaned = raw.replace(/```json\s*/i, '').replace(/```\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      const json = JSON.parse(cleaned);
      return json.questions || (Array.isArray(json) ? json : []);
    } catch (e) {
      // fallback array regex
      const match = cleaned.match(/\[.*\]/s);
      if (match) return JSON.parse(match[0]);
      throw new Error('Invalid JSON from AI');
    }
  }
}

class OpenAIProvider {
  constructor(providerName = 'openai') {
    this.providerName = providerName; // 'openai' or 'groq'
    this.apiKey = providerName === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
    this.baseURL = providerName === 'groq' ? 'https://api.groq.com/openai/v1' : undefined;

    if (!this.apiKey) throw new Error(`Missing API Key for ${providerName.toUpperCase()}`);
    if (!OpenAI) throw new Error('openai package not installed. Run npm install openai');

    this.client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });

    // Defaults
    if (providerName === 'groq') {
      this.model = process.env.GROQ_MODEL || 'llama3-70b-8192';
    } else {
      this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }
  }

  async generate(text, difficulty, type) {
    const systemPrompt = "You are a helpful JSON API converting text to quiz questions.";
    const userPrompt = buildPrompt(text, difficulty, type);

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: this.model,
        response_format: { type: "json_object" }, // helpful for OpenAI
        temperature: 0.3,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content returned');

      const json = JSON.parse(content);
      return json.questions || (Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(`[${this.providerName}] Error:`, e.message);
      throw e;
    }
  }
}

// --- Factory ---

async function getProvider() {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (provider === 'mock' || process.env.MOCK_AI === 'true') return new MockProvider();
  if (provider === 'openai') return new OpenAIProvider('openai');
  if (provider === 'groq') return new OpenAIProvider('groq');

  // Default to Gemini
  return new GeminiProvider();
}

async function extractQuestionsFromTextGemini(text, difficulty, questionType) {
  const provider = await getProvider();
  const rawQuestions = await provider.generate(text, difficulty, questionType);
  if (!rawQuestions || rawQuestions.length === 0) throw new Error('No questions generated');

  // Normalization
  return rawQuestions.map(q => {
    let opts = Array.isArray(q.options) ? q.options.map(String) : [];
    let type = q.type || 'multiple-choice';
    // inference check
    if (opts.length === 2 && opts.some(o => o.toLowerCase() === 'true')) type = 'true-false';

    if (type === 'multiple-choice') {
      while (opts.length < 4) opts.push('Option ' + (opts.length + 1));
      opts = opts.slice(0, 4);
    } else if (type === 'true-false') {
      opts = ['True', 'False'];
    }

    let cIdx = Number(q.correctOptionIndex);
    if (isNaN(cIdx)) cIdx = 0;
    if (cIdx < 0) cIdx = 0;
    if (cIdx >= opts.length) cIdx = 0;

    return {
      text: q.text || 'Untitled Question',
      options: opts,
      correctOptionIndex: cIdx,
      answer: q.answer || (opts[cIdx] || ''),
      explanation: q.explanation || '',
      type
    };
  });
}

module.exports = { extractQuestionsFromTextGemini };
