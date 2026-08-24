import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Shield, Users, Zap, ChevronRight, Award } from 'lucide-react';
import './Home.css';

const POPULAR_GAMES = [
  {
    id: 'bgmi',
    name: 'BGMI',
    subtitle: 'Battlegrounds Mobile India',
    image: '/images/games/bgmi.png',
  },
  {
    id: 'valorant',
    name: 'Valorant',
    subtitle: 'Valorant Tactical Shooter',
    image: '/images/games/valorant.png',
  },
  {
    id: 'freefire',
    name: 'Free Fire MAX',
    subtitle: 'Free Fire MAX Battle Royale',
    image: '/images/games/freefire.png',
  },
  {
    id: 'codm',
    name: 'Call of Duty',
    subtitle: 'Mobile Ops',
    image: '/images/games/codm.png',
  },
  {
    id: 'pubgm',
    name: 'PUBG Mobile',
    subtitle: 'Global Esports',
    image: '/images/games/pubg.png',
  },
];

const Home = () => {
  return (
    <div className="home-page container">
      {/* Hero Section */}
      <section className="hero-section glass-panel-glow">
        <div className="hero-content">
          <div className="hero-badge">
            <Award size={14} className="hero-badge-icon" />
            <span>Tournament Management Redefined</span>
          </div>
          <h1>
            Unleash the Power of <span>eSports</span> Tournaments
          </h1>
          <p className="hero-subtitle">
            Create, manage, and scale online gaming brackets instantly. Arena-Verse automates scheduling, team registrations, and live bracket progressions.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">
              Get Started
              <ChevronRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Login to Arena
            </Link>
          </div>
        </div>
        <div className="hero-graphic">
          <div className="hero-stats-card glass-panel p-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '20px', width: '100%', maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="avatar-med bg-primary text-white font-bold flex items-center justify-center" style={{ width: '52px', height: '52px', borderRadius: '50%' }}>
                <img src="/images/logo.png" alt="ArenaVerse" className="logo-icon" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              </div>
              <div>
                <strong className="text-white text-md block">ArenaVerse Live Pulse</strong>
                <span className="badge badge-ongoing text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={12} className="animate-pulse" /> Real-Time Engine Active
                </span>
              </div>
            </div>

            <div className="grid-2 gap-2 text-center mb-3">
              <div className="glass-panel p-2">
                <p className="text-muted text-xs font-bold uppercase m-0">Prize Pool</p>
                <h4 className="text-warning font-extrabold m-0">₹1,00,000+</h4>
              </div>
              <div className="glass-panel p-2">
                <p className="text-muted text-xs font-bold uppercase m-0">Arenas</p>
                <h4 className="text-primary font-extrabold m-0">50+ Arenas</h4>
              </div>
            </div>

            <div className="glass-panel p-3 text-xs text-secondary flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🛡️ Registered Players</span>
              <strong className="text-white">1,200+ Competitors</strong>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="features-section mt-4">
        <div className="text-center mb-4">
          <h2 className="section-title">Built For Gamers & Organizers</h2>
          <p className="section-subtitle">Take your competitive gaming to professional standards with automated systems.</p>
        </div>

        <div className="grid-3">
          <div className="feature-card glass-panel">
            <Zap className="feature-icon" />
            <h3>Automated Brackets</h3>
            <p>Single and double-elimination brackets generated instantly. Winners advance automatically upon score submission.</p>
          </div>

          <div className="feature-card glass-panel">
            <Users className="feature-icon" />
            <h3>Team Management</h3>
            <p>Form squads, invite friends using unique join codes, and register your team for competitive formats in one click.</p>
          </div>

          <div className="feature-card glass-panel">
            <Shield className="feature-icon" />
            <h3>Role Access Keys</h3>
            <p>Dedicated dashboard panels for Admins, Organizers, and Players. Secured with JWT tokens and password hashing.</p>
          </div>
        </div>
      </section>

      {/* Generic Tournaments Teaser */}
      <section className="popular-games-section mt-5">
        <div className="text-center mb-4">
          <h2 className="section-title">Popular Competitive Titles</h2>
          <p className="section-subtitle">Log in to compete in daily scrims, open qualifiers, and cash prize tournaments.</p>
        </div>
        <div className="popular-games-grid">
          {POPULAR_GAMES.map((game) => (
            <div key={game.id} className="popular-game-card" style={{ cursor: 'default' }}>
              <img src={game.image} alt={game.name} className="popular-game-img" />
              <div className="popular-game-overlay"></div>
              <div className="popular-game-info">
                <h3>{game.name}</h3>
                <p>{game.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Login & Register CTAs */}
      <section className="cta-section mt-5 mb-4 text-center">
        <div className="glass-panel p-5" style={{ background: 'linear-gradient(135deg, rgba(255, 75, 43, 0.1), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px' }}>
          <Trophy size={48} className="text-warning mb-3" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px' }}>Ready to Enter the Arena?</h2>
          <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto 24px auto', fontSize: '1rem' }}>
            Sign up or log in to unlock live tournaments, player rankings, team recruitment, store rewards, live streams, and community forums.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Free Account
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Log In Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

