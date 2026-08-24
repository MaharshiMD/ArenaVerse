import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Send, X, Sparkles, HelpCircle, Shield, Calendar, BookOpen, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './AIAssistantWidget.css';

const AIAssistantWidget = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '👋 Hi! I am **ArenaBot**, your AI Tournament Assistant. Ask me about tournament rules, registration, match schedules, squad teams, or platform features!',
    },
  ]);

  const messagesEndRef = useRef(null);

  // Extract tournamentId if user is viewing a tournament page
  const match = location.pathname.match(/\/tournaments\/([a-fA-B0-9]{24})/);
  const currentTournamentId = match ? match[1] : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const newMessages = [...messages, { sender: 'user', text: textToSend.trim() }];
    setMessages(newMessages);
    if (!customText) setInputMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/ai-assistant/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: textToSend.trim(),
          tournamentId: currentTournamentId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI request failed');

      setMessages([...newMessages, { sender: 'bot', text: data.response }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { sender: 'bot', text: `⚠️ Sorry, I encountered an error: ${err.message}. Please try again.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    { label: '🔴 Live Tournaments', prompt: 'Which tournaments are live?' },
    { label: '📅 Upcoming Arenas', prompt: 'What tournaments are upcoming?' },
    { label: '📜 Rules & Policy', prompt: 'What are the tournament rules and guidelines?' },
    { label: '⏰ Match Schedule', prompt: 'When is the next match scheduled?' },
    { label: '🚨 Report Dispute', prompt: 'How do I report cheating or fake scores?' },
  ];

  return (
    <div className="ai-assistant-widget-container">
      {/* Widget Trigger Button */}
      {!isOpen && (
        <button className="ai-assistant-trigger-btn" onClick={() => setIsOpen(true)}>
          <Bot size={20} className="bot-icon-glow" />
          <span>ArenaBot AI</span>
          <span className="sparkle-badge"><Sparkles size={12} /></span>
        </button>
      )}

      {/* Chat Window Dialog */}
      {isOpen && (
        <div className="ai-assistant-window glass-panel">
          {/* Header Bar */}
          <div className="ai-assistant-header">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-primary" />
              <div>
                <h4 className="m-0 font-bold text-white text-sm">ArenaBot AI Assistant</h4>
                <p className="m-0 text-xs text-secondary">
                  {currentTournamentId ? '⚡ Context: Viewing Tournament' : '⚡ Context: ArenaVerse Platform'}
                </p>
              </div>
            </div>
            <button className="ai-assistant-close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="ai-assistant-body">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-chat-bubble-wrapper ${msg.sender}`}>
                <div className={`ai-chat-bubble ${msg.sender}`}>
                  <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-chat-bubble-wrapper bot">
                <div className="ai-chat-bubble bot typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="ai-assistant-suggestions">
            {QUICK_PROMPTS.map((p, idx) => (
              <button 
                key={idx} 
                className="suggestion-pill"
                onClick={() => handleSendMessage(p.prompt)}
                disabled={loading}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Form Bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="ai-assistant-footer"
          >
            <input 
              type="text" 
              className="form-control text-xs" 
              placeholder="Ask ArenaBot about rules, schedule, team setup..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !inputMessage.trim()}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
