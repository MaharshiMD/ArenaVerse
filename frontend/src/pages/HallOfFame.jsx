import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Coins, Award, Star, Shield, Flame, Sparkles, UserCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AvatarFrame from '../components/AvatarFrame';
import { API_BASE_URL } from '../config/api';
import './HallOfFame.css';

const HallOfFame = () => {
  const [data, setData] = useState({ topEarners: [], champions: [], topTeams: [] });
  const [activeTab, setActiveTab] = useState('earners'); // 'earners', 'champions', 'teams'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHallOfFame();
  }, []);

  const fetchHallOfFame = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/hall-of-fame`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch Hall of Fame:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5 mt-5">
        <p className="text-secondary text-sm">Loading ArenaVerse Hall of Fame & Legends...</p>
      </div>
    );
  }

  const top1 = data.topEarners?.[0];
  const top2 = data.topEarners?.[1];
  const top3 = data.topEarners?.[2];

  const totalPrizeDistributed = data.topEarners?.reduce((sum, e) => sum + (e.prizeWon || 0), 0) || 1250000;

  return (
    <div className="hall-of-fame-page container py-4 mt-4">
      {/* Hero Showcase Banner */}
      <div className="hof-hero-panel glass-panel p-5 mb-5 text-center">
        <div className="hof-crown-sparkle">
          <Crown className="text-warning hof-crown-icon" size={54} />
        </div>
        <h1 className="hof-title text-white font-extrabold m-0">
          ArenaVerse <span className="hof-title-gradient">Hall of Fame</span>
        </h1>
        <p className="section-subtitle mt-2 mb-4" style={{ maxWidth: '640px', margin: '0.5rem auto 1.5rem auto' }}>
          Immortalizing the greatest esports competitors, highest cash prize earners, gold champions, and legendary squads in ArenaVerse history.
        </p>

        {/* Global Summary Stats */}
        <div className="hof-stats-row">
          <div className="hof-stat-card">
            <Coins size={22} className="text-warning mb-1" />
            <h3 className="text-warning font-extrabold m-0">₹{totalPrizeDistributed.toLocaleString('en-IN')}</h3>
            <span className="text-muted text-xs">Total Prize Money Earned</span>
          </div>
          <div className="hof-stat-card">
            <Trophy size={22} className="text-primary mb-1" />
            <h3 className="text-primary font-extrabold m-0">{data.champions?.length || 10}+</h3>
            <span className="text-muted text-xs">Gold Champions Crowned</span>
          </div>
          <div className="hof-stat-card">
            <Shield size={22} className="text-success mb-1" />
            <h3 className="text-success font-extrabold m-0">{data.topTeams?.length || 10}+</h3>
            <span className="text-muted text-xs">Legend Esports Squads</span>
          </div>
        </div>
      </div>

      {/* Top 3 All-Time Podium Showcase */}
      {data.topEarners?.length > 0 && (
        <div className="hof-podium-section glass-panel p-4 mb-5">
          <h2 className="text-white text-center font-bold mb-4 flex items-center justify-center gap-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Sparkles size={20} className="text-warning" /> All-Time Legend Podium
          </h2>

          <div className="hof-podium-container">
            {/* Rank 2 (Silver) */}
            {top2 && (
              <div className="hof-podium-card podium-silver">
                <div className="podium-rank-badge silver-glow">#2 SILVER</div>
                <AvatarFrame 
                  src={top2.player?.profile?.avatar} 
                  size={76} 
                  frame={top2.player?.profile?.equippedFrame || 'Default'} 
                />
                <strong className="text-white text-sm mt-2 block">@{top2.player?.username}</strong>
                {top2.player?.profile?.equippedTitle && (
                  <span className="equipped-title-badge text-xs mt-1">👑 {top2.player.profile.equippedTitle}</span>
                )}
                <div className="podium-prize text-sm font-bold text-silver mt-2">
                  ₹{(top2.prizeWon || 0).toLocaleString('en-IN')}
                </div>
                <Link to={`/players/${top2.player?.username}`} className="btn btn-secondary btn-xs mt-3">
                  Inspect Legend
                </Link>
              </div>
            )}

            {/* Rank 1 (Gold - Center & Elevated) */}
            {top1 && (
              <div className="hof-podium-card podium-gold">
                <div className="gold-crown-header">👑</div>
                <div className="podium-rank-badge gold-glow">#1 ALL-TIME CHAMPION</div>
                <AvatarFrame 
                  src={top1.player?.profile?.avatar} 
                  size={96} 
                  frame={top1.player?.profile?.equippedFrame || 'Default'} 
                />
                <strong className="text-white text-md mt-2 block font-extrabold">@{top1.player?.username}</strong>
                {top1.player?.profile?.equippedTitle && (
                  <span className="equipped-title-badge text-xs mt-1">👑 {top1.player.profile.equippedTitle}</span>
                )}
                
                <div className="podium-prize text-lg font-extrabold text-warning mt-2">
                  ₹{(top1.prizeWon || 0).toLocaleString('en-IN')}
                </div>
                <Link to={`/players/${top1.player?.username}`} className="btn btn-primary btn-sm mt-3" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Crown size={14} /> Inspect Grand Champion
                </Link>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3 && (
              <div className="hof-podium-card podium-bronze">
                <div className="podium-rank-badge bronze-glow">#3 BRONZE</div>
                <AvatarFrame 
                  src={top3.player?.profile?.avatar} 
                  size={76} 
                  frame={top3.player?.profile?.equippedFrame || 'Default'} 
                />
                <strong className="text-white text-sm mt-2 block">@{top3.player?.username}</strong>
                {top3.player?.profile?.equippedTitle && (
                  <span className="equipped-title-badge text-xs mt-1">👑 {top3.player.profile.equippedTitle}</span>
                )}
                <div className="podium-prize text-sm font-bold text-bronze mt-2">
                  ₹{(top3.prizeWon || 0).toLocaleString('en-IN')}
                </div>
                <Link to={`/players/${top3.player?.username}`} className="btn btn-secondary btn-xs mt-3">
                  Inspect Legend
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs & Leaderboard Showcase */}
      <div className="filter-toolbar glass-panel mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0.85rem 1.25rem' }}>
        <div className="details-tabs" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button className={`tab-btn ${activeTab === 'earners' ? 'active' : ''}`} onClick={() => setActiveTab('earners')}>
            <Coins size={16} /> Highest Cash Prize Earners
          </button>
          <button className={`tab-btn ${activeTab === 'champions' ? 'active' : ''}`} onClick={() => setActiveTab('champions')}>
            <Crown size={16} /> Gold Medal Champions
          </button>
          <button className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
            <Shield size={16} /> Legendary Esports Squads
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-panel p-4">
        {activeTab === 'earners' && (
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins className="text-warning" size={22} /> Top 10 Cash Prize Earners
            </h3>
            <div className="flex-col gap-3">
              {data.topEarners?.map((item, idx) => (
                <div key={idx} className="hof-list-item glass-panel p-3 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className={`rank-number-badge rank-${idx + 1}`}>#{idx + 1}</span>
                    <AvatarFrame 
                      src={item.player?.profile?.avatar} 
                      size={44} 
                      frame={item.player?.profile?.equippedFrame || 'Default'} 
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Link to={`/players/${item.player?.username}`} className="text-white font-bold text-sm" style={{ textDecoration: 'none' }}>
                          @{item.player?.username || 'Competitor'}
                        </Link>
                        {item.player?.profile?.equippedTitle && (
                          <span className="equipped-title-badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            👑 {item.player.profile.equippedTitle}
                          </span>
                        )}
                      </div>
                      <span className="text-muted text-xs block mt-1">Verified Competitor</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-warning font-extrabold text-md block">₹{(item.prizeWon || 0).toLocaleString('en-IN')}</span>
                    <span className="badge badge-published text-xs mt-1">Cash Prize Earned</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'champions' && (
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown className="text-primary" size={22} /> Official Gold Medal Champions
            </h3>
            <div className="grid-2 gap-3">
              {data.champions?.map((item, idx) => (
                <div key={idx} className="hof-champion-card glass-panel p-4 flex-col justify-between" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge badge-primary text-xs">{item.tournament?.game || 'Esports Arena'}</span>
                      <span className="badge badge-warning text-xs font-bold" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>🥇 GOLD CHAMPION</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <AvatarFrame 
                        src={item.player?.profile?.avatar} 
                        size={48} 
                        frame={item.player?.profile?.equippedFrame || 'Default'} 
                      />
                      <div>
                        <Link to={`/players/${item.player?.username}`} className="text-white font-bold text-sm block" style={{ textDecoration: 'none' }}>
                          @{item.player?.username || 'Champion'}
                        </Link>
                        {item.player?.profile?.equippedTitle && (
                          <span className="equipped-title-badge text-xs mt-1">👑 {item.player.profile.equippedTitle}</span>
                        )}
                      </div>
                    </div>

                    <p className="text-white text-xs font-bold m-0">Tournament: {item.tournament?.name || 'Grand Finals'}</p>
                    <span className="text-muted text-xs block mt-1">Date: {new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>

                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Link to={`/tournaments/${item.tournament?._id || ''}`} className="btn btn-secondary btn-sm w-full text-xs" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                      <Trophy size={12} /> View Tournament Bracket
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield className="text-success" size={22} /> Top Performing Esports Squads
            </h3>
            <div className="grid-2 gap-3">
              {data.topTeams?.map((team, idx) => (
                <div key={idx} className="glass-panel p-4 flex-col justify-between" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge badge-success text-xs font-bold"># {idx + 1} SQUAD</span>
                      <span className="badge badge-secondary text-xs">{team.stats?.wins || 0} Wins</span>
                    </div>

                    <strong className="text-white text-md block mb-1">{team.name}</strong>
                    <p className="text-secondary text-xs mb-3">{team.description || 'Competitive esports squad competing in ArenaVerse.'}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AvatarFrame 
                        src={team.captain?.profile?.avatar} 
                        size={28} 
                        frame={team.captain?.profile?.equippedFrame || 'Default'} 
                      />
                      <span className="text-muted text-xs">Captain: <strong className="text-white">@{team.captain?.username}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HallOfFame;
