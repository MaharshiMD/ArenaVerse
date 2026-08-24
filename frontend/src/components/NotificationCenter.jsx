import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Bell, Check, Trash2, X, Trophy, Users, Shield, Calendar, Swords, CreditCard, Megaphone, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { user, getAuthHeader } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Handle Socket.io real-time notifications
  useEffect(() => {
    if (!socket || !user) return;

    // Join user's personal notification room
    const userIdStr = (user.id || user._id)?.toString();
    if (userIdStr) {
      socket.emit('join_user', userIdStr);
    }

    const handleNewNotification = (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, link, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }

    if (link) {
      setIsOpen(false);
      navigate(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(prev => prev.filter(n => n._id !== id));
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'tournament_registration': return <Trophy size={16} className="notif-type-icon gold" />;
      case 'join_request': return <Users size={16} className="notif-type-icon blue" />;
      case 'team_invitation': return <Shield size={16} className="notif-type-icon purple" />;
      case 'match_scheduled': return <Calendar size={16} className="notif-type-icon info" />;
      case 'match_result': return <Swords size={16} className="notif-type-icon warning" />;
      case 'payment_success': return <CreditCard size={16} className="notif-type-icon success" />;
      case 'organizer_announcement': return <Megaphone size={16} className="notif-type-icon accent" />;
      case 'tournament_cancellation': return <AlertTriangle size={16} className="notif-type-icon danger" />;
      default: return <Bell size={16} className="notif-type-icon" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="notification-center-wrapper" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button 
        className="notification-bell-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown-panel glass-panel">
          <div className="notif-panel-header">
            <div className="notif-header-title">
              <h3>Notifications</h3>
              {unreadCount > 0 && <span className="unread-pill">{unreadCount} New</span>}
            </div>

            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="btn-mark-all-read">
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="notif-filter-tabs">
            <button 
              className={`notif-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`notif-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="notif-items-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => (
                <div 
                  key={notif._id} 
                  className={`notif-item-card ${!notif.read ? 'unread' : 'read'}`}
                  onClick={(e) => handleMarkAsRead(notif._id, notif.link, e)}
                >
                  <div className="notif-icon-col">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="notif-content-col">
                    <div className="notif-title-row">
                      <strong className="notif-item-title">{notif.title}</strong>
                      <span className="notif-time text-muted text-xs">
                        {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="notif-item-message">{notif.message}</p>
                  </div>
                  <div className="notif-actions-col">
                    {!notif.read && <span className="unread-dot" title="Unread"></span>}
                    <button 
                      className="btn-delete-notif" 
                      onClick={(e) => handleDelete(notif._id, e)}
                      title="Remove notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="notif-empty-state">
                <Bell size={32} className="empty-bell-icon" />
                <p className="text-secondary text-sm">No notifications found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
