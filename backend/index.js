import "dotenv/config";
import express from "express";
import cors from "cors";
import { travelAssistant } from "./services/llm.js";
import { getWeather } from "./services/weather.js";

console.log("🚀 Travel Assistant Backend Starting...");
console.log("🔑 Ollama URL:", process.env.OLLAMA_BASE_URL || "http://localhost:11434");
console.log("🤖 Model:", process.env.OLLAMA_MODEL || "llama3:latest");

const app = express();
app.use(cors());
app.use(express.json());

// Simple session storage
const sessions = new Map();

// Generate session ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get or create session
function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId);
}

// Clean up old sessions (every hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [sessionId] of sessions.entries()) {
    const timestamp = parseInt(sessionId, 36);
    if (now - timestamp > maxAge) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

// Main chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("💬 New message:", message.substring(0, 50) + "...");

    // Get session history
    const currentSessionId = sessionId || generateSessionId();
    const history = getSession(currentSessionId);
    
    // Check if it's a weather query
    let enhancedMessage = message;
    if (message.toLowerCase().includes('weather')) {
      const city = extractCity(message);
      if (city) {
        try {
          const weatherData = await getWeather(city);
          enhancedMessage = `${message}\n\nCurrent weather for ${city}:\n${weatherData}`;
        } catch (error) {
          console.log("⚠️ Weather API error:", error.message);
        }
      }
    }

    // Get response from travel assistant
    const response = await travelAssistant(history, enhancedMessage);
    
    // Update session history
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: response });
    
    // Keep history manageable (last 10 messages)
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    res.json({ 
      reply: response, 
      sessionId: currentSessionId 
    });
    
  } catch (error) {
    console.error("❌ Chat error:", error);
    res.status(500).json({ 
      error: "Sorry, I'm having trouble right now. Please try again." 
    });
  }
});

// New chat session
app.post("/new-chat", (req, res) => {
  const sessionId = generateSessionId();
  sessions.set(sessionId, []);
  res.json({ sessionId });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Extract city from weather query
function extractCity(message) {
  const patterns = [
    /weather\s+(?:in|at|for)\s+([a-zA-Z\s]+)/i,
    /(?:what's|what is)\s+(?:the\s+)?weather\s+(?:in|at|for)\s+([a-zA-Z\s]+)/i,
    /temperature\s+(?:in|at|for)\s+([a-zA-Z\s]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: look for capitalized words
  const words = message.split(/\s+/);
  for (const word of words) {
    if (word.length > 2 && word[0] === word[0].toUpperCase() && /^[A-Za-z]+$/.test(word)) {
      return word;
    }
  }
  
  return null;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
