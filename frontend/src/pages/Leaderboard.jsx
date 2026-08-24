import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Award, Medal, Crown, Flame, Filter, Calendar, Shield, Swords, Coins, Percent, ArrowUpRight } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './Leaderboard.css';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState('all');
  const [timeframe, setTimeframe] = useState('all'); // 'all', 'monthly', 'weekly'
  const [availableGames, setAvailableGames] = useState(['all']);

  const DEFAULT_AVATAR = '/images/default-avatar.png';

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedGame !== 'all') params.append('game', selectedGame);
      if (timeframe !== 'all') params.append('timeframe', timeframe);

      const res = await fetch(`${API_BASE_URL}/api/leaderboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load leaderboard data');
      }
      const data = await res.json();
      setLeaderboardData(data.leaderboard || []);
      if (data.filters?.availableGames && Array.isArray(data.filters.availableGames)) {
        setAvailableGames(prev => Array.from(new Set([...prev, ...data.filters.availableGames])));
      }
    } catch (err) {
      setError(err.message || 'Error fetching rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGame, timeframe]);

  const top1 = leaderboardData[0];
  const top2 = leaderboardData[1];
  const top3 = leaderboardData[2];
  const remainingLeaderboard = leaderboardData.slice(3);

  return (
    <div className="container py-4 mt-4 leaderboard-page">
      {/* Header Title */}
      <div className="leaderboard-header text-center">
        <div className="title-badge mb-2">
          <Flame size={16} className="text-warning" />
          <span>OFFICIAL COMPETITIVE RANKINGS</span>
        </div>
        <h1>GLOBAL PLAYER LEADERBOARD</h1>
        <p className="subtitle text-secondary">
          Dominate tournament brackets, secure podium finishes, and earn rating points to claim the #1 spot in esports glory.
        </p>
      </div>

      {/* Controls & Filter Row */}
      <div className="leaderboard-controls-bar glass-panel mt-4">
        <div className="timeframe-buttons">
          <button 
            className={`btn btn-sm ${timeframe === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTimeframe('all')}
          >
            All-Time
          </button>
          <button 
            className={`btn btn-sm ${timeframe === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTimeframe('monthly')}
          >
            <Calendar size={14} /> Monthly (30D)
          </button>
          <button 
            className={`btn btn-sm ${timeframe === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTimeframe('weekly')}
          >
            <Flame size={14} /> Weekly (7D)
          </button>
        </div>

        <div className="game-filter-dropdown">
          <Filter size={16} className="filter-icon" />
          <select 
            className="form-control game-select"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
          >
            <option value="all">🎮 All Esports Games</option>
            {availableGames.filter(g => g !== 'all').map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <p className="text-secondary text-sm">Calculating live player rankings from MongoDB...</p>
        </div>
      ) : error ? (
        <div className="text-center py-5">
          <p className="error-text">{error}</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Spotlight Grid */}
          {leaderboardData.length >= 1 && (
            <div className="podium-spotlight-grid mt-4">
              {/* 2nd Place */}
              {top2 ? (
                <div className="podium-card rank-silver-card glass-panel">
                  <div className="podium-crown-badge silver">🥈 #2 RANK</div>
                  <div className="podium-avatar-wrapper">
                    <img 
                      src={top2.user.avatar || DEFAULT_AVATAR} 
                      alt={top2.user.username} 
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <Link to={`/players/${top2.user.username}`} className="podium-username">
                    @{top2.user.username}
                  </Link>
                  <p className="podium-team text-secondary">{top2.teamName}</p>
                  <div className="podium-points-tag silver-glow">
                    {top2.points} PTS
                  </div>
                  <div className="podium-stats-mini mt-3">
                    <div><span>Wins:</span> <strong>{top2.wins}</strong></div>
                    <div><span>Earned:</span> <strong>₹{top2.prizeMoney.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>
              ) : null}

              {/* 1st Place */}
              {top1 ? (
                <div className="podium-card rank-gold-card glass-panel">
                  <div className="podium-crown-badge gold">👑 #1 CHAMPION</div>
                  <div className="podium-avatar-wrapper gold-border">
                    <img 
                      src={top1.user.avatar || DEFAULT_AVATAR} 
                      alt={top1.user.username} 
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <Link to={`/players/${top1.user.username}`} className="podium-username gold-name">
                    @{top1.user.username}
                  </Link>
                  <p className="podium-team text-secondary">{top1.teamName}</p>
                  <div className="podium-points-tag gold-glow">
                    🏆 {top1.points} PTS
                  </div>
                  <div className="podium-stats-mini mt-3">
                    <div><span>Wins:</span> <strong>{top1.wins}</strong></div>
                    <div><span>Win Rate:</span> <strong>{top1.winRate}%</strong></div>
                    <div><span>Earned:</span> <strong>₹{top1.prizeMoney.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>
              ) : null}

              {/* 3rd Place */}
              {top3 ? (
                <div className="podium-card rank-bronze-card glass-panel">
                  <div className="podium-crown-badge bronze">🥉 #3 RANK</div>
                  <div className="podium-avatar-wrapper">
                    <img 
                      src={top3.user.avatar || DEFAULT_AVATAR} 
                      alt={top3.user.username} 
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <Link to={`/players/${top3.user.username}`} className="podium-username">
                    @{top3.user.username}
                  </Link>
                  <p className="podium-team text-secondary">{top3.teamName}</p>
                  <div className="podium-points-tag bronze-glow">
                    {top3.points} PTS
                  </div>
                  <div className="podium-stats-mini mt-3">
                    <div><span>Wins:</span> <strong>{top3.wins}</strong></div>
                    <div><span>Earned:</span> <strong>₹{top3.prizeMoney.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Full Rankings Table */}
          <div className="glass-panel mt-4 leaderboard-table-container table-responsive" style={{ padding: '0', overflowX: 'auto' }}>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Active Squad</th>
                  <th>Wins (1st)</th>
                  <th>Runner-Ups</th>
                  <th>Win Rate</th>
                  <th>Matches Won</th>
                  <th>Total Prize</th>
                  <th className="text-right">Rating Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((item) => (
                  <tr key={item.user.id} className={item.rank <= 3 ? `top-rank-row rank-${item.rank}` : ''}>
                    <td className="rank-cell">
                      <span className={`rank-badge rank-${item.rank}`}>
                        {item.rank === 1 ? '🥇 #1' : item.rank === 2 ? '🥈 #2' : item.rank === 3 ? '🥉 #3' : `#${item.rank}`}
                      </span>
                    </td>
                    <td className="player-cell">
                      <div className="player-meta">
                        <img 
                          src={item.user.avatar || DEFAULT_AVATAR} 
                          alt={item.user.username} 
                          className="player-row-avatar" 
                          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                        />
                        <div>
                          <Link to={`/players/${item.user.username}`} className="player-row-handle">
                            @{item.user.username} <ArrowUpRight size={12} className="link-arrow" />
                          </Link>
                          <span className="player-row-role">{item.user.role.toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="team-cell-badge">
                        <Shield size={12} className="text-muted" /> {item.teamName}
                      </span>
                    </td>
                    <td><strong>{item.wins}</strong></td>
                    <td>{item.runnerUps}</td>
                    <td>
                      <span className="winrate-pill">{item.winRate}%</span>
                    </td>
                    <td>
                      {item.matchesWon} / {item.totalMatches}
                    </td>
                    <td className="prize-cell">
                      {item.prizeMoney > 0 ? `₹${item.prizeMoney.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="points-cell text-right" style={{ whiteSpace: 'nowrap' }}>
                      <span className="pts-highlight">{item.points} PTS</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
