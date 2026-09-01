import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Trophy, Edit, Trash2, Globe, Eye, Settings, ShieldAlert, Upload, X, BarChart3, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import OrganizerAnalytics from '../components/OrganizerAnalytics';
import VerificationModal from '../components/VerificationModal';
import { API_BASE_URL } from '../config/api';
import './Dashboard.css';

const OrganizerDashboard = () => {
  const { user, getAuthHeader, checkAuthStatus } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Predefined popular games list
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
    'Chess',
    'Other'
  ];

  // Form states for creating tournament
  const [name, setName] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [customGame, setCustomGame] = useState('');
  const [banner, setBanner] = useState('');
  const [startDate, setStartDate] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [prizePool, setPrizePool] = useState('');
  const [prizeDistribution, setPrizeDistribution] = useState([{ position: 1, amount: '' }]);
  const [rules, setRules] = useState('');
  const [maxTeams, setMaxTeams] = useState('16');
  const [type, setType] = useState('team'); // 'solo', 'duo', or 'team'
  const [minTeamMembers, setMinTeamMembers] = useState('');
  const [maxTeamMembers, setMaxTeamMembers] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Publish bracket picker state
  const [activePublishId, setActivePublishId] = useState('');
  const [bracketType, setBracketType] = useState('single_elimination'); // or 'double_elimination'

  const fetchMyTournaments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments?limit=100`);
      if (!res.ok) throw new Error('Could not load tournaments');
      const data = await res.json();
      
      const list = Array.isArray(data) ? data : (data.tournaments || []);

      // Filter tournaments where current user is organizer
      const userIdStr = (user?.id || user?._id)?.toString();
      const filtered = list.filter(t => {
        if (!t.organizer) return false;
        const orgIdStr = (t.organizer._id || t.organizer.id || t.organizer).toString();
        return orgIdStr === userIdStr;
      });
      setTournaments(filtered);
    } catch (err) {
      setError(err.message || 'Error loading tournaments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyTournaments();
    }
  }, [user]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setBanner(reader.result);
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const totalDistributed = prizeDistribution.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const parsedPrizePool = Number(prizePool) || 0;

    if (totalDistributed > parsedPrizePool) {
      setFormError(`Prize distribution (₹${totalDistributed}) cannot exceed the total prize pool (₹${parsedPrizePool}).`);
      return;
    }

    if (!name.trim()) {
      setFormError('Tournament Name is required.');
      return;
    }

    const finalGame = selectedGame === 'Other' ? customGame.trim() : selectedGame;
    if (!finalGame) {
      setFormError('Game Title is required.');
      return;
    }

    if (!banner) {
      setFormError('Tournament Banner Photo is required. Please upload a photo.');
      return;
    }

    if (!startDate) {
      setFormError('Start Date & Time is required.');
      return;
    }

    if (prizePool === '') {
      setFormError('Prize Pool (₹) is required (enter 0 for no prize pool).');
      return;
    }

    if (entryFee === '') {
      setFormError('Entry Fee (₹) is required (enter 0 for free entry).');
      return;
    }

    if (!maxTeams || Number(maxTeams) < 2) {
      setFormError('Max Entrants/Teams is required (at least 2).');
      return;
    }

    if (type === 'team') {
      if (minTeamMembers === '') {
        setFormError('Minimum Team Members is required for team registration.');
        return;
      }
      if (maxTeamMembers === '') {
        setFormError('Maximum Team Members is required for team registration.');
        return;
      }
      if (Number(minTeamMembers) > Number(maxTeamMembers)) {
        setFormError('Minimum Team Members cannot exceed Maximum Team Members.');
        return;
      }
    }

    if (!rules.trim()) {
      setFormError('Tournament Rules are required.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          name: name.trim(),
          game: finalGame,
          banner,
          startDate,
          entryFee: Number(entryFee),
          prizePool: parsedPrizePool,
          prizeDistribution: prizeDistribution.map(p => ({ position: p.position, amount: Number(p.amount) || 0 })),
          rules: rules.trim(),
          maxTeams: Number(maxTeams),
          type,
          minTeamMembers: type === 'team' ? Number(minTeamMembers) : type === 'duo' ? 2 : 1,
          maxTeamMembers: type === 'team' ? Number(maxTeamMembers) : type === 'duo' ? 2 : 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create');

      setFormSuccess('Tournament draft successfully created!');
      // Clear fields
      setName('');
      setSelectedGame('');
      setCustomGame('');
      setBanner('');
      setStartDate('');
      setEntryFee('');
      setPrizePool('');
      setPrizeDistribution([{ position: 1, amount: '' }]);
      setRules('');
      setMaxTeams('16');
      setMinTeamMembers('');
      setMaxTeamMembers('');
      setShowCreateForm(false);
      fetchMyTournaments();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tournament? All associated brackets and matches will be wiped.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete');
      fetchMyTournaments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePublish = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ bracketType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to publish');

      alert('🎉 Tournament published live! Brackets successfully generated and matches are active.');
      setActivePublishId('');
      fetchMyTournaments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFundPrizePool = async (id, poolAmount) => {
    if (!window.confirm(`Are you sure you want to securely fund ₹${poolAmount} from your Arena Wallet? This will lock the prize distribution.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/fund-prize-pool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ tournamentId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fund prize pool');
      alert('✅ Prize pool successfully funded and secured!');
      fetchMyTournaments();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
    return (
      <div className="container py-4 text-center mt-4">
        <div className="glass-panel text-center">
          <ShieldAlert className="warning-icon mb-4" size={40} />
          <h3>Access Denied</h3>
          <p>This panel is restricted to verified event organizers.</p>
        </div>
      </div>
    );
  }

  const [activeDashboardTab, setActiveDashboardTab] = useState('tournaments');
  const [disputes, setDisputes] = useState([]);
  const [selectedDisputeId, setSelectedDisputeId] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchDisputes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/disputes/all`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const json = await res.json();
        setDisputes(json);
      }
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'organizer' || user.role === 'admin')) {
      fetchDisputes();
    }
  }, [user]);

  const handleResolveDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDisputeId || resolving) return;
    setResolving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/disputes/${selectedDisputeId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          status: resolutionStatus,
          resolutionNote: resolutionNoteInput.trim() || 'Dispute reviewed and resolved.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resolve dispute');

      alert(`Dispute successfully updated to ${resolutionStatus.toUpperCase()}`);
      setSelectedDisputeId('');
      setResolutionNoteInput('');
      fetchDisputes();
    } catch (err) {
      alert(err.message);
    } finally {
      setResolving(false);
    }
  };

  if (loading) return <div className="text-center mt-4"><p>Loading workspace...</p></div>;
  if (error) return <div className="text-center mt-4 error-text"><p>{error}</p></div>;

  const handleSpawnPrejoinedDraft = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/seed-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to spawn draft');
      alert('🎉 Draft Tournament created with 4 pre-joined esports teams!');
      fetchMyTournaments();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="organizer-dashboard-page container py-4 mt-4">
      <div className="dashboard-header-row mb-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2>Organizer Studio</h2>
            {user.isVerifiedOrganizer ? (
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}>
                <CheckCircle2 size={14} /> VERIFIED ORGANIZER
              </span>
            ) : user.verificationStatus === 'pending' ? (
              <span className="badge badge-warning text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ⏳ Verification Pending Review
              </span>
            ) : (
              <button 
                className="btn btn-secondary btn-sm text-xs"
                onClick={() => setShowVerificationModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldCheck size={14} className="text-primary" /> Get Verified Badge
              </button>
            )}
          </div>
          <p className="text-secondary">Administer brackets, manage rules, track analytics, and declare champions.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

          <button 
            className="btn btn-primary"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setActiveDashboardTab('tournaments');
            }}
          >
            <PlusCircle size={18} />
            <span>{showCreateForm ? 'Back to Studio' : 'Create Tournament'}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher Controls */}
      {!showCreateForm && (
        <div className="details-tabs mb-4">
          <button 
            className={`tab-btn ${activeDashboardTab === 'tournaments' ? 'active' : ''}`}
            onClick={() => setActiveDashboardTab('tournaments')}
          >
            <Trophy size={16} /> Tournament Arenas ({tournaments.length})
          </button>
          <button 
            className={`tab-btn ${activeDashboardTab === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveDashboardTab('disputes')}
          >
            <ShieldAlert size={16} /> Disputes & Incident Reports ({disputes.length})
          </button>
          <button 
            className={`tab-btn ${activeDashboardTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveDashboardTab('analytics')}
          >
            <BarChart3 size={16} /> Analytics & Intelligence
          </button>
        </div>
      )}

      {showCreateForm ? (
        <div className="create-tournament-panel glass-panel">
          <h3>Spawn Tournament Arena</h3>
          {formError && <p className="error-text mt-4">{formError}</p>}
          {formSuccess && <p className="success-text mt-4">{formSuccess}</p>}

          <form onSubmit={handleCreate} className="mt-4 form-grid-two">
            <div className="form-group">
              <label className="form-label">
                Tournament Name <span className="required-asterisk">*</span>
              </label>
              <input type="text" className="form-control" placeholder="Apex Legends Challenger Series" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">
                Game Title <span className="required-asterisk">*</span>
              </label>
              <select
                className="form-control"
                value={selectedGame}
                onChange={(e) => {
                  setSelectedGame(e.target.value);
                  if (e.target.value !== 'Other') {
                    setCustomGame('');
                  }
                }}
                required
              >
                <option value="" disabled>Select a Game</option>
                {PREDEFINED_GAMES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {selectedGame === 'Other' && (
              <div className="form-group">
                <label className="form-label">
                  Custom Game Title <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter custom game title..."
                  value={customGame}
                  onChange={(e) => setCustomGame(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Tournament Banner Photo <span className="required-asterisk">*</span>
              </label>
              <div className="file-upload-wrapper">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  id="banner-upload-input"
                  className="file-upload-input"
                />
                <label htmlFor="banner-upload-input" className="file-upload-label">
                  <Upload size={18} />
                  <span>{banner ? 'Change Photo' : 'Upload Banner Photo'}</span>
                </label>
              </div>

              {banner && (
                <div className="banner-preview-box mt-3">
                  <img src={banner} alt="Tournament Banner Preview" className="banner-preview-img" />
                  <button 
                    type="button" 
                    className="btn-remove-banner" 
                    onClick={() => setBanner('')}
                    title="Remove Banner"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Start Date & Time <span className="required-asterisk">*</span>
              </label>
              <input type="datetime-local" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">
                Entry Fee (₹) <span className="required-asterisk">*</span>
              </label>
              <input type="number" min="0" placeholder="0" className="form-control" value={entryFee} onChange={e => setEntryFee(e.target.value)} required />
              <small className="text-muted text-xs">Enter 0 for Free Registration</small>
            </div>

            <div className="form-group">
              <label className="form-label">
                Prize Pool (₹) <span className="required-asterisk">*</span>
              </label>
              <input type="number" min="0" placeholder="5000" className="form-control" value={prizePool} onChange={e => setPrizePool(e.target.value)} required />
            </div>

            <div className="form-group w-full" style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', opacity: Number(prizePool) > 0 ? 1 : 0.5 }}>
              <label className="form-label text-md" style={{ color: '#fff' }}>
                PRIZE DISTRIBUTION <span className="required-asterisk">*</span>
              </label>
              
              {Number(prizePool) <= 0 ? (
                <p className="text-sm text-secondary mt-2">Please enter a Prize Pool greater than ₹0 to configure prize distribution.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {prizeDistribution.map((p, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                          <span style={{ fontWeight: 'bold' }}>Pos:</span>
                          <input
                            type="number"
                            min="1"
                            className="form-control"
                            placeholder="Rank"
                            value={p.position}
                            onChange={e => {
                              const updated = [...prizeDistribution];
                              updated[index].position = e.target.value === '' ? '' : Number(e.target.value);
                              setPrizeDistribution(updated);
                            }}
                            style={{ width: '80px', padding: '8px' }}
                            required
                          />
                        </div>
                        <input 
                          type="number" 
                          min="0"
                          className="form-control" 
                          placeholder="Amount (₹)" 
                          value={p.amount} 
                          onChange={e => {
                            const updated = [...prizeDistribution];
                            updated[index].amount = e.target.value;
                            setPrizeDistribution(updated);
                          }} 
                          style={{ flex: 1 }}
                          required
                        />
                        {prizeDistribution.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => {
                              const updated = prizeDistribution.filter((_, i) => i !== index);
                              setPrizeDistribution(updated);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm mt-3" 
                    onClick={() => {
                      const maxPos = prizeDistribution.reduce((max, p) => Math.max(max, Number(p.position) || 0), 0);
                      setPrizeDistribution([...prizeDistribution, { position: maxPos + 1, amount: '' }]);
                    }}
                  >
                    <PlusCircle size={14} style={{ marginRight: '6px' }} /> Add Position
                  </button>

                  <div className="mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span>Distributed: ₹{prizeDistribution.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)}</span>
                      <span style={{ color: (Number(prizePool) - prizeDistribution.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)) < 0 ? '#f87171' : '#94a3b8' }}>
                        Remaining: ₹{Number(prizePool) - prizeDistribution.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)}
                      </span>
                    </div>
                    {(Number(prizePool) - prizeDistribution.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)) < 0 && (
                      <div style={{ color: '#f87171', fontSize: '13px', marginTop: '5px' }}>
                        ✕ Prize distribution exceeds the total prize pool.
                      </div>
                    )}
                    {(Number(prizePool) - prizeDistribution.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)) >= 0 && (
                      <div style={{ color: '#4ade80', fontSize: '13px', marginTop: '5px' }}>
                        ✓ Prize distribution is valid.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="form-row form-group w-full">
              <div>
                <label className="form-label">
                  Max Entrants/Teams <span className="required-asterisk">*</span>
                </label>
                <input 
                  type="number" 
                  min="2" 
                  className="form-control" 
                  value={maxTeams} 
                  onChange={e => setMaxTeams(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="form-label">
                  Registration Type <span className="required-asterisk">*</span>
                </label>
                <select className="form-control" value={type} onChange={e => setType(e.target.value)} required>
                  <option value="solo">Solo (Player registrations)</option>
                  <option value="duo">Duo (2 Player Teams)</option>
                  <option value="team">Team (Squad registrations)</option>
                </select>
              </div>
            </div>

            {type === 'team' && (
              <div className="form-row form-group w-full">
                <div>
                  <label className="form-label">
                    Minimum Team Members <span className="required-asterisk">*</span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="2"
                    className="form-control" 
                    value={minTeamMembers} 
                    onChange={e => setMinTeamMembers(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="form-label">
                    Maximum Team Members <span className="required-asterisk">*</span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="5"
                    className="form-control" 
                    value={maxTeamMembers} 
                    onChange={e => setMaxTeamMembers(e.target.value)} 
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group w-full">
              <label className="form-label">
                Tournament Rules <span className="required-asterisk">*</span>
              </label>
              <textarea rows="4" className="form-control" placeholder="1. Respect opponents. 2. Record match clips..." value={rules} onChange={e => setRules(e.target.value)} required />
            </div>

            <div className="w-full mt-4 flex gap-1 justify-end">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Draft Arena</button>
            </div>
          </form>
        </div>
      ) : activeDashboardTab === 'analytics' ? (
        <OrganizerAnalytics />
      ) : activeDashboardTab === 'disputes' ? (
        <div className="disputes-dashboard-panel glass-panel p-4">
          <h3>Incident & Rule Violation Disputes</h3>
          <p className="text-secondary text-sm">Review competitor reports for cheating, toxic behavior, fake scores, and rule breaches.</p>
          
          {disputes.length === 0 ? (
            <p className="text-muted text-center py-5">No incident reports filed for your tournaments.</p>
          ) : (
            <div className="disputes-list mt-4 flex-col gap-3">
              {disputes.map(disp => (
                <div key={disp._id} className="small-list-item glass-panel p-3" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-danger">🚨 {disp.category}</span>
                      <span className={`badge badge-${disp.status}`}>{disp.status.toUpperCase()}</span>
                      <strong className="text-sm">Tournament: {disp.tournament?.name || 'Tournament'}</strong>
                    </div>

                    <p className="text-xs text-secondary mt-2">
                      Reported by: <strong>@{disp.reportedBy?.username}</strong> 
                      {disp.reportedUser && <span> | Reported Player: <strong>@{disp.reportedUser?.username}</strong></span>}
                    </p>

                    <p className="text-warning font-semibold text-xs mt-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      Violation Details: "{disp.description}"
                    </p>

                    {disp.evidenceUrl && (
                      <p className="text-xs text-primary mt-1">
                        Evidence Link: <a href={disp.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: '#8b5cf6', textDecoration: 'underline' }}>{disp.evidenceUrl}</a>
                      </p>
                    )}

                    {disp.resolutionNote && (
                      <p className="text-xs text-muted mt-2 p-2 rounded" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <strong>Resolution Note:</strong> "{disp.resolutionNote}" (by @{disp.resolvedBy?.username || 'Organizer'})
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <button 
                      className="btn btn-primary btn-sm text-xs"
                      onClick={() => {
                        setSelectedDisputeId(disp._id);
                        setResolutionNoteInput(disp.resolutionNote || '');
                        setResolutionStatus(disp.status === 'pending' ? 'resolved' : disp.status);
                      }}
                    >
                      Update / Resolve Dispute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="tournaments-dashboard-list">
          {tournaments.length === 0 ? (
            <div className="glass-panel text-center py-4">
              <Trophy size={40} className="empty-icon mb-4" />
              <h3>No Tournaments Drafted</h3>
              <p className="text-secondary">Click the 'Create Tournament' button to host your first arena match.</p>
            </div>
          ) : (
            <div className="table-responsive glass-panel">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Game</th>
                    <th>Registrants</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map(t => {
                    const regCount = t.type === 'solo' ? t.registeredPlayers.length : t.registeredTeams.length;
                    return (
                      <tr key={t._id}>
                        <td>
                          <strong>{t.name}</strong>
                          <span className="subtitle-sm text-muted block">{t.type} format</span>
                        </td>
                        <td>{t.game}</td>
                        <td>
                          <strong>{regCount}</strong> / {t.maxTeams}
                        </td>
                        <td>
                          <span className={`badge badge-${t.status}`}>{t.status}</span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <Link to={`/tournaments/${t._id}`} className="btn-table-action" title="View Details">
                              <Eye size={16} />
                            </Link>

                            {t.status === 'draft' && (
                              <>
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setActivePublishId(t._id)}
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  disabled={t.prizePool > 0 && t.prizePoolStatus !== 'FUNDED'}
                                  title={t.prizePool > 0 && t.prizePoolStatus !== 'FUNDED' ? "You must fund the prize pool first" : "Publish Tournament"}
                                >
                                  <Globe size={14} /> Publish Live
                                </button>
                                
                                {t.prizePool > 0 && t.prizePoolStatus === 'PENDING_FUNDING' && (
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleFundPrizePool(t._id, t.prizePool)}
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#3b82f6', color: 'white', border: 'none' }}
                                  >
                                    Fund ₹{t.prizePool}
                                  </button>
                                )}

                                <button 
                                  className="btn-table-action btn-action-delete"
                                  onClick={() => handleDelete(t._id)}
                                  title="Delete Draft"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Publish Bracket Type Selector Modal */}
      {activePublishId && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Publish Tournament Bracket</h3>
              <button className="modal-close" onClick={() => setActivePublishId('')}>&times;</button>
            </div>
            <div>
              <p className="text-secondary mb-4">Choose an elimination structure to generate the tournament tree nodes:</p>
              
              <div className="form-group">
                <label className="form-label">Bracket Type</label>
                <select 
                  className="form-control"
                  value={bracketType}
                  onChange={(e) => setBracketType(e.target.value)}
                >
                  <option value="single_elimination">Single Elimination (Knockout)</option>
                  <option value="double_elimination">Double Elimination (Winner/Loser)</option>
                </select>
              </div>

              <div className="modal-actions mt-4">
                <button className="btn btn-secondary" onClick={() => setActivePublishId('')}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handlePublish(activePublishId)}>Generate Bracket & Start</button>
              </div>
            </div>
          </div>
        </div>
      )}
        {/* Resolve Dispute Modal */}
      {selectedDisputeId && (
        <div className="modal-overlay" onClick={() => setSelectedDisputeId('')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Resolve Tournament Dispute</h3>
              <button className="modal-close" onClick={() => setSelectedDisputeId('')}>&times;</button>
            </div>
            <form onSubmit={handleResolveDisputeSubmit}>
              <div className="form-group mb-3">
                <label className="form-label">Resolution Status</label>
                <select 
                  className="form-control"
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                >
                  <option value="resolved">✅ Resolved (Action taken / Ruling enforced)</option>
                  <option value="under_review">⏳ Under Investigation</option>
                  <option value="dismissed">❌ Dismissed (Insufficient evidence / Invalid claim)</option>
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Resolution Notes & Findings</label>
                <textarea 
                  rows="3" 
                  className="form-control" 
                  placeholder="Explain the organizer ruling, evidence checked, or match score adjustment..."
                  value={resolutionNoteInput}
                  onChange={(e) => setResolutionNoteInput(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedDisputeId('')}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={resolving}>
                  {resolving ? 'Submitting...' : 'Save & Notify Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Verification Modal */}
      <VerificationModal 
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => checkAuthStatus()}
      />
    </div>
  );
};

export default OrganizerDashboard;
