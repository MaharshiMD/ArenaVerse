import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import { Users, Trophy, Shield, Trash2, Eye, Edit2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user, getAuthHeader } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [reports, setReports] = useState([]);
  const [verifications, setVerifications] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Failed to load admin stats');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reports`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const json = await res.json();
        setReports(json);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const fetchVerifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/verifications`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const json = await res.json();
        setVerifications(json);
      }
    } catch (err) {
      console.error('Failed to fetch verifications:', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchStats();
      fetchReports();
      fetchVerifications();
    }
  }, [user]);

  const handleReviewVerification = async (userId, username, status) => {
    const adminNote = window.prompt(`Enter review note for organizer '@${username}' (${status.toUpperCase()}):`, status === 'approved' ? 'Verified Official Organizer' : 'Application documentation insufficient');
    if (adminNote === null) return;
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/verifications/${userId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setActionMessage(`Organizer '@${username}' verification set to ${status.toUpperCase()}.`);
      fetchVerifications();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (userId, username, newStatus) => {
    let reason = '';
    if (newStatus !== 'active') {
      reason = window.prompt(`Enter reason for ${newStatus.toUpperCase()} action on user '${username}':`, 'Violation of community terms');
      if (reason === null) return;
    }
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || 'Status update failed');

      setActionMessage(`User '${username}' status updated to '${newStatus.toUpperCase()}'.`);
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResolveDispute = async (reportId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setActionMessage('Dispute successfully marked as resolved.');
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this inappropriate review?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setActionMessage('Review removed by Admin.');
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user '${username}'? This action is permanent.`)) return;
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || 'Delete failed');

      setActionMessage(`User account '${username}' removed successfully.`);
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ role: newRole }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || 'Role update failed');

      setActionMessage(`User role successfully changed to '${newRole}'.`);
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTournament = async (tournamentId, name) => {
    if (!window.confirm(`Are you sure you want to delete tournament '${name}'? All brackets and matches will be deleted.`)) return;
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || 'Delete failed');

      setActionMessage(`Tournament '${name}' wiped successfully.`);
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTeam = async (teamId, name) => {
    if (!window.confirm(`Are you sure you want to disband/delete team '${name}'?`)) return;
    setActionMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || 'Delete failed');

      setActionMessage(`Team '${name}' deleted successfully.`);
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container py-4 text-center mt-4">
        <div className="glass-panel text-center">
          <ShieldAlert className="warning-icon mb-4" size={40} />
          <h3>Access Denied</h3>
          <p>This panel is restricted to platform super-administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="text-center mt-4"><p>Loading system metrics...</p></div>;
  if (error) return <div className="text-center mt-4 error-text"><p>{error}</p></div>;
  if (!data) return <div className="text-center mt-4"><p>No statistics found.</p></div>;

  return (
    <div className="admin-dashboard-page container py-4 mt-4">
      <div className="dashboard-header-row mb-4">
        <div>
          <h2>Master Super-Admin Console</h2>
          <p className="subtitle text-secondary">Full system governance across users, roles, tournaments, and team arenas.</p>
        </div>
        <Link to="/organizer-dashboard" className="btn btn-primary">
          Open Organizer Studio
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-stats-grid grid-3 mb-4">
        <StatCard title="Registered Users" value={data.stats.totalUsers} icon={Users} />
        <StatCard title="Total Teams" value={data.stats.totalTeams} icon={Shield} />
        <StatCard title="Tournaments Created" value={data.stats.totalTournaments} icon={Trophy} />
      </div>

      {actionMessage && <p className="success-text mb-4 p-2 glass-panel">{actionMessage}</p>}

      {/* Admin Panels Split */}
      <div className="dashboard-split mt-4">
        {/* User Account Controls & Moderation Status */}
        <div className="dashboard-card glass-panel flex-1">
          <h3>User Moderation & Account Governance</h3>
          <div className="table-responsive mt-4">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <strong>@{u.username}</strong>
                      <div className="text-muted text-xs">{u.email}</div>
                    </td>
                    <td>
                      <select 
                        className="form-control form-control-sm text-xs"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      >
                        <option value="player">Player</option>
                        <option value="organizer">Organizer</option>
                        <option value="moderator">Staff Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge badge-${u.status || 'active'}`}>
                        {(u.status || 'active').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {u._id.toString() !== user.id.toString() ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {(u.status || 'active') === 'active' ? (
                            <>
                              <button 
                                className="btn btn-warning btn-sm py-1 px-2 text-xs"
                                onClick={() => handleStatusChange(u._id, u.username, 'suspended')}
                                title="Suspend User"
                              >
                                Suspend
                              </button>
                              <button 
                                className="btn btn-danger btn-sm py-1 px-2 text-xs"
                                onClick={() => handleStatusChange(u._id, u.username, 'banned')}
                                title="Ban User"
                              >
                                Ban
                              </button>
                            </>
                          ) : (
                            <button 
                              className="btn btn-primary btn-sm py-1 px-2 text-xs"
                              onClick={() => handleStatusChange(u._id, u.username, 'active')}
                              title="Reactivate User Account"
                            >
                              Reactivate
                            </button>
                          )}
                          <button 
                            className="btn-action-delete"
                            onClick={() => handleDeleteUser(u._id, u.username)}
                            title="Delete User Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Admin (You)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tournament Management Controls */}
        <div className="dashboard-card glass-panel flex-1">
          <h3>All Tournaments Index</h3>
          <div className="tournaments-list-small mt-4">
            {data.tournaments.length === 0 ? (
              <p className="text-muted">No tournaments found.</p>
            ) : (
              data.tournaments.map(t => (
                <div key={t._id} className="small-list-item">
                  <div>
                    <h4>{t.name}</h4>
                    <p className="text-secondary">{t.game} | Org: {t.organizer?.username || 'System'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${t.status}`}>{t.status}</span>
                    <Link to={`/tournaments/${t._id}`} className="btn-table-action" title="Inspect Arena">
                      <Eye size={16} />
                    </Link>
                    <button 
                      className="btn-action-delete"
                      onClick={() => handleDeleteTournament(t._id, t.name)}
                      title="Force Delete Tournament"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <h3 className="mt-4 pt-4 border-t">All Teams Index</h3>
          <div className="tournaments-list-small mt-4">
            {data.teams.length === 0 ? (
              <p className="text-muted">No teams created yet.</p>
            ) : (
              data.teams.map(tm => (
                <div key={tm._id} className="small-list-item">
                  <div>
                    <h4>{tm.name}</h4>
                    <p className="text-secondary">Capt: {tm.captain?.username || 'Unknown'} | Members: {tm.members.length}</p>
                  </div>
                  <button 
                    className="btn-action-delete"
                    onClick={() => handleDeleteTeam(tm._id, tm.name)}
                    title="Force Delete Team"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reported Disputes & Review Moderation */}
      <div className="dashboard-card glass-panel mt-4">
        <h3>Reported Tournament Disputes & Review Moderation</h3>
        {reports.length === 0 ? (
          <p className="text-muted text-center py-4 mt-2">No open disputes or issue reports flagged by competitors.</p>
        ) : (
          <div className="reports-list mt-4 flex-col gap-3">
            {reports.map((rep) => (
              <div key={rep._id} className="small-list-item glass-panel p-3" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-danger">DISPUTE REPORT</span>
                    <strong className="text-sm">Tournament: {rep.tournament?.name || 'Tournament'}</strong>
                    <span className="text-muted text-xs">({rep.tournament?.game})</span>
                  </div>

                  <p className="text-xs text-secondary mt-1">
                    Reporter: <strong>@{rep.player?.username}</strong> | Organizer: <strong>@{rep.organizer?.username}</strong>
                  </p>

                  <p className="text-warning font-semibold text-xs mt-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    ⚠️ Reported Issue: "{rep.reportedIssue}"
                  </p>

                  {rep.review && (
                    <p className="text-xs text-muted mt-1">Competitor Review: "{rep.review}" ({rep.rating} ★)</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="btn btn-primary btn-sm py-1 text-xs"
                    onClick={() => handleResolveDispute(rep._id)}
                  >
                    Resolve Dispute
                  </button>
                  <button 
                    className="btn btn-danger btn-sm py-1 text-xs"
                    onClick={() => handleDeleteReview(rep._id)}
                  >
                    Delete Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizer Verification Applications Panel */}
      <div className="dashboard-card glass-panel mt-4">
        <h3>💙 Organizer Verification Applications</h3>
        <p className="text-secondary text-sm">Review organizer requests for the verified checkmark badge.</p>
        
        {verifications.length === 0 ? (
          <p className="text-muted text-center py-4 mt-2">No organizer verification applications submitted.</p>
        ) : (
          <div className="verifications-list mt-4 flex-col gap-3">
            {verifications.map((v) => (
              <div key={v._id} className="small-list-item glass-panel p-3" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.05)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong className="text-md">@{v.username}</strong>
                    <span className={`badge badge-${v.verificationStatus === 'approved' ? 'success' : v.verificationStatus === 'pending' ? 'warning' : 'danger'}`}>
                      {v.verificationStatus.toUpperCase()}
                    </span>
                    {v.isVerifiedOrganizer && (
                      <span className="badge" style={{ background: '#3b82f6', color: '#fff' }}>VERIFIED</span>
                    )}
                  </div>

                  <p className="text-xs text-secondary mt-1">
                    Organization: <strong>{v.verificationRequest?.organizationName || v.username}</strong> | Email: <strong>{v.email}</strong>
                  </p>

                  <p className="text-xs text-white mt-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    Hosting Experience: "{v.verificationRequest?.reason || 'No description provided.'}"
                  </p>

                  {v.verificationRequest?.websiteUrl && (
                    <p className="text-xs text-primary mt-1">
                      Website: <a href={v.verificationRequest.websiteUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{v.verificationRequest.websiteUrl}</a>
                    </p>
                  )}

                  {v.verificationRequest?.adminNote && (
                    <p className="text-xs text-muted mt-1">
                      Admin Note: "{v.verificationRequest.adminNote}"
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {v.verificationStatus !== 'approved' && (
                    <button 
                      className="btn btn-primary btn-sm py-1 text-xs"
                      onClick={() => handleReviewVerification(v._id, v.username, 'approved')}
                    >
                      Approve & Grant Badge
                    </button>
                  )}
                  {v.verificationStatus !== 'rejected' && (
                    <button 
                      className="btn btn-danger btn-sm py-1 text-xs"
                      onClick={() => handleReviewVerification(v._id, v.username, 'rejected')}
                    >
                      Reject Application
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
