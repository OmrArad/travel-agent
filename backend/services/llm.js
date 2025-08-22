import fetch from "node-fetch";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export async function askLLM(history, userMessage) {
  const systemPrompt = `
You are a helpful Travel Assistant.
- Answer concisely and clearly.
- If asked about weather, use provided data (don't hallucinate).
- If unsure, ask clarifying questions.
- Think step by step before answering.
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
        model: process.env.OLLAMA_MODEL || "llama3:latest", // Default to llama3.2, can be changed via env var
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("🔵 Raw Ollama response:", data);

    return data.message.content;
  } catch (error) {
    console.error("❌ Error calling Ollama:", error);
    throw new Error(`Failed to get response from Ollama: ${error.message}`);
  }
}
