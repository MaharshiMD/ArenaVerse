import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, Send, Pin, Shield, Lock, Trash2, Check, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './TournamentChat.css';

const TournamentChat = ({ tournamentId, isOrganizer }) => {
  const { user, getAuthHeader } = useAuth();
  const socket = useSocket();

  const [messages, setMessages] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [canChat, setCanChat] = useState(true);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const chatBottomRef = useRef(null);

  const fetchChatHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/chat`, {
        headers: getAuthHeader(),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setCanChat(false);
          setError(data.message || 'Only registered participants can access live chat.');
        } else {
          throw new Error(data.message || 'Failed to load chat');
        }
      } else {
        setMessages(data.messages || []);
        setPinnedMessage(data.pinnedMessage || null);
        setCanChat(data.canChat ?? true);
      }
    } catch (err) {
      setError(err.message || 'Could not connect to tournament chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId && user) {
      fetchChatHistory();
    }
  }, [tournamentId, user]);

  // Handle Socket.io real-time chat updates
  useEffect(() => {
    if (!socket || !tournamentId) return;

    socket.emit('join_tournament', tournamentId);

    const handleNewMessage = (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    };

    const handlePinnedMessage = (pinnedMsg) => {
      setPinnedMessage(pinnedMsg);
    };

    socket.on('chat_message', handleNewMessage);
    socket.on('chat_pinned', handlePinnedMessage);

    return () => {
      socket.off('chat_message', handleNewMessage);
      socket.off('chat_pinned', handlePinnedMessage);
    };
  }, [socket, tournamentId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !canChat) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/chat`, {
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

  const handlePinMessage = async (messageId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/chat/${messageId}/pin`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to pin message');
      }

      const data = await res.json();
      setPinnedMessage(data.pinnedMessage);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnpinMessage = async () => {
    if (!pinnedMessage) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/chat/${pinnedMessage._id}/unpin`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to unpin message');
      }

      setPinnedMessage(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const DEFAULT_AVATAR = '/images/default-avatar.png';

  return (
    <div className="tournament-chat-card glass-panel">
      {/* Header */}
      <div className="chat-card-header">
        <div className="chat-title-group">
          <MessageSquare size={18} className="text-primary" />
          <h4>Tournament Live Chat Room</h4>
        </div>
        <span className="live-status-pill">● LIVE</span>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="pinned-message-banner">
          <div className="pinned-header">
            <span className="pinned-label"><Pin size={14} /> PINNED BY ORGANIZER</span>
            {isOrganizer && (
              <button onClick={handleUnpinMessage} className="btn-unpin" title="Unpin Message">
                Unpin
              </button>
            )}
          </div>
          <div className="pinned-content">
            <strong>@{pinnedMessage.sender?.username}:</strong> {pinnedMessage.text}
          </div>
        </div>
      )}

      {/* Chat Messages Feed */}
      <div className="chat-feed-box">
        {loading ? (
          <p className="text-muted text-center py-4">Connecting to live chat room...</p>
        ) : !canChat ? (
          <div className="chat-locked-notice">
            <Lock size={32} className="text-muted mb-2" />
            <p className="text-secondary">{error}</p>
            <span className="text-muted text-xs">Register for this tournament to participate in player discussion.</span>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted text-center py-4">No messages yet. Be the first competitor to say hello!</p>
        ) : (
          messages.map((m) => {
            const senderName = m.sender?.username || 'Player';
            const senderAvatar = m.sender?.profile?.avatar || DEFAULT_AVATAR;
            const isHost = m.sender?.role === 'organizer' || m.sender?.role === 'admin';

            return (
              <div key={m._id} className={`chat-message-row ${m.isPinned ? 'is-pinned-msg' : ''}`}>
                <img src={senderAvatar} alt={senderName} className="chat-avatar" />
                <div className="chat-message-body">
                  <div className="chat-meta-row">
                    <Link to={`/players/${senderName}`} className="chat-sender-name">
                      @{senderName}
                    </Link>
                    {isHost && <span className="host-badge">HOST</span>}
                    <span className="chat-time text-muted text-xs">
                      {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOrganizer && (
                      <button 
                        onClick={() => handlePinMessage(m._id)}
                        className={`btn-pin-action ${m.isPinned ? 'active' : ''}`}
                        title="Pin Message"
                      >
                        <Pin size={12} />
                      </button>
                    )}
                  </div>
                  <p className="chat-text">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Message Input Form */}
      {canChat && (
        <form onSubmit={handleSend} className="chat-input-form mt-3">
          <input 
            type="text" 
            className="form-control chat-input" 
            placeholder="Type a message to competitors..." 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary btn-chat-send" disabled={!text.trim() || sending}>
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
};

export default TournamentChat;
