// backend/models/Chat.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["query", "result"],
    required: true,
  },
  query: String,
  data: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "New Analysis",
      maxlength: 100,
    },
    messages: [messageSchema],
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate title from first query
chatSchema.methods.autoTitle = function () {
  const firstQuery = this.messages.find((m) => m.type === "query");
  if (firstQuery && firstQuery.query) {
    // Take first 50 chars of the query as the title
    this.title = firstQuery.query.slice(0, 50) + (firstQuery.query.length > 50 ? "..." : "");
  }
};

// Index for fast listing (most recent first)
chatSchema.index({ lastActivity: -1 });

module.exports = mongoose.model("Chat", chatSchema);
