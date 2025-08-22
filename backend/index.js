import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { askLLM } from "./services/llm.js";
import { getWeather } from "./services/weather.js";

console.log("🔑 Ollama configuration:");
console.log("  - Base URL:", process.env.OLLAMA_BASE_URL || "http://localhost:11434");
console.log("  - Model:", process.env.OLLAMA_MODEL || "llama3:latest");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conversation memory (very simple for demo)
let conversationHistory = [];

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("🟢 Incoming message:", message);
    
    // Check if query needs weather data
    if (message.toLowerCase().includes("weather")) {
      const city = message.split("in ")[1] || "Paris"; // crude extraction
      const weather = await getWeather(city);
      conversationHistory.push({ role: "user", content: message });
      conversationHistory.push({ role: "system", content: `Weather in ${city}: ${weather}` });
    }

    // Call LLM
    const response = await askLLM(conversationHistory, message);
    console.log("🟢 LLM response (to be sent):", response);

    conversationHistory.push({ role: "user", content: message });
    conversationHistory.push({ role: "assistant", content: response });

    res.json({ reply: response });
  } catch (err) {
    console.error("❌ Error in /chat route:", err);
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
});


app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
