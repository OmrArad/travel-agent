import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { askLLM } from "./services/llm.js";

console.log("🔑 Ollama configuration:");
console.log("  - Base URL:", process.env.OLLAMA_BASE_URL || "http://localhost:11434");
console.log("  - Model:", process.env.OLLAMA_MODEL || "llama3:latest");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Session management for conversation histories
const sessions = new Map();

// Generate a unique session ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get or create session history
function getSessionHistory(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId);
}

// Clean up old sessions (older than 24 hours)
function cleanupOldSessions() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  for (const [sessionId, history] of sessions.entries()) {
    // Extract timestamp from session ID (first part before random string)
    const timestamp = parseInt(sessionId, 36);
    if (now - timestamp > maxAge) {
      sessions.delete(sessionId);
      console.log(`🧹 Cleaned up old session: ${sessionId}`);
    }
  }
}

// Clean up sessions every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    console.log("🟢 Incoming message:", message);
    console.log("🆔 Session ID:", sessionId || "new session");

    // Get or create session history
    const conversationHistory = getSessionHistory(sessionId);
    
    // Call LLM with function calling support
    const response = await askLLM(conversationHistory, message);
    console.log("🟢 LLM response (to be sent):", response);

    // Add messages to session history
    conversationHistory.push({ role: "user", content: message });
    conversationHistory.push({ role: "assistant", content: response });

    // Return response with session ID (create new one if not provided)
    const currentSessionId = sessionId || generateSessionId();
    if (!sessionId) {
      sessions.set(currentSessionId, conversationHistory);
    }

    res.json({ 
      reply: response, 
      sessionId: currentSessionId,
      messageCount: conversationHistory.length
    });
  } catch (err) {
    console.error("❌ Error in /chat route:", err);
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
});

// Endpoint to start a new chat session
app.post("/new-chat", (req, res) => {
  const sessionId = generateSessionId();
  sessions.set(sessionId, []);
  console.log("🆕 Created new chat session:", sessionId);
  res.json({ sessionId });
});

// Endpoint to get session info
app.get("/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const history = sessions.get(sessionId);
  
  if (!history) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  res.json({ 
    sessionId, 
    messageCount: history.length,
    history: history.slice(-10) // Return last 10 messages
  });
});

// Endpoint to clear a session
app.delete("/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const deleted = sessions.delete(sessionId);
  
  if (deleted) {
    console.log("🗑️ Deleted session:", sessionId);
    res.json({ message: "Session cleared successfully" });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
