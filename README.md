# 🔍 FactifAI — Explainable Fake News Detection & Verification System

> An AI-powered web application that detects fake news, explains its reasoning, scores source credibility, verifies factual claims, and breaks articles apart line by line to show exactly which parts are authentic and which are fabricated.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Deep Scan](#deep-scan)
- [Analysis History](#analysis-history)
- [Screenshots](#screenshots)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

FactifAI is a full-stack web application built for a hackathon that solves a real problem — fake news spreads faster than corrections and most detection tools either give no explanation or require human fact-checkers who cannot scale.

FactifAI gives an instant, explainable verdict on any news content. It accepts a URL, raw article text, or a natural language question like *"Is this news fake?"* and returns a full analysis in seconds — with reasons, source credibility, claim verification, and a segment-by-segment breakdown of the article.

The entire AI backbone runs on **Groq** using Meta's **Llama3** model — giving production-grade inference speed on a free tier.

---

## Features

### Core Analysis
- **Unified input** — paste a URL, raw text, or ask naturally
- **Fake / Real classification** with confidence score (0–100)
- **3 specific reasons** grounded in actual text from the article
- **Suspicious pattern detection** — anonymous sourcing, sensationalism, emotional manipulation
- **Claim verification** — Verified / Likely False / Unverified based on AI knowledge

### Source Credibility
- Domain-based trust scoring (0–100) across 50+ news sources
- Tiered labels — Highly Credible, Generally Reliable, Mixed, Suspicious
- Color-coded visual indicator — green, blue, amber, red

### Deep Scan
- Segment-by-segment analysis of every paragraph, headline, and quote
- Each segment classified as Real, Fake, Misleading, or Unverifiable
- Highlighted phrase showing exactly which words triggered the verdict
- Authentic Content panel and Flagged Content panel for quick review
- Overall verdict — Mostly Authentic, Mixed, or Mostly Fake

### URL Scraping & Validation
- Automatic article text extraction from URLs using Cheerio
- Smart validation that rejects homepages, paywalled articles, social media links, and category pages
- Specific error messages with suggestions when a URL cannot be analyzed

### History & Database
- Every analysis automatically saved to the database
- Persistent chat-style history panel showing all past analyses
- Click any history item to reload the full result instantly — no new API call
- New Analysis button clears the screen without deleting history

### UI
- Chat-style interface with dark and light mode
- Animated confidence ring and color-coded result cards
- Real-time input type detection — URL / Text / Prompt labeled as you type
- Fully responsive design

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | UI component framework |
| Styling | Tailwind CSS | Utility-first styling |
| Build Tool | Vite | Fast frontend bundling |
| Icons | Lucide React | Icon library |
| Backend | Node.js + Express | API server |
| Scraping | Cheerio | Server-side HTML parsing |
| AI Engine | Groq API | LLM inference (Llama3) |
| AI Model | llama3-70b-8192 | Main analysis |
| AI Model | llama3-8b-8192 | Deep scan segments |
| Database | MongoDB / SQLite | Analysis history storage |
| Fonts | DM Sans + DM Serif | Typography |

---

## Project Structure

```
FactifAI/
├── backend/
│   ├── server.js           # Express server, /analyze endpoint
│   ├── analyzer.js         # Main whole-article Groq analysis
│   ├── deepScan.js         # Segmentation + per-segment Groq calls
│   ├── credibility.js      # Domain trust score database
│   ├── scraper.js          # URL fetching and article extraction
│   ├── history.js          # Database read/write for saved analyses
│   ├── package.json
│   └── .env.example        # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app shell, chat UI, routing
│   │   ├── api.js                # API service layer
│   │   ├── main.jsx              # React entry point
│   │   ├── index.css             # Global styles and CSS variables
│   │   └── components/
│   │       ├── ResultCard.jsx        # Main analysis result display
│   │       ├── DeepScanCard.jsx      # Segment breakdown display
│   │       └── LoadingSkeleton.jsx   # Loading state shimmer
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- A free Groq account at [console.groq.com](https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/Hardik64/FactifAI.git
cd FactifAI
```

### 2. Set Up the Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your Groq API keys (see [Environment Variables](#environment-variables)).

```bash
npm run dev
```

Backend runs at `http://localhost:3001`

### 3. Set Up the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

### 4. Open the App

Visit `http://localhost:3000` in your browser and start analyzing.

---

## Environment Variables

Create a `.env` file in the `backend/` directory using `.env.example` as a template.

```env
GROQ_API_KEY_1=gsk_your_first_groq_api_key_here
GROQ_API_KEY_2=gsk_your_second_groq_api_key_here
GROQ_API_KEY_3=gsk_your_third_groq_api_key_here
PORT=3001
```

### Getting Free Groq API Keys

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with Google or GitHub
3. Click **API Keys** in the left sidebar
4. Click **Create API Key** — repeat 3 times for 3 keys
5. Each key starts with `gsk_`

The free tier allows **30 requests per minute per key**. Three keys in round-robin gives an effective limit of 90 requests per minute.

> **Important:** Never commit your `.env` file to GitHub. It is listed in `.gitignore` by default. Only commit `.env.example` which contains placeholder values.

---

## API Reference

### POST `/analyze`

Runs the full analysis pipeline — main analysis + deep scan — and returns a unified response.

**Request:**
```json
{
  "text": "Paste article text, URL, or natural language question here"
}
```

**Response:**
```json
{
  "label": "Fake",
  "confidence": 87,
  "headline": "Extracted article headline",
  "summary": "One sentence summary of the core claim",
  "reasons": [
    "Specific reason 1 referencing actual text",
    "Specific reason 2 referencing actual text",
    "Specific reason 3 referencing actual text"
  ],
  "suspicious_patterns": ["Anonymous sourcing", "Sensationalist headline"],
  "source_analysis": {
    "credibility_score": 95,
    "trust_score": 93,
    "justification": "BBC is a major international public broadcaster with strong editorial standards"
  },
  "verification": {
    "status": "Likely False",
    "explanation": "The described events contradict verified reporting from multiple credible sources"
  },
  "deep_scan": {
    "summary": {
      "total_segments": 12,
      "authentic_count": 3,
      "fake_count": 7,
      "misleading_count": 2,
      "unverifiable_count": 0,
      "authenticity_ratio": 25,
      "most_suspicious_segment": "paragraph_3",
      "verdict": "Mostly Fake"
    },
    "segments": [
      {
        "segment_id": "headline",
        "text": "The article headline text",
        "label": "Fake",
        "confidence": 91,
        "flag": "false_claim",
        "reason": "The headline makes a claim that directly contradicts verified data",
        "highlighted_phrase": "exact phrase from the headline"
      }
    ]
  },
  "meta": {
    "analyzedAt": "2024-03-29T10:00:00.000Z",
    "contentLength": 2840,
    "hadUrl": true,
    "scrapedTitle": "Original article title from the page"
  }
}
```

### GET `/history`

Returns all saved analyses ordered newest first.

### POST `/history/save`

Saves a completed analysis to the database. Called automatically by the frontend.

### GET `/health`

Health check endpoint. Returns `{ "status": "ok" }`.

---

## How It Works

### Input Detection

The frontend detects input type in real time as the user types — no API call needed:

| Input Type | Detection Rule | Handling |
|---|---|---|
| URL | Starts with `http://` or `https://` | Scraped → validated → analyzed |
| Prompt | Contains "is this fake", "check if", etc. | AI extracts embedded claim |
| Text | Everything else | Sent directly to AI |

### Analysis Pipeline

```
User Input
    │
    ├── URL? → Scraper (Cheerio) → Validation Gate
    │              │
    │         ┌────┴────┐
    │       Pass      Fail → Error message to user
    │         │
    ├── Source Credibility Score (domain database lookup)
    │
    └── Groq API (Main Analysis)
              │
              ├── Label: Fake / Real
              ├── Confidence: 0-100
              ├── 3 Reasons
              ├── Suspicious Patterns
              └── Verification: Verified / Likely False / Unverified
                        │
                   Deep Scan
                        │
              ├── Segmentation (headline + paragraphs + quotes)
              ├── Per-segment Groq calls (round-robin across 3 keys)
              └── Aggregation → Mostly Authentic / Mixed / Mostly Fake
                        │
                   Merge & Return
                        │
              Single unified JSON response
                        │
              Frontend renders ResultCard + DeepScanCard
```

### Three API Keys — Round Robin

```
Segment 1 → Key 1
Segment 2 → Key 2
Segment 3 → Key 3
Segment 4 → Key 1  ← cycle repeats
Segment 5 → Key 2
...
```

If a key fails, the system automatically tries the next key before marking a segment as unavailable.

---

## Deep Scan

Deep Scan breaks the article into logical segments and analyzes each one individually using a separate Groq API call per segment.

### Segment Types

| ID Format | Content |
|---|---|
| `headline` | The article title or first h1 |
| `paragraph_1`, `paragraph_2` ... | Body paragraphs (1-4 sentences each) |
| `quote_1`, `quote_2` ... | Quoted text longer than 20 characters |

### Segment Labels

| Label | Meaning |
|---|---|
| **Real** | Consistent with known facts |
| **Fake** | Directly contradicts known facts |
| **Misleading** | Real facts framed deceptively |
| **Unverifiable** | No factual claim to evaluate |

### Segment Flags

| Flag | Meaning |
|---|---|
| `authentic` | No red flags detected |
| `suspicious` | Vague sourcing, anonymous claims |
| `false_claim` | Direct false statement |
| `exaggerated` | Real event but scale or numbers inflated |
| `opinion_stated_as_fact` | Subjective claim with no evidence |
| `unverifiable` | Pure filler, nothing to fact-check |

### Verdict Thresholds

| Authenticity Ratio | Verdict |
|---|---|
| 70% or above | Mostly Authentic |
| 40% to 69% | Mixed |
| Below 40% | Mostly Fake |

---

## Analysis History

Every completed analysis is automatically saved. The history panel shows all past analyses with their label, confidence score, headline, and timestamp.

- Clicking a history item loads the full result from the database — no new API call
- The New Analysis button clears the screen only — history is never deleted
- If the database is unavailable the analysis still works — results just are not saved

---

## Limitations

- **Paywall articles** — sites that require login or subscription cannot be fully scraped. Paste the article text directly as a workaround
- **Social media URLs** — Twitter, Instagram, Facebook, Reddit and similar platforms are not supported for scraping due to API restrictions. Paste the post text directly
- **Very recent events** — the AI's knowledge has a training cutoff. Claims about events after that cutoff may return Unverified even if true
- **Groq free tier** — 30 requests per minute per key. Three keys give 90 requests per minute which handles concurrent users comfortably for a demo but has limits under heavy load
- **Language** — the domain credibility database currently covers English-language sources only. Analysis works in other languages but source scoring defaults to Unknown for non-English domains

---

## Roadmap

- [ ] Browser extension for one-click analysis on any webpage
- [ ] Real-time web search integration for verifying current events
- [ ] Multilingual domain database covering regional Indian news sources
- [ ] User feedback mechanism to flag incorrect verdicts
- [ ] Redis caching for recently analyzed URLs
- [ ] Export analysis results as PDF report
- [ ] API rate limit dashboard showing key usage in real time

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature-name`
3. Commit your changes — `git commit -m "Add your feature"`
4. Push to the branch — `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## Built With

This project was built as a hackathon project in 18 hours by:

- **Hardik** — [github.com/Hardik64](https://github.com/Hardik64)

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.

---

<div align="center">
  <p>Built for a hackathon · Powered by Groq + Llama3 · Open Source</p>
  <p>⭐ Star this repo if you found it useful</p>
</div>
