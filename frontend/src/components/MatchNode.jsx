import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Edit2, Award, CheckCircle, Clock, AlertTriangle, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import './MatchNode.css';

const MatchNode = ({ match, isOrganizer, onUpdateScore }) => {
  const { user, getAuthHeader } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0);
  const [error, setError] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);

  // MVP States
  const [mvpPlayerId, setMvpPlayerId] = useState(match.mvp?._id || match.mvp || '');
  const [mvpCommentInput, setMvpCommentInput] = useState(match.mvpComment || '');

  const { teamA, teamB, winner, status, round, position, checkInA, checkInB, isWalkover, walkoverReason, mvp, mvpComment } = match;

  const handleSetMVP = async (selectedUserId, commentStr) => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/matches/${match._id}/mvp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          mvpUserId: selectedUserId,
          comment: commentStr || 'Dominant MVP performance',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to award MVP');
    } catch (err) {
      console.error('Error awarding MVP:', err);
    }
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/matches/${match._id}/checkin`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Check-in failed');
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckInLoading(false);
    }
  };

  const userIdStr = (user?._id || user?.id)?.toString();
  const teamAIdStr = (teamA?.id?._id || teamA?.id)?.toString();
  const teamBIdStr = (teamB?.id?._id || teamB?.id)?.toString();

  const isUserTeamA = Boolean(userIdStr) && Boolean(teamAIdStr) && userIdStr === teamAIdStr;
  const isUserTeamB = Boolean(userIdStr) && Boolean(teamBIdStr) && userIdStr === teamBIdStr;
  const canUserCheckIn = status !== 'completed' && ((isUserTeamA && !checkInA) || (isUserTeamB && !checkInB));

  const handleOpenModal = () => {
    setScoreA(match.scoreA ?? 0);
    setScoreB(match.scoreB ?? 0);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numA = scoreA === '' ? 0 : parseInt(scoreA, 10);
    const numB = scoreB === '' ? 0 : parseInt(scoreB, 10);

    if (isNaN(numA) || isNaN(numB)) {
      setError('Please enter valid numerical scores.');
      return;
    }

    if (numA === numB) {
      setError('Matches cannot end in a draw.');
      return;
    }

    try {
      await onUpdateScore(match._id, numA, numB);
      if (mvpPlayerId) {
        await handleSetMVP(mvpPlayerId, mvpCommentInput);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to update score.');
    }
  };

  const isCompleted = status === 'completed';
  const winnerIdStr = (winner?._id || winner)?.toString();

  const teamAWon = isCompleted && Boolean(winnerIdStr) && Boolean(teamAIdStr) && winnerIdStr === teamAIdStr;
  const teamBWon = isCompleted && Boolean(winnerIdStr) && Boolean(teamBIdStr) && winnerIdStr === teamBIdStr;

  // Determine label values
  const nameA = teamA?.name || 'TBD';
  const nameB = teamB?.name || 'TBD';

  // Helper to extract player list from Team A and Team B
  const getTeamPlayers = (teamObj, teamFallbackName) => {
    const players = [];
    if (!teamObj || !teamObj.id) return players;

    const tData = teamObj.id;
    if (Array.isArray(tData.members) && tData.members.length > 0) {
      tData.members.forEach(m => {
        if (m && typeof m === 'object') {
          const mId = (m._id || m.id)?.toString();
          const mName = m.username || m.name;
          if (mId && mName) {
            players.push({ id: mId, name: mName });
          }
        }
      });
    }

    if (tData.captain && typeof tData.captain === 'object') {
      const cId = (tData.captain._id || tData.captain.id)?.toString();
      const cName = tData.captain.username || tData.captain.name;
      if (cId && cName && !players.some(p => p.id === cId)) {
        players.push({ id: cId, name: cName });
      }
    }

    if (players.length === 0 && tData.username) {
      const pId = (tData._id || tData.id || tData)?.toString();
      players.push({ id: pId, name: tData.username });
    }

    if (players.length === 0) {
      const rawId = (tData._id || tData.id || tData)?.toString();
      if (rawId) {
        players.push({ id: rawId, name: teamFallbackName || 'Player' });
      }
    }

    return players;
  };

  const teamAPlayers = getTeamPlayers(teamA, nameA);
  const teamBPlayers = getTeamPlayers(teamB, nameB);
  const displayRound = match.relativeRound || round;
  const isLoserBracket = match.bracketType === 'losers';
  const isGrandFinal = match.bracketType === 'winners' && !match.nextMatchId && round > 1;

  return (
    <div className={`match-node glass-panel ${isCompleted ? 'completed' : 'scheduled'} ${isGrandFinal ? 'grand-final-node' : ''}`}>
      <div className="match-node-header">
        <span className="match-id-label">
          {isGrandFinal ? `🏆 GRAND FINAL` : isLoserBracket ? `Losers R${displayRound} P${position}` : `Match R${displayRound} P${position}`}
        </span>
        {isWalkover && (
          <span className="walkover-badge" title={walkoverReason}>
            <AlertTriangle size={10} /> WALKOVER
          </span>
        )}
        {isOrganizer && (
          <button 
            className="match-edit-btn" 
            onClick={handleOpenModal}
            title="Record Score"
          >
            <Edit2 size={12} />
          </button>
        )}
      </div>

      <div className="match-teams">
        <div className={`match-team-row ${teamAWon ? 'winner' : ''} ${isCompleted && !teamAWon ? 'loser' : ''}`}>
          <span className="team-name" title={nameA}>
            {teamAWon && <Award size={14} className="winner-crown" />}
            {nameA}
            {teamA?.id && !isCompleted && (
              <span className={`checkin-pill ${checkInA ? 'checked' : 'pending'}`}>
                {checkInA ? <CheckCircle size={10} /> : <Clock size={10} />}
                {checkInA ? 'In' : 'Pending'}
              </span>
            )}
            {isCompleted && isGrandFinal && teamAWon && <span className="final-tag champ">CHAMPION 🏆</span>}
            {isCompleted && isGrandFinal && !teamAWon && <span className="final-tag runner">RUNNER-UP 🥈</span>}
          </span>
          <span className="team-score">{isCompleted ? match.scoreA : '-'}</span>
        </div>

        <div className="match-divider"></div>

        <div className={`match-team-row ${teamBWon ? 'winner' : ''} ${isCompleted && !teamBWon ? 'loser' : ''}`}>
          <span className="team-name" title={nameB}>
            {teamBWon && <Award size={14} className="winner-crown" />}
            {nameB}
            {teamB?.id && !isCompleted && (
              <span className={`checkin-pill ${checkInB ? 'checked' : 'pending'}`}>
                {checkInB ? <CheckCircle size={10} /> : <Clock size={10} />}
                {checkInB ? 'In' : 'Pending'}
              </span>
            )}
            {isCompleted && isGrandFinal && teamBWon && <span className="final-tag champ">CHAMPION 🏆</span>}
            {isCompleted && isGrandFinal && !teamBWon && <span className="final-tag runner">RUNNER-UP 🥈</span>}
          </span>
          <span className="team-score">{isCompleted ? match.scoreB : '-'}</span>
        </div>
      </div>

      {/* MVP Badge on completed match */}
      {mvp && (
        <div className="match-mvp-pill-row mt-2" title={mvpComment || 'Match MVP'}>
          <span className="mvp-star-badge">
            <Star size={10} className="fill-gold" /> MVP: @{mvp.username || (typeof mvp === 'string' ? mvp : 'Player')}
          </span>
        </div>
      )}

      {canUserCheckIn && (
        <div className="match-checkin-action mt-2 text-center">
          <button 
            onClick={handleCheckIn} 
            className="btn btn-primary btn-sm w-full py-1 text-xs"
            disabled={checkInLoading}
          >
            {checkInLoading ? 'Checking In...' : '✔ Check-In for Match'}
          </button>
        </div>
      )}

      {showModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Match Score</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="score-inputs-row">
                <div className="score-input-col">
                  <label className="form-label">{nameA}</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-control score-number-input" 
                    value={scoreA}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScoreA(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                    }}
                    disabled={!teamA.id}
                  />
                </div>
                <div className="score-separator">VS</div>
                <div className="score-input-col">
                  <label className="form-label">{nameB}</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-control score-number-input" 
                    value={scoreB}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScoreB(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
                    }}
                    disabled={!teamB.id}
                  />
                </div>
              </div>

              {/* MVP Selection Section for Organizer */}
              {teamA.id && teamB.id && (
                <div className="mt-4 pt-3 border-t">
                  <label className="form-label font-bold flex items-center gap-1">
                    <Star size={14} className="text-warning" /> Award Match MVP (Optional)
                  </label>
                  <select 
                    className="form-control mt-1 text-sm"
                    value={mvpPlayerId}
                    onChange={(e) => setMvpPlayerId(e.target.value)}
                  >
                    <option value="">-- Select Most Valuable Player (MVP) --</option>

                    {teamAPlayers.length > 0 && (
                      <optgroup label={`🛡️ ${nameA} Players`}>
                        {teamAPlayers.map((p, idx) => (
                          <option key={`a-${p.id}-${idx}`} value={p.id}>
                            @{p.name} ({nameA})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {teamBPlayers.length > 0 && (
                      <optgroup label={`🛡️ ${nameB} Players`}>
                        {teamBPlayers.map((p, idx) => (
                          <option key={`b-${p.id}-${idx}`} value={p.id}>
                            @{p.name} ({nameB})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <input 
                    type="text" 
                    className="form-control mt-2 text-xs" 
                    placeholder="MVP Comment (e.g. 35 Kills, Clutch 1v3 Round 5)"
                    value={mvpCommentInput}
                    onChange={(e) => setMvpCommentInput(e.target.value)}
                  />
                </div>
              )}

              {error && <p className="error-text mt-4">{error}</p>}
              {!teamA.id || !teamB.id ? (
                <p className="warning-text mt-4 text-center">Cannot record scores until both participants are advanced.</p>
              ) : null}

              <div className="modal-actions mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!teamA.id || !teamB.id}
                >
                  Save Score
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

export default MatchNode;
