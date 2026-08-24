import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Trophy, Menu, X, LogOut, LayoutDashboard, 
  BookOpen, HelpCircle, User, ShieldAlert, ChevronDown, Award,
  Users, ShoppingBag, Shirt, Sparkles, MessageSquare, Video, Tv, Newspaper, Wallet, Settings, Activity, Crown, Sun, Moon
} from 'lucide-react';
import './DashboardLayout.css';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import AvatarFrame from './AvatarFrame';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('arenaverse-sidebar-open');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth >= 992;
  });

  // Save desktop preference to localStorage
  useEffect(() => {
    if (window.innerWidth >= 992) {
      localStorage.setItem('arenaverse-sidebar-open', sidebarOpen);
    }
  }, [sidebarOpen]);

  // Handle window resize breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setSidebarOpen(false);
      } else {
        const saved = localStorage.getItem('arenaverse-sidebar-open');
        setSidebarOpen(saved !== null ? saved === 'true' : true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when changing routes
  useEffect(() => {
    if (window.innerWidth < 992) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Close sidebar on Escape key when open on mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && window.innerWidth < 992 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardHomePath = () => {
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'moderator') return '/moderator-dashboard';
    if (user.role === 'organizer') return '/organizer-dashboard';
    return '/player-dashboard';
  };

  const dashboardHome = getDashboardHomePath();

  const getRoleLabel = () => {
    if (user.role === 'admin') return 'Admin';
    if (user.role === 'moderator') return 'Staff Moderator';
    if (user.role === 'organizer') return 'Host / Organizer';
    return 'Competitor / Player';
  };

  const userAvatar = user.profile?.avatar || '/images/default-avatar.png';

  return (
    <div className="dashboard-layout-wrapper">
      {/* Sidebar Navigation */}
      <aside 
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}
      >
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo" title="ARENAVERSE Home">
            <img src="/images/logo.png" alt="ArenaVerse" className="logo-icon" />
            <span>ARENA<span>VERSE</span></span>
          </NavLink>
        </div>

        {/* User Card */}
        <div className="sidebar-user-card" title={`@${user.username} (${getRoleLabel()})`}>
          <img src={userAvatar} alt={user.username} className="sidebar-user-avatar" />
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">@{user.username}</span>
            <span className="sidebar-user-role">{getRoleLabel()}</span>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section-title">CORE HUB</div>
          <NavLink to={dashboardHome} className="sidebar-link" end title="Overview Panel">
            <LayoutDashboard size={18} />
            <span>Overview Panel</span>
          </NavLink>

          <NavLink to="/tournaments" className="sidebar-link" title="Browse Arenas">
            <Trophy size={18} />
            <span>Browse Arenas</span>
          </NavLink>

          <NavLink to="/leaderboard" className="sidebar-link" title="Global Rankings">
            <Award size={18} />
            <span>Global Rankings</span>
          </NavLink>

          <div className="sidebar-nav-section-title mt-3">ECOSYSTEM & RECRUITMENT</div>
          <NavLink to="/recruitment" className="sidebar-link" title="LFT / LFP Board">
            <Users size={18} />
            <span>LFT / LFP Board</span>
          </NavLink>

          <NavLink to="/store" className="sidebar-link" title="Arena Store">
            <ShoppingBag size={18} />
            <span>Arena Store</span>
          </NavLink>

          <NavLink to="/merch" className="sidebar-link" title="Merch Market">
            <Shirt size={18} />
            <span>Merch Market</span>
          </NavLink>

          {(user.role === 'organizer' || user.role === 'admin') && (
            <NavLink to="/ai-studio" className="sidebar-link" title="AI Creative Studio">
              <Sparkles size={18} />
              <span>AI Creative Studio</span>
            </NavLink>
          )}

          <NavLink to="/forums" className="sidebar-link" title="Community Forums">
            <MessageSquare size={18} />
            <span>Community Forums</span>
          </NavLink>

          <NavLink to="/replays" className="sidebar-link" title="Replay VOD Hub">
            <Video size={18} />
            <span>Replay VOD Hub</span>
          </NavLink>

          <NavLink to="/streams" className="sidebar-link" title="Live Streams">
            <Tv size={18} />
            <span>Live Streams</span>
          </NavLink>

          <NavLink to="/hall-of-fame" className="sidebar-link" title="Hall of Fame">
            <Crown size={18} />
            <span>Hall of Fame</span>
          </NavLink>

          <NavLink to="/esports-news" className="sidebar-link" title="Esports News">
            <Newspaper size={18} />
            <span>Esports News</span>
          </NavLink>

          <div className="sidebar-nav-section-title mt-3">ACCOUNT & SYSTEM</div>
          <NavLink to="/wallet" className="sidebar-link" title="Arena Wallet">
            <Wallet size={18} />
            <span>Arena Wallet</span>
          </NavLink>

          <NavLink to="/settings" className="sidebar-link" title="Account Settings">
            <Settings size={18} />
            <span>Account Settings</span>
          </NavLink>

          {(user.role === 'moderator' || user.role === 'admin') && (
            <NavLink to="/moderator-dashboard" className="sidebar-link" title="Moderator Panel">
              <ShieldAlert size={18} />
              <span>Moderator Panel</span>
            </NavLink>
          )}

          {(user.role === 'organizer' || user.role === 'admin') && (
            <NavLink to="/health" className="sidebar-link" title="System Health">
              <Activity size={18} />
              <span>System Health</span>
            </NavLink>
          )}
        </nav>

        {/* Footer actions */}
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn" title="Log Out">
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className={`dashboard-main-area ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <header className="dashboard-top-header">
          <div className="header-left-block">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="hamburger-toggle-btn"
              aria-label="Toggle Sidebar"
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="dashboard-header-title">
              {user.role.toUpperCase()} PANEL
            </span>
          </div>

          <GlobalSearch />

          <div className="header-right-block" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'dark' ? 'Dark Mode (Click for Light Mode)' : 'Light Mode (Click for Dark Mode)'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <NotificationCenter />
            {user.role === 'player' ? (
              <div 
                className="header-profile-trigger" 
                onClick={() => navigate('/profile')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <AvatarFrame 
                  src={userAvatar} 
                  alt={user.username} 
                  size={32} 
                  frame={user.profile?.equippedFrame || 'Default'} 
                />
                <span className="text-secondary text-sm font-semibold">@{user.username}</span>
                {user.profile?.equippedTitle && (
                  <span className="equipped-title-badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    👑 {user.profile.equippedTitle}
                  </span>
                )}
                <ChevronDown size={14} className="text-secondary" />
              </div>
            ) : (
              <span className="text-secondary text-sm display-flex align-items-center gap-2">
                <span className="user-online-badge"></span>
                {user.username}
              </span>
            )}
          </div>
        </header>

        {/* Dynamic child content */}
        <main className="dashboard-inner-content">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="dashboard-sidebar-overlay active" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default DashboardLayout;
