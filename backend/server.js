// backend/server.js
// FactifAI Backend - Express API Server

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { analyzeContent, validateInputText } = require("./analyzer");
const { scoreSource } = require("./credibility");
const { scrapeArticle, isUrl, extractUrlFromText } = require("./scraper");
const chatRoutes = require("./routes/chats");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
app.use(express.json({ limit: "2mb" }));

// ── Chat History Routes ──────────────────────────────────────────────────────
app.use("/api/chats", chatRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "FactifAI API", version: "1.2.0" });
});

// ── POST /analyze ─────────────────────────────────────────────────────────────
app.post("/analyze", async (req, res) => {
  const startTime = Date.now();

  // Always send proper JSON, even on errors
  const sendError = (status, message) => {
    res.status(status).json({ error: message });
  };

  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return sendError(400, "Please provide at least 10 characters of content to analyze.");
    }

    const trimmed = text.trim();
    let contentToAnalyze = trimmed;
    let sourceUrl = null;
    let scrapedMeta = null;

    // ── Pre-Step: Gibberish Validation ────────────────────────────────────────
    if (!isUrl(trimmed) && !extractUrlFromText(trimmed)) {
      const isValid = validateInputText(trimmed);
      if (!isValid) {
        return sendError(400, "Invalid input. Please provide meaningful text or a URL.");
      }
    }

    // ── Step 1: Input Processing (with timeout protection) ───────────────────
    const scrapeWithTimeout = async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s max
      try {
        return await scrapeArticle(url);
      } finally {
        clearTimeout(timeout);
      }
    };

    if (isUrl(trimmed)) {
      sourceUrl = trimmed;
      console.log(`[FactifAI] Scraping URL: ${sourceUrl}`);
      try {
        scrapedMeta = await scrapeWithTimeout(sourceUrl);
        contentToAnalyze = scrapedMeta.fullText;
      } catch (scrapeErr) {
        console.warn(`[FactifAI] Scrape failed: ${scrapeErr.message}`);
        return sendError(400, "Couldn't extract content from this URL. The site may block automated requests. Please paste the article text directly.");
      }
    } else {
      const embeddedUrl = extractUrlFromText(trimmed);
      if (embeddedUrl) {
        sourceUrl = embeddedUrl;
        console.log(`[FactifAI] Embedded URL found: ${sourceUrl}`);
        try {
          scrapedMeta = await scrapeWithTimeout(sourceUrl);
          contentToAnalyze = `User query: ${trimmed}\n\nScraped article content:\n${scrapedMeta.fullText}`;
        } catch {
          return sendError(400, "Couldn't extract content from the embedded URL. Please paste the article text directly.");
        }
      }
    }

    // ── Post-Scrape Validation ────────────────────────────────────────────────
    if (sourceUrl) {
      const isContentValid = validateInputText(contentToAnalyze.slice(0, 1500));
      if (!isContentValid) {
        return sendError(400, "The URL does not appear to contain a valid news article. Please provide a direct link to an article.");
      }
    }

    // ── Step 2: Source Credibility Scoring ────────────────────────────────────
    const sourceScore = scoreSource(sourceUrl);

    // ── Step 3: AI Analysis (with the multi-key failover engine) ─────────────
    console.log(`[FactifAI] Analyzing content (${contentToAnalyze.length} chars)...`);
    const analysis = await analyzeContent(contentToAnalyze);

    const elapsed = Date.now() - startTime;
    console.log(`[FactifAI] ✔ ${analysis.label} (${analysis.confidence}%) in ${elapsed}ms`);

    // ── Step 4: Build Response ────────────────────────────────────────────────
    const result = {
      label: analysis.label,
      confidence: analysis.confidence,
      headline: analysis.headline || "News Claim",
      summary: analysis.summary || "",
      reasons: analysis.reasons,
      suspiciousPatterns: analysis.suspiciousPatterns || [],
      inputType: analysis.inputType || "text",
      sourceScore: {
        score: sourceScore.score,
        domain: sourceScore.domain,
        label: sourceScore.label,
        tier: sourceScore.tier,
        color: sourceScore.color,
        url: sourceUrl,
      },
      newsArticles: [],
      verification: {
        status: analysis.verification?.status || "Unverified",
        explanation: analysis.verification?.explanation || "Could not verify.",
      },
      meta: {
        analyzedAt: new Date().toISOString(),
        contentLength: contentToAnalyze.length,
        hadUrl: !!sourceUrl,
        scrapedTitle: scrapedMeta?.title || null,
        responseTimeMs: elapsed,
      },
    };

    res.json(result);
  } catch (error) {
    console.error("[FactifAI] Analysis error:", error.message);

    // Map all errors to user-friendly messages — never expose raw errors
    if (error.message?.includes("API key") || error.message?.includes("Invalid API") || error.status === 401) {
      return sendError(500, "Service configuration error. Please contact support.");
    }

    if (error.message?.includes("rate limit") || error.message?.includes("429") || error.message?.includes("quota") || error.status === 429) {
      return sendError(429, "Our AI service is experiencing high demand. Please try again in a few seconds.");
    }

    if (error.message?.includes("All AI providers")) {
      return sendError(503, "Our AI service is temporarily busy. Please try again in a minute.");
    }

    if (error.message?.includes("malformed JSON") || error.message?.includes("Missing required")) {
      return sendError(502, "AI returned an unexpected response. Please try again.");
    }

    // Generic fallback — NEVER expose raw error details
    sendError(500, "Something went wrong. Please try again.");
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
const { initDB } = require("./db");
initDB();

app.listen(PORT, () => {
  const keyCount = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean).length;

  console.log(`\n🔍 FactifAI Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Groq API Keys: ${keyCount} configured`);
  console.log(`⚡ Multi-key failover: ${keyCount > 1 ? "ACTIVE" : "SINGLE KEY (add more for resilience)"}\n`);
});
