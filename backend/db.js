// backend/db.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'database.json');

let chatsCache = null;

async function initDB() {
  try {
    await fs.access(DB_FILE);
    const data = await fs.readFile(DB_FILE, 'utf8');
    chatsCache = JSON.parse(data);
    console.log(`📦 Local File DB connected: ${DB_FILE}`);
  } catch {
    chatsCache = [];
    await fs.writeFile(DB_FILE, JSON.stringify(chatsCache, null, 2), 'utf8');
    console.log(`📦 Local File DB created: ${DB_FILE}`);
  }
  return true;
}

async function getChats() {
  if (!chatsCache) await initDB();
  return chatsCache;
}

async function saveChats(chats) {
  chatsCache = chats;
  await fs.writeFile(DB_FILE, JSON.stringify(chatsCache, null, 2), 'utf8');
}

function generateId() {
  return crypto.randomUUID();
}

module.exports = { initDB, getChats, saveChats, generateId };
