import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DashboardLayout from './components/DashboardLayout';
import AIAssistantWidget from './components/AIAssistantWidget';

// Lazy Loaded Pages
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const TournamentList = lazy(() => import('./pages/TournamentList'));
const TournamentDetails = lazy(() => import('./pages/TournamentDetails'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ModeratorDashboard = lazy(() => import('./pages/ModeratorDashboard'));
const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard'));
const PlayerDashboard = lazy(() => import('./pages/PlayerDashboard'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const Rules = lazy(() => import('./pages/Rules'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const PublicOrganizerProfile = lazy(() => import('./pages/PublicOrganizerProfile'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const RecruitmentBoard = lazy(() => import('./pages/RecruitmentBoard'));
const ArenaWallet = lazy(() => import('./pages/ArenaWallet'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const EsportsNews = lazy(() => import('./pages/EsportsNews'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const RewardStore = lazy(() => import('./pages/RewardStore'));
const CommunityForums = lazy(() => import('./pages/CommunityForums'));
const ReplayCenter = lazy(() => import('./pages/ReplayCenter'));
const StreamHub = lazy(() => import('./pages/StreamHub'));
const PlatformTimeline = lazy(() => import('./pages/PlatformTimeline'));
const AICreativeStudio = lazy(() => import('./pages/AICreativeStudio'));
const MerchStore = lazy(() => import('./pages/MerchStore'));
const SystemHealthConsole = lazy(() => import('./pages/SystemHealthConsole'));
const MyCertificates = lazy(() => import('./pages/MyCertificates'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(139, 92, 246, 0.2)', borderTop: '3px solid #8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
  </div>
);

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0d12',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '0.1em',
            background: 'linear-gradient(to right, #ff4b2b, #ff416c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            ARENA-VERSE
          </h2>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 75, 43, 0.1)',
            borderTop: '3px solid #ff4b2b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '20px auto 10px auto'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '13px', letterSpacing: '0.05em' }}>
            SYNCING PLAYER SESSION...
          </p>
        </div>
      </div>
    );
  }

  const getDashboardHomePath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'moderator') return '/moderator-dashboard';
    if (user.role === 'organizer') return '/organizer-dashboard';
    return '/player-dashboard';
  };

  const dashboardHome = getDashboardHomePath();

  // If user is logged in, keep them inside the DashboardLayout context
  if (user) {
    // Redirect logged-in users away from auth pages
    if (location.pathname === '/login' || location.pathname === '/register') {
      return <Navigate to={dashboardHome} replace />;
    }

    return (
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/moderator-dashboard" element={<ModeratorDashboard />} />
            <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
            <Route path="/player-dashboard" element={<PlayerDashboard />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/tournaments" element={<TournamentList />} />
            <Route path="/tournaments/:id" element={<TournamentDetails />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/players/:username" element={<PublicProfile />} />
            <Route path="/organizers/:username" element={<PublicOrganizerProfile />} />
            <Route path="/recruitment" element={<RecruitmentBoard />} />
            <Route path="/wallet" element={<ArenaWallet />} />
            <Route path="/hall-of-fame" element={<HallOfFame />} />
            <Route path="/esports-news" element={<EsportsNews />} />
            <Route path="/settings" element={<UserSettings />} />
            <Route path="/store" element={<RewardStore />} />
            <Route path="/forums" element={<CommunityForums />} />
            <Route path="/replays" element={<ReplayCenter />} />
            <Route path="/streams" element={<StreamHub />} />
            <Route path="/milestones" element={<PlatformTimeline />} />
            <Route path="/ai-studio" element={<AICreativeStudio />} />
            <Route path="/merch" element={<MerchStore />} />
            <Route path="/health" element={<SystemHealthConsole />} />
            <Route path="/certificates" element={<MyCertificates />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Navigate to={dashboardHome} replace />} />
            <Route path="*" element={<Navigate to={dashboardHome} replace />} />
          </Routes>
        </Suspense>
        <AIAssistantWidget />
      </DashboardLayout>
    );
  }

  // Guest routing (not logged in)
  // Only allow public landing pages; redirect all feature & dashboard paths to login
  const protectedPrefixes = [
    '/leaderboard',
    '/recruitment',
    '/store',
    '/forums',
    '/replays',
    '/streams',
    '/milestones',
    '/ai-studio',
    '/merch',
    '/health',
    '/hall-of-fame',
    '/esports-news',
    '/tournaments',
    '/wallet',
    '/settings'
  ];

  const isDashboardRoute =
    location.pathname.includes('-dashboard') ||
    location.pathname === '/profile' ||
    protectedPrefixes.some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix + '/')
    );

  if (isDashboardRoute) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/players/:username" element={<PublicProfile />} />
            <Route path="/organizers/:username" element={<PublicOrganizerProfile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <AIAssistantWidget />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
