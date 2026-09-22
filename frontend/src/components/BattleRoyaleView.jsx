import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Flame, Trophy, Award, Crown, Crosshair, MapPin, Calendar, Edit3, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './BattleRoyaleView.css';

const BattleRoyaleView = ({ tournament, isOrganizer, getAuthHeader, onResultsUpdated }) => {
  const [activeTab, setActiveTab] = useState('overall'); // 'overall', 'matches'
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);

  // Result entry modal states
  const [editingMatch, setEditingMatch] = useState(null);
  const [entryResults, setEntryResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [entryError, setEntryError] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournament._id}/leaderboard`);
      if (!res.ok) throw new Error('Failed to load Battle Royale leaderboard');
      const data = await res.json();
      setLeaderboardData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournament?._id) {
      fetchLeaderboard();
    }
  }, [tournament?._id]);

  const matches = leaderboardData?.matches || [];
  const overall = leaderboardData?.overallLeaderboard || [];
  const activeMatch = matches[selectedMatchIndex] || null;

  // Open modal to enter/edit scores for a match
  const handleOpenScoreModal = (match) => {
    setEditingMatch(match);
    setEntryError('');

    // Prepopulate with existing match results or default from registered teams
    const defaultList = tournament.registeredTeams.map(t => {
      const existing = (match.results || []).find(r => (r.teamId?._id || r.teamId)?.toString() === t._id.toString());
      return {
        teamId: t._id,
        teamName: t.name,
        logo: t.logo || '',
        placement: existing?.placement || '',
        kills: existing?.kills ?? 0,
      };
    });

    setEntryResults(defaultList);
  };

  const calculatePointsPreview = (placement, kills) => {
    const pNum = Number(placement) || 0;
    const kNum = Number(kills) || 0;

    const scoringSystem = tournament.brSettings?.scoringSystem || {};
    const placementMap = scoringSystem.placementPoints || {
      1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
      7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
    };

    const placementPts = pNum > 0 && placementMap[pNum] !== undefined ? Number(placementMap[pNum]) : 0;
    const killPts = kNum * (scoringSystem.killPoints != null ? Number(scoringSystem.killPoints) : 1);
    const bonus = pNum === 1 ? (Number(scoringSystem.booyahBonus) || 0) : 0;

    return {
      placementPts,
      killPts,
      total: placementPts + killPts + bonus,
    };
  };

  const handleAutoFillDemoResults = () => {
    // Generate realistic demo placements and kills for testing
    const shuffledPositions = Array.from({ length: entryResults.length }, (_, i) => i + 1);
    // Shuffle placements
    for (let i = shuffledPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
    }

    const updated = entryResults.map((team, idx) => ({
      ...team,
      placement: shuffledPositions[idx],
      kills: Math.floor(Math.random() * 9),
    }));

    setEntryResults(updated);
  };

  const handleSubmitResults = async (e) => {
    e.preventDefault();
    setEntryError('');

    // Validate placements
    const usedPlacements = new Set();
    for (const row of entryResults) {
      const p = Number(row.placement);
      if (!p || p < 1 || p > entryResults.length) {
        setEntryError(`Each team must have a valid placement between 1 and ${entryResults.length}.`);
        return;
      }
      if (usedPlacements.has(p)) {
        setEntryError(`Duplicate placement #${p} found. Every team must have a unique rank.`);
        return;
      }
      usedPlacements.add(p);
      if (Number(row.kills) < 0) {
        setEntryError('Kills cannot be negative.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        results: entryResults.map(r => ({
          teamId: r.teamId,
          teamName: r.teamName,
          placement: Number(r.placement),
          kills: Number(r.kills),
        })),
      };

      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournament._id}/matches/${editingMatch._id}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit match results');

      setEditingMatch(null);
      await fetchLeaderboard();
      if (onResultsUpdated) onResultsUpdated();
    } catch (err) {
      setEntryError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalMatchesCount = matches.length || tournament.brSettings?.numberOfMatches || 6;

  return (
    <div className="br-view-container">
      {/* Top Banner Header */}
      <div className="br-header-banner">
        <div className="br-header-left">
          <div className="br-header-icon">
            <Flame size={28} />
          </div>
          <div>
            <h2 className="br-header-title">
              🔥 Free Fire Battle Royale Hub
            </h2>
            <p className="br-header-subtitle">
              Multi-Match Points Series • Placement Points + Kill Points • 12 Squads Lobby
            </p>
          </div>
        </div>

        <div className="br-header-stats">
          <div className="br-stat-chip">
            <span className="chip-label">Total Matches</span>
            <span className="chip-val">{totalMatchesCount}</span>
          </div>
          <div className="br-stat-chip">
            <span className="chip-label">Completed</span>
            <span className="chip-val" style={{ color: '#4ade80' }}>
              {matches.filter(m => m.status === 'completed').length} / {totalMatchesCount}
            </span>
          </div>
          <div className="br-stat-chip">
            <span className="chip-label">Lobby Size</span>
            <span className="chip-val">{tournament.registeredTeams?.length || 12} Teams</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="br-subnav">
        <button
          className={`br-subnav-btn ${activeTab === 'overall' ? 'active' : ''}`}
          onClick={() => setActiveTab('overall')}
        >
          <Trophy size={16} />
          <span>Overall Tournament Leaderboard</span>
        </button>

        <button
          className={`br-subnav-btn ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          <Crosshair size={16} />
          <span>Match-by-Match Breakdown ({matches.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERALL LEADERBOARD */}
      {activeTab === 'overall' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ffedd5' }}>
                <Trophy size={20} style={{ color: '#f59e0b' }} /> Official Overall Standings
              </h3>
              <p className="text-xs text-muted" style={{ margin: '4px 0 0 0' }}>
                Tie-Breakers: 1. Total Points &bull; 2. Total Kills &bull; 3. Best Placement &bull; 4. Placement Points
              </p>
            </div>

            {tournament.status === 'completed' && (
              <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', padding: '6px 12px', fontSize: '0.85rem' }}>
                🏆 Tournament Finalized
              </span>
            )}
          </div>

          {overall.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p>No leaderboard data available yet. Results will display as matches are played.</p>
            </div>
          ) : (
            <div className="br-table-responsive">
              <table className="br-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                    <th>Team</th>
                    {Array.from({ length: totalMatchesCount }).map((_, i) => (
                      <th key={i} style={{ textAlign: 'center' }}>M{i + 1}</th>
                    ))}
                    <th style={{ textAlign: 'center' }}>Placement Pts</th>
                    <th style={{ textAlign: 'center' }}>Kills</th>
                    <th style={{ textAlign: 'center' }}>Booyahs 👑</th>
                    <th style={{ textAlign: 'center' }}>Total Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {overall.map((row) => (
                    <tr key={row.teamId} style={{ background: row.rank === 1 ? 'rgba(245, 158, 11, 0.06)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`br-rank-badge ${row.rank === 1 ? 'br-rank-1' : row.rank === 2 ? 'br-rank-2' : row.rank === 3 ? 'br-rank-3' : 'br-rank-other'}`}>
                          {row.rank}
                        </span>
                      </td>
                      <td>
                        <div className="br-team-cell">
                          <div className="br-team-avatar">
                            {row.logo ? <img src={row.logo} alt={row.teamName} /> : row.teamName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ color: '#fff', fontWeight: '700' }}>{row.teamName}</span>
                            {row.tag && <span className="text-xs text-muted" style={{ display: 'block' }}>[{row.tag}]</span>}
                          </div>
                        </div>
                      </td>

                      {/* Match Breakdown Columns M1..Mn */}
                      {Array.from({ length: totalMatchesCount }).map((_, i) => {
                        const mNum = i + 1;
                        const matchData = row.matchBreakdown?.[mNum];
                        const matchFinished = matches.find(m => m.matchNumber === mNum)?.status === 'completed';
                        return (
                          <td key={i} style={{ textAlign: 'center' }}>
                            {matchFinished && matchData ? (
                              <span className="br-pts-pill" title={`Pos: #${matchData.placement} | Kills: ${matchData.kills}`}>
                                {matchData.totalPoints}
                              </span>
                            ) : (
                              <span className="text-muted text-xs">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td style={{ textAlign: 'center', color: '#cbd5e1' }}>{row.placementPoints}</td>
                      <td style={{ textAlign: 'center', color: '#cbd5e1' }}>{row.totalKills}</td>
                      <td style={{ textAlign: 'center' }}>
                        {row.booyahs > 0 ? (
                          <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>👑 {row.booyahs}</span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="br-pts-total">{row.totalPoints}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MATCH-BY-MATCH BREAKDOWN & ORGANIZER ENTRY */}
      {activeTab === 'matches' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ffedd5' }}>
              <Crosshair size={20} style={{ color: '#f97316' }} /> Match Results & Fixtures
            </h3>

            {isOrganizer && activeMatch && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenScoreModal(activeMatch)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit3 size={15} />
                <span>{activeMatch.status === 'completed' ? 'Edit Match Results' : 'Enter Match Results'}</span>
              </button>
            )}
          </div>

          {/* Match pill selector */}
          {matches.length === 0 ? (
            <p className="text-muted">No matches scheduled yet.</p>
          ) : (
            <>
              <div className="br-match-pills mb-4">
                {matches.map((m, idx) => (
                  <button
                    key={m._id}
                    className={`br-match-pill-btn ${idx === selectedMatchIndex ? 'active' : ''}`}
                    onClick={() => setSelectedMatchIndex(idx)}
                  >
                    <span className="br-match-pill-num">Match {m.matchNumber}</span>
                    <span className="br-match-pill-sub">
                      🗺️ {m.mapName} &bull; {m.status === 'completed' ? '✅ Finished' : '🕒 Scheduled'}
                    </span>
                  </button>
                ))}
              </div>

              {activeMatch && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#ffedd5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Match #{activeMatch.matchNumber} &bull; Map: <span style={{ color: '#f97316' }}>{activeMatch.mapName}</span>
                      </h4>
                      <span className="text-xs text-muted">
                        Status: <strong style={{ color: activeMatch.status === 'completed' ? '#4ade80' : '#f59e0b' }}>{activeMatch.status.toUpperCase()}</strong>
                      </span>
                    </div>

                    {isOrganizer && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenScoreModal(activeMatch)}
                      >
                        <Edit3 size={14} style={{ marginRight: '5px' }} />
                        {activeMatch.status === 'completed' ? 'Update Scores' : 'Record Results'}
                      </button>
                    )}
                  </div>

                  {/* Match Leaderboard */}
                  {activeMatch.status !== 'completed' ? (
                    <div className="text-center py-4 text-muted">
                      <p>Results have not been submitted for this match yet.</p>
                      {isOrganizer && (
                        <button
                          className="btn btn-primary btn-sm mt-2"
                          onClick={() => handleOpenScoreModal(activeMatch)}
                        >
                          Record Placements & Kills
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="br-table-responsive">
                      <table className="br-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                            <th>Team</th>
                            <th style={{ textAlign: 'center' }}>Placement</th>
                            <th style={{ textAlign: 'center' }}>Kills</th>
                            <th style={{ textAlign: 'center' }}>Placement Pts</th>
                            <th style={{ textAlign: 'center' }}>Kill Pts</th>
                            <th style={{ textAlign: 'center' }}>Total Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...activeMatch.results]
                            .sort((a, b) => a.placement - b.placement)
                            .map((r, idx) => (
                              <tr key={r.teamId?._id || r.teamId} style={{ background: r.placement === 1 ? 'rgba(245, 158, 11, 0.08)' : undefined }}>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`br-rank-badge ${r.placement === 1 ? 'br-rank-1' : r.placement === 2 ? 'br-rank-2' : r.placement === 3 ? 'br-rank-3' : 'br-rank-other'}`}>
                                    {r.placement}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontWeight: '700', color: '#fff' }}>
                                    {r.teamName || r.teamId?.name || 'Team'}
                                  </span>
                                  {r.placement === 1 && (
                                    <span style={{ marginLeft: '8px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                      🏆 BOOYAH!
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>#{r.placement}</td>
                                <td style={{ textAlign: 'center' }}>{r.kills}</td>
                                <td style={{ textAlign: 'center' }}>{r.placementPoints}</td>
                                <td style={{ textAlign: 'center' }}>{r.killPoints}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="br-pts-total">{r.totalPoints}</span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ORGANIZER SCORE SUBMISSION MODAL */}
      {editingMatch && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={() => setEditingMatch(null)}>
          <div className="modal-content" style={{ maxWidth: '750px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, color: '#ffedd5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔥 Enter Match #{editingMatch.matchNumber} Results
                </h3>
                <span className="text-xs text-muted">
                  Map: {editingMatch.mapName} &bull; Enter Placements (1-12) and Kills for each squad
                </span>
              </div>
              <button className="modal-close" onClick={() => setEditingMatch(null)}>&times;</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAutoFillDemoResults}
                style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Sparkles size={14} style={{ color: '#fbbf24' }} /> Auto-Fill Demo Results (Testing)
              </button>
            </div>

            <form onSubmit={handleSubmitResults}>
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="br-score-modal-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Team Name</th>
                      <th style={{ width: '20%', textAlign: 'center' }}>Placement (1-12)</th>
                      <th style={{ width: '20%', textAlign: 'center' }}>Kills</th>
                      <th style={{ width: '20%', textAlign: 'center' }}>Live Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entryResults.map((row, idx) => {
                      const pts = calculatePointsPreview(row.placement, row.kills);
                      return (
                        <tr key={row.teamId}>
                          <td style={{ fontWeight: '600', color: '#fff' }}>
                            {row.teamName}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              max={entryResults.length}
                              className="form-control"
                              style={{ width: '80px', margin: '0 auto', textAlign: 'center', padding: '6px' }}
                              value={row.placement}
                              onChange={(e) => {
                                const updated = [...entryResults];
                                updated[idx].placement = e.target.value === '' ? '' : Number(e.target.value);
                                setEntryResults(updated);
                              }}
                              placeholder="1-12"
                              required
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-control"
                              style={{ width: '80px', margin: '0 auto', textAlign: 'center', padding: '6px' }}
                              value={row.kills}
                              onChange={(e) => {
                                const updated = [...entryResults];
                                updated[idx].kills = e.target.value === '' ? '' : Number(e.target.value);
                                setEntryResults(updated);
                              }}
                              required
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: '#f97316' }}>
                              {pts.total} pts
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                              ({pts.placementPts}p + {pts.killPts}k)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {entryError && (
                <p className="error-text mt-3" style={{ fontSize: '0.85rem' }}>
                  ⚠️ {entryError}
                </p>
              )}

              <div className="modal-actions mt-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingMatch(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{submitting ? 'Saving Results...' : 'Save & Update Leaderboard'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BattleRoyaleView;
