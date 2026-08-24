import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Crown, Shield, Swords, Award, Star, Activity, ArrowRight, Filter } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './GlobalActivityFeed.css';

const GlobalActivityFeed = ({ limit = 20 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  const DEFAULT_ACTIVITIES = [
    { id: 'def_1', category: 'tournaments', title: '🏆 BGMI Pro Masters Season 1', message: 'Registration opened for ₹1,00,000 Grand Championship Arena!', icon: '🏆', timestamp: new Date(), link: '/tournaments' },
    { id: 'def_2', category: 'champions', title: '👑 Champion Crown Awarded', message: 'Team Cloud9 Reborn secured 1st Place Gold Medal in Valorant Champions Cup!', icon: '👑', timestamp: new Date(), link: '/leaderboard' },
    { id: 'def_3', category: 'teams', title: '🛡️ New Squad Formed', message: 'Captain @play1 founded squad "Vitality APAC" for upcoming BGMI tournaments.', icon: '🛡️', timestamp: new Date(), link: '/recruitment' },
    { id: 'def_4', category: 'badges', title: '⭐ MVP Honor Badge Awarded', message: 'Player @play2 was awarded Match MVP for 14 K/D clutch performance!', icon: '⭐', timestamp: new Date(), link: '/hall-of-fame' },
  ];

  useEffect(() => {
    const fetchGlobalFeed = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/follows/global-activity-feed`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities && data.activities.length > 0 ? data.activities : DEFAULT_ACTIVITIES);
        } else {
          setActivities(DEFAULT_ACTIVITIES);
        }
      } catch (err) {
        console.error('Failed to load global activity feed:', err);
        setActivities(DEFAULT_ACTIVITIES);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalFeed();
  }, []);

  const CATEGORY_CHIPS = [
    { id: 'all', label: 'All Updates', icon: Activity },
    { id: 'tournaments', label: '🏆 New Tournaments', icon: Trophy },
    { id: 'champions', label: '👑 Champions', icon: Crown },
    { id: 'teams', label: '🛡️ Squads Formed', icon: Shield },
    { id: 'matches', label: '⚔️ Match Results', icon: Swords },
    { id: 'badges', label: '⭐ Badges & MVPs', icon: Star },
  ];

  const filteredActivities = filterCategory === 'all'
    ? activities
    : activities.filter(a => a.category === filterCategory || (filterCategory === 'badges' && a.category === 'achievements'));

  const displayedActivities = filteredActivities.slice(0, limit);

  if (loading) {
    return (
      <div className="glass-panel p-4 text-center">
        <p className="text-secondary text-sm">Loading Arena Activity Pulse...</p>
      </div>
    );
  }

  return (
    <div className="global-activity-feed-container glass-panel p-4">
      <div className="feed-header mb-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 className="m-0 font-bold text-white flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity className="text-primary" size={20} />
            <span>Arena Pulse & Activity Feed</span>
          </h3>
          <p className="m-0 text-secondary text-xs mt-1">Live updates across tournaments, champion crowns, squad creation, & badges</p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="feed-filter-bar mb-3" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {CATEGORY_CHIPS.map(chip => (
          <button
            key={chip.id}
            className={`feed-chip ${filterCategory === chip.id ? 'active' : ''}`}
            onClick={() => setFilterCategory(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {displayedActivities.length === 0 ? (
        <div className="text-center py-4">
          <Activity size={32} className="text-muted mb-2" />
          <p className="text-secondary text-sm m-0">No activity items recorded for this filter category.</p>
        </div>
      ) : (
        <div className="feed-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayedActivities.map(act => (
            <div key={act.id} className="feed-item-card glass-panel p-3">
              <div className="feed-icon-container" style={{ fontSize: '1.4rem' }}>
                {act.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 className="text-white text-sm font-bold m-0">{act.title}</h4>
                  <span className="badge badge-secondary text-xs" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{act.category}</span>
                </div>
                <p className="text-secondary text-xs mt-1 mb-0">{act.message}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="text-muted text-xs">
                  {new Date(act.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
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
  );
};

export default GlobalActivityFeed;
