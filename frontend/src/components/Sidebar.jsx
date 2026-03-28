// src/components/Sidebar.jsx
import { useState, useRef, useEffect } from "react";
import {
  Plus, MessageSquare, Trash2, X, Search,
  ChevronLeft, Pencil, Check, Shield, ShieldX,
  Clock, Menu
} from "lucide-react";

const LABEL_BADGE = {
  Fake: { text: "FAKE", className: "sidebar-badge-fake" },
  Real: { text: "REAL", className: "sidebar-badge-real" },
};

function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChatItem({ chat, isActive, onSelect, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [showDelete, setShowDelete] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== chat.title) {
      onRename(chat._id, trimmed);
    }
    setIsEditing(false);
  };

  const badge = chat.lastLabel ? LABEL_BADGE[chat.lastLabel] : null;

  return (
    <div
      className={`sidebar-chat-item ${isActive ? "active" : ""}`}
      onClick={() => !isEditing && onSelect(chat._id)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditTitle(chat.title);
        setIsEditing(true);
      }}
    >
      <div className="sidebar-chat-icon">
        <MessageSquare size={14} />
      </div>

      <div className="sidebar-chat-content">
        {isEditing ? (
          <div className="sidebar-rename-row" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              className="sidebar-rename-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onBlur={handleRename}
              maxLength={100}
            />
            <button className="sidebar-rename-ok" onClick={handleRename}>
              <Check size={12} />
            </button>
          </div>
        ) : (
          <>
            <span className="sidebar-chat-title">{chat.title}</span>
            <div className="sidebar-chat-meta">
              <span className="sidebar-chat-time">
                <Clock size={10} />
                {timeAgo(chat.lastActivity || chat.createdAt)}
              </span>
              {badge && (
                <span className={`sidebar-label-badge ${badge.className}`}>
                  {badge.text}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {showDelete && !isEditing && (
        <button
          className="sidebar-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat._id);
          }}
          title="Delete chat"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  isOpen,
  onToggle,
}) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? chats.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : chats;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onToggle} />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-icon">🔍</span>
            <span className="sidebar-brand-text">
              Factif<span className="sidebar-brand-accent">AI</span>
            </span>
          </div>
          <button className="sidebar-close-btn" onClick={onToggle} title="Close sidebar">
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* New chat button */}
        <div className="sidebar-new-wrap">
          <button className="sidebar-new-btn" onClick={onNewChat}>
            <Plus size={15} />
            <span>New Analysis</span>
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-search-wrap">
          <Search size={13} className="sidebar-search-icon" />
          <input
            className="sidebar-search"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="sidebar-search-clear" onClick={() => setSearch("")}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Chat list */}
        {chats.length > 0 && (
          <div style={{ padding: "12px 16px 4px" }}>
            <span className="text-xs font-bold uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
              Your Analysis
            </span>
          </div>
        )}
        <div className="sidebar-list">
          {filtered.length === 0 ? (
            <div className="sidebar-empty">
              {chats.length === 0
                ? "No analyses yet. Click + New to start!"
                : "No matching chats found"}
            </div>
          ) : (
            filtered.map((chat) => (
              <ChatItem
                key={chat._id}
                chat={chat}
                isActive={chat._id === activeChatId}
                onSelect={onSelectChat}
                onDelete={onDeleteChat}
                onRename={onRenameChat}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <span className="sidebar-footer-text">
            {chats.length} {chats.length === 1 ? "analysis" : "analyses"} saved
          </span>
        </div>
      </aside>
    </>
  );
}
