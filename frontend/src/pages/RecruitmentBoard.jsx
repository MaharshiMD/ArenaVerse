import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, Search, Filter, Globe, Star, PlusCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import './RecruitmentBoard.css';

const PREDEFINED_GAMES = [
  'Valorant',
  'BGMI / PUBG Mobile',
  'Counter-Strike 2',
  'Apex Legends',
  'League of Legends',
  'Dota 2',
  'Fortnite',
  'Overwatch 2',
  'Call of Duty: Warzone',
  'Rocket League',
  'EA Sports FC / FIFA',
  'Free Fire',
  'Tekken 8',
  'Street Fighter 6',
  'Rainbow Six Siege',
  'Chess'
];

const RecruitmentBoard = () => {
  const { user, getAuthHeader } = useAuth();
  const [activeTab, setActiveTab] = useState('lft'); // 'lft' (Players looking for team), 'lfp' (Teams looking for players)
  const [selectedGameFilter, setSelectedGameFilter] = useState('all');
  const [lftPosts, setLftPosts] = useState([]);
  const [lfpPosts, setLfpPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPostType, setCreatePostType] = useState('lft'); // 'lft' or 'lfp'
  const [myTeams, setMyTeams] = useState([]);

  // Form State for LFT
  const [gameInput, setGameInput] = useState('Valorant');
  const [regionInput, setRegionInput] = useState('Global');
  const [rankInput, setRankInput] = useState('Immortal');
  const [roleInput, setRoleInput] = useState('Entry Fragger / Duelist');
  const [availabilityInput, setAvailabilityInput] = useState('Evenings & Weekends');
  const [bioInput, setBioInput] = useState('Competitive player with 5+ tournament wins looking for a committed squad.');

  // Form State for LFP
  const [lfpTeamId, setLfpTeamId] = useState('');
  const [lfpGame, setLfpGame] = useState('Valorant');
  const [lfpRegion, setLfpRegion] = useState('Global');
  const [lfpMinRank, setLfpMinRank] = useState('Diamond / Immortal');
  const [lfpRoles, setLfpRoles] = useState('Entry Fragger, Duelist, ICL');
  const [lfpDesc, setLfpDesc] = useState('Recruiting active, dedicated players for our competitive tournament roster.');

  useEffect(() => {
    fetchBoardData();
  }, [activeTab, selectedGameFilter]);

  useEffect(() => {
    if (showCreateModal && user) {
      fetchMyTeams();
    }
  }, [showCreateModal, user]);

  const fetchMyTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/my`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setMyTeams(data);
        const userIdStr = (user._id || user.id)?.toString();
        const captained = data.filter(t => {
          const capId = (t.captain?._id || t.captain)?.toString();
          return capId === userIdStr;
        });
        if (captained.length > 0) {
          setLfpTeamId(captained[0]._id);
        } else if (data.length > 0) {
          setLfpTeamId(data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load user teams for LFP:', err);
    }
  };

  const fetchBoardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedGameFilter && selectedGameFilter !== 'all') {
        params.append('game', selectedGameFilter);
      }
      const endpoint = activeTab === 'lft' ? '/api/nextgen/lft' : '/api/nextgen/lfp';
      const res = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'lft') setLftPosts(data);
        else setLfpPosts(data);
      }
    } catch (err) {
      console.error('Failed to load recruitment board:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLFT = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/lft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          games: [gameInput],
          region: regionInput,
          rank: rankInput,
          role: roleInput,
          availability: availabilityInput,
          bio: bioInput,
        }),
      });

      if (!res.ok) throw new Error('Failed to create LFT post');
      alert('Your LFT listing has been published to the Recruitment Board!');
      setShowCreateModal(false);
      fetchBoardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateLFP = async (e) => {
    e.preventDefault();
    if (!lfpTeamId) {
      alert('Please select a team. If you do not have a team yet, create one first in your Player Dashboard.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/lfp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          teamId: lfpTeamId,
          game: lfpGame,
          region: lfpRegion,
          minRank: lfpMinRank,
          requiredRoles: lfpRoles.split(',').map(r => r.trim()).filter(Boolean),
          description: lfpDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create LFP post');
      alert('Your Squad LFP recruitment post has been published to the board!');
      setShowCreateModal(false);
      fetchBoardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openModalWithTab = (type) => {
    setCreatePostType(type);
    setShowCreateModal(true);
  };

  const captainedTeams = myTeams.filter(t => {
    const userIdStr = (user?._id || user?.id)?.toString();
    const capId = (t.captain?._id || t.captain)?.toString();
    return capId === userIdStr;
  });

  return (
    <div className="recruitment-board-page container py-4 mt-4">
      <div className="header-flex mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title m-0">Esports Recruitment Board & LFT/LFP</h1>
          <p className="section-subtitle m-0">Connect with pro players seeking teams or browse open squad roster openings.</p>
        </div>
        {user && (
          <button className="btn btn-primary" onClick={() => openModalWithTab(activeTab)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} />
            <span>{activeTab === 'lft' ? 'Post Player LFT Card' : 'Post Squad LFP Listing'}</span>
          </button>
        )}
      </div>

      {/* Tabs & Game Filter Bar */}
      <div className="filter-toolbar glass-panel mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0.85rem 1.25rem' }}>
        <div className="details-tabs" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button className={`tab-btn ${activeTab === 'lft' ? 'active' : ''}`} onClick={() => setActiveTab('lft')}>
            <Users size={16} /> Players Seeking Teams (LFT)
          </button>
          <button className={`tab-btn ${activeTab === 'lfp' ? 'active' : ''}`} onClick={() => setActiveTab('lfp')}>
            <Shield size={16} /> Squad Roster Openings (LFP)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} className="text-secondary" />
          <span className="text-xs text-secondary font-bold">Filter Game:</span>
          <select 
            className="form-control text-xs" 
            style={{ width: 'auto', minWidth: '180px', background: 'var(--bg-tertiary)' }}
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
          >
            <option value="all">All Games (16)</option>
            {PREDEFINED_GAMES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><p className="text-secondary text-sm">Loading recruitment listings...</p></div>
      ) : activeTab === 'lft' ? (
        <div className="grid-3 gap-3">
          {lftPosts.length === 0 ? (
            <div className="glass-panel text-center py-5 flex-1" style={{ gridColumn: '1 / -1' }}>
              <Users size={40} className="text-muted mb-2" />
              <h3>No Active LFT Listings</h3>
              <p className="text-secondary mb-3">Be the first competitor to publish an LFT card!</p>
              {user && (
                <button className="btn btn-primary btn-sm" onClick={() => openModalWithTab('lft')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <PlusCircle size={16} /> Create LFT Card
                </button>
              )}
            </div>
          ) : (
            lftPosts.map((post) => (
              <div key={post._id} className="lft-card glass-panel p-4 flex-col justify-between">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div className="avatar-med bg-primary text-white font-bold flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '50%' }}>
                      {post.player?.username?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <strong className="text-white">@{post.player?.username}</strong>
                      <span className="badge badge-secondary text-xs block mt-1">{post.player?.availabilityStatus || 'Available'}</span>
                    </div>
                  </div>

                  <div className="tags-row flex gap-1 flex-wrap mb-3">
                    <span className="badge badge-primary text-xs">{post.games?.join(', ')}</span>
                    <span className="badge badge-secondary text-xs">{post.region}</span>
                    <span className="badge badge-published text-xs">{post.rank}</span>
                    <span className="badge badge-ongoing text-xs">{post.role}</span>
                  </div>

                  <p className="text-secondary text-xs mb-3">"{post.bio || 'Competitor seeking active esports squad.'}"</p>
                  <p className="text-muted text-xs">⏰ Availability: <strong>{post.availability}</strong></p>
                </div>

                <div className="mt-3 pt-3 border-t border-muted" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Link to={`/players/${post.player?.username}`} className="btn btn-secondary btn-sm w-full text-xs" style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <UserPlus size={14} /> Contact @{post.player?.username}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid-3 gap-3">
          {lfpPosts.length === 0 ? (
            <div className="glass-panel text-center py-5 flex-1" style={{ gridColumn: '1 / -1' }}>
              <Shield size={40} className="text-muted mb-2" />
              <h3>No Open Squad Recruitment Posts</h3>
              <p className="text-secondary mb-3">Team captains can create recruitment listings for their squads right here.</p>
              {user && (
                <button className="btn btn-primary btn-sm" onClick={() => openModalWithTab('lfp')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <PlusCircle size={16} /> Post Squad LFP Listing
                </button>
              )}
            </div>
          ) : (
            lfpPosts.map((post) => (
              <div key={post._id} className="lfp-card glass-panel p-4 flex-col justify-between">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div className="avatar-med bg-primary text-white font-bold flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '8px' }}>
                      {post.team?.name?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div>
                      <strong className="text-white">{post.team?.name}</strong>
                      <p className="text-secondary text-xs m-0">Captain @{post.captain?.username}</p>
                    </div>
                  </div>

                  <div className="tags-row flex gap-1 flex-wrap mb-3">
                    <span className="badge badge-primary text-xs">{post.game}</span>
                    <span className="badge badge-secondary text-xs">{post.region}</span>
                    <span className="badge badge-published text-xs">Min: {post.minRank}</span>
                  </div>

                  <p className="text-white text-xs font-bold mb-1">Roles Needed: {post.requiredRoles?.join(', ')}</p>
                  <p className="text-secondary text-xs">{post.description || 'Squad recruiting competitive roster members.'}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-muted" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Link to="/player-dashboard" className="btn btn-primary btn-sm w-full text-xs" style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <Shield size={14} /> Apply to Join Squad
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal for Creating LFT or LFP Post */}
      {showCreateModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel p-4" style={{ width: '520px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="mb-2 text-white">Create Recruitment Post</h3>
            
            {/* Modal Sub-Tab Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
              <button 
                type="button"
                className={`btn btn-sm ${createPostType === 'lft' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setCreatePostType('lft')}
              >
                👤 Player LFT (Seeking Team)
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${createPostType === 'lfp' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setCreatePostType('lfp')}
              >
                🛡️ Squad LFP (Recruiting Players)
              </button>
            </div>

            {createPostType === 'lft' ? (
              <form onSubmit={handleCreateLFT} className="flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">Primary Game</label>
                  <select className="form-control" value={gameInput} onChange={e => setGameInput(e.target.value)}>
                    {PREDEFINED_GAMES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <input type="text" className="form-control" value={regionInput} onChange={e => setRegionInput(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rank / Tier</label>
                  <input type="text" className="form-control" value={rankInput} onChange={e => setRankInput(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Role</label>
                  <input type="text" className="form-control" value={roleInput} onChange={e => setRoleInput(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio & Playstyle</label>
                  <textarea className="form-control" rows={3} value={bioInput} onChange={e => setBioInput(e.target.value)}></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary flex-1">Publish LFT Post</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateLFP} className="flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">Select Your Squad / Team</label>
                  {captainedTeams.length > 0 ? (
                    <select className="form-control" value={lfpTeamId} onChange={e => setLfpTeamId(e.target.value)}>
                      {captainedTeams.map(t => (
                        <option key={t._id} value={t._id}>{t.name} (Captain)</option>
                      ))}
                    </select>
                  ) : myTeams.length > 0 ? (
                    <select className="form-control" value={lfpTeamId} onChange={e => setLfpTeamId(e.target.value)}>
                      {myTeams.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs error-text m-0">
                      You don't have any teams yet. Create a team in your <Link to="/player-dashboard" style={{ color: '#8b5cf6', textDecoration: 'underline' }}>Player Dashboard</Link> first.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Game</label>
                  <select className="form-control" value={lfpGame} onChange={e => setLfpGame(e.target.value)}>
                    {PREDEFINED_GAMES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Region</label>
                  <input type="text" className="form-control" value={lfpRegion} onChange={e => setLfpRegion(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Minimum Required Rank</label>
                  <input type="text" className="form-control" value={lfpMinRank} onChange={e => setLfpMinRank(e.target.value)} placeholder="e.g. Diamond+, Ascendant, Global" />
                </div>

                <div className="form-group">
                  <label className="form-label">Required Roles (comma-separated)</label>
                  <input type="text" className="form-control" value={lfpRoles} onChange={e => setLfpRoles(e.target.value)} placeholder="e.g. Entry Fragger, Controller, Sniper" />
                </div>

                <div className="form-group">
                  <label className="form-label">Squad Description & Details</label>
                  <textarea className="form-control" rows={3} value={lfpDesc} onChange={e => setLfpDesc(e.target.value)} placeholder="Specify team goals, practice hours, tournament plans..."></textarea>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary flex-1" disabled={!lfpTeamId}>Publish Squad LFP Listing</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentBoard;
