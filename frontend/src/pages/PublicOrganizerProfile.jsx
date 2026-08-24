import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import TournamentCard from '../components/TournamentCard';
import { Trophy, Users, Star, Coins, CheckCircle2, Globe, Shield, Calendar, MessageSquare, ArrowLeft, Twitter, Youtube, Instagram, UserPlus, Check } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './PublicOrganizerProfile.css';

const PublicOrganizerProfile = () => {
  const { username } = useParams();
  const { user, getAuthHeader } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tournaments'); // 'tournaments', 'reviews'
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingLoading, setFollowingLoading] = useState(false);

  const DEFAULT_AVATAR = '/images/default-avatar.png';

  const fetchFollowStatus = async (targetId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/follows/status?targetType=organizer&targetId=${targetId}`, {
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
    if (!user) return;
    if (!profileData?.organizer?.id || followingLoading) return;
    setFollowingLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/follows/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          targetType: 'organizer',
          targetId: profileData.organizer.id,
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
    const fetchOrganizerProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/organizers/${username}/public-profile`);
        if (!res.ok) throw new Error('Organizer profile not found');
        const data = await res.json();
        setProfileData(data);
        if (data.organizer?.id) {
          fetchFollowStatus(data.organizer.id);
        }
      } catch (err) {
        setError(err.message || 'Could not load organizer profile.');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchOrganizerProfile();
    }
  }, [username]);

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading organizer public profile...</p></div>;
  }

  if (error || !profileData) {
    return (
      <div className="container py-5 text-center mt-5">
        <div className="glass-panel text-center p-5">
          <Trophy className="warning-icon mb-4" size={44} />
          <h3>Organizer Profile Not Found</h3>
          <p className="text-secondary mb-4">No event organizer was found with handle @{username}.</p>
          <Link to="/tournaments" className="btn btn-primary">Browse Tournaments</Link>
        </div>
      </div>
    );
  }

  const { organizer, stats, hostedTournaments = [], reviews = [] } = profileData;

  return (
    <div className="public-organizer-profile-page container py-4 mt-4">
      {/* Back Button */}
      <div className="mb-4">
        <Link to="/tournaments" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Browse Arenas
        </Link>
      </div>

      {/* Header Profile Card */}
      <div className="organizer-header-card glass-panel p-4 mb-4">
        <div className="organizer-avatar-container">
          <img 
            src={organizer.profile?.avatar || DEFAULT_AVATAR} 
            alt={organizer.username} 
            className="organizer-profile-avatar"
            onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
          />
          {organizer.isVerifiedOrganizer && (
            <div className="organizer-verified-icon-badge" title="Verified Organizer">
              <CheckCircle2 size={20} />
            </div>
          )}
        </div>

        <div className="organizer-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="organizer-title">{organizer.organizationName}</h1>
            {organizer.isVerifiedOrganizer ? (
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> VERIFIED ORGANIZER
              </span>
            ) : (
              <span className="badge badge-player">ORGANIZER</span>
            )}

            {user?.id !== organizer.id && (
              <button 
                className={`btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleToggleFollow}
                disabled={followingLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', marginLeft: 'auto' }}
              >
                {isFollowing ? <Check size={14} /> : <UserPlus size={14} />}
                <span>{isFollowing ? 'Following' : 'Follow Organizer'}</span>
                {followerCount > 0 && <span className="badge badge-secondary text-xs" style={{ background: 'rgba(255,255,255,0.2)', marginLeft: '4px' }}>{followerCount}</span>}
              </button>
            )}
          </div>

          <p className="organizer-handle text-secondary text-sm mt-1">@{organizer.username}</p>
          <p className="organizer-bio text-sm mt-2">{organizer.profile?.bio || 'Official event organizer hosting esports tournaments on ArenaVerse.'}</p>

          {/* Social Links & Website */}
          <div className="organizer-social-links mt-3" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {organizer.websiteUrl && (
              <a href={organizer.websiteUrl} target="_blank" rel="noreferrer" className="social-link-btn" title="Official Website">
                <Globe size={16} /> <span>{organizer.websiteUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {organizer.profile?.socialLinks?.twitter && (
              <a href={`https://twitter.com/${organizer.profile.socialLinks.twitter}`} target="_blank" rel="noreferrer" className="social-icon-btn" title="Twitter / X">
                <Twitter size={16} />
              </a>
            )}
            {organizer.profile?.socialLinks?.youtube && (
              <a href={`https://youtube.com/${organizer.profile.socialLinks.youtube}`} target="_blank" rel="noreferrer" className="social-icon-btn" title="YouTube">
                <Youtube size={16} />
              </a>
            )}
            {organizer.profile?.socialLinks?.instagram && (
              <a href={`https://instagram.com/${organizer.profile.socialLinks.instagram}`} target="_blank" rel="noreferrer" className="social-icon-btn" title="Instagram">
                <Instagram size={16} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4 gap-3 mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard title="Hosted Tournaments" value={`${stats.totalHostedTournaments} Arenas`} icon={Trophy} />
        <StatCard title="Total Players Hosted" value={`${stats.totalPlayersHosted} Entrants`} icon={Users} />
        <StatCard title="Total Prize Pools" value={`₹${stats.totalPrizePoolsAwarded.toLocaleString('en-IN')}`} icon={Coins} />
        <StatCard title="Average Rating" value={`${stats.averageRating} ★ (${stats.totalReviewsCount})`} icon={Star} />
      </div>

      {/* Tabs Switcher */}
      <div className="details-tabs mb-4">
        <button 
          className={`tab-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          <Trophy size={16} /> Hosted Arenas ({hostedTournaments.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Star size={16} /> Competitor Reviews ({reviews.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'tournaments' ? (
        <div className="hosted-tournaments-panel">
          {hostedTournaments.length === 0 ? (
            <div className="glass-panel text-center py-5">
              <Trophy size={40} className="empty-icon mb-3" />
              <h3>No Tournaments Hosted Yet</h3>
              <p className="text-secondary">This organizer has not published any public tournaments yet.</p>
            </div>
          ) : (
            <div className="grid-3 gap-3">
              {hostedTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="organizer-reviews-panel glass-panel p-4">
          <h3>Competitor Ratings & Feedback</h3>
          {reviews.length === 0 ? (
            <p className="text-muted text-center py-5">No competitor reviews submitted for this organizer yet.</p>
          ) : (
            <div className="reviews-list mt-4 flex-col gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="small-list-item glass-panel p-3">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong className="text-white text-sm">@{r.player?.username || 'Competitor'}</strong>
                      <span className="text-warning text-xs font-bold">{'★'.repeat(r.rating)}</span>
                      {r.tournament && (
                        <span className="text-muted text-xs">on tournament "{r.tournament.name}"</span>
                      )}
                    </div>
                    <p className="text-secondary text-xs mt-2">"{r.review}"</p>
                  </div>
                  <span className="text-muted text-xs">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicOrganizerProfile;
