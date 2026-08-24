import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award, Coins, Users, Swords, Share2, Copy, Check, Twitter, MessageCircle } from 'lucide-react';
import StatCard from './StatCard';
import { API_BASE_URL } from '../config/api';
import './TournamentHighlights.css';

const TournamentHighlights = ({ tournamentId }) => {
  const [highlights, setHighlights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchHighlights = async () => {
      if (!tournamentId) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/highlights`);
        if (!res.ok) return;
        const data = await res.json();
        setHighlights(data);
      } catch (err) {
        console.error('Failed to fetch highlights:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, [tournamentId]);

  if (loading) {
    return <div className="text-center py-4"><p className="text-secondary text-sm">Generating tournament highlights graphic cards...</p></div>;
  }

  if (!highlights) {
    return null;
  }

  const { tournament, champion, runnerUp, top3 = [], prizeWinners = [], stats, socialShareText } = highlights;

  const currentUrl = window.location.href;

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialShareText)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank');
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${socialShareText} ${currentUrl}`)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${socialShareText}\n${currentUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tournament-highlights-wrapper flex-col gap-4">
      {/* 1. Champion Spotlight Card */}
      <div className="champion-spotlight-card glass-panel text-center p-4">
        <div className="spotlight-crown-wrapper">
          <Crown size={48} className="spotlight-crown-icon" />
        </div>
        <span className="spotlight-badge">OFFICIAL TOURNAMENT CHAMPION</span>
        <h1 className="spotlight-champion-name">{champion.name.toUpperCase()}</h1>
        <p className="spotlight-subtitle">{tournament.name} ({tournament.game})</p>
        
        {champion.prizeWon > 0 && (
          <div className="spotlight-prize-tag mt-3">
            <Coins size={18} /> Grand Prize Won: ₹{champion.prizeWon.toLocaleString('en-IN')}
          </div>
        )}
      </div>

      {/* 2. Top 3 Podium Spotlight Grid */}
      <h3 className="section-title mt-4">Top 3 Podium Finishers</h3>
      <div className="podium-spotlight-grid mt-2">
        {top3.map((podium) => (
          <div key={podium.rank} className={`podium-spotlight-card rank-${podium.rank} glass-panel`}>
            <div className={`rank-pill rank-pill-${podium.rank}`}>#{podium.rank} PLACE</div>
            {podium.rank === 1 ? (
              <Crown size={32} className="rank-icon gold-icon" />
            ) : (
              <Medal size={28} className={`rank-icon ${podium.rank === 2 ? 'silver-icon' : 'bronze-icon'}`} />
            )}
            <h3 className="podium-team-name">{podium.name}</h3>
            <span className="podium-title-label">{podium.title}</span>
            {podium.prizeWon > 0 ? (
              <span className="podium-prize-badge">Prize: ₹{podium.prizeWon.toLocaleString('en-IN')}</span>
            ) : (
              <span className="podium-prize-badge muted">Honorary Finish</span>
            )}
          </div>
        ))}
      </div>

      {/* 3. Prize Winners & Tournament Statistics Split */}
      <div className="dashboard-split mt-4">
        {/* Prize Winners Breakdown Table */}
        <div className="glass-panel flex-1">
          <h3><Coins size={18} className="text-warning inline-block mr-2" /> Cash Prize Distribution</h3>
          {prizeWinners.length > 0 ? (
            <div className="table-responsive mt-3">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Competitor / Squad</th>
                    <th>Prize Money</th>
                  </tr>
                </thead>
                <tbody>
                  {prizeWinners.map((winner, idx) => (
                    <tr key={idx}>
                      <td><strong>#{winner.rank}</strong></td>
                      <td><strong>{winner.name}</strong></td>
                      <td className="text-success font-bold">₹{winner.prizeWon.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted text-center py-4">Free tournament format with non-monetary rankings.</p>
          )}
        </div>

        {/* Tournament Statistics Grid */}
        <div className="glass-panel flex-1">
          <h3><Swords size={18} className="text-primary inline-block mr-2" /> Tournament Statistics</h3>
          <div className="grid-2 mt-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <StatCard title="Total Entrants" value={stats.totalParticipants} icon={Users} />
            <StatCard title="Matches Battled" value={stats.completedMatches} icon={Swords} />
            <StatCard title="Prize Distributed" value={`₹${stats.totalPrizeDistributed.toLocaleString('en-IN')}`} icon={Coins} />
            <StatCard title="Walkover Matches" value={stats.walkoverMatches} icon={Award} />
          </div>
        </div>
      </div>

      {/* 4. One-Click Social Media Share Bar */}
      <div className="glass-panel social-share-bar p-3 mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Share2 size={20} className="text-primary" />
          <div>
            <strong>Share Highlights on Social Media</strong>
            <p className="text-muted text-xs">Broadcast champions, podium finishes, and match stats to your followers.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleShareTwitter} style={{ background: '#1da1f2', color: '#fff', border: 'none' }}>
            <Twitter size={14} /> <span>Share on X</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleShareWhatsApp} style={{ background: '#25d366', color: '#fff', border: 'none' }}>
            <MessageCircle size={14} /> <span>WhatsApp</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
            {copied ? <Check size={14} /> : <Copy size={14} />} <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentHighlights;
