import React, { useState, useEffect } from 'react';
import { Swords, Trophy, ShieldCheck, AlertCircle, ArrowRight, UserCheck, Flame } from 'lucide-react';
import './ClashSquadTeamView.css';

const ClashSquadTeamView = ({ tournament, matches, user, myTeams }) => {
  const registeredTeams = tournament?.registeredTeams || [];
  
  // Find which registered team belongs to logged in user
  const userRegisteredTeam = registeredTeams.find(t => {
    const tId = (t._id || t)?.toString();
    return (myTeams || []).some(mt => mt._id.toString() === tId);
  });

  const [selectedTeamId, setSelectedTeamId] = useState(
    userRegisteredTeam ? (userRegisteredTeam._id || userRegisteredTeam).toString() : (registeredTeams[0]?._id || registeredTeams[0] || '').toString()
  );

  useEffect(() => {
    if (userRegisteredTeam) {
      setSelectedTeamId((userRegisteredTeam._id || userRegisteredTeam).toString());
    } else if (registeredTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId((registeredTeams[0]._id || registeredTeams[0]).toString());
    }
  }, [userRegisteredTeam, registeredTeams]);

  if (!matches || matches.length === 0 || registeredTeams.length === 0) {
    return null;
  }

  const selectedTeamObj = registeredTeams.find(t => (t._id || t).toString() === selectedTeamId);
  const selectedTeamName = selectedTeamObj?.name || 'My Squad';

  // Find all matches for selected team
  const teamMatches = matches.filter(m => {
    const aId = (m.teamA?.id?._id || m.teamA?.id)?.toString();
    const bId = (m.teamB?.id?._id || m.teamB?.id)?.toString();
    return aId === selectedTeamId || bId === selectedTeamId;
  }).sort((a, b) => a.round - b.round);

  if (teamMatches.length === 0) {
    return (
      <div className="cs-team-view-container glass-panel">
        <div className="cs-team-view-header">
          <div className="cs-team-view-title-group">
            <div className="cs-team-view-icon">
              <Swords size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#e0e7ff', fontSize: '1.1rem' }}>
                ⚔️ Team Journey Tracker
              </h4>
              <span className="text-xs text-muted">Select squad to inspect round progress and upcoming fixture</span>
            </div>
          </div>

          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '180px', padding: '6px 12px', fontSize: '0.85rem' }}
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
          >
            {registeredTeams.map(t => (
              <option key={t._id || t} value={t._id || t}>{t.name || 'Team'}</option>
            ))}
          </select>
        </div>
        <p className="text-muted text-sm text-center py-3">
          This team has not been seeded into an active match slot yet.
        </p>
      </div>
    );
  }

  // Identify current match (latest live or upcoming match, or the final match if completed)
  const currentMatch = teamMatches.find(m => m.status === 'live')
    || teamMatches.find(m => m.status === 'scheduled')
    || teamMatches[teamMatches.length - 1];

  const isTeamA = (currentMatch.teamA?.id?._id || currentMatch.teamA?.id)?.toString() === selectedTeamId;
  const opponentName = isTeamA ? (currentMatch.teamB?.name || 'TBD') : (currentMatch.teamA?.name || 'TBD');
  const opponentId = isTeamA ? (currentMatch.teamB?.id?._id || currentMatch.teamB?.id) : (currentMatch.teamA?.id?._id || currentMatch.teamA?.id);

  const teamScore = isTeamA ? currentMatch.scoreA : currentMatch.scoreB;
  const opponentScore = isTeamA ? currentMatch.scoreB : currentMatch.scoreA;

  // Round display name
  const totalRounds = Math.max(...matches.map(m => m.round));
  let roundName = `Round ${currentMatch.round}`;
  if (currentMatch.round === totalRounds) {
    roundName = 'Final 🏆';
  } else if (currentMatch.round === totalRounds - 1 && totalRounds > 1) {
    roundName = 'Semi Final ⚔️';
  } else if (currentMatch.round === totalRounds - 2 && totalRounds > 2) {
    roundName = 'Quarter Final 🎯';
  }

  // Determine status & progression
  const isCompleted = currentMatch.status === 'completed';
  const isLive = currentMatch.status === 'live';
  const winnerId = (currentMatch.winner?._id || currentMatch.winner)?.toString();
  const didWin = isCompleted && winnerId === selectedTeamId;
  const didLose = isCompleted && winnerId && winnerId !== selectedTeamId;

  let progressionStatus = 'Upcoming Match';
  let statusBadgeColor = '#94a3b8';

  if (isLive) {
    progressionStatus = '🔴 LIVE in Progress';
    statusBadgeColor = '#f87171';
  } else if (didWin) {
    if (currentMatch.round === totalRounds) {
      progressionStatus = '🏆 TOURNAMENT CHAMPION';
      statusBadgeColor = '#fbbf24';
    } else {
      progressionStatus = currentMatch.round === totalRounds - 1 ? '✨ Qualified for Final' : '✨ Qualified for Next Round';
      statusBadgeColor = '#4ade80';
    }
  } else if (didLose) {
    progressionStatus = '❌ Eliminated';
    statusBadgeColor = '#ef4444';
  }

  // Determine Next Opponent if qualified
  let nextOpponentText = 'None / Tournament Complete';
  if (didWin && currentMatch.nextMatchId) {
    const nextMatch = matches.find(m => m._id.toString() === currentMatch.nextMatchId.toString());
    if (nextMatch) {
      const nextIsTeamA = currentMatch.nextMatchSlot === 'teamA';
      const potentialOpponent = nextIsTeamA ? nextMatch.teamB : nextMatch.teamA;
      nextOpponentText = potentialOpponent?.name && potentialOpponent.name !== 'TBD'
        ? potentialOpponent.name
        : 'Winner of Feeder Match';
    }
  } else if (!isCompleted) {
    nextOpponentText = 'Determined upon match conclusion';
  }

  return (
    <div className="cs-team-view-container glass-panel">
      <div className="cs-team-view-header">
        <div className="cs-team-view-title-group">
          <div className="cs-team-view-icon">
            <Swords size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, color: '#e0e7ff', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{selectedTeamName.toUpperCase()}</span>
              {userRegisteredTeam && (userRegisteredTeam._id || userRegisteredTeam).toString() === selectedTeamId && (
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8', fontSize: '0.7rem' }}>
                  YOUR SQUAD
                </span>
              )}
            </h4>
            <span className="text-xs text-muted">
              {tournament.name} &bull; Series: {currentMatch.matchFormat || tournament.clashSquadSettings?.matchFormat || 'BO3'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="text-xs text-secondary">Switch Squad:</span>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '160px', padding: '6px 10px', fontSize: '0.85rem' }}
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
          >
            {registeredTeams.map(t => (
              <option key={t._id || t} value={t._id || t}>{t.name || 'Team'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="cs-team-grid">
        <div className="cs-info-box">
          <div className="cs-info-label">Current Round</div>
          <div className="cs-info-val" style={{ color: '#a5b4fc' }}>
            {roundName}
          </div>
        </div>

        <div className="cs-info-box">
          <div className="cs-info-label">Opponent</div>
          <div className="cs-info-val">
            {opponentName}
          </div>
        </div>

        <div className="cs-info-box">
          <div className="cs-info-label">Match Score ({currentMatch.matchFormat || 'BO3'})</div>
          <div className="cs-info-val" style={{ color: isLive ? '#f87171' : '#fff' }}>
            {isCompleted || isLive ? `${teamScore} - ${opponentScore}` : '0 - 0 (Upcoming)'}
          </div>
        </div>

        <div className="cs-info-box">
          <div className="cs-info-label">Status & Result</div>
          <div className="cs-info-val" style={{ color: statusBadgeColor }}>
            {progressionStatus}
          </div>
        </div>

        <div className="cs-info-box" style={{ gridColumn: 'span 2' }}>
          <div className="cs-info-label">Next Opponent</div>
          <div className="cs-info-val" style={{ fontSize: '0.95rem', color: '#c7d2fe' }}>
            <ArrowRight size={15} style={{ color: '#818cf8' }} /> {nextOpponentText}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClashSquadTeamView;
