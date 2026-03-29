// src/components/DeepScanCard.jsx
import {
  ShieldCheck, ShieldX, ShieldAlert, HelpCircle,
  Layers, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

const LABEL_STYLES = {
  Real:         { border: "#10b981", bg: "rgba(16, 185, 129, 0.08)", text: "#10b981", icon: CheckCircle2 },
  Fake:         { border: "#ef4444", bg: "rgba(239, 68, 68, 0.08)",  text: "#ef4444", icon: XCircle },
  Misleading:   { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", text: "#f59e0b", icon: AlertTriangle },
  Unverifiable: { border: "#9ca3af", bg: "rgba(156, 163, 175, 0.08)", text: "#9ca3af", icon: HelpCircle },
};

const FLAG_LABELS = {
  authentic: "Authentic",
  suspicious: "Suspicious",
  false_claim: "False Claim",
  exaggerated: "Exaggerated",
  unverifiable: "Unverifiable",
  opinion_stated_as_fact: "Opinion as Fact",
};

const VERDICT_STYLES = {
  "Mostly Authentic": { bg: "rgba(16, 185, 129, 0.12)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  "Mixed":            { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  "Mostly Fake":      { bg: "rgba(239, 68, 68, 0.12)",  text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

function highlightPhrase(text, phrase) {
  if (!phrase || !text) return text;
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + phrase.length);
  const after = text.slice(idx + phrase.length);
  return (
    <>
      {before}
      <span style={{
        background: "rgba(249, 115, 22, 0.2)",
        borderBottom: "2px solid var(--accent)",
        fontWeight: 600,
        padding: "0 2px",
        borderRadius: "2px",
      }}>
        {match}
      </span>
      {after}
    </>
  );
}

function SegmentBlock({ segment }) {
  const style = LABEL_STYLES[segment.label] || LABEL_STYLES.Unverifiable;
  const Icon = style.icon;

  return (
    <div
      className="rounded-lg p-4 transition-all hover:scale-[1.005]"
      style={{
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        marginBottom: "8px",
      }}
    >
      <div className="flex items-start gap-3">
        <Icon size={15} style={{ color: style.text, marginTop: "2px", flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          {/* Header: ID + badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono"
              style={{ color: "var(--text-muted)" }}>
              {segment.segment_id}
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md"
              style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
              {segment.label}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono"
              style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              {FLAG_LABELS[segment.flag] || segment.flag}
            </span>
            <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--text-muted)" }}>
              {segment.confidence}%
            </span>
          </div>

          {/* Segment text with highlighted phrase */}
          <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-primary)" }}>
            {highlightPhrase(segment.text, segment.highlighted_phrase)}
          </p>

          {/* Reason */}
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {segment.reason}
          </p>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[var(--bg-secondary)] transition-colors rounded-xl"
      >
        <Icon size={14} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs font-bold uppercase tracking-wider flex-1"
          style={{ color: "var(--text-muted)" }}>
          {title}
        </span>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full"
          style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
          {count}
        </span>
        <ChevronDown
          size={14}
          style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export default function DeepScanCard({ deepScan }) {
  if (!deepScan || !deepScan.segments || deepScan.segments.length === 0) return null;

  const { summary, segments } = deepScan;
  const verdictStyle = VERDICT_STYLES[summary.verdict] || VERDICT_STYLES["Mixed"];

  const authenticSegments = segments.filter((s) => s.label === "Real");
  const flaggedSegments = segments.filter((s) => s.label === "Fake" || s.label === "Misleading");

  return (
    <div className="card p-5 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent-glow)" }}>
          <Layers size={16} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h3 className="font-display text-base" style={{ color: "var(--text-primary)" }}>
            Deep Scan Analysis
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Segment-by-segment authenticity breakdown
          </p>
        </div>
      </div>

      <hr style={{ borderColor: "var(--border)" }} />

      {/* SECTION 1: Summary Bar */}
      <div className="space-y-4">
        {/* Verdict + Stats Row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold px-3 py-1.5 rounded-lg"
            style={{ background: verdictStyle.bg, color: verdictStyle.text, border: `1px solid ${verdictStyle.border}` }}>
            {summary.verdict}
          </span>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1" style={{ color: "#10b981" }}>
              <CheckCircle2 size={12} /> {summary.authentic_count} Authentic
            </span>
            <span className="flex items-center gap-1" style={{ color: "#ef4444" }}>
              <XCircle size={12} /> {summary.fake_count} Fake
            </span>
            <span className="flex items-center gap-1" style={{ color: "#f59e0b" }}>
              <AlertTriangle size={12} /> {summary.misleading_count} Misleading
            </span>
            {summary.unverifiable_count > 0 && (
              <span className="flex items-center gap-1" style={{ color: "#9ca3af" }}>
                <HelpCircle size={12} /> {summary.unverifiable_count}
              </span>
            )}
          </div>
        </div>

        {/* Authenticity progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Authenticity Ratio
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: verdictStyle.text }}>
              {summary.authenticity_ratio}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${summary.authenticity_ratio}%`,
                background: summary.authenticity_ratio >= 70 ? "#10b981" :
                             summary.authenticity_ratio >= 40 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
          <p className="text-[10px] mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
            {summary.total_segments} segments analyzed
          </p>
        </div>
      </div>

      <hr style={{ borderColor: "var(--border)" }} />

      {/* SECTION 2: Full Segment Breakdown */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}>
          Segment Breakdown
        </p>
        <div className="space-y-2">
          {segments.map((seg) => (
            <SegmentBlock key={seg.segment_id} segment={seg} />
          ))}
        </div>
      </div>

      {/* SECTION 3: Authentic Content (collapsible) */}
      <CollapsibleSection
        title="Authentic Content"
        icon={ShieldCheck}
        count={authenticSegments.length}
        defaultOpen={false}
      >
        {authenticSegments.map((seg) => (
          <div key={seg.segment_id} className="mb-3 last:mb-0">
            <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
              {seg.text}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {seg.reason}
            </p>
          </div>
        ))}
      </CollapsibleSection>

      {/* SECTION 4: Flagged Content (collapsible) */}
      <CollapsibleSection
        title="Flagged Content"
        icon={ShieldAlert}
        count={flaggedSegments.length}
        defaultOpen={flaggedSegments.length > 0}
      >
        {flaggedSegments.map((seg) => {
          const style = LABEL_STYLES[seg.label];
          return (
            <div key={seg.segment_id} className="mb-3 last:mb-0 rounded-lg p-3"
              style={{ background: style.bg, borderLeft: `3px solid ${style.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                  style={{ color: style.text, background: "rgba(0,0,0,0.05)", border: `1px solid ${style.border}` }}>
                  {seg.label}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  {FLAG_LABELS[seg.flag]}
                </span>
              </div>
              <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                {seg.text}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {seg.reason}
              </p>
            </div>
          );
        })}
      </CollapsibleSection>
    </div>
  );
}
