// src/components/ResultCard.jsx
import {
  ShieldCheck, ShieldX, ShieldQuestion,
  CheckCircle2, XCircle, HelpCircle,
  AlertTriangle, Link, Activity, ChevronRight,
  TrendingUp, Globe, Newspaper, ExternalLink
} from "lucide-react";

const VERIFICATION_CONFIG = {
  "Likely True": {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  "Likely False": {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-500",
  },
  Unverified: {
    icon: HelpCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
};

const SOURCE_COLOR = {
  green: { bar: "bg-emerald-500", text: "text-emerald-500", ring: "ring-emerald-500/20" },
  blue: { bar: "bg-blue-500", text: "text-blue-500", ring: "ring-blue-500/20" },
  yellow: { bar: "bg-amber-500", text: "text-amber-500", ring: "ring-amber-500/20" },
  red: { bar: "bg-red-500", text: "text-red-500", ring: "ring-red-500/20" },
  gray: { bar: "bg-gray-400", text: "text-gray-400", ring: "ring-gray-400/20" },
};

function ConfidenceRing({ value, label }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const isFake = label === "Fake";
  const color = isFake ? "#ef4444" : "#10b981";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="5"
          className="text-gray-200 dark:text-gray-700" fill="none" />
        <circle cx="40" cy="40" r={radius} stroke={color} strokeWidth="5"
          fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono leading-none" style={{ color }}>{value}%</span>
        <span className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>conf.</span>
      </div>
    </div>
  );
}

function SourceMeter({ sourceScore }) {
  if (!sourceScore?.score) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Globe size={14} />
        <span>No URL source detected</span>
      </div>
    );
  }

  const colors = SOURCE_COLOR[sourceScore.color] || SOURCE_COLOR.gray;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <Globe size={13} />
          {sourceScore.domain}
        </span>
        <span className={`font-mono font-semibold text-xs ${colors.text}`}>
          {sourceScore.score}/100
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-1000`}
          style={{ width: `${sourceScore.score}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${colors.text}`}>{sourceScore.label}</span>
        <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{sourceScore.tier}</span>
      </div>
    </div>
  );
}

export default function ResultCard({ result, index }) {
  const isFake = result.label === "Fake";
  const verConfig = VERIFICATION_CONFIG[result.verification?.status] || VERIFICATION_CONFIG.Unverified;
  const VerIcon = verConfig.icon;

  return (
    <div
      className="animate-slide-up space-y-4"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Query echo */}
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-sm text-sm" style={{
          background: "var(--accent)",
          color: "white",
        }}>
          {result._query}
        </div>
      </div>

      {/* Main result */}
      <div className="card p-5 space-y-5 animate-fade-in">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <ConfidenceRing value={result.confidence} label={result.label} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {isFake ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                  <ShieldX size={14} /> FAKE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ShieldCheck size={14} /> REAL
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-md font-mono capitalize"
                style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                {result.inputType}
              </span>
            </div>
            {result.headline && (
              <h3 className="font-display text-base leading-snug" style={{ color: "var(--text-primary)" }}>
                {result.headline}
              </h3>
            )}
            {result.summary && (
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {result.summary}
              </p>
            )}
          </div>
        </div>

        <hr style={{ borderColor: "var(--border)" }} />

        {/* Two-column grid for verification + source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Verification */}
          <div className={`rounded-xl p-4 border ${verConfig.bg} ${verConfig.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <VerIcon size={15} className={verConfig.color} />
              <span className={`text-xs font-bold uppercase tracking-wider ${verConfig.color}`}>
                {result.verification?.status}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {result.verification?.explanation}
            </p>
          </div>

          {/* Source */}
          <div className="rounded-xl p-4 border" style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)"
          }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={13} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Source Credibility
              </span>
            </div>
            <SourceMeter sourceScore={result.sourceScore} />
          </div>
        </div>

        {/* Reasons */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Analysis Breakdown
          </p>
          <div className="space-y-2.5">
            {result.reasons?.map((reason, i) => (
              <div key={i} className="flex gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: "var(--accent)", color: "white" }}>
                  {i + 1}
                </span>
                <span className="leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suspicious patterns (if any) */}
        {result.suspiciousPatterns?.length > 0 && (
          <div className="rounded-lg px-4 py-3 flex flex-wrap gap-2 items-center"
            style={{ background: "var(--bg-secondary)" }}>
            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Patterns detected:</span>
            {result.suspiciousPatterns.map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-md font-mono"
                style={{ background: "var(--border)", color: "var(--text-secondary)" }}>
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Real-time News Context */}
        {result.newsArticles?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Newspaper size={14} style={{ color: "var(--text-muted)" }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Real-Time Context
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.newsArticles.map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-3 rounded-xl border transition-all hover:scale-[1.01]"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border)"
                  }}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                      {article.source?.name || "News Source"}
                    </span>
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <h4 className="text-sm font-semibold mb-1.5 line-clamp-2 leading-snug" style={{ color: "var(--text-primary)" }}>
                    {article.title}
                  </h4>
                  <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {new Date(article.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-right font-mono" style={{ color: "var(--text-muted)" }}>
          Analyzed {new Date(result.meta?.analyzedAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
