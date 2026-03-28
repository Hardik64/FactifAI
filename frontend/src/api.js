// src/api.js
const API_BASE = import.meta.env.VITE_API_URL || "";

export async function analyzeNews(text) {
  let res;
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (networkErr) {
    // Network failure (server down, DNS, CORS, etc.)
    throw new Error("Cannot reach the server. Please check your connection and try again.");
  }

  // Read body as text first — prevents "Failed to execute 'json' on 'Response'" crash
  let bodyText;
  try {
    bodyText = await res.text();
  } catch {
    throw new Error("Server returned an empty response. Please try again.");
  }

  // Try to parse as JSON
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    // Server returned non-JSON (HTML error page, empty body, etc.)
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

  // Final sanity check — make sure we got a valid analysis result
  if (!data.label || !data.reasons) {
    throw new Error("Incomplete analysis result. Please try again.");
  }

  return data;
}
