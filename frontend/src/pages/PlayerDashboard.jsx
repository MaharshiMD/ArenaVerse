import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Trophy, Settings, Users, LogOut, Award, UserPlus, Instagram, MessageSquare, Youtube, Rss, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import TeamChat from '../components/TeamChat';
import AvatarFrame from '../components/AvatarFrame';
import { API_BASE_URL } from '../config/api';
import './Dashboard.css';
import '../styles/shared-tabs.css';

const DEFAULT_AVATAR = '/images/default-avatar.png';

const PREDEFINED_GAMES = [
  'Counter-Strike 2',
  'VALORANT',
  'Call of Duty: Black Ops 7',
  'Call of Duty: Warzone',
  'Overwatch 2',
  'Rainbow Six Siege',
  'Crossfire',
  'PUBG: Battlegrounds',
  'PUBG Mobile',
  'Battlegrounds Mobile India (BGMI)',
  'Free Fire MAX',
  'Fortnite',
  'Apex Legends',
  'League of Legends',
  'Dota 2',
  'Mobile Legends: Bang Bang',
  'Honor of Kings',
  'EA Sports FC 26',
  'eFootball',
  'Rocket League',
  'Trackmania',
  'Gran Turismo 7',
  'Tekken 8',
  'Street Fighter 6',
  'Fatal Fury: City of the Wolves',
  'Mortal Kombat 1',
  'Teamfight Tactics',
  'Pokémon UNITE',
  'Brawl Stars',
  'Clash Royale',
  'Clash of Clans',
  'Hearthstone',
  'Chess'
];

const getXUrl = (handleOrLink) => {
  if (!handleOrLink) return '';
  const trimmed = handleOrLink.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      if (url.hostname.includes('twitter.com') || url.hostname.includes('x.com')) {
        return url.href;
      }
    } catch (e) {
      // ignore
    }
  }
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return `https://x.com/${encodeURIComponent(username)}`;
};

const getInstagramUrl = (handleOrLink) => {
  if (!handleOrLink) return '';
  const trimmed = handleOrLink.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      if (url.hostname.includes('instagram.com')) {
        return url.href;
      }
    } catch (e) {
      // ignore
    }
  }
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return `https://instagram.com/${encodeURIComponent(username)}`;
};

const PlayerDashboard = () => {
  const { user, getAuthHeader } = useAuth();
  
  // States
  const [activeSubTab, setActiveSubTab] = useState('tournaments'); // 'tournaments', 'teams', 'payments', 'feed'
  const [joinedTournaments, setJoinedTournaments] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);

  // Team creation states
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamError, setTeamError] = useState('');
  const [teamSuccess, setTeamSuccess] = useState('');

  // Join team states
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [copiedTeamId, setCopiedTeamId] = useState('');

  // Search, requests, and invites states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [myInvitations, setMyInvitations] = useState([]);
  const [invitePlayerInput, setInvitePlayerInput] = useState({});
  const [inviteError, setInviteError] = useState({});
  const [inviteSuccess, setInviteSuccess] = useState({});
  const [openChatTeamId, setOpenChatTeamId] = useState(null);

  const handleCopyCode = (teamId, code) => {
    navigator.clipboard.writeText(code);
    setCopiedTeamId(teamId);
    setTimeout(() => {
      setCopiedTeamId('');
    }, 2000);
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch my teams
      const teamsRes = await fetch(`${API_BASE_URL}/api/teams/my`, {
        headers: getAuthHeader(),
      });
      let teamsData = [];
      if (teamsRes.ok) {
        teamsData = await teamsRes.json();
        setMyTeams(teamsData);
      }

      // 2. Fetch all tournaments to filter joined
      const tournsRes = await fetch(`${API_BASE_URL}/api/tournaments?limit=100`);
      if (tournsRes.ok) {
        const tournsData = await tournsRes.json();
        const list = Array.isArray(tournsData) ? tournsData : (tournsData.tournaments || []);
        const userIdStr = (user?.id || user?._id)?.toString();

        const joined = list.filter(t => {
          if (t.type === 'solo') {
            return t.registeredPlayers?.some(id => (id._id || id).toString() === userIdStr);
          } else {
            // Check if any of my teams is registered in this tournament
            return t.registeredTeams?.some(rtId => 
              teamsData.some(mt => (mt._id || mt.id).toString() === (rtId._id || rtId).toString())
            );
          }
        });
        setJoinedTournaments(joined);

        // Build match history (Completed matches for current player/teams)
        const allMatches = [];
        for (let t of joined) {
          const detailRes = await fetch(`${API_BASE_URL}/api/tournaments/${t._id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const completedUserMatches = (detailData.matches || []).filter(m => {
              const isCompleted = m.status === 'completed';
              if (!isCompleted) return false;
              
              if (t.type === 'solo') {
                return (
                  m.teamA.id?.toString() === userIdStr || 
                  m.teamB.id?.toString() === userIdStr
                );
              } else {
                return (
                  teamsData.some(mt => m.teamA.id?.toString() === (mt._id || mt.id).toString()) || 
                  teamsData.some(mt => m.teamB.id?.toString() === (mt._id || mt.id).toString())
                );
              }
            });
            allMatches.push(...completedUserMatches);
          }
        }
        setMatchHistory(allMatches);
      }

      // 3. Fetch incoming invitations
      const invitesRes = await fetch(`${API_BASE_URL}/api/teams/invitations`, {
        headers: getAuthHeader(),
      });
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setMyInvitations(invitesData);
      }

      // 4. Fetch payment history
      const paymentsRes = await fetch(`${API_BASE_URL}/api/payments/history`, {
        headers: getAuthHeader(),
      });
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData);
      }

      // 5. Fetch Activity Feed
      const feedRes = await fetch(`${API_BASE_URL}/api/follows/activity-feed`, {
        headers: getAuthHeader(),
      });
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setActivityFeed(feedData.activities || []);
      }
    } catch (err) {
      setError('Could not load dashboard information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError('');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/teams?name=${encodeURIComponent(searchQuery.trim())}`, {
          headers: getAuthHeader(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to search teams');
        setSearchResults(data);
      } catch (err) {
        setSearchError(err.message);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRequestJoin = async (teamId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/request-join`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send join request');
      alert(data.message || 'Join request sent successfully!');
      // Refresh search results
      const searchRes = await fetch(`${API_BASE_URL}/api/teams?name=${encodeURIComponent(searchQuery.trim())}`, {
        headers: getAuthHeader(),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        setSearchResults(searchData);
      }
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRespondToRequest = async (teamId, userId, action) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/requests/${userId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to respond to request');
      alert(data.message || `Request ${action}ed successfully!`);
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleInvitePlayer = async (e, teamId) => {
    e.preventDefault();
    const usernameOrEmail = invitePlayerInput[teamId] || '';
    if (!usernameOrEmail.trim()) return;

    setInviteError(prev => ({ ...prev, [teamId]: '' }));
    setInviteSuccess(prev => ({ ...prev, [teamId]: '' }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ usernameOrEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send invite');

      setInviteSuccess(prev => ({ ...prev, [teamId]: `Invitation sent to ${usernameOrEmail}!` }));
      setInvitePlayerInput(prev => ({ ...prev, [teamId]: '' }));
      fetchDashboardData();
    } catch (err) {
      setInviteError(prev => ({ ...prev, [teamId]: err.message }));
    }
  };

  const handleRespondToInvitation = async (teamId, action) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/invitations/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to respond to invitation');
      alert(data.message || `Invitation ${action}ed successfully!`);
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setTeamError('');
    setTeamSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ name: teamName, description: teamDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create team');

      setTeamSuccess(`Squad '${data.name}' formed successfully!`);
      setTeamName('');
      setTeamDesc('');
      fetchDashboardData();
    } catch (err) {
      setTeamError(err.message);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to join');

      setJoinSuccess(`Successfully joined squad '${data.team.name}'!`);
      setInviteCode('');
      fetchDashboardData();
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/leave`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to leave team');

      alert(data.message);
      fetchDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) return <div className="text-center mt-4"><p>Access Denied. Please log in.</p></div>;
  if (loading) return <div className="text-center mt-4"><p>Loading workspace statistics...</p></div>;

  return (
    <div className="player-dashboard-page container py-4 mt-4">
      {/* User Card */}
      <div className="player-profile-panel glass-panel mb-4">
        <div className="player-avatar-large" style={{ display: 'flex', alignItems: 'center' }}>
          <AvatarFrame 
            src={user.profile?.avatar || DEFAULT_AVATAR} 
            alt={user.username} 
            size={80} 
            frame={user.profile?.equippedFrame || 'Default'} 
          />
        </div>
        <div className="player-profile-details">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 className="m-0">{user.username}</h2>
            {user.profile?.equippedTitle && (
              <span className="equipped-title-badge">👑 {user.profile.equippedTitle}</span>
            )}
          </div>
          <span className="badge badge-player mt-1">{user.role}</span>
          
          <div className="player-socials-row mt-2 mb-2" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            {user.profile?.socialLinks?.discord && (
              <div className="flex items-center gap-1 text-secondary text-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Discord tag">
                <MessageSquare size={16} />
                <span>{user.profile.socialLinks.discord}</span>
              </div>
            )}
            {user.profile?.socialLinks?.twitter && (
              <a 
                href={getXUrl(user.profile.socialLinks.twitter)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1 text-primary text-sm" 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }} 
                title="X Profile"
              >
                <strong style={{ fontSize: '13px', fontFamily: 'sans-serif' }}>X</strong>
                <span>Profile</span>
              </a>
            )}
            {user.profile?.socialLinks?.instagram && (
              <a 
                href={getInstagramUrl(user.profile.socialLinks.instagram)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1 text-sm" 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline', color: '#E1306C' }} 
                title="Instagram Profile"
              >
                <Instagram size={16} />
                <span>Instagram</span>
              </a>
            )}
          </div>

          {user.profile?.favoriteGames && user.profile.favoriteGames.length > 0 && (
            <div className="mt-1 mb-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {user.profile.favoriteGames.map(game => (
                <span key={game} className="badge badge-draft text-xs">
                  🎮 {game}
                </span>
              ))}
            </div>
          )}

          <p className="bio-display text-secondary" style={{ marginTop: '5px' }}>{user.profile?.bio || 'Ready to compete, conquer, and make my mark in the arena.'}</p>
        </div>
      </div>

      {/* Nav Controls */}
      <div className="details-tabs mb-4">
        <button className={`tab-btn ${activeSubTab === 'tournaments' ? 'active' : ''}`} onClick={() => setActiveSubTab('tournaments')}>
          Tournaments & Matches
        </button>
        <button className={`tab-btn ${activeSubTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveSubTab('teams')}>
          My Squads
        </button>
        <button className={`tab-btn ${activeSubTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveSubTab('payments')}>
          Payment History
        </button>
        <button className={`tab-btn ${activeSubTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveSubTab('feed')}>
          <Rss size={15} style={{ display: 'inline', marginRight: '6px' }} /> Following Activity Feed ({activityFeed.length})
        </button>
      </div>

      {/* Tab Pages */}
      <div className="tab-panels-content">
        {activeSubTab === 'tournaments' && (
          <div className="dashboard-split">
            {/* Joined Tournaments */}
            <div className="glass-panel flex-1">
              <h3>Registered Tournaments</h3>
              <div className="small-list-container mt-4">
                {joinedTournaments.length === 0 ? (
                  <p className="text-muted text-center py-4">You have not registered for any tournaments.</p>
                ) : (
                  joinedTournaments.map(t => (
                    <div key={t._id} className="small-list-item">
                      <div>
                        <h4>{t.name}</h4>
                        <p className="text-secondary">{t.game} | {t.type} registration</p>
                      </div>
                      <Link to={`/tournaments/${t._id}`} className="btn btn-secondary btn-sm">
                        View Bracket
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Match History */}
            <div className="glass-panel flex-1">
              <h3>Completed Match History</h3>
              <div className="small-list-container mt-4">
                {matchHistory.length === 0 ? (
                  <p className="text-muted text-center py-4">No completed matches recorded yet.</p>
                ) : (
                  matchHistory.map(m => {
                    const didWin = m.winner.toString() === user.id.toString() || myTeams.some(mt => m.winner.toString() === mt._id.toString());
                    return (
                      <div key={m._id} className={`small-list-item match-history-item ${didWin ? 'win' : 'lose'}`}>
                        <div>
                          <strong>{m.teamA.name} vs {m.teamB.name}</strong>
                          <span className="block text-secondary">Score: {m.scoreA} - {m.scoreB}</span>
                        </div>
                        <span className={`badge ${didWin ? 'badge-completed' : 'badge-draft'}`}>
                          {didWin ? 'VICTORY' : 'DEFEAT'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'teams' && (
          <div className="dashboard-split">
            {/* My Teams */}
            <div className="glass-panel flex-1">
              <h3>My Squads</h3>
              <div className="small-list-container mt-4">
                {myTeams.length === 0 ? (
                  <p className="text-muted text-center py-4">You do not belong to any squads.</p>
                ) : (
                  myTeams.map(team => {
                    const isCaptain = team.captain._id ? team.captain._id.toString() === user.id.toString() : team.captain.toString() === user.id.toString();
                    return (
                      <div key={team._id} className="small-list-item flex-col items-start gap-2" style={{ padding: '15px' }}>
                        <div className="w-full flex justify-between items-center">
                          <div>
                            <h4>{team.name}</h4>
                            <p className="text-secondary">{team.description || 'No description.'}</p>
                          </div>
                          {isCaptain && <span className="badge badge-ongoing">CAPTAIN</span>}
                        </div>
                        
                        {/* Members list */}
                        <div className="w-full mt-1 mb-2">
                          <span className="text-secondary text-xs block mb-1"><strong>Squad Members ({team.members.length} / {team.maxMembers || 10}):</strong></span>
                          <div className="flex flex-wrap gap-1">
                            {team.members.map(m => (
                              <span key={m._id} className="badge badge-draft text-xs mr-1 mb-1" style={{ display: 'inline-block', padding: '2px 8px' }}>
                                {m.username} {m._id.toString() === (team.captain._id || team.captain).toString() ? '👑' : ''}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Captain Pending Join Requests */}
                        {isCaptain && team.joinRequests && team.joinRequests.length > 0 && (
                          <div className="w-full mt-2 pt-2 border-t">
                            <span className="text-secondary text-xs block mb-1"><strong>Join Requests ({team.joinRequests.length}):</strong></span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {team.joinRequests.map(applicant => (
                                <div key={applicant._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '4px', marginTop: '3px' }}>
                                  <span className="text-sm">{applicant.username}</span>
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button className="btn btn-success btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => handleRespondToRequest(team._id, applicant._id, 'accept')}>
                                      Accept
                                    </button>
                                    <button className="btn btn-danger btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => handleRespondToRequest(team._id, applicant._id, 'reject')}>
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Captain Outgoing Invitations */}
                        {isCaptain && (
                          <div className="w-full mt-2 pt-2 border-t">
                            <span className="text-secondary text-xs block mb-1"><strong>Invite Players:</strong></span>
                            <form onSubmit={(e) => handleInvitePlayer(e, team._id)} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Player username or email" 
                                style={{ height: '30px', padding: '2px 8px', fontSize: '12px', flexGrow: 1 }}
                                value={invitePlayerInput[team._id] || ''}
                                onChange={(e) => setInvitePlayerInput(prev => ({ ...prev, [team._id]: e.target.value }))}
                                required
                              />
                              <button type="submit" className="btn btn-primary btn-sm" style={{ height: '30px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                Invite
                              </button>
                            </form>
                            {inviteSuccess[team._id] && <p className="success-text mt-1 text-xs" style={{ margin: '4px 0 0 0' }}>{inviteSuccess[team._id]}</p>}
                            {inviteError[team._id] && <p className="error-text mt-1 text-xs" style={{ margin: '4px 0 0 0' }}>{inviteError[team._id]}</p>}
                          </div>
                        )}

                        <div className="w-full mt-2 pt-2 border-t flex justify-between items-center gap-2 flex-wrap">
                          <span className="invite-code-display text-muted text-sm flex items-center gap-2">
                            Invite Code: <strong className="text-primary mr-1">{team.inviteCode}</strong>
                            <button 
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '11px', minWidth: '65px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => handleCopyCode(team._id, team.inviteCode)}
                            >
                              {copiedTeamId === team._id ? 'Copied!' : 'Copy'}
                            </button>
                          </span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              className={`btn ${openChatTeamId === team._id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                              onClick={() => setOpenChatTeamId(openChatTeamId === team._id ? null : team._id)}
                            >
                              💬 {openChatTeamId === team._id ? 'Hide Chat' : 'Squad Chat'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleLeaveTeam(team._id)}>
                              Leave
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Private Team Chat */}
                        {openChatTeamId === team._id && (
                          <div className="mt-3 w-full">
                            <TeamChat teamId={team._id} teamName={team.name} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Squad actions */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Incoming Squad Invitations */}
              {myInvitations && myInvitations.length > 0 && (
                <div className="glass-panel">
                  <h3>Squad Invitations</h3>
                  <p className="text-secondary text-xs mt-1 mb-2">
                    You have been invited to join the following squads:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {myInvitations.map(invTeam => (
                      <div key={invTeam._id} className="small-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '10px' }}>
                        <div style={{ width: '100%' }}>
                          <h4 style={{ margin: 0 }}>{invTeam.name}</h4>
                          <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
                            Captain: <strong>{invTeam.captain.username}</strong> | Members: <strong>{invTeam.members.length} / {invTeam.maxMembers || 10}</strong>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button className="btn btn-primary btn-sm flex-1" style={{ padding: '4px 0' }} onClick={() => handleRespondToInvitation(invTeam._id, 'accept')}>
                            Accept
                          </button>
                          <button className="btn btn-secondary btn-sm flex-1" style={{ padding: '4px 0' }} onClick={() => handleRespondToInvitation(invTeam._id, 'reject')}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Create Team */}
              <div className="glass-panel">
                <h3>Form Pro Squad</h3>
                {teamError && <p className="error-text mt-2">{teamError}</p>}
                {teamSuccess && <p className="success-text mt-2">{teamSuccess}</p>}
                
                <form onSubmit={handleCreateTeam} className="mt-4">
                  <div className="form-group">
                    <label className="form-label">Squad Name</label>
                    <input type="text" className="form-control" placeholder="Sentinels Gaming" value={teamName} onChange={e => setTeamName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input type="text" className="form-control" placeholder="Challengers division EU" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full">Create Squad</button>
                </form>
              </div>

              {/* Discover & Search Teams */}
              <div className="glass-panel">
                <h3>Discover Squads</h3>
                <p className="text-secondary text-xs mt-1 mb-2">
                  Search for teams by name to request to join them.
                </p>
                <div className="mt-2">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter squad name..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchError && <p className="error-text mt-2">{searchError}</p>}
                
                <div className="search-results-list mt-3" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchLoading ? (
                    <p className="text-muted text-center py-2 text-xs">Searching squads...</p>
                  ) : (
                    searchResults.map(sTeam => {
                      const isMember = sTeam.members.some(m => m._id.toString() === user.id.toString());
                      const hasRequested = sTeam.joinRequests?.some(id => id.toString() === user.id.toString());
                      
                      return (
                        <div key={sTeam._id} className="small-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '5px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0 }}>{sTeam.name}</h4>
                              <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>{sTeam.description || 'No description.'}</p>
                              <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
                                Captain: <strong>{sTeam.captain.username}</strong> | Members: <strong>{sTeam.members.length} / {sTeam.maxMembers || 10}</strong>
                              </p>
                            </div>
                          </div>
                          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
                            {isMember ? (
                              <span className="badge badge-ongoing text-xs">ALREADY MEMBER</span>
                            ) : hasRequested ? (
                              <span className="badge badge-draft text-xs">PENDING APPROVAL</span>
                            ) : (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '2px 10px', fontSize: '12px' }}
                                onClick={() => handleRequestJoin(sTeam._id)}
                                disabled={sTeam.members.length >= (sTeam.maxMembers || 10)}
                              >
                                {sTeam.members.length >= (sTeam.maxMembers || 10) ? 'FULL' : 'Request to Join'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                    <p className="text-muted text-center py-2 text-xs">No teams found.</p>
                  )}
                </div>
              </div>

              {/* Form Join Team */}
              <div className="glass-panel">
                <h3>Join Squad via Invite Code</h3>
                <p className="text-secondary text-xs mt-1 mb-2">
                  Have an invite code from a team captain? Enter it below to join their squad instantly and participate in team-based tournaments together.
                </p>
                {joinError && <p className="error-text mt-2">{joinError}</p>}
                {joinSuccess && <p className="success-text mt-2">{joinSuccess}</p>}

                <form onSubmit={handleJoinTeam} className="mt-4">
                  <div className="form-group">
                    <label className="form-label">Invite Code</label>
                    <input type="text" className="form-control" placeholder="FNTCODE" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-secondary btn-full">Register into Squad</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'payments' && (
          <div className="glass-panel">
            <h3>Payment & Registration History</h3>
            <p className="text-secondary text-xs mt-1 mb-4">
              Review your payments, entry fee statuses, and tournament registrations.
            </p>
            {payments.length === 0 ? (
              <p className="text-muted text-center py-4">No payment records found.</p>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px' }}>Tournament</th>
                      <th style={{ padding: '12px 8px' }}>Squad / Registered As</th>
                      <th style={{ padding: '12px 8px' }}>Entry Fee</th>
                      <th style={{ padding: '12px 8px' }}>Order & Payment ID</th>
                      <th style={{ padding: '12px 8px' }}>Date</th>
                      <th style={{ padding: '12px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <strong style={{ display: 'block' }}>{p.tournament?.name || 'Deleted Tournament'}</strong>
                          <span className="text-xs text-secondary">{p.tournament?.game}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {p.team ? (
                            <span>👥 {p.team.name}</span>
                          ) : (
                            <span>👤 Solo Entry</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontWeight: 'bold' }}>₹{p.amount}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div className="text-xs">
                            <span className="text-secondary">Order:</span> {p.orderId || 'N/A'}
                          </div>
                          {p.paymentId && (
                            <div className="text-xs">
                              <span className="text-secondary">Payment:</span> {p.paymentId}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className="text-xs">{new Date(p.createdAt).toLocaleString()}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`badge badge-${p.status === 'success' ? 'published' : p.status === 'failed' ? 'draft' : 'ongoing'}`} style={{ textTransform: 'capitalize' }}>
                            {p.status === 'success' ? 'Paid' : p.status === 'failed' ? 'Failed' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'feed' && (
          <div className="glass-panel p-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Rss size={20} className="text-primary" /> Personalized Activity Updates Feed
              </h3>
              <span className="text-muted text-xs">Real-time updates from followed players, teams, & organizers</span>
            </div>

            {activityFeed.length === 0 ? (
              <div className="text-center py-5">
                <Rss size={40} className="empty-icon mb-3 text-muted" />
                <h4>No Activity Updates Yet</h4>
                <p className="text-secondary text-sm">
                  Start following players, squad teams, or event organizers to see their tournament announcements, match victories, and rank achievements here!
                </p>
                <div className="mt-4" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Link to="/tournaments" className="btn btn-primary btn-sm">Explore Tournaments</Link>
                  <Link to="/leaderboard" className="btn btn-secondary btn-sm">Browse Leaderboard</Link>
                </div>
              </div>
            ) : (
              <div className="feed-list flex-col gap-3">
                {activityFeed.map((act) => (
                  <div key={act.id} className="small-list-item glass-panel p-3">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 className="text-white text-sm m-0">{act.title}</h4>
                        <span className="badge badge-secondary text-xs">{act.targetName}</span>
                      </div>
                      <p className="text-secondary text-xs mt-1 m-0">{act.message}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="text-muted text-xs">{new Date(act.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {act.link && (
                        <Link to={act.link} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDashboard;
