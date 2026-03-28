// backend/analyzer.js
// AI-powered fake news detection using Groq API with multi-key failover

const Groq = require("groq-sdk");

// ── Multi-Key Configuration ─────────────────────────────────────────────────
// Load up to 3 API keys from environment variables
const API_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean); // Remove any undefined/empty keys

if (API_KEYS.length === 0) {
  throw new Error("No Groq API keys configured! Set at least GROQ_API_KEY in .env");
}

// Create a Groq client for each key
const groqClients = API_KEYS.map((key) => new Groq({ apiKey: key }));

// Track which keys are temporarily exhausted (cooldown timestamps)
const keyCooldowns = new Map(); // key index -> cooldown expiry timestamp

// ── Model Fallback Chain (fastest → most capable) ───────────────────────────
const MODEL_CHAIN = [
  "llama-3.3-70b-versatile",     // Primary: best quality
  "llama-3.1-8b-instant",        // Fallback 1: very fast, good enough
  "gemma2-9b-it",                // Fallback 2: alternative model
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Get the next available client (round-robin with cooldown awareness) ─────
let lastUsedIndex = -1;

function getAvailableClientIndex() {
  const now = Date.now();

  // Try round-robin starting from the next index
  for (let attempt = 0; attempt < groqClients.length; attempt++) {
    const idx = (lastUsedIndex + 1 + attempt) % groqClients.length;
    const cooldownExpiry = keyCooldowns.get(idx) || 0;

    if (now >= cooldownExpiry) {
      return idx; // This key is available
    }
  }

  // All keys are on cooldown — find the one that expires soonest
  let soonestIdx = 0;
  let soonestTime = Infinity;
  for (let i = 0; i < groqClients.length; i++) {
    const expiry = keyCooldowns.get(i) || 0;
    if (expiry < soonestTime) {
      soonestTime = expiry;
      soonestIdx = i;
    }
  }
  return soonestIdx;
}

function markKeyAsRateLimited(idx) {
  // Cool down this key for 60 seconds
  keyCooldowns.set(idx, Date.now() + 60000);
  console.warn(`[Groq] Key #${idx + 1} rate-limited, cooldown for 60s`);
}

// ── Core: Execute with full failover across keys AND models ─────────────────
async function executeWithFailover(params) {
  const errors = [];

  // Try each model in the chain
  for (const model of MODEL_CHAIN) {
    // Try each available key for this model
    for (let keyAttempt = 0; keyAttempt < groqClients.length; keyAttempt++) {
      const clientIdx = getAvailableClientIndex();
      const client = groqClients[clientIdx];
      lastUsedIndex = clientIdx;

      // Wait if this key is on cooldown (with a cap)
      const cooldownExpiry = keyCooldowns.get(clientIdx) || 0;
      const waitTime = Math.max(0, cooldownExpiry - Date.now());
      if (waitTime > 0 && waitTime < 5000) {
        console.log(`[Groq] Waiting ${waitTime}ms for key #${clientIdx + 1} cooldown...`);
        await delay(waitTime);
      }

      try {
        const requestParams = { ...params, model };
        console.log(`[Groq] Trying model=${model}, key=#${clientIdx + 1}`);

        const response = await client.chat.completions.create(requestParams);
        
        // Success! Clear any cooldown on this key
        keyCooldowns.delete(clientIdx);
        return response;
      } catch (err) {
        const isRateLimit =
          err.status === 429 ||
          err.message?.includes("429") ||
          err.message?.includes("rate limit") ||
          err.message?.includes("quota") ||
          err.message?.includes("Rate limit") ||
          err.message?.includes("Too Many Requests") ||
          err.message?.includes("resource_exhausted");

        const isModelUnavailable =
          err.status === 503 ||
          err.message?.includes("503") ||
          err.message?.includes("overloaded") ||
          err.message?.includes("unavailable");

        if (isRateLimit) {
          markKeyAsRateLimited(clientIdx);
          errors.push(`Key#${clientIdx + 1}/${model}: rate limited`);
          continue; // Try next key
        }

        if (isModelUnavailable) {
          errors.push(`Key#${clientIdx + 1}/${model}: model unavailable`);
          break; // Skip to next model, this model is down
        }

        // Non-recoverable error (bad key, invalid request, etc.)
        errors.push(`Key#${clientIdx + 1}/${model}: ${err.message}`);

        if (err.status === 401 || err.message?.includes("Invalid API Key")) {
          // Bad key — mark it with a long cooldown so we skip it
          keyCooldowns.set(clientIdx, Date.now() + 300000); // 5 min cooldown
          continue;
        }

        // Unknown error — don't retry same key
        markKeyAsRateLimited(clientIdx);
        continue;
      }
    }
  }

  // All attempts exhausted
  console.error("[Groq] All keys and models exhausted:", errors);
  throw new Error(
    "All AI providers are temporarily busy. Please try again in a minute."
  );
}

// ── Prompts ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are FactifAI — an expert fake news detection and claim verification system. You analyze news content with the precision of a professional fact-checker.

Your analysis covers TWO dimensions:
1. DETECTION: Pattern-based classification analyzing linguistic, structural, and logical indicators
2. VERIFICATION: Evidence-based reasoning using your knowledge to assess factual accuracy

You are objective, rigorous, and transparent about uncertainty. Never guess — when uncertain, say "Unverified".
Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

const ANALYSIS_PROMPT = (content) => `Analyze this news content for authenticity.

INPUT:
"""
${content.slice(0, 3000)}
"""

INSTRUCTIONS:
1. If input is a question (e.g. "Is this fake: ..."), extract the claim and analyze it.
2. Classify as "Fake" or "Real".
3. Confidence 0-100.
4. Give EXACTLY 3 specific reasons referencing text elements.
5. Identify suspicious patterns if any.
6. Verify the core claim:
   - "Likely True": aligns with verified facts
   - "Likely False": contradicts established facts
   - "Unverified": cannot confirm or deny

Respond ONLY with this JSON (no markdown fences):
{
  "label": "Fake" or "Real",
  "confidence": <integer 0-100>,
  "headline": "<max 15 words>",
  "summary": "<one sentence>",
  "reasons": ["<reason1>", "<reason2>", "<reason3>"],
  "suspiciousPatterns": ["<pattern1>"],
  "verification": {
    "status": "Likely True" or "Likely False" or "Unverified",
    "explanation": "<2-3 sentences>"
  },
  "inputType": "article" or "prompt" or "claim"
}`;

// ── Input Validation ────────────────────────────────────────────────────────

function validateInputText(text) {
  if (!text) return false;
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return false;

  // Single-word keyboard smash
  if (words.length === 1 && words[0].length > 10) return false;

  const lower = text.toLowerCase();

  const genericSignatures = [
    "sign in to youtube", "enable javascript", "access denied",
    "captcha", "404 not found", "are you a human", "please subscribe"
  ];

  for (const sig of genericSignatures) {
    if (lower.includes(sig) && words.length < 100) return false;
  }

  // Repeated exact words (asdf asdf asdf)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  if (words.length > 4 && uniqueWords.size === 1) return false;

  return true;
}

// ── Main Analysis Function ──────────────────────────────────────────────────

async function analyzeContent(text) {
  const params = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ANALYSIS_PROMPT(text) },
    ],
    temperature: 0.05,           // Lower = faster + more deterministic
    max_tokens: 600,             // Enough for JSON response, avoids wasted tokens
    response_format: { type: "json_object" },
  };

  const response = await executeWithFailover(params);
  const rawText = response.choices?.[0]?.message?.content?.trim() || "{}";

  // Strip any accidental markdown fences
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to salvage partial JSON
    try {
      // Sometimes the model returns truncated JSON — try to close it
      const salvaged = cleaned + (cleaned.includes('"reasons"') ? "]}}" : "}");
      parsed = JSON.parse(salvaged);
    } catch {
      throw new Error("AI returned malformed JSON. Please try again.");
    }
  }

  // Validate required fields — provide defaults for missing ones
  parsed.label = parsed.label === "Fake" ? "Fake" : "Real";
  parsed.confidence = Math.max(0, Math.min(100, parseInt(parsed.confidence) || 50));
  parsed.headline = parsed.headline || "News Claim Analysis";
  parsed.summary = parsed.summary || "";
  parsed.reasons = (parsed.reasons || ["Analysis completed"]).slice(0, 3);
  parsed.suspiciousPatterns = parsed.suspiciousPatterns || [];
  parsed.verification = parsed.verification || { status: "Unverified", explanation: "Could not independently verify." };
  parsed.inputType = parsed.inputType || "text";

  return parsed;
}

module.exports = { analyzeContent, validateInputText };
