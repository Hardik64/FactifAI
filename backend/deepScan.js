// backend/deepScan.js
// Deep Scan: segment-level analysis using raw Groq fetch calls

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Match .env / analyzer.js — not GROQ_API_KEY_1 (that name is not used in this project)
const groqKeys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean);

console.log(`[DeepScan] Loaded ${groqKeys.length} Groq API key(s)`);
if (groqKeys.length === 0) {
  console.error("[DeepScan] FATAL: No Groq API keys found in environment.");
  console.error(
    "[DeepScan] Make sure GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3 are set in backend/.env"
  );
}

// llama3-8b-8192 is decommissioned on Groq (HTTP 400) — align with working analyzer models
const SEGMENT_MODEL =
  process.env.GROQ_DEEP_SCAN_MODEL || "llama-3.1-8b-instant";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function testGroqConnection(keys) {
  for (let i = 0; i < keys.length; i++) {
    try {
      console.log(`[DeepScan DEBUG] Testing Key ${i + 1}...`);

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keys[i]}`,
        },
        body: JSON.stringify({
          model: SEGMENT_MODEL,
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: 'Reply with exactly this JSON: {"test": "ok"}',
            },
          ],
        }),
      });

      const raw = await response.json();
      console.log(`[DeepScan DEBUG] Key ${i + 1} status:`, response.status);
      console.log(
        `[DeepScan DEBUG] Key ${i + 1} response:`,
        JSON.stringify(raw, null, 2)
      );
    } catch (err) {
      console.error(
        `[DeepScan DEBUG] Key ${i + 1} threw error:`,
        err.message
      );
    }
  }
}

function segmentContent(content) {
  const segments = [];
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  let headlineText = "";
  const titleMatch = content.match(/^Title:\s*(.+)/m);
  if (titleMatch && titleMatch[1].trim().length > 5) {
    headlineText = titleMatch[1].trim();
  } else if (lines.length > 0) {
    headlineText = lines[0];
  }

  if (headlineText && headlineText.length >= 10) {
    segments.push({ id: "headline", text: headlineText });
  }

  const quotes = [];
  const quoteRegex = /"([^"]{20,})"/g;
  let qMatch;
  while ((qMatch = quoteRegex.exec(content)) !== null) {
    quotes.push(qMatch[1]);
  }
  quotes.forEach((q, i) => {
    segments.push({ id: `quote_${i + 1}`, text: q });
  });

  let bodyText = content;
  const contentMatch = content.match(/Content:\s*([\s\S]*)/);
  if (contentMatch) {
    bodyText = contentMatch[1].trim();
  }

  let rawParagraphs = bodyText.split(/\n\n+/).filter((p) => p.trim().length >= 30);

  if (rawParagraphs.length <= 1 && bodyText.length > 100) {
    const sentences = bodyText.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
    rawParagraphs = [];
    let current = "";
    for (const sentence of sentences) {
      current += (current ? " " : "") + sentence;
      if (current.length >= 150 || sentences.indexOf(sentence) === sentences.length - 1) {
        if (current.length >= 30) rawParagraphs.push(current);
        current = "";
      }
    }
  }

  let pIdx = 1;
  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (trimmed.length < 30 || trimmed.length > 600) {
      if (trimmed.length > 600) {
        const mid = Math.floor(trimmed.length / 2);
        const splitPoint = trimmed.indexOf(". ", mid - 50);
        if (splitPoint > 0) {
          const part1 = trimmed.slice(0, splitPoint + 1).trim();
          const part2 = trimmed.slice(splitPoint + 1).trim();
          if (part1.length >= 30) segments.push({ id: `paragraph_${pIdx++}`, text: part1 });
          if (part2.length >= 30) segments.push({ id: `paragraph_${pIdx++}`, text: part2 });
          continue;
        }
      }
      if (trimmed.length < 30) continue;
    }
    if (headlineText && trimmed.startsWith(headlineText.slice(0, 30))) continue;
    if (quotes.some((q) => trimmed === q)) continue;
    segments.push({ id: `paragraph_${pIdx++}`, text: trimmed.slice(0, 600) });
  }

  return segments.slice(0, 12);
}

async function callGroqForSegment(
  segmentId,
  segmentText,
  articleContext,
  articleHeadline,
  mainLabel,
  apiKey,
  keyIndex
) {
  const systemPrompt = `You are a strict news fact-checker. Classify the given news segment as Real, Fake, Misleading, or Unverifiable.

RULES:
- Always classify as Real, Fake, or Misleading if ANY factual claim exists in the segment
- Only use Unverifiable for pure filler with zero factual content
- A low confidence Real or Fake is better than Unverifiable

CLASSIFY AS FAKE if:
- Contains fabricated statistics or impossible claims
- Contradicts widely known scientific or historical facts
- Misattributes quotes or invents sources

CLASSIFY AS MISLEADING if:
- Uses real facts but frames them deceptively
- Omits critical context that changes the meaning
- Uses emotionally loaded language on neutral facts

CLASSIFY AS REAL if:
- Consistent with known facts and events
- Properly attributed to named, known sources
- Neutral factual description with no red flags

CLASSIFY AS UNVERIFIABLE only if:
- Pure filler sentence with zero factual claim
- Example: "The story is developing" — nothing to check

Always include a highlighted_phrase copied EXACTLY from the segment text (max 10 words).

Respond ONLY with valid JSON, nothing else:
{
  "segment_id": "string",
  "label": "Real" or "Fake" or "Misleading" or "Unverifiable",
  "confidence": number between 20 and 100,
  "flag": "authentic" or "suspicious" or "false_claim" or "exaggerated" or "unverifiable" or "opinion_stated_as_fact",
  "reason": "One specific sentence about this segment",
  "highlighted_phrase": "exact copied phrase from segment"
}`;

  const userMessage = `Article headline: ${articleHeadline}
Main article verdict: ${mainLabel}
Article context: ${articleContext.slice(0, 400)}

Analyze this segment (ID: ${segmentId}):
"${segmentText}"`;

  console.log(
    `[DeepScan] Calling Key ${keyIndex + 1} for ${segmentId}` +
      ` (${segmentText.length} chars)`
  );

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SEGMENT_MODEL,
      max_tokens: 300,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  console.log(
    `[DeepScan] Key ${keyIndex + 1} HTTP status:`,
    response.status
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[DeepScan] Key ${keyIndex + 1} error body:`, errorBody);
    throw new Error(`Groq API error: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();

  const rawContent = data?.choices?.[0]?.message?.content;
  console.log(
    `[DeepScan] Key ${keyIndex + 1} raw response for ${segmentId}:`,
    rawContent
  );

  if (!rawContent) {
    console.error(
      `[DeepScan] Empty content in response:`,
      JSON.stringify(data)
    );
    throw new Error("Empty response content from Groq");
  }

  return rawContent;
}

function parseSegmentResponse(rawText, segmentId, segmentText) {
  try {
    let cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error(`No JSON object in response: ${cleaned.slice(0, 100)}`);
    }

    const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonSlice);

    const validLabels = ["Real", "Fake", "Misleading", "Unverifiable"];
    const validFlags = [
      "authentic",
      "suspicious",
      "false_claim",
      "exaggerated",
      "unverifiable",
      "opinion_stated_as_fact",
    ];

    if (!validLabels.includes(parsed.label)) {
      console.warn(
        `[DeepScan] Invalid label "${parsed.label}" for ${segmentId} — inferring from flag`
      );
      if (parsed.flag === "authentic") parsed.label = "Real";
      else if (["false_claim", "exaggerated"].includes(parsed.flag))
        parsed.label = "Fake";
      else if (["suspicious", "opinion_stated_as_fact"].includes(parsed.flag))
        parsed.label = "Misleading";
      else parsed.label = "Unverifiable";
    }

    if (!validFlags.includes(parsed.flag)) {
      if (parsed.label === "Real") parsed.flag = "authentic";
      else if (parsed.label === "Fake") parsed.flag = "false_claim";
      else if (parsed.label === "Misleading") parsed.flag = "suspicious";
      else parsed.flag = "unverifiable";
    }

    const rawConf = parseInt(parsed.confidence, 10);
    parsed.confidence = isNaN(rawConf)
      ? 50
      : Math.max(
          parsed.label === "Unverifiable" ? 0 : 20,
          Math.min(100, rawConf)
        );

    parsed.segment_id = segmentId;

    if (!parsed.reason || parsed.reason.length < 5) {
      parsed.reason = `Classified as ${parsed.label} based on content`;
    }

    if (!parsed.highlighted_phrase || parsed.highlighted_phrase.length < 3) {
      parsed.highlighted_phrase = segmentText.split(" ").slice(0, 7).join(" ");
    }

    return parsed;
  } catch (err) {
    console.error(`[DeepScan] Parse error for ${segmentId}:`, err.message);
    console.error("[DeepScan] Raw text was:", rawText);

    const textLower = (rawText || "").toLowerCase();
    const isFake =
      /fake|false|fabricat|mislead|incorrect|wrong|inaccurate/.test(textLower);
    const isReal =
      /real|authentic|accurate|verif|credible|true/.test(textLower);

    return {
      segment_id: segmentId,
      label: isFake ? "Fake" : isReal ? "Real" : "Misleading",
      confidence: 25,
      flag: isFake ? "false_claim" : "suspicious",
      reason: "Fallback classification — response parse failed",
      highlighted_phrase: segmentText.split(" ").slice(0, 7).join(" "),
    };
  }
}

async function analyzeAllSegments(
  segments,
  keys,
  articleContext,
  articleHeadline,
  mainLabel
) {
  const results = [];
  const batchSize = 3;

  if (!keys.length) {
    console.error("[DeepScan] No API keys — returning fallbacks for all segments");
    return segments.map((segment) => ({
      segment_id: segment.id,
      text: segment.text,
      label: "Unverifiable",
      confidence: 0,
      flag: "unverifiable",
      reason: "Analysis unavailable for this segment",
      highlighted_phrase: "",
    }));
  }

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);

    const batchPromises = batch.map(async (segment, batchIndex) => {
      const globalIndex = i + batchIndex;

      const wordCount = segment.text.trim().split(/\s+/).length;
      if (wordCount < 6) {
        console.log(`[DeepScan] Skipping ${segment.id} — too short`);
        return {
          segment_id: segment.id,
          text: segment.text,
          label: "Unverifiable",
          confidence: 0,
          flag: "unverifiable",
          reason: "Segment too short to analyze",
          highlighted_phrase: "",
        };
      }

      const startKeyIndex = globalIndex % keys.length;

      for (let attempt = 0; attempt < keys.length; attempt++) {
        const keyIndex = (startKeyIndex + attempt) % keys.length;
        const apiKey = keys[keyIndex];

        try {
          const rawResponse = await callGroqForSegment(
            segment.id,
            segment.text,
            articleContext,
            articleHeadline,
            mainLabel,
            apiKey,
            keyIndex
          );

          const parsed = parseSegmentResponse(
            rawResponse,
            segment.id,
            segment.text
          );

          console.log(
            `[DeepScan] ✓ ${segment.id} → ${parsed.label} (${parsed.confidence}%)`
          );

          return { ...parsed, text: segment.text };
        } catch (err) {
          console.error(
            `[DeepScan] ✗ Key ${keyIndex + 1} failed for ${segment.id}:`,
            err.message
          );

          if (attempt === keys.length - 1) {
            console.error(`[DeepScan] All keys failed for ${segment.id}`);
            return {
              segment_id: segment.id,
              text: segment.text,
              label: "Unverifiable",
              confidence: 0,
              flag: "unverifiable",
              reason: "Analysis unavailable for this segment",
              highlighted_phrase: "",
            };
          }

          await delay(300);
        }
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + batchSize < segments.length) {
      console.log(
        `[DeepScan] Batch ${Math.floor(i / batchSize) + 1} complete. Waiting 500ms before next batch...`
      );
      await delay(500);
    }
  }

  return results;
}

function aggregateResults(segmentResults) {
  const total = segmentResults.length;
  const authentic_count = segmentResults.filter((s) => s.label === "Real").length;
  const fake_count = segmentResults.filter((s) => s.label === "Fake").length;
  const misleading_count = segmentResults.filter((s) => s.label === "Misleading").length;
  const unverifiable_count = segmentResults.filter((s) => s.label === "Unverifiable").length;
  const authenticity_ratio = total > 0 ? Math.round((authentic_count / total) * 100) : 0;

  let verdict;
  if (authenticity_ratio >= 70) verdict = "Mostly Authentic";
  else if (authenticity_ratio >= 40) verdict = "Mixed";
  else verdict = "Mostly Fake";

  const suspicious = segmentResults
    .filter((s) => s.label === "Fake" || s.label === "Misleading")
    .sort((a, b) => a.confidence - b.confidence);
  const most_suspicious_segment = suspicious.length > 0 ? suspicious[0].segment_id : null;

  return {
    summary: {
      total_segments: total,
      authentic_count,
      fake_count,
      misleading_count,
      unverifiable_count,
      authenticity_ratio,
      most_suspicious_segment,
      verdict,
    },
    segments: segmentResults,
  };
}

async function runDeepScan(content, mainAnalysisResult) {
  console.log("\n[DeepScan] ═══════════════════════════════════════════");
  console.log("[DeepScan] Starting segment analysis...");
  console.log(`[DeepScan] API keys available: ${groqKeys.length}`);
  console.log(`[DeepScan] Segment model: ${SEGMENT_MODEL}`);
  console.log(
    `[DeepScan] Main article verdict: ${mainAnalysisResult?.label || "Unknown"}`
  );

  await testGroqConnection(groqKeys);

  const segments = segmentContent(content);

  if (segments.length === 0) {
    console.log("[DeepScan] No segments to analyze");
    return {
      summary: {
        total_segments: 0,
        authentic_count: 0,
        fake_count: 0,
        misleading_count: 0,
        unverifiable_count: 0,
        authenticity_ratio: 0,
        most_suspicious_segment: null,
        verdict: "Unverifiable",
      },
      segments: [],
    };
  }

  console.log(`[DeepScan] ${segments.length} segments created:`);
  segments.forEach((s) =>
    console.log(`  → ${s.id}: ${s.text.length} chars — "${s.text.slice(0, 60)}..."`)
  );

  const articleHeadline =
    mainAnalysisResult?.headline || segments[0]?.text || "Unknown";
  const mainLabel = mainAnalysisResult?.label || "Unknown";

  const segmentResults = await analyzeAllSegments(
    segments,
    groqKeys,
    content,
    articleHeadline,
    mainLabel
  );
  const deepScan = aggregateResults(segmentResults);

  console.log(
    `[DeepScan] ✔ Complete: ${deepScan.summary.verdict} (${deepScan.summary.authenticity_ratio}% authentic)`
  );
  console.log("[DeepScan] Breakdown:", {
    real: deepScan.summary.authentic_count,
    fake: deepScan.summary.fake_count,
    misleading: deepScan.summary.misleading_count,
    unverifiable: deepScan.summary.unverifiable_count,
  });
  console.log("[DeepScan] ═══════════════════════════════════════════\n");

  return deepScan;
}

module.exports = { runDeepScan };
