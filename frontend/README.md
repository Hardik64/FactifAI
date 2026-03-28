# 🔍 FactifAI — Explainable Fake News Detection & Verification

> AI-powered fake news detection with explainability, source credibility scoring, and claim verification.

---

## 🏗️ Project Structure

```
FactifAI/
├── backend/                    # Node.js + Express API
│   ├── server.js               # Main API server (Express)
│   ├── analyzer.js             # AI analysis via Anthropic Claude
│   ├── credibility.js          # Source credibility scoring
│   ├── scraper.js              # URL article extraction
│   ├── package.json
│   └── .env.example            # Copy to .env and fill in API key
│
├── frontend/                   # React + Tailwind UI
│   ├── src/
│   │   ├── App.jsx             # Main app with chat-style UI
│   │   ├── api.js              # API service layer
│   │   ├── main.jsx            # React entry point
│   │   ├── index.css           # Global styles + design tokens
│   │   └── components/
│   │       ├── ResultCard.jsx  # Full analysis result display
│   │       └── LoadingSkeleton.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md
```

---

## 🚀 Quick Start (18-min setup)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your Anthropic API key
npm run dev
```

Backend runs at: `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## 🔑 API Key

Get your key from: https://console.anthropic.com/

Add to `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

---

## 🧠 How It Works

### Input Types (Auto-detected)
| Input | Detection | Handling |
|-------|-----------|----------|
| `https://...` | URL | Scraped → AI |
| `"Is this fake: ..."` | Prompt | Extracted → AI |
| Long text | Article | Direct → AI |

### Analysis Pipeline
```
User Input
    │
    ├─ URL? → Scrape article text (Cheerio)
    │
    ├─ Source Credibility Score (domain lookup)
    │
    └─ AI Analysis (Claude)
            ├─ Detection (Fake/Real + confidence)
            ├─ 3 Reasons
            ├─ Suspicious Patterns
            └─ Verification (Likely True/False/Unverified)
```

---

## 📡 API Reference

### POST `/analyze`

**Request:**
```json
{
  "text": "News text, URL, or prompt"
}
```

**Response:**
```json
{
  "label": "Fake",
  "confidence": 87,
  "headline": "Extracted headline",
  "summary": "Core claim summary",
  "reasons": ["Reason 1", "Reason 2", "Reason 3"],
  "suspiciousPatterns": ["Sensationalism", "Anonymous sourcing"],
  "sourceScore": {
    "score": 95,
    "domain": "bbc.com",
    "label": "Highly Credible",
    "tier": "trusted",
    "color": "green"
  },
  "verification": {
    "status": "Likely False",
    "explanation": "This claim contradicts..."
  },
  "meta": {
    "analyzedAt": "2024-01-01T12:00:00Z",
    "contentLength": 1200,
    "hadUrl": true
  }
}
```

---

## 🎨 Tech Stack

- **Frontend**: React 18, Tailwind CSS, Vite, Lucide Icons
- **Backend**: Node.js, Express, Cheerio (scraping)
- **AI**: Anthropic Claude (claude-sonnet-4)
- **Fonts**: DM Serif Display + DM Sans (Google Fonts)

---

## ✨ Features

- **Unified input** — URL, raw text, or natural language prompt
- **AI Detection** — Fake/Real with confidence score
- **3 Explainable Reasons** — specific, textual evidence
- **Suspicious Pattern Detection** — linguistic red flags
- **Source Credibility** — 50+ domain database with trust scores
- **Claim Verification** — AI knowledge-based fact assessment
- **Chat-style UI** — persistent session, dark mode
- **URL Scraping** — automatic article extraction

---

## 🏆 Hackathon Notes

- No model training — uses Anthropic API with prompt engineering
- ~18 hours to build
- Strong demo: shows Detection AND Verification as separate layers
- Decision-support framing: explains *why*, not just *what*
