import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, User, LogOut, LayoutDashboard, Menu, X, ShieldAlert, Award, Search, Sun, Moon } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  const handleNavSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/tournaments?q=${encodeURIComponent(navSearch.trim())}`);
      setNavSearch('');
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'organizer') return '/organizer-dashboard';
    return '/player-dashboard';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="nav-logo" onClick={() => setIsOpen(false)}>
          <img src="/images/logo.png" alt="ArenaVerse" className="logo-icon" />
          <span>ARENA<span>VERSE</span></span>
        </Link>

        {/* Global Quick Search (shown when logged in) */}
        {user && (
          <form onSubmit={handleNavSearchSubmit} className="nav-search-form" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: '20px', padding: '2px 12px', border: '1px solid var(--border-color)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
            <input 
              type="text" 
              placeholder="Search Arena-Verse..." 
              value={navSearch} 
              onChange={(e) => setNavSearch(e.target.value)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', width: '130px' }}
            />
          </form>
        )}

        <button className="nav-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>

        <div className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-item" onClick={() => setIsOpen(false)}>Home</Link>
          <Link to="/about" className="nav-item" onClick={() => setIsOpen(false)}>About</Link>

          {user ? (
            <>
              <Link to="/tournaments" className="nav-item" onClick={() => setIsOpen(false)}>{t('tournaments')}</Link>
              <Link to="/leaderboard" className="nav-item" onClick={() => setIsOpen(false)}>{t('leaderboard')}</Link>

              {/* Explore Dropdown */}
              <div className="nav-dropdown" style={{ position: 'relative' }}>
                <button className="nav-item nav-dropdown-trigger" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Explore ▾
                </button>
                <div className="nav-dropdown-menu glass-panel p-2">
                  <Link to="/recruitment" className="dropdown-item" onClick={() => setIsOpen(false)}>👥 LFT / LFP Recruitment</Link>
                  <Link to="/hall-of-fame" className="dropdown-item" onClick={() => setIsOpen(false)}>🏆 Hall of Fame</Link>
                  <Link to="/certificates" className="dropdown-item" onClick={() => setIsOpen(false)}>📜 eSports Certificates</Link>
                  <Link to="/store" className="dropdown-item" onClick={() => setIsOpen(false)}>🛍️ Arena Store</Link>
                  <Link to="/merch" className="dropdown-item" onClick={() => setIsOpen(false)}>👕 Merch Marketplace</Link>
                  {(user.role === 'organizer' || user.role === 'admin') && (
                    <Link to="/ai-studio" className="dropdown-item" onClick={() => setIsOpen(false)}>✨ AI Creative Studio</Link>
                  )}
                  <Link to="/forums" className="dropdown-item" onClick={() => setIsOpen(false)}>💬 Forums & Polls</Link>
                  <Link to="/replays" className="dropdown-item" onClick={() => setIsOpen(false)}>🎬 Match Replay Hub</Link>
                  <Link to="/streams" className="dropdown-item" onClick={() => setIsOpen(false)}>📺 Live Streams</Link>
                  <Link to="/esports-news" className="dropdown-item" onClick={() => setIsOpen(false)}>📰 Esports News</Link>
                  {(user.role === 'organizer' || user.role === 'admin') && (
                    <Link to="/health" className="dropdown-item" onClick={() => setIsOpen(false)}>⚡ System Health</Link>
                  )}
                </div>
              </div>

              <Link to={getDashboardLink()} className="nav-item nav-dash-link" onClick={() => setIsOpen(false)}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              
              <div className="nav-user-info">
                <span className={`nav-role-badge role-${user.role}`}>
                  {user.role === 'admin' && <ShieldAlert size={12} />}
                  {user.role}
                </span>
                <span className="nav-username">@{user.username}</span>
              </div>

              <button onClick={handleLogout} className="btn btn-secondary btn-sm btn-logout">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div className="nav-auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setIsOpen(false)}>Register</Link>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Dark Mode (Click for Light Mode)' : 'Light Mode (Click for Dark Mode)'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
