// backend/routes/chats.js
const express = require("express");
const router = express.Router();
const { getChats, saveChats, generateId } = require("../db");

function getLastLabel(messages) {
  if (!messages) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === "result" && messages[i].data?.label) {
      return messages[i].data.label;
    }
  }
  return null;
}

// GET /api/chats — List all chats
router.get("/", async (req, res) => {
  try {
    const chats = await getChats();
    const sorted = [...chats].sort((a, b) => new Date(b.lastActivity || b.createdAt) - new Date(a.lastActivity || a.createdAt));
    
    const list = sorted.slice(0, 50).map((c) => ({
      _id: c._id,
      title: c.title,
      messageCount: c.messages?.length || 0,
      lastActivity: c.lastActivity,
      createdAt: c.createdAt,
      lastLabel: getLastLabel(c.messages),
    }));

    res.json(list);
  } catch (err) {
    console.error("[Chats] List error:", err.message);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

// POST /api/chats — Create an empty chat
router.post("/", async (req, res) => {
  try {
    const chats = await getChats();
    const newChat = {
      _id: generateId(),
      title: "New Analysis",
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    chats.push(newChat);
    await saveChats(chats);
    res.status(201).json({ _id: newChat._id, title: newChat.title });
  } catch (err) {
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// GET /api/chats/:id — Get full chat
router.get("/:id", async (req, res) => {
  try {
    const chats = await getChats();
    const chat = chats.find(c => c._id === req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: "Failed to load chat" });
  }
});

// POST /api/chats/:id/messages — Add a message pair
router.post("/:id/messages", async (req, res) => {
  try {
    const { query, result } = req.body;
    const chats = await getChats();
    const chatIndex = chats.findIndex(c => c._id === req.params.id);
    if (chatIndex === -1) return res.status(404).json({ error: "Chat not found" });

    const chat = chats[chatIndex];
    chat.messages.push({ type: "query", query, timestamp: new Date().toISOString() });
    chat.messages.push({ type: "result", data: result, timestamp: new Date().toISOString() });

    // Auto-title from first query
    if (chat.messages.filter(m => m.type === "query").length === 1 && query) {
      chat.title = query.slice(0, 50) + (query.length > 50 ? "..." : "");
    }

    chat.lastActivity = new Date().toISOString();
    chats[chatIndex] = chat;
    await saveChats(chats);

    res.json({
      _id: chat._id,
      title: chat.title,
      messageCount: chat.messages.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save message" });
  }
});

// PUT /api/chats/:id/title — Rename a chat
router.put("/:id/title", async (req, res) => {
  try {
    const { title } = req.body;
    const chats = await getChats();
    const chatIndex = chats.findIndex(c => c._id === req.params.id);
    if (chatIndex === -1) return res.status(404).json({ error: "Chat not found" });

    chats[chatIndex].title = title?.slice(0, 100) || "Untitled";
    await saveChats(chats);

    res.json({ _id: chats[chatIndex]._id, title: chats[chatIndex].title });
  } catch (err) {
    res.status(500).json({ error: "Failed to rename chat" });
  }
});

// DELETE /api/chats/:id — Delete a chat
router.delete("/:id", async (req, res) => {
  try {
    const chats = await getChats();
    const filtered = chats.filter(c => c._id !== req.params.id);
    if (chats.length === filtered.length) return res.status(404).json({ error: "Chat not found" });
    
    await saveChats(filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

module.exports = router;
