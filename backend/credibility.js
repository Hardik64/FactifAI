// backend/credibility.js
// Source credibility scoring system

const TRUSTED_DOMAINS = {
  // Tier 1 - Highly Trusted (85-100)
  "reuters.com": 97,
  "apnews.com": 96,
  "bbc.com": 95,
  "bbc.co.uk": 95,
  "npr.org": 94,
  "pbs.org": 93,
  "theguardian.com": 91,
  "nytimes.com": 90,
  "washingtonpost.com": 89,
  "economist.com": 92,
  "ft.com": 91,
  "bloomberg.com": 90,
  "wsj.com": 89,
  "nature.com": 98,
  "science.org": 97,
  "who.int": 97,
  "cdc.gov": 96,
  "nih.gov": 96,
  "gov.uk": 94,
  "snopes.com": 88,
  "factcheck.org": 90,
  "politifact.com": 87,
  "fullfact.org": 88,

  // Tier 2 - Generally Reliable (65-84)
  "cnn.com": 75,
  "nbcnews.com": 76,
  "abcnews.go.com": 77,
  "cbsnews.com": 76,
  "foxnews.com": 65,
  "msnbc.com": 68,
  "usatoday.com": 74,
  "thehill.com": 72,
  "axios.com": 80,
  "vox.com": 74,
  "slate.com": 70,
  "theatlantic.com": 78,
  "time.com": 80,
  "newsweek.com": 68,
  "vice.com": 67,
  "buzzfeednews.com": 70,
  "propublica.org": 88,
  "theintercept.com": 70,
  "aljazeera.com": 74,
  "dw.com": 82,
  "france24.com": 81,

  // Tier 3 - Mixed Reliability (40-64)
  "nypost.com": 52,
  "dailymail.co.uk": 45,
  "mirror.co.uk": 50,
  "thesun.co.uk": 44,
  "breitbart.com": 30,
  "infowars.com": 5,
  "naturalnews.com": 8,
  "beforeitsnews.com": 5,
  "worldnewsdailyreport.com": 3,
  "theonion.com": 0, // satire
};

const SUSPICIOUS_TLD_PATTERNS = [
  ".com.co", ".news.co", "-news.com", "breaking-", "alert-",
  "truth-", "realtruth", "uncensored", "exposed", "shocking"
];

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function scoreSource(url) {
  if (!url || !url.startsWith("http")) {
    return {
      score: null,
      label: "No URL",
      domain: null,
      tier: "unknown",
      color: "gray",
    };
  }

  const domain = extractDomain(url);
  if (!domain) {
    return { score: null, label: "Invalid URL", domain: null, tier: "unknown", color: "gray" };
  }

  // Check exact match
  if (TRUSTED_DOMAINS[domain] !== undefined) {
    const score = TRUSTED_DOMAINS[domain];
    return {
      score,
      domain,
      label: getLabel(score),
      tier: getTier(score),
      color: getColor(score),
    };
  }

  // Check for suspicious patterns
  const hasSuspiciousPattern = SUSPICIOUS_TLD_PATTERNS.some(
    (pattern) => domain.includes(pattern) || url.includes(pattern)
  );

  if (hasSuspiciousPattern) {
    return {
      score: 15,
      domain,
      label: "Suspicious Domain",
      tier: "suspicious",
      color: "red",
    };
  }

  // Check if it's a government or educational domain
  if (domain.endsWith(".gov") || domain.endsWith(".edu")) {
    return { score: 85, domain, label: "Government/Academic", tier: "trusted", color: "green" };
  }

  // Unknown domain - neutral score
  return {
    score: 40,
    domain,
    label: "Unknown Source",
    tier: "unknown",
    color: "yellow",
  };
}

function getLabel(score) {
  if (score >= 85) return "Highly Credible";
  if (score >= 70) return "Generally Reliable";
  if (score >= 50) return "Mixed Reliability";
  if (score >= 25) return "Low Credibility";
  return "Not Credible";
}

function getTier(score) {
  if (score >= 85) return "trusted";
  if (score >= 65) return "reliable";
  if (score >= 40) return "mixed";
  return "suspicious";
}

function getColor(score) {
  if (score >= 85) return "green";
  if (score >= 65) return "blue";
  if (score >= 40) return "yellow";
  return "red";
}

module.exports = { scoreSource, extractDomain };
