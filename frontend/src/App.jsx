import React, { useState, useRef, useEffect } from "react";
import { sendMessage, createNewChat } from "./api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2>Something went wrong.</h2>
          <details className="mt-2">
            <summary>Error details</summary>
            <pre className="mt-2 text-xs">{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI travel assistant. I can help you with:\n\n• Destination recommendations\n• Weather information for any city\n• Packing suggestions\n• Travel tips and advice\n\nWhat would you like to know about?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newMsg = { role: "user", content: input, timestamp: new Date() };
    setMessages([...messages, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendMessage(input, sessionId);
      
      if (!response.reply) {
        throw new Error("Empty response from API");
      }
      
      const assistantMsg = { role: "assistant", content: response.reply, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
      
      // Update session ID if this is a new session
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action) => {
    setInput(action);
    // Auto-send the quick action
    setTimeout(() => {
      const newMsg = { role: "user", content: action, timestamp: new Date() };
      setMessages([...messages, newMsg]);
      setInput("");
      setIsLoading(true);

      sendMessage(action, sessionId)
        .then(response => {
          setMessages(prev => [...prev, { role: "assistant", content: response.reply, timestamp: new Date() }]);
          if (response.sessionId && !sessionId) {
            setSessionId(response.sessionId);
          }
        })
        .catch(error => {
          console.error("Error sending message:", error);
          setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 100);
  };

  const formatMessage = (content, role) => {
    // For user messages, just return plain text
    if (role === "user") {
      return content;
    }
    
    // For assistant messages, render markdown with error handling
    return (
      <ErrorBoundary>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // Apply styling through components
              h1: ({children}) => <h1 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{children}</h1>,
              h2: ({children}) => <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{children}</h2>,
              h3: ({children}) => <h3 className="text-base font-medium mb-2 text-gray-900 dark:text-white">{children}</h3>,
              p: ({children}) => <p className="mb-2 leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>,
              ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300">{children}</ol>,
              li: ({children}) => <li className="leading-relaxed">{children}</li>,
              strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
              em: ({children}) => <em className="italic">{children}</em>,
              code: ({children, inline}) => 
                inline ? (
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">{children}</code>
                ) : (
                  <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm font-mono overflow-x-auto text-gray-800 dark:text-gray-200">{children}</code>
                ),
              pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
              blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-300 mb-3">{children}</blockquote>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </ErrorBoundary>
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearChat = async () => {
    try {
      // Create a new chat session
      const newSessionId = await createNewChat();
      setSessionId(newSessionId);
      
      // Reset messages to initial state
      setMessages([
        {
          role: "assistant",
          content: "Hello! I'm your AI travel assistant. I can help you with:\n\n• Destination recommendations\n• Weather information for any city\n• Packing suggestions\n• Travel tips and advice\n\nWhat would you like to know about?",
          timestamp: new Date()
        }
      ]);
      
      console.log("🆕 Started new chat session:", newSessionId);
    } catch (error) {
      console.error("Error creating new chat:", error);
      // Fallback: just reset messages locally
      setMessages([
        {
          role: "assistant",
          content: "Hello! I'm your AI travel assistant. I can help you with:\n\n• Destination recommendations\n• Weather information for any city\n• Packing suggestions\n• Travel tips and advice\n\nWhat would you like to know about?",
          timestamp: new Date()
        }
      ]);
      setSessionId(null);
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-gray-900 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:relative lg:translate-x-0 lg:flex lg:flex-col`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <button
              onClick={clearChat}
              className="flex items-center space-x-3 text-white hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">New chat</span>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex-1 p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h3>
            
            <button
              onClick={() => handleQuickAction("What's the weather in Paris?")}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🌤️</span>
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Weather Check</div>
                  <div className="text-gray-400 text-xs">Check weather in Paris</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleQuickAction("Recommend some travel destinations for summer")}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🏖️</span>
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Summer Destinations</div>
                  <div className="text-gray-400 text-xs">Get recommendations</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleQuickAction("What should I pack for a beach vacation?")}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🧳</span>
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Packing Tips</div>
                  <div className="text-gray-400 text-xs">Beach vacation essentials</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleQuickAction("Tell me about budget travel tips")}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">💰</span>
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Budget Travel</div>
                  <div className="text-gray-400 text-xs">Money-saving tips</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">✈️</span>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Travel Assistant</h1>
            </div>
          </div>
          
          {/* Session Info */}
          <div className="flex items-center space-x-3">
            {sessionId && (
              <div className="hidden md:flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  Session: {sessionId.slice(-8)}
                </span>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {messages.length - 1} messages
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
          {messages.length === 1 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto px-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-2xl">✈️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Travel Assistant</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">Your AI travel companion ready to help you plan the perfect trip.</p>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {messages.slice(1).map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-start space-x-3 max-w-3xl ${message.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-medium">AI</span>
                    </div>
                  )}
                  {message.role === "user" && (
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">U</span>
                    </div>
                  )}
                  <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl max-w-full ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    }`}>
                      <div className="text-sm leading-relaxed">
                        {formatMessage(message.content, message.role)}
                      </div>
                    </div>
                    {message.timestamp && (
                      <div className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${
                        message.role === "user" ? "text-right" : "text-left"
                      }`}>
                        {formatTimestamp(message.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-medium">AI</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  className={`w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message Travel Assistant..."
                  disabled={isLoading}
                  rows="1"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                className={`p-3 rounded-xl font-medium transition-all duration-200 ${
                  isLoading || !input.trim()
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Travel Assistant can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
