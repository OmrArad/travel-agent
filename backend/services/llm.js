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

// Function to detect complex queries that need chain-of-thought reasoning
function needsChainOfThought(message) {
  const complexQueryKeywords = [
    'plan', 'itinerary', 'schedule', 'budget', 'compare', 'recommend',
    'best', 'optimal', 'efficient', 'strategy', 'approach', 'consider',
    'factors', 'pros and cons', 'advantages', 'disadvantages', 'trade-offs'
  ];
  
  const lowerMessage = message.toLowerCase();
  return complexQueryKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to detect follow-up questions that reference previous context
function isFollowUpQuestion(message, history) {
  const followUpIndicators = [
    'what about', 'how about', 'what if', 'can you', 'could you',
    'tell me more', 'explain', 'elaborate', 'give me', 'show me',
    'and', 'also', 'additionally', 'furthermore', 'moreover',
    'what else', 'anything else', 'other options', 'alternatives'
  ];
  
  const lowerMessage = message.toLowerCase();
  const hasFollowUpIndicator = followUpIndicators.some(indicator => 
    lowerMessage.includes(indicator)
  );
  
  // Check if this is a short question (likely a follow-up)
  const isShortQuestion = message.split(' ').length <= 15;
  
  // Check if there's recent conversation history
  const hasRecentHistory = history.length > 0;
  
  return hasFollowUpIndicator || (isShortQuestion && hasRecentHistory);
}

// Function to determine if recent conversation was complex
function hasRecentComplexConversation(history) {
  if (history.length === 0) return false;
  
  // Look at the last few messages to see if there was a complex query
  const recentMessages = history.slice(-4); // Last 4 messages (2 exchanges)
  
  return recentMessages.some(msg => 
    msg.role === 'user' && needsChainOfThought(msg.content)
  );
}

// Function to calculate appropriate timeout based on context
function calculateTimeout(message, history) {
  const isComplex = needsChainOfThought(message);
  const isFollowUp = isFollowUpQuestion(message, history);
  const hadComplexRecent = hasRecentComplexConversation(history);
  
  // Base timeouts (in milliseconds) - configurable via environment variables
  const baseTimeouts = {
    simple: parseInt(process.env.OLLAMA_TIMEOUT_SIMPLE) || 120000,    // 2 minutes
    complex: parseInt(process.env.OLLAMA_TIMEOUT_COMPLEX) || 180000,   // 3 minutes
    followUp: parseInt(process.env.OLLAMA_TIMEOUT_FOLLOWUP) || 150000,  // 2.5 minutes
    followUpAfterComplex: parseInt(process.env.OLLAMA_TIMEOUT_FOLLOWUP_COMPLEX) || 240000  // 4 minutes
  };
  
  // Determine timeout based on context
  if (isFollowUp && hadComplexRecent) {
    console.log("⏱️ Using extended timeout for follow-up after complex conversation");
    return baseTimeouts.followUpAfterComplex;
  } else if (isFollowUp) {
    console.log("⏱️ Using extended timeout for follow-up question");
    return baseTimeouts.followUp;
  } else if (isComplex) {
    console.log("⏱️ Using extended timeout for complex query");
    return baseTimeouts.complex;
  } else {
    console.log("⏱️ Using standard timeout for simple query");
    return baseTimeouts.simple;
  }
}

// Function to detect duplicate or very similar messages
function isDuplicateMessage(message, history, threshold = 0.8) {
  if (history.length === 0) return false;
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for exact duplicates first
  const exactDuplicate = history.some(msg => 
    msg.role === 'user' && 
    msg.content.toLowerCase().trim() === lowerMessage
  );
  
  if (exactDuplicate) {
    console.log("🔄 Detected exact duplicate message");
    return true;
  }
  
  // Check for similar messages (simple word overlap)
  const messageWords = new Set(lowerMessage.split(/\s+/));
  
  for (const msg of history) {
    if (msg.role !== 'user') continue;
    
    const historyWords = new Set(msg.content.toLowerCase().trim().split(/\s+/));
    const intersection = new Set([...messageWords].filter(x => historyWords.has(x)));
    const union = new Set([...messageWords, ...historyWords]);
    
    const similarity = intersection.size / union.size;
    
    if (similarity > threshold) {
      console.log(`🔄 Detected similar message (${Math.round(similarity * 100)}% similarity)`);
      return true;
    }
  }
  
  return false;
}

// Function to consolidate weather queries
function consolidateWeatherQueries(history) {
  const weatherQueries = history.filter(msg => 
    msg.role === 'user' && isWeatherQuery(msg.content)
  );
  
  if (weatherQueries.length <= 1) return history;
  
  // Keep only the most recent weather query for each unique city
  const cityQueries = new Map();
  
  for (const query of weatherQueries) {
    const city = extractCityFromWeatherQuery(query.content);
    if (city) {
      cityQueries.set(city, query);
    }
  }
  
  // Replace all weather queries with consolidated versions
  const consolidatedHistory = history.filter(msg => 
    !(msg.role === 'user' && isWeatherQuery(msg.content))
  );
  
  // Add back the most recent query for each city
  for (const query of cityQueries.values()) {
    consolidatedHistory.push(query);
  }
  
  console.log(`🔄 Consolidated ${weatherQueries.length} weather queries into ${cityQueries.size} unique cities`);
  return consolidatedHistory;
}

// Function to clean and optimize conversation history
function cleanConversationHistory(history, maxMessages = null) {
  const defaultMaxMessages = parseInt(process.env.OLLAMA_MAX_HISTORY_MESSAGES) || 8;
  const actualMaxMessages = maxMessages || defaultMaxMessages;
  
  if (history.length <= actualMaxMessages) return history;
  
  console.log(`🧹 Cleaning conversation history: ${history.length} → ${actualMaxMessages} messages`);
  
  // Remove duplicates and consolidate weather queries
  let cleanedHistory = consolidateWeatherQueries(history);
  
  // Remove exact duplicates
  const seen = new Set();
  cleanedHistory = cleanedHistory.filter(msg => {
    const key = `${msg.role}:${msg.content.toLowerCase().trim()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  
  // If still too long, keep the most recent messages
  if (cleanedHistory.length > actualMaxMessages) {
    cleanedHistory = cleanedHistory.slice(-actualMaxMessages);
  }
  
  console.log(`✅ Cleaned history: ${history.length} → ${cleanedHistory.length} messages`);
  return cleanedHistory;
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

// Chain-of-thought system prompt for complex reasoning
function getChainOfThoughtPrompt() {
  return `
You are a helpful Travel Assistant. For complex questions, use this structured approach:

**🤔 Understanding:** Break down the request
**📋 Factors:** List key considerations  
**🔍 Analysis:** Step-by-step reasoning
**💡 Recommendation:** Clear actionable advice
**📝 Tips:** Additional helpful info

Always show your reasoning process clearly using markdown formatting.

## Follow-up Questions:
After providing your main response, always include 2-3 relevant follow-up questions or suggestions that could help the user continue the conversation. These should be:
- Related to the topic discussed
- Helpful for planning or decision-making
- Natural conversation continuations
- Specific and actionable

Format follow-up questions as:
**🤔 What's Next?**
• [Follow-up question 1]
• [Follow-up question 2]
• [Follow-up question 3]
`;
}

// Standard system prompt for simple queries
function getStandardPrompt() {
  return `
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

## Follow-up Questions:
After providing your main response, always include 2-3 relevant follow-up questions or suggestions that could help the user continue the conversation. These should be:
- Related to the topic discussed
- Helpful for planning or decision-making
- Natural conversation continuations
- Specific and actionable

Format follow-up questions as:
**🤔 What's Next?**
• [Follow-up question 1]
• [Follow-up question 2]
• [Follow-up question 3]

**Note:** For very short responses or simple acknowledgments, you may skip follow-up questions, but for most responses, include them to maintain conversation flow.
`;
}

export async function askLLM(history, userMessage) {
  // Check for duplicate messages to avoid unnecessary processing
  if (isDuplicateMessage(userMessage, history)) {
    console.log("🔄 Skipping duplicate message processing");
    // Return a cached response or simple acknowledgment
    return "I've already answered this question. Is there anything specific you'd like me to clarify or expand on?";
  }
  
  // Determine which prompt strategy to use
  const useChainOfThought = needsChainOfThought(userMessage);
  const systemPrompt = useChainOfThought ? getChainOfThoughtPrompt() : getStandardPrompt();

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

  // Add chain-of-thought instruction for complex queries
  if (useChainOfThought) {
    enhancedUserMessage = `Please use chain-of-thought reasoning to answer this question step by step:\n\n${enhancedUserMessage}`;
    console.log("🧠 Using chain-of-thought reasoning for complex query");
  }

  // Clean and optimize conversation history
  const cleanedHistory = cleanConversationHistory(history); // Uses environment variable or default of 8

  const messages = [
    { role: "system", content: systemPrompt },
    ...cleanedHistory,
    { role: "user", content: enhancedUserMessage }
  ];

  console.log("🔵 Sending to Ollama:", JSON.stringify(messages, null, 2));

  try {
    // Create AbortController for timeout - longer timeout for complex queries
    const controller = new AbortController();
    const timeout = calculateTimeout(userMessage, history);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
      const timeoutMs = calculateTimeout(userMessage, history);
      const timeoutMinutes = Math.round(timeoutMs / 60000 * 10) / 10; // Round to 1 decimal place
      throw new Error(`Request to Ollama timed out after ${timeoutMinutes} minutes. This timeout was automatically adjusted based on your question type.`);
    }
    throw new Error(`Failed to get response from Ollama: ${error.message}`);
  }
}
