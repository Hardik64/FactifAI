// src/App.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Moon, Sun, Scan, Link2, FileText,
  Zap, ChevronDown, RotateCcw, Menu, Mic
} from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import 'regenerator-runtime/runtime';
import ResultCard from "./components/ResultCard";
import LoadingSkeleton from "./components/LoadingSkeleton";
import Sidebar from "./components/Sidebar";
import { analyzeNews, fetchChats, createChat, fetchChat, addMessage, deleteChat, renameChat } from "./api";

const EXAMPLE_INPUTS = [
  { icon: "🔗", label: "URL", text: "https://www.bbc.com/news/world-us-canada-latest" },
  { icon: "📰", label: "Claim", text: "NASA confirms the moon is made entirely of cheese according to new lunar samples." },
  { icon: "❓", label: "Prompt", text: "Check if this is fake: Scientists discover that drinking coffee reverses aging by 20 years." },
];

function Header({ dark, onToggle, onToggleSidebar }) {
  return (
    <header className="border-b sticky top-0 z-40 backdrop-blur-md"
      style={{ borderColor: "var(--border)", background: "rgba(var(--bg-primary), 0.85)" }}>
      <div className="w-full mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={onToggleSidebar} className="p-1.5 -ml-1.5 rounded-lg transition-colors md:hidden" style={{ color: "var(--text-secondary)" }}>
            <Menu size={18} />
          </button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "var(--accent)" }}>
            🔍
          </div>
          <span className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
            Factif<span style={{ color: "var(--accent)" }}>AI</span>
          </span>
          {/* <span className="text-xs px-2 py-0.5 rounded-full font-mono hidden sm:block"
            style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            beta
          </span> */}
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

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const prevTextRef = useRef("");
  const silenceTimerRef = useRef(null);

  // Sync transcript directly to the input box while listening
  useEffect(() => {
    if (listening) {
      const prefix = prevTextRef.current ? prevTextRef.current + (prevTextRef.current.endsWith(" ") ? "" : " ") : "";
      onChange(prefix + transcript);

      // Reset the silence auto-stop timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      silenceTimerRef.current = setTimeout(() => {
        SpeechRecognition.stopListening();
      }, 3000); // 3 seconds of silence
    } else {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, listening]);

  const toggleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      prevTextRef.current = value;
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    }
  };

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
    <div className="w-full relative z-30" style={{ background: "var(--bg-primary)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-3xl mx-auto p-4 md:py-5">
        <div className="relative card overflow-hidden focus-within:ring-2 focus-within:ring-[var(--accent)] transition-all flex flex-col shadow-md"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          {type && (
            <div className="flex items-center gap-1.5 px-3 pt-3">
              <type.icon size={11} style={{ color: "var(--accent)" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
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
            rows={1}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder-shown:text-base px-4 py-3"
            style={{
              color: "var(--text-primary)",
              minHeight: type ? "40px" : "48px",
              maxHeight: "200px",
              "::placeholder": { color: "var(--text-muted)" },
            }}
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <span className="text-[11px] font-mono px-1 flex-1" style={{ color: "var(--text-muted)" }}>
              {listening ? "Listening..." : (value.length > 0 ? `${value.length} chars` : "⏎ to send, Shift+⏎ for newline")}
            </span>

            <div className="flex items-center gap-2">
              {browserSupportsSpeechRecognition && (
                <button
                  onClick={toggleListen}
                  className={`p-2 rounded-full transition-colors ${listening ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-sm' : 'hover:bg-[var(--bg-secondary)]'}`}
                  style={{ color: listening ? "" : "var(--text-muted)" }}
                  title={listening ? "Stop recording (esc to stop)" : "Dictate text"}
                >
                  <Mic size={15} className={listening ? "animate-pulse" : ""} />
                </button>
              )}

              <button
                onClick={onSubmit}
                disabled={loading || !value.trim()}
                className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3 shadow-sm"
                style={{ borderRadius: "8px" }}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    <Scan size={13} />
                    Analyze
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Subtle footer credit area beneath the input */}
        <div className="text-center mt-3">
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            FactifAI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== null ? saved === "dark" : true;
  });
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Chat History State
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load chat list on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const data = await fetchChats();
      if (data) setChats(data);
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load active chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const loadCurrentChat = async () => {
      try {
        const data = await fetchChat(activeChatId);
        if (data && data.messages) {
          const mapped = [];
          let lastQuery = "";
          data.messages.forEach(m => {
            if (m.type === "query") {
              lastQuery = m.query;
            } else if (m.type === "result") {
              mapped.push({ type: "result", data: { ...m.data, _query: lastQuery } });
            }
          });
          setMessages(mapped);
        }
      } catch (err) {
        console.error("Failed to load chat:", err);
        setError("Could not load chat history.");
      }
    };

    loadCurrentChat();
    if (window.innerWidth < 768) setSidebarOpen(false); // auto-close on mobile
  }, [activeChatId]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setError(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setError(null);
  };

  const handleDeleteChat = async (id) => {
    try {
      await deleteChat(id);
      if (activeChatId === id) handleNewChat();
      await loadChats();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleRenameChat = async (id, title) => {
    try {
      await renameChat(id, title);
      await loadChats();
    } catch (err) {
      console.error("Failed to rename", err);
    }
  };

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    const pendingQuery = text;

    try {
      let result;
      try {
        result = await analyzeNews(text);
      } catch (firstErr) {
        const isTransient = firstErr.message?.match(/try again|high demand|server error|busy|wait/i);
        if (isTransient) {
          console.log("[FactifAI] Transient error, retrying in 2s...");
          await new Promise((r) => setTimeout(r, 2000));
          result = await analyzeNews(text);
        } else {
          throw firstErr;
        }
      }

      result._query = pendingQuery;

      let currentChatId = activeChatId;

      if (!currentChatId) {
        try {
          const newChat = await createChat();
          if (newChat) currentChatId = newChat._id;
        } catch (e) {
          console.error("Failed to create chat in DB, continuing transiently");
        }
      }

      setMessages((prev) => [...prev, { type: "result", data: result }]);

      if (currentChatId) {
        try {
          await addMessage(currentChatId, pendingQuery, result);
          await loadChats();
          if (activeChatId !== currentChatId) setActiveChatId(currentChatId);
        } catch (e) {
          console.error("Failed to save message to DB");
        }
      }

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeChatId]);

  const handleExample = (text) => {
    setInput(text);
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar Layout Layer */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header dark={dark} onToggle={() => setDark(!dark)} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 min-h-full pb-8">
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
              <div className="flex gap-3 items-start p-4 rounded-xl border animate-fade-in shadow-sm"
                style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                <span className="text-red-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-700">Analysis failed</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {!activeChatId && messages.length > 0 && !loading && (
               <div className="flex justify-center mt-6">
                 <button onClick={handleClear}
                   className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                   style={{ color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                   <RotateCcw size={11} />
                   Clear chat
                 </button>
               </div>
            )}

            <div ref={bottomRef} className="h-4" />
          </div>
        </main>

        <InputBar
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  );
}
