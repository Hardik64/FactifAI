// src/App.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Moon, Sun, Send, Trash2, Scan, Link2, FileText,
  Zap, ChevronDown, RotateCcw
} from "lucide-react";
import ResultCard from "./components/ResultCard";
import LoadingSkeleton from "./components/LoadingSkeleton";
import { analyzeNews } from "./api";

const EXAMPLE_INPUTS = [
  { icon: "🔗", label: "URL", text: "https://www.bbc.com/news/world-us-canada-latest" },
  { icon: "📰", label: "Claim", text: "NASA confirms the moon is made entirely of cheese according to new lunar samples." },
  { icon: "❓", label: "Prompt", text: "Check if this is fake: Scientists discover that drinking coffee reverses aging by 20 years." },
];

function Header({ dark, onToggle }) {
  return (
    <header className="border-b sticky top-0 z-40 backdrop-blur-md"
      style={{ borderColor: "var(--border)", background: "rgba(var(--bg-primary), 0.85)" }}>
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "var(--accent)" }}>
            🔍
          </div>
          <span className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
            Factif<span style={{ color: "var(--accent)" }}>AI</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono hidden sm:block"
            style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            beta
          </span>
        </div>
        <button onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}

function EmptyState({ onExample }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-8 animate-fade-in">
      <div>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          🔍
        </div>
        <h1 className="font-display text-2xl mb-2" style={{ color: "var(--text-primary)" }}>
          Detect. Verify. <span style={{ color: "var(--accent)" }}>Understand.</span>
        </h1>
        <p className="text-sm max-w-xs" style={{ color: "var(--text-secondary)" }}>
          Paste news text, a URL, or just ask — FactifAI analyzes and explains.
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Try an example</p>
        {EXAMPLE_INPUTS.map((ex) => (
          <button key={ex.label} onClick={() => onExample(ex.text)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.01] group"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <span className="text-lg shrink-0">{ex.icon}</span>
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider block mb-0.5"
                style={{ color: "var(--accent)" }}>{ex.label}</span>
              <span className="text-sm truncate block" style={{ color: "var(--text-secondary)" }}>
                {ex.text}
              </span>
            </div>
            <ChevronDown size={14} className="ml-auto shrink-0 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function InputBar({ onSubmit, loading, value, onChange }) {
  const textareaRef = useRef(null);

  const detectType = (text) => {
    if (!text) return null;
    const t = text.trim();
    if (t.startsWith("http")) return { icon: Link2, label: "URL" };
    if (t.toLowerCase().includes("check if") || t.toLowerCase().includes("is this fake")) return { icon: Zap, label: "Prompt" };
    return { icon: FileText, label: "Text" };
  };

  const type = detectType(value);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="border-t py-4" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
      <div className="max-w-2xl mx-auto px-4">
        <div className="card p-3 focus-within:ring-2 transition-all"
          style={{ "--tw-ring-color": "var(--accent)" }}>
          {/* Type indicator */}
          {type && (
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <type.icon size={11} style={{ color: "var(--accent)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                {type.label} detected
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste news text, a URL, or ask: 'Is this fake: ...'"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder-shown:text-base"
            style={{
              color: "var(--text-primary)",
              fontFamily: "'DM Sans', sans-serif",
              minHeight: "56px",
              maxHeight: "200px",
              "::placeholder": { color: "var(--text-muted)" },
            }}
          />

          <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {value.length > 0 ? `${value.length} chars` : "⏎ to send, Shift+⏎ for newline"}
            </span>
            <button
              onClick={onSubmit}
              disabled={loading || !value.trim()}
              className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Scan size={14} />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    const pendingQuery = text;

    try {
      const result = await analyzeNews(text);
      result._query = pendingQuery;
      setMessages((prev) => [...prev, { type: "result", data: result }]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleExample = (text) => {
    setInput(text);
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <Header dark={dark} onToggle={() => setDark(!dark)} />

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !loading && (
            <EmptyState onExample={handleExample} />
          )}

          {messages.map((msg, i) =>
            msg.type === "result" ? (
              <ResultCard key={i} result={msg.data} index={i} />
            ) : null
          )}

          {loading && <LoadingSkeleton query={input || "Analyzing..."} />}

          {error && (
            <div className="flex gap-3 items-start p-4 rounded-xl border animate-fade-in"
              style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700">Analysis failed</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex justify-center">
              <button onClick={handleClear}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{ color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <RotateCcw size={11} />
                Clear chat
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
