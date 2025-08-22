import { useState } from "react";
import { sendMessage } from "./api";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMsg = { role: "user", content: input };
    setMessages([...messages, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendMessage(input);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">Travel Assistant</h1>
      <div className="w-full max-w-md h-96 border rounded p-4 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-blue-600" : "text-green-700"}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
        {isLoading && (
          <div className="text-green-700">
            <b>assistant:</b> 
            <div className="flex items-center mt-1">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-2"></div>
              Thinking...
            </div>
          </div>
        )}
      </div>
      <div className="flex mt-4 w-full max-w-md">
        <input
          className={`flex-1 border rounded p-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about travel..."
          disabled={isLoading}
        />
        <button 
          className={`ml-2 px-4 py-2 rounded ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white`} 
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
