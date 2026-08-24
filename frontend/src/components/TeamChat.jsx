import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Shield, Send, Lock, MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './TeamChat.css';

const TeamChat = ({ teamId, teamName }) => {
  const { user, getAuthHeader } = useAuth();
  const socket = useSocket();

  const [messages, setMessages] = useState([]);
  const [captainId, setCaptainId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const chatBottomRef = useRef(null);

  const fetchChatHistory = async () => {
    if (!teamId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/chat`, {
        headers: getAuthHeader(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load team chat');
      }

      setMessages(data.messages || []);
      setCaptainId(data.captainId || '');
    } catch (err) {
      setError(err.message || 'Could not connect to squad chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [teamId, user]);

  // Handle Socket.io real-time team chat updates
  useEffect(() => {
    if (!socket || !teamId) return;

    socket.emit('join_team', teamId);

    const handleNewMessage = (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    };

    socket.on('team_chat_message', handleNewMessage);

    return () => {
      socket.emit('leave_team', teamId);
      socket.off('team_chat_message', handleNewMessage);
    };
  }, [socket, teamId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send message');
      }

      setText('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const DEFAULT_AVATAR = '/images/default-avatar.png';

  return (
    <div className="team-chat-card glass-panel">
      {/* Header */}
      <div className="team-chat-header">
        <div className="team-chat-title">
          <Shield size={18} className="text-primary" />
          <h4>Private Squad Chat - {teamName || 'Team'}</h4>
        </div>
        <span className="squad-encrypted-badge">🔒 Encrypted Squad Room</span>
      </div>

      {/* Message Feed Box */}
      <div className="team-chat-feed">
        {loading ? (
          <p className="text-muted text-center py-4">Loading private squad chat...</p>
        ) : error ? (
          <div className="team-chat-locked">
            <Lock size={32} className="text-muted mb-2" />
            <p className="text-secondary">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted text-center py-4">No squad messages yet. Send a message to coordinate strategy!</p>
        ) : (
          messages.map((m) => {
            const senderName = m.sender?.username || 'Teammate';
            const senderAvatar = m.sender?.profile?.avatar || DEFAULT_AVATAR;
            const isCaptain = captainId && (m.sender?._id || m.sender)?.toString() === captainId.toString();

            return (
              <div key={m._id} className="team-chat-msg-row">
                <img src={senderAvatar} alt={senderName} className="team-chat-avatar" />
                <div className="team-chat-body">
                  <div className="team-chat-meta">
                    <strong className="team-sender-name">@{senderName}</strong>
                    {isCaptain && <span className="captain-badge">CAPTAIN</span>}
                    <span className="team-msg-time text-muted text-xs">
                      {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="team-msg-text">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Form */}
      {!error && (
        <form onSubmit={handleSend} className="team-chat-form mt-3">
          <input 
            type="text" 
            className="form-control team-chat-input" 
            placeholder="Type a message to squad mates..." 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary btn-team-send" disabled={!text.trim() || sending}>
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
};

export default TeamChat;
