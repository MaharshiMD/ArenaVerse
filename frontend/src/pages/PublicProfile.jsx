import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Award, Coins, ArrowLeft, Shield, Star, Percent, Medal, CheckCircle2, Swords, Calendar, UserPlus, Check } from 'lucide-react';
import StatCard from '../components/StatCard';
import AvatarFrame from '../components/AvatarFrame';
import { API_BASE_URL } from '../config/api';
import './PublicProfile.css';

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tournaments'); // 'tournaments' or 'matches'
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingLoading, setFollowingLoading] = useState(false);

  const DEFAULT_AVATAR = '/images/default-avatar.png';

  const fetchFollowStatus = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/follows/status?targetType=player&targetId=${targetId}`, {
        headers: user ? getAuthHeader() : {},
      });
      if (res.ok) {
        const json = await res.json();
        setIsFollowing(json.isFollowing);
        setFollowerCount(json.followerCount);
      }
    } catch (err) {
      console.error('Failed to fetch follow status:', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!profileData?.player?.id || followingLoading) return;
    setFollowingLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/follows/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          targetType: 'player',
          targetId: profileData.player.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setIsFollowing(json.isFollowing);
      setFollowerCount(json.followerCount);
    } catch (err) {
      alert(err.message);
    } finally {
      setFollowingLoading(false);
    }
  };

  useEffect(() => {
    const fetchPublicProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/players/${encodeURIComponent(username)}/public-profile`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Player not found');
        }
        const data = await res.json();
        setProfileData(data);
        if (data.player?.id) {
          fetchFollowStatus(data.player.id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load player profile');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="container py-4 text-center mt-4">
        <p className="text-secondary text-sm">Loading player profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="container py-4 text-center mt-4">
        <p className="error-text">{error || 'Player profile not found'}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-3">
          <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Go Back
        </button>
      </div>
    );
  }

  const { player, history = [], matchHistory = [], mvpAwards = [], badges = [], stats = {} } = profileData;
  const avatarUrl = player.profile?.avatar || DEFAULT_AVATAR;

  return (
    <div className="container py-4 mt-4 public-profile-page">
      {/* Back button */}
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>

      <div className="profile-header-grid">
        {/* Left Side: Avatar, Bio & Socials */}
        <div className="glass-panel profile-card text-center flex-col items-center">
          <div className="player-avatar-large" style={{ margin: '0 auto 15px auto', display: 'flex', justifyContent: 'center' }}>
            <AvatarFrame 
              src={avatarUrl} 
              alt={player.username} 
              size={110} 
              frame={player.profile?.equippedFrame || player.battlePass?.equippedFrame || 'Default'} 
            />
          </div>
          <h2 className="m-0">@{player.username}</h2>
          {(player.profile?.equippedTitle || player.battlePass?.equippedTitle) && (
            <div className="mt-1 mb-1">
              <span className="equipped-title-badge">👑 {player.profile?.equippedTitle || player.battlePass?.equippedTitle}</span>
            </div>
          )}
          <p className="role-text text-secondary mt-1">{player.role.toUpperCase()}</p>
          
          {user?.id !== player.id && (
            <div className="mt-2 mb-2">
              <button 
                className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleToggleFollow}
                disabled={followingLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px' }}
              >
                {isFollowing ? <Check size={14} /> : <UserPlus size={14} />}
                <span>{isFollowing ? 'Following' : 'Follow Player'}</span>
                {followerCount > 0 && <span className="badge badge-secondary text-xs" style={{ background: 'rgba(255,255,255,0.2)', marginLeft: '4px' }}>{followerCount}</span>}
              </button>
            </div>
          )}
          
          <p className="bio-text mt-3">
            {player.profile?.bio || 'Ready to compete, conquer, and make my mark in the arena.'}
          </p>

          {/* Social Links */}
          <div className="social-links-row mt-4" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
            {player.profile?.socialLinks?.discord && (
              <span className="social-badge">Discord: {player.profile.socialLinks.discord}</span>
            )}
            {player.profile?.socialLinks?.twitter && (
              <span className="social-badge">X/Twitter: {player.profile.socialLinks.twitter}</span>
            )}
            {player.profile?.socialLinks?.instagram && (
              <span className="social-badge">Instagram: {player.profile.socialLinks.instagram}</span>
            )}
            {player.profile?.socialLinks?.youtube && (
              <span className="social-badge">YouTube: {player.profile.socialLinks.youtube}</span>
            )}
            {player.profile?.socialLinks?.twitch && (
              <span className="social-badge">Twitch: {player.profile.socialLinks.twitch}</span>
            )}
          </div>
        </div>

        {/* Right Side: Squads (Current & Previous) & Favorite Games */}
        <div className="glass-panel profile-squad-games-card">
          <h3>Squads & Favorite Games</h3>
          
          <div className="squad-section mt-3">
            <h4 className="text-secondary text-xs uppercase-label">CURRENT SQUAD</h4>
            {player.currentTeams && player.currentTeams.length > 0 ? (
              <div className="active-squad-badge mt-2">
                <Shield size={16} className="text-primary" style={{ marginRight: '8px' }} />
                <div>
                  <strong>{player.currentTeams[0].name}</strong>
                  {player.currentTeams[0].description && (
                    <p className="text-muted text-xs">{player.currentTeams[0].description}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted text-sm mt-1">Free Agent (No active squad)</p>
            )}
          </div>

          {player.previousTeams && player.previousTeams.length > 0 && (
            <div className="squad-section mt-4">
              <h4 className="text-secondary text-xs uppercase-label">PREVIOUS SQUADS</h4>
              <div className="previous-teams-list mt-2">
                {player.previousTeams.map((teamName, idx) => (
                  <span key={idx} className="previous-team-chip">
                    <Shield size={12} className="text-muted" /> {teamName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="games-section mt-4">
            <h4 className="text-secondary text-xs uppercase-label">FAVORITE GAMES</h4>
            {player.profile?.favoriteGames && player.profile.favoriteGames.length > 0 ? (
              <div className="games-tags-list mt-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {player.profile.favoriteGames.map((game, index) => (
                  <span key={index} className="game-chip">{game}</span>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm mt-1">No favorite games selected.</p>
            )}
          </div>
        </div>
      </div>

      {/* Career Statistics */}
      <h3 className="section-title mt-5">Career Statistics</h3>
      <div className="stats-grid mt-3">
        <StatCard title="Tournaments Played" value={stats.totalTournaments} icon={Trophy} />
        <StatCard title="Tournament Wins" value={stats.wins} icon={Award} />
        <StatCard title="Runner-up Finishes" value={stats.runnerUps || 0} icon={Medal} />
        <StatCard title="Match MVPs" value={stats.mvpCount || 0} icon={Star} description="Organizers awarded" />
        <StatCard title="Win Rate" value={`${stats.winRate}%`} icon={Percent} description="Victory percentage" />
        <StatCard title="Best Placement" value={stats.bestPlacement > 0 ? `#${stats.bestPlacement}` : 'N/A'} icon={Shield} />
        <StatCard title="Total Earnings" value={`₹${stats.totalPrize.toLocaleString('en-IN')}`} icon={Coins} />
      </div>

      {/* Career Badges & Achievements */}
      {badges && badges.length > 0 && (
        <>
          <div className="section-header-with-count mt-5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="section-title">Career Achievements & Badges</h3>
            <span className="badges-count-pill" style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8' }}>
              {badges.filter(b => b.unlocked).length} / {badges.length} UNLOCKED
            </span>
          </div>
          <div className="badges-showcase-grid mt-3">
            {badges.map((b) => (
              <div 
                key={b.id} 
                className={`badge-achievement-card glass-panel ${b.unlocked ? 'badge-unlocked' : 'badge-locked'}`}
              >
                <div className="badge-icon-wrapper">
                  {b.unlocked ? b.icon : '🔒'}
                </div>
                <div className="badge-info">
                  <div className="badge-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h4>{b.name}</h4>
                    {b.unlocked ? (
                      <span className="badge-status-tag unlocked">UNLOCKED</span>
                    ) : (
                      <span className="badge-status-tag locked">LOCKED</span>
                    )}
                  </div>
                  <p>{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Playing & Match History Tabs */}
      <div className="profile-history-header mt-5">
        <div className="history-tabs">
          <button 
            className={`tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
            onClick={() => setActiveTab('tournaments')}
          >
            <Trophy size={16} /> Tournament History ({history.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <Swords size={16} /> Match History ({matchHistory?.length || 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'mvps' ? 'active' : ''}`}
            onClick={() => setActiveTab('mvps')}
          >
            <Star size={16} /> MVP Honors ({mvpAwards.length})
          </button>
        </div>
      </div>

      {activeTab === 'tournaments' && (
        <div className="glass-panel mt-3 table-responsive">
          {history.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Game</th>
                  <th>Represented Squad</th>
                  <th>Date</th>
                  <th>Finished</th>
                  <th>Prize Won</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {record.tournament ? (
                        <Link to={`/tournaments/${record.tournament.id}`} className="tournament-link">
                          {record.tournament.name}
                        </Link>
                      ) : (
                        'Unknown Tournament'
                      )}
                    </td>
                    <td>{record.tournament?.game || 'N/A'}</td>
                    <td>
                      {record.teamName ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={12} className="text-secondary" /> {record.teamName}
                        </span>
                      ) : (
                        <span className="text-muted">Solo</span>
                      )}
                    </td>
                    <td>
                      {record.tournament?.startDate ? (
                        new Date(record.tournament.startDate).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <span className={`placement-badge rank-${record.placement}`}>
                        {record.placement === 1 ? '🥇 1st Place' : record.placement === 2 ? '🥈 2nd Place' : record.placement === 3 ? '🥉 3rd Place' : `${record.placement}th Place`}
                      </span>
                    </td>
                    <td className="prize-column">
                      {record.prizeWon > 0 ? `₹${record.prizeWon.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted text-center py-4">No historical playing records found in MongoDB.</p>
          )}
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="glass-panel mt-3 table-responsive">
          {matchHistory && matchHistory.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Round</th>
                  <th>Squad</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Outcome</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {matchHistory.map((m) => (
                  <tr key={m.id}>
                    <td>{m.tournamentName} ({m.game})</td>
                    <td>Round {m.round}</td>
                    <td><strong>{m.playerTeamName}</strong></td>
                    <td>{m.opponentName}</td>
                    <td className="score-cell"><strong>{m.score}</strong></td>
                    <td>
                      <span className={`outcome-chip outcome-${m.outcome.toLowerCase()}`}>
                        {m.outcome === 'WIN' ? '🏆 WIN' : m.outcome === 'LOSS' ? '❌ LOSS' : '⏳ PENDING'}
                      </span>
                    </td>
                    <td>
                      {new Date(m.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted text-center py-4">No match history recorded yet.</p>
          )}
        </div>
      )}

      {activeTab === 'mvps' && (
        <div className="glass-panel mt-3 table-responsive">
          {mvpAwards && mvpAwards.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Game</th>
                  <th>Match Round</th>
                  <th>Organizer Citation</th>
                  <th>Award Date</th>
                </tr>
              </thead>
              <tbody>
                {mvpAwards.map((mvpItem) => (
                  <tr key={mvpItem.id}>
                    <td><strong>{mvpItem.tournamentName}</strong></td>
                    <td>{mvpItem.game}</td>
                    <td>Round {mvpItem.round}</td>
                    <td className="text-primary font-semibold">🌟 "{mvpItem.comment}"</td>
                    <td>
                      {new Date(mvpItem.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted text-center py-4">No MVP awards won yet. Compete in tournaments to earn MVP honors!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
