import fetch from "node-fetch";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3:latest";

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

// Common prompt sections
function getBasePrompt() {
  return `You are a specialized Travel Assistant with access to weather information. You help with travel-related questions and maintain natural conversation flow.

## IMPORTANT: Travel-Focused but Conversational
- Focus primarily on travel-related topics
- If a question is completely unrelated to travel, politely redirect while maintaining conversation flow
- For follow-up questions or clarifications, continue the conversation naturally
- Use context from previous messages to provide relevant responses
- For simple responses like "yes", "no", "okay", etc., interpret them in the context of the previous conversation

## CRITICAL: Handling Follow-up Responses
- When a user responds with "yes", "no", "okay", "sure", etc., this is ALWAYS a follow-up to your previous question
- NEVER redirect these responses - they are valid conversation continuations
- Provide the information or answer that the user is agreeing to or responding to
- Use the conversation context to understand what the user is responding to`;
}

function getResponseGuidelines() {
  return `## Response Guidelines:
- Use markdown formatting with **bold** for emphasis
- Use bullet points (•) for lists and recommendations
- Use numbered lists for step-by-step instructions
- Use ### headers for organizing information
- Use > blockquotes for tips or warnings
- Keep responses concise and natural`;
}

function getWeatherGuidelines() {
  return `## Weather Information:
- When weather data is provided, present it clearly
- Include temperature, conditions, and travel advice`;
}

function getFollowUpGuidelines() {
  return `## Follow-up Questions:
After your main response, include 1-3 natural follow-up questions when helpful:
- Related to travel topics discussed
- Helpful for travel planning
- Specific and actionable
- Use phrases like "You might also want to consider..." or "If you're interested in..."`;
}

function getConversationFlowGuidelines() {
  return `## Conversation Flow:
- Maintain natural conversation flow
- Reference previous messages when relevant
- For simple responses like "yes", "no", or clarifications, continue the conversation
- If the user says "yes" after you asked a question, provide the information they're agreeing to
- Only redirect if the topic is completely unrelated to travel
- Always consider the conversation context when responding`;
}

function getGeneralGuidelines() {
  return `## General Guidelines:
- If unsure, ask clarifying questions
- Structure responses with clear sections
- Provide actionable travel recommendations
- Keep responses concise and natural
- Only redirect if the topic is completely unrelated to travel
- Always consider the conversation context when responding`;
}

function getChainOfThoughtApproach() {
  return `## Chain-of-Thought Approach for Complex Travel Questions:
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

Always show your reasoning process clearly using the structured approach above.`;
}

// Chain-of-thought prompt for complex travel planning
function getChainOfThoughtPrompt() {
  return [
    getBasePrompt(),
    getChainOfThoughtApproach(),
    getResponseGuidelines(),
    getWeatherGuidelines(),
    getFollowUpGuidelines(),
    getConversationFlowGuidelines()
  ].join('\n\n');
}

// Standard prompt for simple queries
function getStandardPrompt() {
  return [
    getBasePrompt(),
    getResponseGuidelines(),
    getWeatherGuidelines(),
    getFollowUpGuidelines(),
    getConversationFlowGuidelines(),
    getGeneralGuidelines()
  ].join('\n\n');
}

// Build conversation context from history
function buildConversationContext(history) {
  if (history.length === 0) return "";
  
  let context = "\n\nPrevious conversation:\n";
  for (const msg of history) {
    const role = msg.role === "user" ? "User" : "Assistant";
    context += `${role}: ${msg.content}\n`;
  }
  return context;
}

export async function travelAssistant(history, userMessage) {
  // Determine prompt strategy
  const useChainOfThought = needsChainOfThought(userMessage);
  const systemPrompt = useChainOfThought ? getChainOfThoughtPrompt() : getStandardPrompt();

  // Build conversation context
  const conversationContext = buildConversationContext(history);
  
  // Create the full prompt
  const fullPrompt = systemPrompt + conversationContext + `\n\nUser: ${userMessage}\nAssistant:`;

  console.log("🤖 Sending to Ollama with", useChainOfThought ? "chain-of-thought" : "standard", "reasoning");

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: fullPrompt,
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
    
    if (!data.response) {
      throw new Error("Invalid response format from Ollama");
    }

    return data.response;
    
  } catch (error) {
    console.error("❌ Ollama error:", error);
    throw new Error(`Failed to get response from travel assistant: ${error.message}`);
  }
}
