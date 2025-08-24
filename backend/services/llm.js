import fetch from "node-fetch";
import { getWeather } from "./weather.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Function to detect if a message is asking about weather
function isWeatherQuery(message) {
  const weatherKeywords = [
    'weather', 'temperature', 'forecast', 'climate', 'rain', 'snow', 
    'sunny', 'cloudy', 'hot', 'cold', 'humidity', 'wind'
  ];
  
  const lowerMessage = message.toLowerCase();
  return weatherKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to extract city name from weather query
function extractCityFromWeatherQuery(message) {
  // Simple pattern matching - can be improved with NLP
  const cityPatterns = [
    /weather\s+(?:in|at|for)\s+([a-zA-Z\s]+)/i,
    /(?:what's|what is)\s+(?:the\s+)?weather\s+(?:in|at|for)\s+([a-zA-Z\s]+)/i,
    /temperature\s+(?:in|at|for)\s+([a-zA-Z\s]+)/i,
    /forecast\s+(?:for|in)\s+([a-zA-Z\s]+)/i
  ];
  
  for (const pattern of cityPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: look for capitalized words that might be city names
  const words = message.split(/\s+/);
  for (const word of words) {
    if (word.length > 2 && word[0] === word[0].toUpperCase() && /^[A-Za-z]+$/.test(word)) {
      return word;
    }
  }
  
  return null;
}

export async function askLLM(history, userMessage) {
  const systemPrompt = `
You are a helpful Travel Assistant with access to weather information.

## Response Guidelines:
- Answer concisely and clearly using markdown formatting
- Use **bold** for emphasis and important points
- Use bullet points (•) for lists and recommendations
- Use numbered lists for step-by-step instructions
- Use ### headers for organizing information
- Use \`code\` for technical terms or commands
- Use > blockquotes for tips or warnings

## Weather Information:
- When weather data is provided, present it in a clear, formatted way
- Include temperature, conditions, and any relevant travel advice

## General Guidelines:
- If unsure, ask clarifying questions
- Think step by step before answering
- Structure responses with clear sections using markdown headers
- Use tables when presenting comparison data
- Provide actionable recommendations with clear formatting
`;

  let enhancedUserMessage = userMessage;
  
  // Check if this is a weather query and get weather data
  if (isWeatherQuery(userMessage)) {
    const city = extractCityFromWeatherQuery(userMessage);
    if (city) {
      try {
        console.log(`🌤️ Detected weather query for city: ${city}`);
        const weatherData = await getWeather(city);
        enhancedUserMessage = `${userMessage}\n\nHere is the current weather information for ${city}:\n${weatherData}`;
      } catch (error) {
        console.error(`❌ Error getting weather for ${city}:`, error);
        enhancedUserMessage = `${userMessage}\n\nNote: I couldn't retrieve weather information for ${city} at the moment.`;
      }
    }
  }

  // Limit conversation history to prevent context overflow
  const maxHistoryLength = 10; // Keep last 10 messages
  const limitedHistory = history.slice(-maxHistoryLength);

  const messages = [
    { role: "system", content: systemPrompt },
    ...limitedHistory,
    { role: "user", content: enhancedUserMessage }
  ];

  console.log("🔵 Sending to Ollama:", JSON.stringify(messages, null, 2));

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3:latest",
        messages: messages,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Ollama API error response:", errorText);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log("🔵 Raw Ollama response:", data);

    if (!data.message || !data.message.content) {
      throw new Error("Invalid response format from Ollama");
    }

    return data.message.content;
  } catch (error) {
    console.error("❌ Error calling Ollama:", error);
    if (error.name === 'AbortError') {
      throw new Error("Request to Ollama timed out after 120 seconds");
    }
    throw new Error(`Failed to get response from Ollama: ${error.message}`);
  }
}
