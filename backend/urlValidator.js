// backend/urlValidator.js
// URL content validation — ensures scraped content is a real news article
// Runs AFTER scraping, BEFORE AI analysis

// ── Rule 5: Social Media Blocklist (checked BEFORE fetching) ─────────────────
const SOCIAL_MEDIA_DOMAINS = [
  "twitter.com", "x.com", "facebook.com", "instagram.com",
  "tiktok.com", "youtube.com", "reddit.com", "linkedin.com",
  "pinterest.com", "threads.net", "snapchat.com",
];

function isSocialMediaUrl(url) {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
    return SOCIAL_MEDIA_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// ── Rule 3: Non-Article Page Patterns (URL path checks) ─────────────────────
const NON_ARTICLE_PATH_PATTERNS = [
  /^\/$/,                  // homepage "/"
  /^\/home\/?$/i,          // /home
  /^\/index(\.\w+)?\/?$/i, // /index or /index.html
  /\/search/i,
  /\/tag\//i,
  /\/category\//i,
  /\/categories\//i,
  /\/topics?\//i,
  /\/author\//i,
  /\/feed\/?$/i,
  /\/rss/i,
  /\/sitemap/i,
];

const BAD_TITLE_PATTERNS = [
  /404/i,
  /page not found/i,
  /access denied/i,
  /subscribe to read/i,
  /sign in/i,
  /log ?in/i,
  /forbidden/i,
];

function detectNonArticlePageType(url, pageTitle) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = parsed.pathname;

    if (/^\/?$/.test(path) || /^\/home\/?$/i.test(path) || /^\/index/i.test(path)) {
      return "homepage";
    }
    if (/\/search/i.test(path)) return "search page";
    if (/\/tag\//i.test(path) || /\/category/i.test(path) || /\/topics?\//i.test(path)) return "category page";
    if (/\/author\//i.test(path)) return "author page";
    if (/\/feed/i.test(path) || /\/rss/i.test(path)) return "feed page";
    if (/\/sitemap/i.test(path)) return "sitemap";
  } catch {}

  // Check page title
  if (pageTitle) {
    for (const pattern of BAD_TITLE_PATTERNS) {
      if (pattern.test(pageTitle)) {
        if (/404|page not found/i.test(pageTitle)) return "404 page";
        if (/access denied|forbidden/i.test(pageTitle)) return "access-denied page";
        if (/subscribe|sign in|log ?in/i.test(pageTitle)) return "login wall";
      }
    }
  }

  return null;
}

// ── Rule 4: Paywall / Bot Block Keywords ─────────────────────────────────────
const PAYWALL_KEYWORDS = [
  "subscribe", "sign in", "sign up", "create account",
  "premium", "members only", "member-only", "paywall",
  "unlock this article", "continue reading", "exclusive content",
  "free trial", "start your free",
];

// ── Main Validation Function ─────────────────────────────────────────────────
function validateUrlContent(url, scrapedResult) {
  const { body, title, description, signals } = scrapedResult;
  const bodyText = body || "";
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // ── Rule 5: Social Media ───────────────────────────────────────────────────
  if (isSocialMediaUrl(url)) {
    return {
      valid: false,
      error: true,
      errorType: "INVALID_URL_CONTENT",
      errorCode: "SOCIAL_MEDIA_URL",
      message: "Social media URLs are not supported for scraping. Please paste the post text directly into the input box.",
      suggestion: "Please paste the article text directly into the input box instead.",
    };
  }

  // ── Rule 3: Non-Article Page Detection ─────────────────────────────────────
  const pageType = detectNonArticlePageType(url, title);
  if (pageType) {
    return {
      valid: false,
      error: true,
      errorType: "INVALID_URL_CONTENT",
      errorCode: "NON_ARTICLE_PAGE",
      message: `This looks like a ${pageType} rather than an article. Please link directly to a specific news article.`,
      suggestion: "Please paste the article text directly into the input box instead.",
    };
  }

  // Check sentence count for non-article pages
  const sentenceCount = (bodyText.match(/[.!?]\s/g) || []).length + (bodyText.endsWith(".") ? 1 : 0);
  if (sentenceCount < 3 && wordCount < 100) {
    return {
      valid: false,
      error: true,
      errorType: "INVALID_URL_CONTENT",
      errorCode: "NON_ARTICLE_PAGE",
      message: "This page contains very little readable content. Please link directly to a specific news article.",
      suggestion: "Please paste the article text directly into the input box instead.",
    };
  }

  // ── Rule 4: Paywall Detection ──────────────────────────────────────────────
  if (wordCount < 100) {
    const lowerBody = bodyText.toLowerCase();
    const hasPaywallSignals = PAYWALL_KEYWORDS.some((kw) => lowerBody.includes(kw));
    if (hasPaywallSignals) {
      return {
        valid: false,
        error: true,
        errorType: "INVALID_URL_CONTENT",
        errorCode: "PAYWALL",
        message: "This article appears to be behind a paywall or login wall. Please paste the article text directly.",
        suggestion: "Please paste the article text directly into the input box instead.",
      };
    }
  }

  // ── Rule 1: Minimum Content Length ─────────────────────────────────────────
  if (wordCount < 150) {
    return {
      valid: false,
      error: true,
      errorType: "INVALID_URL_CONTENT",
      errorCode: "TOO_SHORT",
      message: "Not enough content found at this URL. It may be a homepage, login page, or blocked article.",
      suggestion: "Please paste the article text directly into the input box instead.",
    };
  }

  // ── Rule 2: Article Signal Detection ───────────────────────────────────────
  if (signals) {
    const hasArticleTag = signals.hasArticleTag;
    const hasMeaningfulH1 = signals.h1WordCount > 4;
    const hasRichParagraphs = signals.richParagraphCount >= 3;
    const hasOgArticle = signals.ogType === "article";
    const hasPublishedDate = signals.hasPublishedDate;

    const hasAnySignal =
      hasArticleTag || hasMeaningfulH1 || hasRichParagraphs ||
      hasOgArticle || hasPublishedDate;

    if (!hasAnySignal) {
      return {
        valid: false,
        error: true,
        errorType: "INVALID_URL_CONTENT",
        errorCode: "NO_ARTICLE_SIGNALS",
        message: "This URL does not appear to be a news article. Please paste the article text directly instead.",
        suggestion: "Please paste the article text directly into the input box instead.",
      };
    }
  }

  // ── All checks passed ─────────────────────────────────────────────────────
  return { valid: true };
}

module.exports = { validateUrlContent, isSocialMediaUrl };
