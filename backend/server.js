// backend/server.js
// FactifAI Backend - Express API Server

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { analyzeContent, validateInputText } = require("./analyzer");
const { scoreSource } = require("./credibility");
const { scrapeArticle, isUrl, extractUrlFromText } = require("./scraper");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));
app.use(express.json({ limit: "2mb" }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "FactifAI API", version: "1.0.0" });
});

// ── POST /analyze ─────────────────────────────────────────────────────────────
app.post("/analyze", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length < 10) {
    return res.status(400).json({
      error: "Please provide at least 10 characters of content to analyze.",
    });
  }

  const trimmed = text.trim();

  try {
    let contentToAnalyze = trimmed;
    let sourceUrl = null;
    let scrapedMeta = null;

    // ── Pre-Step: Gibberish Validation ────────────────────────────────────────
    if (!isUrl(trimmed) && !extractUrlFromText(trimmed)) {
      const isValid = validateInputText(trimmed);
      if (!isValid) {
        return res.status(400).json({
          error: "Invalid input detected. Please provide a meaningful text or URL, not raw keyboard mashing.",
        });
      }
    }

    // ── Step 1: Input Processing ──────────────────────────────────────────────
    if (isUrl(trimmed)) {
      // Direct URL input
      sourceUrl = trimmed;
      console.log(`[FactifAI] Scraping URL: ${sourceUrl}`);
      try {
        scrapedMeta = await scrapeArticle(sourceUrl);
        contentToAnalyze = scrapedMeta.fullText;
      } catch (scrapeErr) {
        console.warn(`[FactifAI] Scrape failed: ${scrapeErr.message}`);
        // Fallback: send URL itself for AI to handle
        contentToAnalyze = `[Could not scrape article. URL: ${sourceUrl}]\nPlease analyze based on the URL domain and any available context.`;
      }
    } else {
      // Check if text contains embedded URL
      const embeddedUrl = extractUrlFromText(trimmed);
      if (embeddedUrl) {
        sourceUrl = embeddedUrl;
        console.log(`[FactifAI] Embedded URL found: ${sourceUrl}`);
        try {
          scrapedMeta = await scrapeArticle(sourceUrl);
          contentToAnalyze = `User query: ${trimmed}\n\nScraped article content:\n${scrapedMeta.fullText}`;
        } catch {
          // Use original text if scraping fails
          contentToAnalyze = trimmed;
        }
      }
    }

    // ── Post-Scrape Validation ────────────────────────────────────────────────
    if (sourceUrl) {
      // Validate the scraped content to ensure it's not a generic video page or landing screen
      const isContentValid = validateInputText(contentToAnalyze.slice(0, 1500));
      if (!isContentValid) {
        return res.status(400).json({
          error: "The provided URL does not appear to contain a valid news article or textual claim. Please provide a direct link to an article.",
        });
      }
    }

    // ── Step 2: Source Credibility Scoring ────────────────────────────────────
    const sourceScore = scoreSource(sourceUrl);

    // ── Step 3: AI Analysis ───────────────────────────────────────────────────
    console.log(`[FactifAI] Analyzing content (${contentToAnalyze.length} chars)...`);
    const analysis = await analyzeContent(contentToAnalyze);

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
        status: analysis.verification.status,
        explanation: analysis.verification.explanation,
      },
      meta: {
        analyzedAt: new Date().toISOString(),
        contentLength: contentToAnalyze.length,
        hadUrl: !!sourceUrl,
        scrapedTitle: scrapedMeta?.title || null,
      },
    };

    console.log(`[FactifAI] Result: ${result.label} (${result.confidence}% confidence)`);
    res.json(result);
  } catch (error) {
    console.error("[FactifAI] Analysis error:", error.message);

    // Differentiate error types for better UX
    if (error.message?.includes("API key") || error.status === 401) {
      return res.status(500).json({ error: "API configuration error. Check your API key." });
    }
    if (error.message?.includes("rate limit") || error.status === 429) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }

    res.status(500).json({
      error: "Analysis failed: " + (error.message || "Unknown error"),
    });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔍 FactifAI Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Groq Key: ${process.env.GROQ_API_KEY ? "✓ Set" : "✗ MISSING!"}\n`);
});
