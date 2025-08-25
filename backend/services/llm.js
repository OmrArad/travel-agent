import fetch from "node-fetch";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama2";

// Check if message is travel-related
function isTravelQuery(message) {
  const travelKeywords = [
    'travel', 'trip', 'vacation', 'holiday', 'destination', 'hotel', 'flight',
    'booking', 'itinerary', 'tour', 'sightseeing', 'attraction', 'restaurant',
    'food', 'cuisine', 'culture', 'language', 'visa', 'passport', 'currency',
    'transportation', 'train', 'bus', 'car rental', 'airport', 'luggage',
    'packing', 'suitcase', 'travel insurance', 'vaccination', 'safety',
    'tourist', 'visitor', 'local', 'guide', 'map', 'directions', 'route',
    'time zone', 'jet lag', 'accommodation', 'hostel', 'airbnb', 'resort',
    'beach', 'mountain', 'hiking', 'adventure', 'shopping', 'market',
    'nightlife', 'entertainment', 'festival', 'event', 'season', 'budget',
    'cost', 'price', 'expensive', 'cheap', 'affordable', 'luxury',
    'backpacking', 'solo travel', 'family', 'couple', 'group', 'business',
    'conference', 'meeting', 'work', 'remote', 'digital nomad', 'pack'
  ];
  
  const lowerMessage = message.toLowerCase();
  return travelKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Check if query needs complex reasoning
function needsChainOfThought(message) {
  const complexKeywords = [
    'plan', 'itinerary', 'schedule', 'budget', 'compare', 'recommend',
    'best', 'optimal', 'efficient', 'strategy', 'approach', 'consider',
    'factors', 'pros and cons', 'advantages', 'disadvantages', 'trade-offs'
  ];
  
  const lowerMessage = message.toLowerCase();
  return complexKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Chain-of-thought prompt for complex travel planning
function getChainOfThoughtPrompt() {
  return `You are a specialized Travel Assistant with access to weather information. You ONLY answer travel-related questions.

## IMPORTANT: Travel-Only Policy
- If a question is NOT related to travel, politely redirect to travel topics
- Focus exclusively on travel-related topics

## Chain-of-Thought Approach for Complex Travel Questions:
When planning trips or making recommendations, use this structured approach:

**🤔 Break down the travel request**
- What type of trip is this?
- What are the key requirements?
- What constraints need to be considered?

**📋 List key travel considerations**
- Budget considerations
- Time constraints
- Traveler preferences
- Seasonal factors
- Safety considerations

**🔍 Step-by-step travel reasoning**
- Research and compare options
- Consider pros and cons
- Evaluate trade-offs
- Make recommendations

**💡 Clear actionable travel advice**
- Specific recommendations
- Practical next steps
- Important considerations

**📝 Additional helpful travel info**
- Tips and warnings
- Alternative options
- Resources for more information

## Response Guidelines:
- Use markdown formatting with **bold** for emphasis
- Use bullet points (•) for lists
- Use numbered lists for step-by-step instructions
- Use ### headers for organizing information
- Use > blockquotes for tips or warnings
- Keep responses concise but comprehensive

## Weather Information:
- When weather data is provided, present it clearly
- Include temperature, conditions, and travel advice

## Follow-up Questions:
After your main response, include 1-3 natural follow-up questions when helpful:
- Related to travel topics discussed
- Helpful for travel planning
- Specific and actionable
- Use phrases like "You might also want to consider..." or "If you're interested in..."

Always show your reasoning process clearly using the structured approach above.`;
}

// Standard prompt for simple queries
function getStandardPrompt() {
  return `You are a specialized Travel Assistant with access to weather information. You ONLY answer travel-related questions.

## IMPORTANT: Travel-Only Policy
- If a question is NOT related to travel, politely respond with: "I'm a travel assistant and can only help with travel-related questions. How can I assist you with your travel plans today?"
- Focus exclusively on travel-related topics

## Conversation Guidelines:
- Use direct address (you, your) instead of third person
- Maintain conversation context and reference previous messages
- Build on previous travel recommendations
- Keep conversations flowing naturally

## Response Guidelines:
- Answer concisely and clearly using markdown formatting
- Use **bold** for emphasis and important points
- Use bullet points (•) for lists and recommendations
- Use numbered lists for step-by-step instructions
- Use ### headers for organizing information
- Use > blockquotes for tips or warnings

## Weather Information:
- When weather data is provided, present it clearly
- Include temperature, conditions, and travel advice

## Follow-up Questions:
After your main response, include 1-3 natural follow-up questions when helpful:
- Related to travel topics discussed
- Helpful for travel planning
- Specific and actionable
- Use phrases like "You might also want to consider..." or "If you're interested in..."

## General Guidelines:
- If unsure, ask clarifying questions
- Structure responses with clear sections
- Provide actionable travel recommendations
- Keep responses concise and natural`;
}

export async function travelAssistant(history, userMessage) {
  // Check if message is travel-related
  if (!isTravelQuery(userMessage)) {
    return "I'm a travel assistant and can only help with travel-related questions. How can I assist you with your travel plans today? For example, I can help you with:\n\n• **Destination recommendations** and travel planning\n• **Hotel and flight bookings**\n• **Weather information** for your travel dates\n• **Travel tips** and local insights\n• **Itinerary planning** and sightseeing suggestions\n• **Budget planning** and cost estimates\n\nWhat travel-related question can I help you with?";
  }

  // Determine prompt strategy
  const useChainOfThought = needsChainOfThought(userMessage);
  const systemPrompt = useChainOfThought ? getChainOfThoughtPrompt() : getStandardPrompt();

  // Prepare messages for Ollama
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage }
  ];

  console.log("🤖 Sending to Ollama with", useChainOfThought ? "chain-of-thought" : "standard", "reasoning");

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.message || !data.message.content) {
      throw new Error("Invalid response format from Ollama");
    }

    return data.message.content;
    
  } catch (error) {
    console.error("❌ Ollama error:", error);
    throw new Error(`Failed to get response from travel assistant: ${error.message}`);
  }
}
