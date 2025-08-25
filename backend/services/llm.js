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

// Function to detect if a message is travel-related
function isTravelQuery(message) {
  const travelKeywords = [
    'travel', 'trip', 'vacation', 'holiday', 'destination', 'hotel', 'flight', 'airline',
    'booking', 'reservation', 'itinerary', 'tour', 'sightseeing', 'attraction', 'museum',
    'restaurant', 'food', 'cuisine', 'culture', 'language', 'visa', 'passport', 'currency',
    'exchange rate', 'transportation', 'train', 'bus', 'car rental', 'taxi', 'uber',
    'airport', 'terminal', 'check-in', 'luggage', 'packing', 'suitcase', 'backpack',
    'travel insurance', 'vaccination', 'health', 'safety', 'crime', 'emergency',
    'tourist', 'visitor', 'local', 'guide', 'map', 'directions', 'route', 'distance',
    'time zone', 'jet lag', 'accommodation', 'hostel', 'airbnb', 'resort', 'spa',
    'beach', 'mountain', 'hiking', 'adventure', 'sports', 'shopping', 'market',
    'nightlife', 'entertainment', 'festival', 'event', 'season', 'best time', 'peak',
    'off-season', 'budget', 'cost', 'price', 'expensive', 'cheap', 'affordable',
    'luxury', 'backpacking', 'solo travel', 'family', 'couple', 'group', 'business',
    'conference', 'meeting', 'work', 'remote', 'digital nomad', 'backpacker',
    'traveler', 'tourist', 'visitor', 'explorer', 'adventurer', 'pack'
  ];
  
  const lowerMessage = message.toLowerCase();
  return travelKeywords.some(keyword => lowerMessage.includes(keyword));
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

// HALLUCINATION DETECTION FUNCTIONS

// Function to detect overly specific claims that might be hallucinations
function detectSpecificClaims(response) {
  const specificClaimPatterns = [
    // Specific prices without context
    /\$\d+(?:\.\d{2})?\s+(?:per\s+)?(?:night|day|person|ticket)/gi,
    // Specific dates without context
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4}\b/gi,
    // Specific times without context
    /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\b/gi,
    // Specific phone numbers
    /\b\+\d{1,3}\s*\d{3}\s*\d{3}\s*\d{4}\b/gi,
    // Specific addresses
    /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi,
    // Specific flight numbers
    /\b[A-Z]{2,3}\d{3,4}\b/gi,
    // Specific hotel names with exact details
    /\b(?:Hotel|Resort|Inn|Lodge)\s+[A-Za-z\s]+(?:is\s+located\s+at|\s+at\s+address|\s+phone\s+number)\b/gi
  ];
  
  const detectedClaims = [];
  for (const pattern of specificClaimPatterns) {
    const matches = response.match(pattern);
    if (matches) {
      detectedClaims.push(...matches);
    }
  }
  
  return detectedClaims;
}

// Function to detect confidence indicators that might signal uncertainty
function detectConfidenceIndicators(response) {
  const lowConfidencePatterns = [
    /\b(?:I think|I believe|probably|maybe|perhaps|possibly|might be|could be|seems like|appears to be)\b/gi,
    /\b(?:as far as I know|to the best of my knowledge|if I remember correctly|I'm not entirely sure)\b/gi,
    /\b(?:this might|this could|this may|this seems|this appears)\b/gi
  ];
  
  const highConfidencePatterns = [
    /\b(?:definitely|certainly|absolutely|without a doubt|guaranteed|100% sure)\b/gi,
    /\b(?:I know for sure|I can confirm|this is definitely|this is certainly)\b/gi
  ];
  
  const lowConfidenceMatches = [];
  const highConfidenceMatches = [];
  
  for (const pattern of lowConfidencePatterns) {
    const matches = response.match(pattern);
    if (matches) {
      lowConfidenceMatches.push(...matches);
    }
  }
  
  for (const pattern of highConfidencePatterns) {
    const matches = response.match(pattern);
    if (matches) {
      highConfidenceMatches.push(...matches);
    }
  }
  
  return {
    lowConfidence: lowConfidenceMatches,
    highConfidence: highConfidenceMatches
  };
}

// Function to detect factual claims that need verification
function detectFactualClaims(response) {
  const factualClaimPatterns = [
    // Currency exchange rates
    /\b(?:exchange rate|conversion rate)\s+(?:is|of)\s+\d+(?:\.\d+)?\s+(?:to|per)\s+\d+(?:\.\d+)?/gi,
    // Visa requirements
    /\b(?:visa|visa-free|visa on arrival)\s+(?:is|are)\s+(?:required|not required|available)\s+(?:for|to)\s+[A-Za-z\s]+/gi,
    // COVID restrictions
    /\b(?:COVID|coronavirus|pandemic)\s+(?:restrictions|requirements|policies)\s+(?:are|is)\s+[A-Za-z\s]+/gi,
    // Political situations
    /\b(?:political|government|regime|administration)\s+(?:situation|status|condition)\s+(?:is|are)\s+[A-Za-z\s]+/gi,
    // Safety claims
    /\b(?:crime rate|safety level|security)\s+(?:is|are)\s+(?:high|low|moderate|excellent|poor)/gi,
    // Weather patterns
    /\b(?:average temperature|rainfall|humidity)\s+(?:is|are)\s+\d+(?:°C|°F|%|mm|inches)/gi,
    // Flight information
    /\b(?:flight|airline)\s+(?:number|route)\s+[A-Z]{2,3}\d{3,4}\s+(?:departs|arrives|leaves)\s+at\s+\d{1,2}:\d{2}/gi,
    // Hotel ratings and reviews
    /\b(?:hotel|resort)\s+[A-Za-z\s]+\s+(?:has|received|got)\s+\d+(?:\.\d+)?\s+(?:stars|star rating|out of 5)/gi,
    // Restaurant recommendations with specific details
    /\b(?:restaurant|dining)\s+[A-Za-z\s]+\s+(?:is|are)\s+(?:located|situated)\s+at\s+\d+/gi,
    // Transportation schedules
    /\b(?:train|bus|metro)\s+(?:departs|leaves|arrives)\s+(?:every|at)\s+\d+\s+(?:minutes|hours)/gi,
    // Tourist attraction details
    /\b(?:museum|attraction|landmark)\s+[A-Za-z\s]+\s+(?:is|are)\s+open\s+(?:from|between)\s+\d{1,2}:\d{2}\s+to\s+\d{1,2}:\d{2}/gi
  ];
  
  const detectedClaims = [];
  for (const pattern of factualClaimPatterns) {
    const matches = response.match(pattern);
    if (matches) {
      detectedClaims.push(...matches);
    }
  }
  
  return detectedClaims;
}

// Function to detect contradictory information
function detectContradictions(response) {
  const contradictions = [];
  
  // Check for conflicting weather information
  const weatherPatterns = [
    /\b(?:hot|warm|sunny)\b/gi,
    /\b(?:cold|chilly|snowy)\b/gi,
    /\b(?:rainy|wet|stormy)\b/gi
  ];
  
  const weatherMatches = weatherPatterns.map(pattern => response.match(pattern) || []);
  if (weatherMatches[0].length > 0 && weatherMatches[1].length > 0) {
    contradictions.push('Conflicting weather descriptions (hot/cold)');
  }
  if (weatherMatches[0].length > 0 && weatherMatches[2].length > 0) {
    contradictions.push('Conflicting weather descriptions (sunny/rainy)');
  }
  
  // Check for conflicting price information
  const pricePatterns = [
    /\b(?:expensive|high cost|luxury)\b/gi,
    /\b(?:cheap|budget|affordable)\b/gi
  ];
  
  const priceMatches = pricePatterns.map(pattern => response.match(pattern) || []);
  if (priceMatches[0].length > 0 && priceMatches[1].length > 0) {
    contradictions.push('Conflicting price descriptions (expensive/cheap)');
  }
  
  // Check for conflicting time information
  const timePatterns = [
    /\b(?:peak season|busy|crowded)\b/gi,
    /\b(?:off season|quiet|empty)\b/gi
  ];
  
  const timeMatches = timePatterns.map(pattern => response.match(pattern) || []);
  if (timeMatches[0].length > 0 && timeMatches[1].length > 0) {
    contradictions.push('Conflicting season descriptions (peak/off-season)');
  }
  
  return contradictions;
}

// Function to detect potential hallucinations and add warnings
function detectHallucinations(response, userMessage) {
  const warnings = [];
  const confidence = { score: 0.5, indicators: [] }; // Start with neutral confidence
  
  // Check for specific claims
  const specificClaims = detectSpecificClaims(response);
  if (specificClaims.length > 0) {
    warnings.push({
      type: 'specific_claims',
      message: 'I notice I provided some specific details. Please verify these independently as they may not be current.',
      claims: specificClaims.slice(0, 3) // Limit to first 3 claims
    });
    confidence.score -= 0.2;
  }
  
  // Check confidence indicators
  const confidenceIndicators = detectConfidenceIndicators(response);
  if (confidenceIndicators.lowConfidence.length > 0) {
    confidence.indicators.push('uncertain');
    confidence.score -= 0.1;
  }
  if (confidenceIndicators.highConfidence.length > 0) {
    confidence.indicators.push('overconfident');
    confidence.score -= 0.15;
  }
  
  // Check factual claims
  const factualClaims = detectFactualClaims(response);
  if (factualClaims.length > 0) {
    warnings.push({
      type: 'factual_claims',
      message: 'I provided some factual information that may change over time. Please verify current conditions.',
      claims: factualClaims.slice(0, 2) // Limit to first 2 claims
    });
    confidence.score -= 0.25;
  }
  
  // Check for contradictions
  const contradictions = detectContradictions(response);
  if (contradictions.length > 0) {
    warnings.push({
      type: 'contradictions',
      message: 'I notice some potentially conflicting information in my response. Please verify the details.',
      contradictions: contradictions
    });
    confidence.score -= 0.3;
  }
  
  // Check for weather queries without weather data
  if (isWeatherQuery(userMessage) && !response.includes('weather') && !response.includes('temperature')) {
    warnings.push({
      type: 'missing_weather_data',
      message: 'I was asked about weather but couldn\'t provide current weather data. Please check a weather service for real-time information.'
    });
    confidence.score -= 0.3;
  }
  
  // Check for overly generic responses to specific questions
  if (userMessage.length > 50 && response.length < 100) {
    warnings.push({
      type: 'generic_response',
      message: 'My response seems quite brief for your detailed question. You may want to ask for more specific information.'
    });
    confidence.score -= 0.1;
  }
  
  // Check for responses that don't address the question
  const questionWords = userMessage.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const responseWords = response.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const commonWords = questionWords.filter(word => responseWords.includes(word));
  
  if (questionWords.length > 3 && commonWords.length < questionWords.length * 0.3) {
    warnings.push({
      type: 'off_topic',
      message: 'My response may not fully address your question. Please let me know if you need more specific information.'
    });
    confidence.score -= 0.2;
  }
  
  return {
    hasWarnings: warnings.length > 0,
    warnings: warnings,
    confidence: {
      score: Math.max(0, Math.min(1, confidence.score)), // Normalize to 0-1
      indicators: confidence.indicators
    }
  };
}

// Function to add hallucination warnings to response
function addHallucinationWarnings(response, hallucinationData) {
  if (!hallucinationData.hasWarnings) {
    return response;
  }
  
  let enhancedResponse = response;
  
  // Determine the most appropriate warning based on the issues detected
  const warningTypes = hallucinationData.warnings.map(w => w.type);
  const confidenceScore = hallucinationData.confidence.score;
  
  // If confidence is very low (< 0.4), use a general confidence warning
  if (confidenceScore < 0.4) {
    enhancedResponse += '\n\n⚠️ **Confidence Note:** Some information provided may need verification. Please check current conditions and details independently.';
  }
  // If we have specific warnings and confidence is moderate (0.4-0.6), use the most relevant specific warning
  else if (warningTypes.length > 0 && confidenceScore < 0.6) {
    // Prioritize warnings by importance
    const priorityOrder = ['missing_weather_data', 'contradictions', 'factual_claims', 'specific_claims', 'off_topic', 'generic_response'];
    const priorityWarning = hallucinationData.warnings.find(w => 
      priorityOrder.includes(w.type)
    );
    
    if (priorityWarning) {
      enhancedResponse += `\n\n💡 **Note:** ${priorityWarning.message}`;
    }
  }
  // If confidence is low but we have multiple warnings, use a general note
  else if (confidenceScore < 0.6) {
    enhancedResponse += '\n\n💡 **Note:** Please verify important details independently as some information may need updating.';
  }
  
  return enhancedResponse;
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
  return getStandardPrompt() + `

For complex travel questions, use this structured approach:

**🤔 Break down the travel request
**📋 List key travel considerations  
**🔍 Step-by-step travel reasoning
**💡 Clear actionable travel advice
**📝 Additional helpful travel info

Only ask questions, and request information, at the end of your response.

Always show your reasoning process clearly using markdown formatting.
`;
}

// Standard system prompt for simple queries
function getStandardPrompt() {
  return `
You are a specialized Travel Assistant with access to weather information. You ONLY answer travel-related questions and requests.

## IMPORTANT: Travel-Only Policy
- If a question is NOT related to travel, politely respond with: "I'm a travel assistant and can only help with travel-related questions. How can I assist you with your travel plans today?"
- Focus exclusively on travel related topics.

## HALLUCINATION PREVENTION GUIDELINES:
- **Avoid specific details** you're not confident about (exact prices, phone numbers, addresses)
- **Use general ranges** instead of specific numbers when possible (e.g., "$100-200 per night" vs "$147.50")
- **Qualify uncertain information** with phrases like "typically," "usually," or "generally"
- **Acknowledge limitations** when you don't have current information
- **Focus on general advice** rather than specific recommendations you can't verify
- **Use weather data** when provided, but don't make up weather information

## Conversation Guidelines:
- Use direct address (you, your) instead of third person (the user, they)
- Maintain conversation context and reference previous messages when relevant
- Build on previous travel recommendations and suggestions
- Keep the conversation flowing naturally

## Response Guidelines:
- Answer concisely and clearly using markdown formatting
- Use **bold** for emphasis and important points
- Use bullet points (•) for lists and recommendations
- Use numbered lists for step-by-step instructions
- Use ### headers for organizing information
- Use > blockquotes for tips or warnings

## Weather Information:
- When weather data is provided, present it in a clear, formatted way
- Include temperature, conditions, and any relevant travel advice

## Follow-up Questions:
After providing your main response, include 1-3 natural follow-up questions or suggestions when they add value to the conversation. These should be:
- Related to travel topics discussed
- Helpful for travel planning or decision-making
- Natural conversation continuations
- Specific and actionable travel suggestions
- Only include follow-up questions when they genuinely help the user
- For simple answers or acknowledgments, skip follow-up questions entirely
- Integrate questions naturally into the response rather than using a separate section
- Use phrases like "You might also want to consider..." or "If you're interested in..."
- Avoid the "🤔 What's Next?" format unless there are multiple distinct options to present

**General Guidelines:**
- If unsure, ask clarifying questions
- Think step by step before answering
- Structure responses with clear sections using markdown headers
- Use tables when presenting comparison data
- Provide actionable travel recommendations with clear formatting

**Note:** For very short responses or simple acknowledgments, skip follow-up questions entirely to keep responses concise and natural.
`;
}

export async function askLLM(history, userMessage) {
  // Check if the message is travel-related
  if (!isTravelQuery(userMessage)) {
    console.log("🚫 Non-travel query detected, redirecting to travel assistance");
    return "I'm a travel assistant and can only help with travel-related questions. How can I assist you with your travel plans today? For example, I can help you with:\n\n• **Destination recommendations** and travel planning\n• **Hotel and flight bookings**\n• **Weather information** for your travel dates\n• **Travel tips** and local insights\n• **Itinerary planning** and sightseeing suggestions\n• **Budget planning** and cost estimates\n\nWhat travel-related question can I help you with?";
  }
  
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
    // Remove timeout and AbortController logic
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3:latest",
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7, // Default temperature
          top_p: 0.9,
          max_tokens: 4096
        }
      })
    });

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

    const rawResponse = data.message.content;
    const hallucinationData = detectHallucinations(rawResponse, userMessage);
    const finalResponse = addHallucinationWarnings(rawResponse, hallucinationData);

    return finalResponse;
  } catch (error) {
    console.error("❌ Error calling Ollama:", error);
    if (error.name === 'AbortError') {
      // No longer using timeout, so this block is effectively removed
      // const timeoutMs = calculateTimeout(userMessage, history);
      // const timeoutMinutes = Math.round(timeoutMs / 60000 * 10) / 10; // Round to 1 decimal place
      // throw new Error(`Request to Ollama timed out after ${timeoutMinutes} minutes. This timeout was automatically adjusted based on your question type.`);
    }
    throw new Error(`Failed to get response from Ollama: ${error.message}`);
  }
}
