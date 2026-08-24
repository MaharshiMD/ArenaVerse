import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import {
  Shield, AlertTriangle, Users, MessageSquare, Megaphone,
  CheckCircle, XCircle, Clock, Eye, Flag, UserX, Send, RefreshCw, FileText
} from 'lucide-react';
import './ModeratorDashboard.css';

const ModeratorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    pendingComplaints: 0,
    totalWarnings: 0,
    activeTempBans: 0,
    totalTeams: 0,
    escalatedComplaints: 0,
  });

  const [complaints, setComplaints] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Complaint for Modal Inspection / Resolution
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modNote, setModNote] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [error, setError] = useState('');

  // Action Modals
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [warningCategory, setWarningCategory] = useState('rule_violation');

  const [banDays, setBanDays] = useState(1);
  const [banReason, setBanReason] = useState('');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const token = localStorage.getItem('token');

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const url = statusFilter
        ? `${API_BASE_URL}/api/moderator/complaints?status=${statusFilter}`
        : `${API_BASE_URL}/api/moderator/complaints`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchComplaints(), fetchTeams()]);
      setLoading(false);
    };
    loadAllData();
  }, [statusFilter]);

  const handleUpdateStatus = async (complaintId, newStatus, resolutionAction = 'none') => {
    try {
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/moderator/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          moderatorNotes: modNote,
          resolutionAction,
        }),
      });

      if (res.ok) {
        setActionSuccess(`Ticket updated to ${newStatus}`);
        setSelectedComplaint(null);
        setModNote('');
        fetchStats();
        fetchComplaints();
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to update ticket');
      }
    } catch (err) {
      setError('Connection error updating ticket');
    }
  };

  const handleIssueWarning = async (e) => {
    e.preventDefault();
    if (!selectedComplaint?.reportedUser?._id && !selectedComplaint?.reporter?._id) {
      setError('No reported user attached to this ticket');
      return;
    }
    const targetUserId = selectedComplaint.reportedUser?._id || selectedComplaint.reporter._id;

    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/warnings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: targetUserId,
          category: warningCategory,
          reason: warningReason,
          complaintId: selectedComplaint._id,
        }),
      });

      if (res.ok) {
        setActionSuccess('Official warning issued successfully');
        setShowWarningModal(false);
        setSelectedComplaint(null);
        setWarningReason('');
        fetchStats();
        fetchComplaints();
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to issue warning');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
  };

  const handleApplyTempBan = async (e) => {
    e.preventDefault();
    if (!selectedComplaint?.reportedUser?._id) {
      setError('No reported user selected for ban');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/temp-ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedComplaint.reportedUser._id,
          durationDays: banDays,
          reason: banReason,
          complaintId: selectedComplaint._id,
        }),
      });

      if (res.ok) {
        setActionSuccess(`Applied ${banDays}-day temporary ban to user`);
        setShowBanModal(false);
        setSelectedComplaint(null);
        setBanReason('');
        fetchStats();
        fetchComplaints();
        setTimeout(() => setActionSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to apply ban');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/moderator/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
        }),
      });

      if (res.ok) {
        setActionSuccess('Staff announcement broadcasted successfully!');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      setError('Failed to send broadcast');
    }
  };

  return (
    <div className="moderator-dashboard-container">
      {/* Top Banner Header */}
      <div className="mod-header-banner">
        <div>
          <div className="mod-badge-pill">
            <Shield size={14} /> Staff / Moderator Workspace
          </div>
          <h1 style={{ margin: '8px 0 4px 0', fontSize: '1.8rem', fontWeight: 800 }}>
            Moderation & Discrepancy Operations
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            Review player complaints, enforce community safety, manage team rosters, and handle escalations.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchComplaints();
            fetchTeams();
          }}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600, textAlign: 'center' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="mod-grid-4">
        <div className="mod-stat-card">
          <div className="mod-stat-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.pendingComplaints}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Pending Complaints</div>
          </div>
        </div>

        <div className="mod-stat-card">
          <div className="mod-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <Flag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalWarnings}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Issued Warnings</div>
          </div>
        </div>

        <div className="mod-stat-card">
          <div className="mod-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <UserX size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.activeTempBans}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Active Temp Bans</div>
          </div>
        </div>

        <div className="mod-stat-card">
          <div className="mod-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalTeams}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Active Teams</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mod-nav-tabs">
        <button
          className={`mod-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FileText size={16} /> Complaints & Disputes ({complaints.length})
        </button>

        <button
          className={`mod-tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          <Users size={16} /> Manage Teams & Rosters ({teams.length})
        </button>

        <button
          className={`mod-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcast')}
        >
          <Megaphone size={16} /> Staff Broadcast Center
        </button>
      </div>

      {/* TAB 1: COMPLAINTS & DISPUTES */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>User Complaints & Ticket Feed</h2>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated to Admin</option>
              </select>
            </div>
          </div>

          {complaints.length === 0 ? (
            <div style={{ textAlignment: 'center', padding: '3rem', background: 'rgba(15, 17, 26, 0.5)', borderRadius: '12px', color: '#94a3b8' }}>
              <CheckCircle size={36} style={{ margin: '0 auto 12px auto', display: 'block', color: '#4ade80' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No complaints match the selected filter.</p>
            </div>
          ) : (
            complaints.map((item) => (
              <div key={item._id} className="mod-complaint-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className={`badge-status badge-${item.status}`}>{item.status}</span>
                      <span style={{ fontSize: '0.8rem', color: '#a78bfa', fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.ticketId}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        • Reported by <strong>@{item.reporter?.username || 'Unknown'}</strong>
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '4px 0' }}>{item.title}</h3>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedComplaint(item)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Eye size={14} /> Inspect Ticket
                  </button>
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
                  {item.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.825rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  {item.reportedUser && <div>Target User: <strong style={{ color: '#f87171' }}>@{item.reportedUser.username}</strong></div>}
                  {item.reportedTeam && <div>Target Team: <strong style={{ color: '#60a5fa' }}>{item.reportedTeam.name}</strong></div>}
                  {item.reportedTournament && <div>Tournament: <strong style={{ color: '#a78bfa' }}>{item.reportedTournament.title}</strong></div>}
                  <div>Category: <strong style={{ textTransform: 'capitalize', color: '#e2e8f0' }}>{item.type}</strong></div>
                  {item.assignedModerator && <div>Assigned Staff: <strong style={{ color: '#4ade80' }}>@{item.assignedModerator.username}</strong></div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: MANAGE TEAMS */}
      {activeTab === 'teams' && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Platform Teams & Roster Oversight</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {teams.map((t) => (
              <div key={t._id} style={{ background: 'rgba(15, 17, 26, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                  <img src={t.logo || '/images/default-team.png'} alt={t.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{t.name} [{t.tag}]</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Captain: @{t.captain?.username}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>Roster ({t.members?.length || 0} Members):</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {t.members?.map((m) => (
                    <div key={m.user?._id || m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <span>@{m.user?.username || 'Member'} <small style={{ color: '#94a3b8' }}>({m.role})</small></span>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Remove @${m.user?.username} from team ${t.name}?`)) {
                            const res = await fetch(`${API_BASE_URL}/api/moderator/teams/${t._id}/members/${m.user._id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) {
                              fetchTeams();
                            }
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STAFF BROADCAST */}
      {activeTab === 'broadcast' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', background: 'rgba(15, 17, 26, 0.8)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={20} style={{ color: '#a78bfa' }} /> Dispatch Staff Broadcast
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Send official announcements, rule reminders, or emergency maintenance notices to players.
          </p>

          <form onSubmit={handleSendBroadcast}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Broadcast Subject</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Fair Play Reminder & Tournament Schedule Update"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Message Body</label>
              <textarea
                rows="5"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Enter formal announcement message..."
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', resize: 'vertical' }}
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={16} /> Broadcast Staff Announcement
            </button>
          </form>
        </div>
      )}

      {/* INSPECT COMPLAINT MODAL */}
      {selectedComplaint && (
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Inspect Ticket #{selectedComplaint.ticketId}</h3>
              <button onClick={() => setSelectedComplaint(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Title:</strong> {selectedComplaint.title}</div>
              <div style={{ marginTop: '6px' }}><strong>Reporter:</strong> @{selectedComplaint.reporter?.username} ({selectedComplaint.reporter?.email})</div>
              {selectedComplaint.reportedUser && (
                <div style={{ marginTop: '6px', color: '#f87171' }}>
                  <strong>Reported Player:</strong> @{selectedComplaint.reportedUser.username} (Warnings: {selectedComplaint.reportedUser.warningsCount || 0})
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Moderator Investigation Notes</label>
              <textarea
                rows="3"
                value={modNote}
                onChange={(e) => setModNote(e.target.value)}
                placeholder="Add private moderator investigation notes..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleUpdateStatus(selectedComplaint._id, 'investigating')}
              >
                Mark Investigating
              </button>

              <button
                className="btn btn-secondary btn-sm"
                style={{ borderColor: '#facc15', color: '#facc15' }}
                onClick={() => setShowWarningModal(true)}
              >
                Issue Warning
              </button>

              {selectedComplaint.reportedUser && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ borderColor: '#f87171', color: '#f87171' }}
                  onClick={() => setShowBanModal(true)}
                >
                  Apply Temp Ban
                </button>
              )}

              <button
                className="btn btn-secondary btn-sm"
                style={{ borderColor: '#a78bfa', color: '#a78bfa' }}
                onClick={() => handleUpdateStatus(selectedComplaint._id, 'escalated', 'escalated_to_admin')}
              >
                Escalate to Admin
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleUpdateStatus(selectedComplaint._id, 'resolved', 'dismissed')}
              >
                Resolve & Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE WARNING MODAL */}
      {showWarningModal && selectedComplaint && (
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 800 }}>Issue Formal Rule Warning</h3>
            <form onSubmit={handleIssueWarning}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Category</label>
                <select
                  value={warningCategory}
                  onChange={(e) => setWarningCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                  <option value="rule_violation">Tournament Rule Violation</option>
                  <option value="unsportsmanlike">Toxicity / Unsportsmanlike</option>
                  <option value="spam">Spam / Advertising</option>
                  <option value="roster_infringement">Roster Infringement</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Warning Reason & Context</label>
                <textarea
                  rows="3"
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="Specify violation details..."
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowWarningModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Issue Official Warning</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLY TEMP BAN MODAL */}
      {showBanModal && selectedComplaint && (
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>Apply Temporary Account Ban</h3>
            <form onSubmit={handleApplyTempBan}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Ban Duration</label>
                <select
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                  <option value="1">24 Hours (1 Day)</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Ban Reason</label>
                <textarea
                  rows="3"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Specify violation reason for temporary suspension..."
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBanModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#ef4444' }}>Apply Temporary Ban</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorDashboard;
