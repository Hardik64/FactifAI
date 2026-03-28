// src/api.js
const API_BASE = import.meta.env.VITE_API_URL || "";

// ── News Analysis ─────────────────────────────────────────────────────────────
export async function analyzeNews(text) {
  let res;
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (networkErr) {
    throw new Error("Cannot reach the server. Please check your connection and try again.");
  }

  let bodyText;
  try {
    bodyText = await res.text();
  } catch {
    throw new Error("Server returned an empty response. Please try again.");
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    if (res.status === 429) {
      throw new Error("High demand — please wait a few seconds and try again.");
    }
    if (res.status >= 500) {
      throw new Error("Server error. Please try again in a moment.");
    }
    throw new Error("Unexpected server response. Please try again.");
  }

  if (!res.ok) {
    throw new Error(data.error || `Server error (${res.status}). Please try again.`);
  }

  if (!data.label || !data.reasons) {
    throw new Error("Incomplete analysis result. Please try again.");
  }

  return data;
}

// ── Chat History CRUD ─────────────────────────────────────────────────────────

async function chatFetch(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    return res.json();
  } catch (err) {
    if (err.message?.includes("Request failed")) throw err;
    // Network error — silently fail for chat operations (non-critical)
    console.warn("[Chat API]", err.message);
    return null;
  }
}

/** Fetch all chats (sidebar list) */
export function fetchChats() {
  return chatFetch("/api/chats");
}

/** Create a new empty chat */
export function createChat() {
  return chatFetch("/api/chats", { method: "POST" });
}

/** Get full chat with all messages */
export function fetchChat(id) {
  return chatFetch(`/api/chats/${id}`);
}

/** Append query+result to a chat */
export function addMessage(id, query, result) {
  return chatFetch(`/api/chats/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ query, result }),
  });
}

/** Delete a chat */
export function deleteChat(id) {
  return chatFetch(`/api/chats/${id}`, { method: "DELETE" });
}

/** Rename a chat */
export function renameChat(id, title) {
  return chatFetch(`/api/chats/${id}/title`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}
