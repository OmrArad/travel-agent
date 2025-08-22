import fetch from "node-fetch";
import { getWeather } from "./weather.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Available tools/functions for the LLM
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather information for a specific city",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "The city name to get weather for (e.g., 'Paris', 'New York', 'Tokyo')"
          }
        },
        required: ["city"]
      }
    }
  }
];

// Function to execute tools
async function executeTool(toolCall) {
  const functionName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  console.log(`🔧 Executing tool: ${functionName} with args:`, args);

  switch (functionName) {
    case "get_weather":
      const weather = await getWeather(args.city);
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        content: weather
      };
    default:
      throw new Error(`Unknown tool: ${functionName}`);
  }
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
- When asked about weather, use the get_weather tool to get real-time data
- Present weather data in a clear, formatted way

## General Guidelines:
- If unsure, ask clarifying questions
- Think step by step before answering
- Structure responses with clear sections using markdown headers
- Use tables when presenting comparison data
- Provide actionable recommendations with clear formatting
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage }
  ];

  console.log("🔵 Sending to Ollama:", JSON.stringify(messages, null, 2));

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3:latest",
        messages: messages,
        tools: tools,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("🔵 Raw Ollama response:", data);

    const responseMessage = data.message;

    // Check if the LLM wants to call a tool
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      console.log("🔧 LLM requested tool calls:", responseMessage.tool_calls);

      // Execute all requested tools
      const toolResults = [];
      for (const toolCall of responseMessage.tool_calls) {
        const result = await executeTool(toolCall);
        toolResults.push(result);
      }

      // Add the tool call message and results to the conversation
      const updatedMessages = [
        ...messages,
        responseMessage,
        ...toolResults
      ];

      // Make a second call to get the final response
      const finalResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3:latest",
          messages: updatedMessages,
          stream: false
        })
      });

      if (!finalResponse.ok) {
        throw new Error(`Ollama API error: ${finalResponse.status} ${finalResponse.statusText}`);
      }

      const finalData = await finalResponse.json();
      console.log("🔵 Final Ollama response:", finalData);

      return finalData.message.content;
    }

    return responseMessage.content;
  } catch (error) {
    console.error("❌ Error calling Ollama:", error);
    throw new Error(`Failed to get response from Ollama: ${error.message}`);
  }
}
