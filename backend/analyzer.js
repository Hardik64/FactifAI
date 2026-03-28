// backend/analyzer.js
// AI-powered fake news detection using Groq API

const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(model, params, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (err) {
      if (err.status === 429 || err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("rate limit") || err.message?.includes("retry")) {
        if (i === maxRetries) throw err;
        console.warn(`[Groq API] Rate limited. Retrying in ${3000 * (i + 1)}ms...`);
        await delay(3000 * (i + 1));
      } else {
        throw err;
      }
    }
  }
}

const SYSTEM_PROMPT = `You are FactifAI — an expert fake news detection and claim verification system. You analyze news content with the precision of a professional fact-checker and the depth of an investigative journalist.

Your analysis covers TWO distinct dimensions:

1. DETECTION: Pattern-based classification analyzing linguistic, structural, and logical indicators
2. VERIFICATION: Evidence-based reasoning using your knowledge to assess factual accuracy

You are objective, rigorous, and transparent about uncertainty. Never guess — when uncertain, say "Unverified".`;

const ANALYSIS_PROMPT = (content) => `Analyze the following news content for authenticity and factual accuracy.

INPUT:
"""
${content}
"""
INSTRUCTIONS:
1. If the input is a prompt/question (e.g., "Is this fake: ..."), extract the embedded news claim and analyze that claim.
2. Classify the news as "Fake" or "Real" based on detection signals.
3. Assess confidence from 0-100.
4. Provide EXACTLY 3 specific, concrete reasons for your classification. Each reason should reference specific elements in the text, not generic observations.
5. Identify suspicious linguistic or structural patterns (if any).
6. INDEPENDENTLY verify the core claim using your knowledge:
   - "Likely True": The claim aligns with verified facts and credible reporting you know about
   - "Likely False": The claim contradicts established facts you know about
   - "Unverified": You cannot confirm or deny based on available knowledge

DETECTION SIGNALS TO LOOK FOR:
- Sensationalist headlines / ALL CAPS / excessive punctuation
- Vague or anonymous sourcing ("sources say", "experts believe")
- Emotional manipulation language designed to provoke outrage/fear
- Missing dates, locations, or specific identifiable details
- Internal logical contradictions
- Claims that defy established science or well-documented history
- Misleading use of real quotes out of context
- Domain mimicking (e.g., ABCnews.com.co)

VERIFICATION APPROACH:
- Cross-reference the main factual claims against your knowledge base
- Consider whether the events described align with known timelines
- Assess whether cited people, organizations, statistics are real
- Note if the claim is plausible given its broader context

Respond ONLY with this exact JSON structure, no markdown, no explanation:

{
  "label": "Fake" or "Real",
  "confidence": <integer 0-100>,
  "headline": "<extracted or inferred headline, max 15 words>",
  "summary": "<one sentence summary of the core claim>",
  "reasons": [
    "<specific reason 1 with textual evidence>",
    "<specific reason 2 with textual evidence>",
    "<specific reason 3 with textual evidence>"
  ],
  "suspiciousPatterns": ["<pattern1>", "<pattern2>"],
  "verification": {
    "status": "Likely True" or "Likely False" or "Unverified",
    "explanation": "<2-3 sentences explaining what you know or don't know about this claim>"
  },
  "inputType": "article" or "prompt" or "claim"
}`;

function validateInputText(text) {
  if (!text) return false;
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return false;

  // 1. Fast heuristic for single-word keyboard smashes
  if (words.length === 1 && words[0].length > 10) return false; // e.g. hbhiughoguuciyfg

  // 2. Heuristic for pure keyboard smash / generic error pages
  const lower = text.toLowerCase();
  
  const genericSignatures = [
    "sign in to youtube", "enable javascript", "access denied", 
    "captcha", "404 not found", "are you a human", "please subscribe"
  ];
  
  for (const sig of genericSignatures) {
    if (lower.includes(sig) && words.length < 100) return false; // Generic non-news page
  }

  // 3. Repeated exact words (asdf asdf asdf)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (words.length > 4 && uniqueWords.size === 1) return false;

  return true;
}

async function analyzeContent(text) {
  const params = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ANALYSIS_PROMPT(text) }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    response_format: { type: "json_object" },
  };

  const response = await generateWithRetry(null, params);
  const rawText = response.choices[0]?.message?.content?.trim() || "{}";

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("AI returned malformed JSON. Raw response: " + rawText.slice(0, 300));
  }

  // Validate required fields
  const required = ["label", "confidence", "reasons", "verification"];
  for (const field of required) {
    if (parsed[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Normalize
  parsed.label = parsed.label === "Fake" ? "Fake" : "Real";
  parsed.confidence = Math.max(0, Math.min(100, parseInt(parsed.confidence)));
  parsed.reasons = (parsed.reasons || []).slice(0, 3);
  parsed.suspiciousPatterns = parsed.suspiciousPatterns || [];

  return parsed;
}

module.exports = { analyzeContent, validateInputText };
