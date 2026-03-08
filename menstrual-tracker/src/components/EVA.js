import React, { useState, useContext, useEffect, useRef } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import API_URL from "../config";
import "../styles/EVA.css";

const EVA = () => {
  const { token } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const sessionId = useRef('default'); // Use consistent session ID

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history on component mount
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!token) return;

      try {
        const response = await axios.get(
          `${API_URL}/api/eva/conversations?sessionId=${sessionId.current}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.messages && response.data.messages.length > 0) {
          const formattedMessages = response.data.messages.map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: new Date(msg.timestamp).toLocaleTimeString(),
            context: msg.context
          }));
          setMessages(formattedMessages);
        } else {
          // Add welcome message only if no conversation history exists
          setMessages([
            {
              id: 1,
              type: "ai",
              content: "Hello! I'm EVA, your Empathic Virtual Assistant. I'm here to support you through your menstrual health journey with understanding and care. How are you feeling today?",
              timestamp: new Date().toLocaleTimeString(),
              context: {}
            }
          ]);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error("Error loading conversation history:", error);
        // Fallback to welcome message
        setMessages([
          {
            id: 1,
            type: "ai", 
            content: "Hello! I'm EVA, your Empathic Virtual Assistant. I'm here to support you through your menstrual health journey. How are you feeling today?",
            timestamp: new Date().toLocaleTimeString(),
            context: {}
          }
        ]);
        setIsInitialized(true);
      }
    };

    loadConversationHistory();
  }, [token]);

  const addMessage = (type, content, context = {}) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date().toLocaleTimeString(),
      context
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !token || loading) {
      if (!token) {
        setError("Please log in to chat with EVA.");
      }
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setError("");
    
    // Add user message
    addMessage("user", userMessage);
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/eva/chat`,
        {
          message: userMessage,
          sessionId: sessionId.current
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 second timeout for AI responses
        }
      );
      
      // Add AI response
      addMessage("ai", response.data.response, response.data.context);
      
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      let errorMessage = "I'm experiencing some technical difficulties right now. ";
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += "The response is taking longer than expected. Please try asking your question again.";
      } else if (error.response?.status === 429) {
        errorMessage += "I'm getting a lot of requests right now. Please wait a moment and try again.";
      } else if (error.response?.status >= 500) {
        errorMessage += "There seems to be a server issue. Please try again in a few minutes.";
      } else {
        errorMessage += "Please try rephrasing your question or ask me something else.";
      }
      
      addMessage("ai", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearConversation = async () => {
    if (!token) return;

    try {
      await axios.delete(
        `${API_URL}/api/eva/conversations`,
        {
          data: { sessionId: sessionId.current },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Reset to welcome message
      setMessages([
        {
          id: Date.now(),
          type: "ai",
          content: "Hello! I'm EVA, your Empathic Virtual Assistant. I'm here to support you through your menstrual health journey. How are you feeling today?",
          timestamp: new Date().toLocaleTimeString(),
          context: {}
        }
      ]);
      
    } catch (error) {
      console.error("Error clearing conversation:", error);
      setError("Could not clear conversation. Please try again.");
    }
  };

  // Conversational quick prompts that encourage open dialogue
  const quickPrompts = [
    { text: "I'm feeling overwhelmed today", action: () => setInputMessage("I'm feeling overwhelmed today") },
    { text: "Help me understand my cycle", action: () => setInputMessage("Help me understand my cycle") },
    { text: "I'm having mood swings", action: () => setInputMessage("I'm having mood swings") },
    { text: "What should I eat during my period?", action: () => setInputMessage("What should I eat during my period?") }
  ];

  if (!isInitialized) {
    return (
      <div className="eva-container">
        <div className="loading-container">
          <div className="ai-orb">
            <div className="orb-inner"></div>
            <div className="orb-pulse"></div>
          </div>
          <p>Loading your conversation with EVA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eva-container">
      <div className="eva-header">
        <div className="eva-avatar">
          <div className="ai-orb">
            <div className="orb-inner"></div>
            <div className="orb-pulse"></div>
          </div>
        </div>
        <div className="eva-info">
          <h1 className="eva-title">🌙 EVA</h1>
          <p className="eva-subtitle">Empathic Virtual Assistant</p>
          <div className="eva-status">
            <span className="status-indicator online"></span>
            <span>Ready to listen and support</span>
          </div>
        </div>
        <div className="eva-actions">
          <button 
            onClick={handleClearConversation}
            className="clear-button"
            disabled={loading}
            title="Start a new conversation"
          >
            ↻ New Chat
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                <div className="message-text">
                  {message.content.split('\n').map((line, index) => (
                    <div key={index}>
                      {line.includes('**') ? (
                        <strong>{line.replace(/\*\*/g, '')}</strong>
                      ) : (
                        line
                      )}
                    </div>
                  ))}
                </div>
                <div className="message-meta">
                  <span className="message-timestamp">{message.timestamp}</span>
                  {message.context?.phase && (
                    <span className="message-phase">{message.context.phase} phase</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message ai loading">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="typing-text">EVA is thinking...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="quick-actions">
            <p className="quick-actions-title">Try asking EVA:</p>
            <div className="quick-buttons">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  className="quick-button"
                  onClick={prompt.action}
                  disabled={loading}
                >
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share what's on your mind... EVA is here to listen and support you."
            className="message-input"
            disabled={loading || !token}
            rows="2"
          />
          <button
            onClick={handleSendMessage}
            className="send-button"
            disabled={!inputMessage.trim() || loading || !token}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>

      <div className="eva-disclaimer">
        <strong>EVA is your supportive companion</strong> - She provides empathetic guidance and general health information. For serious medical concerns, always consult with a healthcare provider.
      </div>
    </div>
  );
};

export default EVA;