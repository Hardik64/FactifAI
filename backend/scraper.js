// backend/scraper.js
// Article text extraction from URLs

const axios = require("axios");
const cheerio = require("cheerio");

const SCRAPER_TIMEOUT = 8000;

async function scrapeArticle(url) {
  let finalUrl = url;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = `https://${finalUrl}`;
  }
  try {
    const response = await axios.get(finalUrl, {
      timeout: SCRAPER_TIMEOUT,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data);

    // Remove noise elements
    $("script, style, nav, footer, header, .ads, .advertisement, .sidebar, .comments, [class*='nav'], [class*='menu'], [id*='nav'], [id*='footer']").remove();

    // Extract title
    const title =
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "";

    // Extract meta description
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    // Extract article body - try common article selectors
    const articleSelectors = [
      "article",
      '[class*="article-body"]',
      '[class*="article-content"]',
      '[class*="story-body"]',
      '[class*="post-content"]',
      '[class*="entry-content"]',
      "main",
      ".content",
    ];

    let bodyText = "";
    for (const selector of articleSelectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 200) {
        bodyText = el.text().trim();
        break;
      }
    }

    // Fallback: grab all paragraphs
    if (!bodyText || bodyText.length < 200) {
      bodyText = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 50)
        .join("\n\n");
    }

    // Clean and truncate
    const cleanBody = bodyText
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 4000); // Limit for API calls

    if (!title && !cleanBody) {
      throw new Error("Could not extract meaningful content from URL");
    }

    return {
      success: true,
      title,
      description,
      body: cleanBody,
      fullText: `Title: ${title}\n\nSummary: ${description}\n\nContent: ${cleanBody}`,
    };
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error(`Cannot reach URL: ${url}`);
    }
    if (error.response?.status === 403 || error.response?.status === 401) {
      throw new Error("Access denied - this site blocks automated requests");
    }
    if (error.response?.status === 404) {
      throw new Error("Article not found (404)");
    }
    throw new Error(`Failed to fetch article: ${error.message}`);
  }
}

function isUrl(input) {
  const trimmed = input.trim();
  const urlRegex = /^(https?:\/\/)?([\w.-]+\.)+[a-z]{2,}(\/.*)?$/i;
  return urlRegex.test(trimmed);
}

function extractUrlFromText(text) {
  const urlRegex = /(https?:\/\/)?([\w.-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
  const urlMatch = text.match(urlRegex);
  return urlMatch ? urlMatch[0] : null;
}

module.exports = { scrapeArticle, isUrl, extractUrlFromText };
