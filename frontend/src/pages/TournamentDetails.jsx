import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import BracketView from '../components/BracketView';
import BattleRoyaleView from '../components/BattleRoyaleView';
import ClashSquadTeamView from '../components/ClashSquadTeamView';
import TournamentChat from '../components/TournamentChat';
import TournamentReviews from '../components/TournamentReviews';
import TournamentHighlights from '../components/TournamentHighlights';
import DisputeModal from '../components/DisputeModal';
import { Calendar, Award, IndianRupee, Users, BookOpen, UserCheck, AlertTriangle, ArrowLeft, Trophy, Crown, Medal, Megaphone, Send, MessageSquare, FileText, Download, Star, Eye, ShieldAlert, ShieldCheck, Sparkles, Wallet, CreditCard, Globe, Flame, Swords, Radio, Tv, Film, Play, Video, ExternalLink, X } from 'lucide-react';
import EsportsCertificateModal from '../components/EsportsCertificateModal';
import { API_BASE_URL } from '../config/api';
import './TournamentDetails.css';

const formatEmbedUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const url = rawUrl.trim();
  if (url.includes('youtube.com/embed/')) return url;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch && twitchMatch[1]) {
    return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=localhost&parent=127.0.0.1`;
  }
  return url;
};

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const socket = useSocket();

  const [tournament, setTournament] = useState(null);
  const [bracket, setBracket] = useState(null);
  const [matches, setMatches] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'announcements', 'bracket', 'participants'
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Certificate Hub Modal State
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certModalType, setCertModalType] = useState('champion');
  const [certTargetName, setCertTargetName] = useState('Team Alpha');

  const [results, setResults] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState('');

  // Live Stream & Replay VOD States
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamUrlInput, setStreamUrlInput] = useState('');
  const [streamTitleInput, setStreamTitleInput] = useState('');
  const [streamPlatformInput, setStreamPlatformInput] = useState('youtube');
  const [streamSaveLoading, setStreamSaveLoading] = useState(false);
  const [streamSaveMsg, setStreamSaveMsg] = useState('');

  const [showReplayModal, setShowReplayModal] = useState(false);
  const [replayUrlInput, setReplayUrlInput] = useState('');
  const [replayTitleInput, setReplayTitleInput] = useState('');
  const [replaySaveLoading, setReplaySaveLoading] = useState(false);
  const [replaySaveMsg, setReplaySaveMsg] = useState('');

  const fetchDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}`);
      if (!res.ok) throw new Error('Tournament not found');
      const data = await res.json();
      setTournament(data.tournament);
      setBracket(data.bracket);
      setMatches(data.matches);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || 'Could not load tournament details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeams = async () => {
    if (!user || tournament?.type === 'solo') return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/my`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setMyTeams(data);
        if (data.length > 0) {
          const firstTeamId = (data[0]._id || data[0].id || '').toString();
          setSelectedTeamId(prev => (prev ? prev : firstTeamId));
        }
      }
    } catch (err) {
      console.error('Failed to load my teams', err);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (tournament) {
      fetchMyTeams();
    }
  }, [tournament, user]);

  // WebSocket Live Updates Connection
  useEffect(() => {
    if (!socket || !id) return;

    // Join tournament room
    socket.emit('join_tournament', id);

    // Listen for live match updates
    socket.on('match_updated', (data) => {
      console.log('Received live bracket update:', data);
      setMatches(data.matches);
      if (data.status) {
        setTournament(prev => prev ? { ...prev, status: data.status, ...(data.tournament || {}) } : null);
      }
      if (data.tournament) {
        setTournament(data.tournament);
      }
    });

    // Listen for live organizer announcements
    socket.on('announcement_posted', (data) => {
      console.log('Received live announcement:', data);
      if (data.announcements) {
        setTournament(prev => prev ? { ...prev, announcements: data.announcements } : null);
      }
    });

    socket.on('stream_updated', (data) => {
      setTournament(prev => prev ? { ...prev, streamUrl: data.streamUrl, streamTitle: data.streamTitle } : null);
    });

    socket.on('replay_updated', (data) => {
      setTournament(prev => prev ? { ...prev, replayUrl: data.replayUrl, replayTitle: data.replayTitle } : null);
    });

    return () => {
      socket.emit('leave_tournament', id);
      socket.off('match_updated');
      socket.off('announcement_posted');
      socket.off('stream_updated');
      socket.off('replay_updated');
    };
  }, [socket, id]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;

    setPostingAnnouncement(true);
    setAnnouncementMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          content: announcementContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to post announcement');

      setAnnouncementMsg('Announcement broadcasted and notifications sent to all registered competitors!');
      setAnnouncementTitle('');
      setAnnouncementContent('');
      if (data.announcements) {
        setTournament(prev => prev ? { ...prev, announcements: data.announcements } : null);
      }
    } catch (err) {
      setAnnouncementMsg(`Error: ${err.message}`);
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const champResult = results.find(r => r.placement === 1);
  const runnerResult = results.find(r => r.placement === 2);

  const effectiveWinner = tournament
    ? ((tournament.winnerName && tournament.winnerName !== 'TBD')
      ? tournament.winnerName
      : (champResult?.teamName || champResult?.player?.username) || (tournament.type === 'solo' ? 'player1' : 'Cloud9 Reborn'))
    : 'Team Alpha';

  const effectiveRunnerUp = tournament
    ? ((tournament.runnerUpName && tournament.runnerUpName !== 'TBD')
      ? tournament.runnerUpName
      : (runnerResult?.teamName || runnerResult?.player?.username) || (tournament.type === 'solo' ? 'player9' : 'Fnatic Squad'))
    : 'Team Omega';

  // Check if current logged-in user is Champion or Runner-Up
  const isUserChampion = !!(user && tournament?.status === 'completed' && (
    (champResult && (
      (champResult.player?._id && champResult.player._id.toString() === user._id.toString()) ||
      (champResult.player && champResult.player.toString() === user._id.toString()) ||
      (champResult.team && myTeams.some(t => t._id.toString() === (champResult.team?._id || champResult.team).toString()))
    )) ||
    (tournament.winnerName && tournament.winnerName !== 'TBD' && (
      tournament.winnerName.toLowerCase() === user.username.toLowerCase() ||
      myTeams.some(t => t.name.toLowerCase() === tournament.winnerName.toLowerCase())
    ))
  ));

  const isUserRunnerUp = !!(user && tournament?.status === 'completed' && (
    (runnerResult && (
      (runnerResult.player?._id && runnerResult.player._id.toString() === user._id.toString()) ||
      (runnerResult.player && runnerResult.player.toString() === user._id.toString()) ||
      (runnerResult.team && myTeams.some(t => t._id.toString() === (runnerResult.team?._id || runnerResult.team).toString()))
    )) ||
    (tournament.runnerUpName && tournament.runnerUpName !== 'TBD' && (
      tournament.runnerUpName.toLowerCase() === user.username.toLowerCase() ||
      myTeams.some(t => t.name.toLowerCase() === tournament.runnerUpName.toLowerCase())
    ))
  ));

  const handleDownloadCertificate = (certType) => {
    if (!user) return;
    if (certType !== 'champion' && certType !== 'runnerup') return;

    let url = `${API_BASE_URL}/api/tournaments/${id}/certificate?type=${certType}`;

    fetch(url, {
      headers: getAuthHeader(),
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Certificate download failed');
        }
        return res.blob();
      })
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `ArenaVerse_${certType.toUpperCase()}_Certificate_${user.username}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(err => alert(err.message));
  };

  const getActiveTeamId = () => {
    if (selectedTeamId) return selectedTeamId.toString();
    if (myTeams && myTeams.length > 0) {
      return (myTeams[0]._id || myTeams[0].id || '').toString();
    }
    return '';
  };

  const handleQuickTopUpAndJoin = async () => {
    setJoinError('');
    setJoinSuccess('');
    try {
      const topUpAmount = tournament?.entryFee || 1000;
      const res = await fetch(`${API_BASE_URL}/api/payments/quick-topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ amount: topUpAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Top-up failed');
      setJoinSuccess(`🎉 Added ₹${topUpAmount} to your Arena Wallet! Registering now...`);
      setTimeout(() => {
        handleJoinWithWallet();
      }, 400);
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const handleJoinWithWallet = async () => {
    setJoinError('');
    setJoinSuccess('');
    try {
      const activeTeamId = getActiveTeamId();
      if (tournament.type !== 'solo' && !activeTeamId) {
        setJoinError('Please select or create a team before joining this tournament.');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/payments/pay-with-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          tournamentId: id,
          teamId: tournament.type !== 'solo' ? activeTeamId : null,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned status ${res.status}. Please check your connection or try again.`);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Wallet payment failed');
      }
      setJoinSuccess('🎉 Successfully registered & entry fee paid using Arena Wallet!');
      fetchDetails();
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const handleJoin = async () => {
    setJoinError('');
    setJoinSuccess('');

    try {
      const activeTeamId = getActiveTeamId();
      if (tournament.type !== 'solo' && !activeTeamId) {
        setJoinError('Please select or create a team before joining this tournament.');
        return;
      }

      if (tournament.entryFee > 0) {
        // 1. Create Razorpay Payment Order
        const orderRes = await fetch(`${API_BASE_URL}/api/payments/order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            tournamentId: id,
            teamId: tournament.type !== 'solo' ? activeTeamId : null
          })
        });

        const orderContentType = orderRes.headers.get('content-type');
        if (!orderContentType || !orderContentType.includes('application/json')) {
          throw new Error(`Payment service returned status ${orderRes.status}. Please try again later or use Arena Wallet.`);
        }

        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          throw new Error(orderData.message || 'Failed to create payment order');
        }

        // If backend is in test/mock mode (no real Razorpay secret configured), simulate instant success without Razorpay CDN errors
        if (orderData.isMock) {
          setJoinSuccess('Simulating test payment confirmation...');
          const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader(),
            },
            body: JSON.stringify({
              tournamentId: id,
              teamId: tournament.type !== 'solo' ? activeTeamId : null,
              razorpay_order_id: orderData.orderId,
              razorpay_payment_id: `pay_test_${Date.now()}`,
              razorpay_signature: 'mock_test_signature'
            })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(verifyData.message || 'Payment verification failed');
          }
          setJoinSuccess('🎉 Successfully registered & entry fee paid!');
          fetchDetails();
          return;
        }

        // 2. Load Real Razorpay Checkout Overlay
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Arena-Verse',
          description: `Entry Fee for ${tournament.name}`,
          order_id: orderData.orderId,
          prefill: {
            name: user?.username || 'Competitor',
            email: user?.email || 'player@arenaverse.com',
            contact: '9999999999',
          },
          theme: {
            color: '#ff4b2b'
          },
          handler: async function (response) {
            setJoinSuccess('Payment successful! Confirming registration...');
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeader(),
                },
                body: JSON.stringify({
                  tournamentId: id,
                  teamId: tournament.type !== 'solo' ? activeTeamId : null,
                  razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                  razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                  razorpay_signature: response.razorpay_signature || ''
                })
              });

              const verifyContentType = verifyRes.headers.get('content-type');
              if (!verifyContentType || !verifyContentType.includes('application/json')) {
                throw new Error('Payment verification server error. Please contact support.');
              }

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.message || 'Payment verification failed');
              }
              setJoinSuccess('🎉 Successfully registered & entry fee paid!');
              fetchDetails();
            } catch (err) {
              setJoinError(err.message || 'Payment verification failed.');
              setJoinSuccess('');
            }
          },
          modal: {
            ondismiss: function () {
              setJoinError('Payment checkout cancelled.');
            }
          }
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            setJoinError(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
          });
          rzp.open();
        } else {
          throw new Error('Razorpay SDK script not loaded on page. Please refresh and try again.');
        }
      } else {
        // Free tournament direct register
        const body = {};
        if (tournament.type !== 'solo') {
          body.teamId = activeTeamId;
        }

        const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify(body),
        });

        const freeContentType = res.headers.get('content-type');
        if (!freeContentType || !freeContentType.includes('application/json')) {
          throw new Error('Registration server error. Please try again.');
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to join tournament');

        setJoinSuccess('Successfully registered for tournament!');
        fetchDetails();
      }
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const handleLeave = async (teamId = null) => {
    let confirmMessage = tournament?.type === 'solo'
      ? 'Are you sure you want to leave this tournament?'
      : 'Are you sure you want to unregister your team from this tournament?';

    if (tournament?.entryFee > 0) {
      confirmMessage += '\n\n⚠️ IMPORTANT: Since this is a paid tournament, unregistering will NOT automatically issue a refund.';
    }

    if (!window.confirm(confirmMessage)) return;

    setJoinError('');
    setJoinSuccess('');
    try {
      const body = {};
      if (tournament.type !== 'solo') {
        body.teamId = teamId || getActiveTeamId();
      }

      const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to unregister');

      setJoinSuccess('Successfully unregistered!');
      fetchDetails();
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const handleUpdateScore = async (matchId, scoreA, scoreB, status = 'completed') => {
    const res = await fetch(`${API_BASE_URL}/api/matches/${matchId}/score`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ scoreA, scoreB, status }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to record score');
    
    fetchDetails();
    return data;
  };

  if (loading) return <div className="text-center mt-4"><p>Loading details...</p></div>;
  if (error || !tournament) {
    return (
      <div className="container py-4 text-center mt-4">
        <p className="error-text">{error || 'Tournament not found.'}</p>
        <button onClick={() => navigate('/tournaments')} className="btn btn-secondary mt-3">
          <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Go Back to Browse Tournaments
        </button>
      </div>
    );
  }

  const defaultBanner = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200';
  
  const userIdStr = (user?._id || user?.id)?.toString();
  const organizerIdStr = (tournament?.organizer?._id || tournament?.organizer)?.toString();
  const organizerName = tournament?.organizer?.username || (typeof tournament?.organizer === 'string' ? 'Organizer' : 'Organizer');

  const isOrganizer = user && (
    user.role === 'admin' || 
    (user.role === 'organizer' && Boolean(organizerIdStr) && Boolean(userIdStr) && organizerIdStr === userIdStr)
  );

  // Check registration status of current user
  const isRegisteredSolo = tournament?.type === 'solo' && user && (tournament?.registeredPlayers || []).some(p => {
    const pId = (p?._id || p)?.toString();
    return Boolean(pId) && Boolean(userIdStr) && pId === userIdStr;
  });

  const registeredUserTeams = (tournament?.type !== 'solo' && user && tournament?.registeredTeams && myTeams.length > 0)
    ? myTeams.filter(team => (tournament.registeredTeams || []).some(rt => {
        const rtId = (rt?._id || rt)?.toString();
        return rtId && team._id && rtId === team._id.toString();
      }))
    : [];

  const isBattleRoyale = tournament?.tournamentMode === 'battle_royale' || 
    tournament?.format === 'battle_royale' || 
    ((tournament?.game === 'Free Fire' || tournament?.game === 'Free Fire MAX') && tournament?.tournamentMode !== 'clash_squad');

  const isClashSquad = tournament?.tournamentMode === 'clash_squad';

  const handleDirectPublish = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ bracketType: 'single_elimination', autoSeed: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to publish tournament');
      alert('🎉 Tournament published live! Brackets and matches are now active.');
      fetchDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const getPrizeAmount = (position) => {
    if (!tournament.prizeDistribution || tournament.prizeDistribution.length === 0) {
      return position === 1 ? Math.round(tournament.prizePool * 0.7) : Math.round(tournament.prizePool * 0.3);
    }
    const pd = tournament.prizeDistribution.find(p => p.position === position);
    return pd ? pd.amount : 0;
  };

  return (
    <div className="tournament-details-page container">
      {/* Top Back Navigation Bar & Dispute Trigger */}
      <div className="back-navigation-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate('/tournaments')} 
          className="btn btn-secondary"
        >
          <ArrowLeft size={18} />
          <span>Go Back to Browse Tournaments</span>
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isOrganizer && (tournament.status === 'published' || tournament.status === 'ongoing') && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setStreamUrlInput(tournament.streamUrl || '');
                setStreamTitleInput(tournament.streamTitle || '');
                setStreamPlatformInput(tournament.streamPlatform || 'youtube');
                setStreamSaveMsg('');
                setShowStreamModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Radio size={15} /> {tournament.streamUrl ? 'Manage Live Stream' : 'Add Live Stream Link'}
            </button>
          )}

          {isOrganizer && tournament.status === 'completed' && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setReplayUrlInput(tournament.replayUrl || '');
                setReplayTitleInput(tournament.replayTitle || '');
                setReplaySaveMsg('');
                setShowReplayModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#8b5cf6' }}
            >
              <Film size={15} /> {tournament.replayUrl ? 'Manage Replay VOD' : 'Add Tournament Replay VOD'}
            </button>
          )}

          {user && (
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => setShowDisputeModal(true)}
            >
              <ShieldAlert size={16} /> File Dispute / Report Violation
            </button>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="details-header glass-panel">
        <img 
          src={tournament.banner || defaultBanner} 
          alt={tournament.name} 
          className="details-banner"
          onError={(e) => { e.target.src = defaultBanner; }}
        />
        <div className="details-header-content">
          <div className="details-badges">
            <span className={`badge badge-${tournament.status}`}>{tournament.status}</span>
            <span className={`badge badge-${tournament.type}`}>{tournament.type}</span>
            {isBattleRoyale && (
              <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.25)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.4)', fontWeight: 'bold' }}>
                🔥 BATTLE ROYALE ({tournament.registeredTeams?.length || 12} SQUADS)
              </span>
            )}
            {isClashSquad && (
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.4)', fontWeight: 'bold' }}>
                ⚔️ CLASH SQUAD ({tournament.clashSquadSettings?.matchFormat || 'BO3'})
              </span>
            )}
            {!user && <span className="badge badge-spectator" style={{ background: '#8b5cf6', color: '#ffffff' }}>👁️ SPECTATOR MODE</span>}
          </div>
          <h1>{tournament.name}</h1>
          <p className="details-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Game: <strong>{tournament.game}</strong> | Organized by: <Link to={`/organizers/${organizerName}`} style={{ color: '#8b5cf6', textDecoration: 'underline' }}><strong>@{organizerName}</strong></Link></span>
            {tournament.organizer?.isVerifiedOrganizer && (
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '2px 8px', fontSize: '0.7rem' }}>
                ✓ VERIFIED ORGANIZER
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Guest Spectator Notice Banner */}
      {!user && (
        <div className="spectator-notice-banner glass-panel mt-4 p-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Eye size={20} style={{ color: '#8b5cf6' }} />
            <span className="text-sm">You are currently watching in <strong>Spectator Mode (Live Scores Active)</strong>. Log in to register or compete.</span>
          </div>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-sm">
            Log In to Compete
          </button>
        </div>
      )}

      {/* Live Stream Section (For Published/Ongoing tournaments with stream configured) */}
      {tournament.streamUrl && tournament.status !== 'completed' && (
        <div className="glass-panel p-4 mt-4" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-ongoing" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Radio size={14} className="animate-pulse" /> LIVE STREAM BROADCAST
              </span>
              <span className="text-white font-bold text-sm">{tournament.streamTitle || `${tournament.name} - Official Live Broadcast`}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to="/streams" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Tv size={12} /> View in Live Streams Hub
              </Link>
              {isOrganizer && (
                <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={() => setShowStreamModal(true)}>
                  Edit Stream Link
                </button>
              )}
            </div>
          </div>
          <div className="video-responsive" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
            <iframe
              src={formatEmbedUrl(tournament.streamUrl)}
              title={tournament.streamTitle || tournament.name}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Tournament Replay VOD Section (For Completed tournaments with replay configured) */}
      {tournament.replayUrl && tournament.status === 'completed' && (
        <div className="glass-panel p-4 mt-4" style={{ border: '1px solid rgba(139, 92, 246, 0.4)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Film size={14} /> OFFICIAL GRAND FINAL REPLAY VOD
              </span>
              <span className="text-white font-bold text-sm">{tournament.replayTitle || `${tournament.name} - Full Match Replay`}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to="/replays" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Film size={12} /> View in Replay VOD Hub
              </Link>
              {isOrganizer && (
                <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }} onClick={() => setShowReplayModal(true)}>
                  Edit Replay Link
                </button>
              )}
            </div>
          </div>
          <div className="video-responsive" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
            <iframe
              src={formatEmbedUrl(tournament.replayUrl)}
              title={tournament.replayTitle || tournament.name}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Organizer Stream Setup Banner if not configured yet */}
      {isOrganizer && (tournament.status === 'published' || tournament.status === 'ongoing') && !tournament.streamUrl && (
        <div className="glass-panel p-3 mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} className="text-danger" />
            <span className="text-sm">Broadcast your tournament live! Add a YouTube, Twitch, or Kick stream link so fans and players can watch in real time.</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowStreamModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} /> Add Stream Link
          </button>
        </div>
      )}

      {/* Organizer Replay VOD Setup Banner if completed and not configured yet */}
      {isOrganizer && tournament.status === 'completed' && !tournament.replayUrl && (
        <div className="glass-panel p-3 mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Film size={20} className="text-primary" />
            <span className="text-sm">Tournament matches completed! Archive this event by publishing the Grand Final Replay VOD to the Replay Hub.</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowReplayModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Film size={14} /> Add Replay VOD
          </button>
        </div>
      )}

      {/* Tournament Winner & Runner-Up Announcement Banner */}
      {(tournament.status === 'completed' || tournament.winnerName) && (
        <div className="champion-announcement-banner glass-panel mt-4">
          <div className="champion-announcement-header">
            <Trophy size={40} className="trophy-gold-glow" />
            <h2>TOURNAMENT CHAMPIONS DECLARED!</h2>
            <p className="subtitle">The arena battles have concluded. All honor to the victors!</p>
          </div>

          <div className="champion-cards-row mt-4">
                <div className="podium-card champion-card">
                  <div className="podium-rank-badge rank-1">1st Place</div>
                  <Crown className="crown-gold-icon" size={32} />
                  <h3 className="winner-title">{effectiveWinner}</h3>
                  <p className="champion-label">🏆 TOURNAMENT CHAMPION</p>
                  {tournament.prizePool > 0 && (
                    <p className="prize-won-tag">Prize Won: ₹{getPrizeAmount(1)}</p>
                  )}
                  {isUserChampion ? (
                    <button 
                      className="btn btn-primary btn-sm mt-3"
                      onClick={() => {
                        setCertModalType('champion');
                        setCertTargetName(user?.username || effectiveWinner);
                        setCertModalOpen(true);
                      }}
                    >
                      <Download size={14} /> Download My Champion Certificate
                    </button>
                  ) : (
                    <span className="text-xs text-muted mt-3" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🏆 Champion Award Issued
                    </span>
                  )}
                </div>

                <div className="podium-card runner-card">
                  <div className="podium-rank-badge rank-2">2nd Place</div>
                  <Medal className="medal-silver-icon" size={28} />
                  <h3 className="winner-title">{effectiveRunnerUp}</h3>
                  <p className="runner-label">🥈 RUNNER-UP</p>
                  {tournament.prizePool > 0 && (
                    <p className="prize-won-tag">Prize Won: ₹{getPrizeAmount(2)}</p>
                  )}
                  {isUserRunnerUp ? (
                    <button 
                      className="btn btn-secondary btn-sm mt-3"
                      onClick={() => {
                        setCertModalType('runnerup');
                        setCertTargetName(user?.username || effectiveRunnerUp);
                        setCertModalOpen(true);
                      }}
                    >
                      <Download size={14} /> Download My Runner-Up Certificate
                    </button>
                  ) : (
                    <span className="text-xs text-muted mt-3" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🥈 Runner-Up Award Issued
                    </span>
                  )}
                </div>
              </div>
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="details-info-grid grid-3 mt-4">
        <div className="info-card glass-panel">
          <Calendar className="info-icon" />
          <div>
            <p className="info-label">Start Time</p>
            <p className="info-value">{new Date(tournament.startDate).toLocaleString()}</p>
          </div>
        </div>

          <div className="info-card glass-panel">
            <Award className="info-icon text-yellow" />
            <div>
              <p className="info-label">Prize Pool</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p className="info-value">₹{tournament.prizePool}</p>
                {tournament.prizePool > 0 && tournament.prizePoolStatus === 'FUNDED' && (
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', fontSize: '0.65rem' }}>
                    <ShieldCheck size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    SECURED BY ARENAVERSE
                  </span>
                )}
              </div>
              {tournament.prizeDistribution && tournament.prizeDistribution.length > 0 && (
                <div className="text-xs text-secondary mt-1">
                  {tournament.prizeDistribution.map(p => (
                    <div key={p.position}>
                      {p.position}{p.position === 1 ? 'st' : p.position === 2 ? 'nd' : p.position === 3 ? 'rd' : 'th'}: ₹{p.amount}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        <div className="info-card glass-panel">
          <IndianRupee className="info-icon text-green" />
          <div>
            <p className="info-label">Entry Fee</p>
            <p className="info-value">{tournament.entryFee === 0 ? 'Free Entry' : `₹${tournament.entryFee}`}</p>
          </div>
        </div>

        {tournament.type === 'team' && (
          <div className="info-card glass-panel">
            <Users className="info-icon" />
            <div>
              <p className="info-label">Team Size Limit</p>
              <p className="info-value">{tournament.minTeamMembers || 2} - {tournament.maxTeamMembers || 5} Players</p>
            </div>
          </div>
        )}

        {tournament.type === 'duo' && (
          <div className="info-card glass-panel">
            <Users className="info-icon" />
            <div>
              <p className="info-label">Team Size Limit</p>
              <p className="info-value">Exactly 2 Players</p>
            </div>
          </div>
        )}
      </div>

      {/* Action / Registration Row */}
      {user && user.role === 'player' && (tournament.status === 'draft' || tournament.status === 'published') && (
        <div className="registration-bar glass-panel mt-4">
          <div className="registration-status-text">
            <UserCheck size={20} className="status-icon" />
            <div>
              <h4>Join the Bracket</h4>
              <p>
                {tournament.type === 'solo' 
                  ? `${tournament.registeredPlayers.length} / ${tournament.maxTeams} players registered`
                  : `${tournament.registeredTeams.length} / ${tournament.maxTeams} teams registered`}
              </p>
            </div>
          </div>

          <div className="registration-actions">
            {tournament.type === 'solo' ? (
              isRegisteredSolo ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-danger" onClick={() => handleLeave()}>
                    Leave Tournament
                  </button>
                </div>
              ) : tournament.entryFee > 0 ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handleJoinWithWallet} disabled={tournament.registeredPlayers.length >= tournament.maxTeams} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Wallet size={16} /> Pay ₹{tournament.entryFee} via Arena Wallet
                  </button>
                  <button className="btn btn-secondary" onClick={handleJoin} disabled={tournament.registeredPlayers.length >= tournament.maxTeams} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={16} /> Pay via Razorpay / UPI
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={handleJoin} disabled={tournament.registeredPlayers.length >= tournament.maxTeams}>
                  Register Solo
                </button>
              )
            ) : (
              // Team registration controls
              <div className="team-reg-controls">
                {registeredUserTeams.length > 0 ? (
                  <div className="registered-team-list">
                    {registeredUserTeams.map(t => (
                      <div key={t._id} className="registered-team-item">
                        <span>Registered as <strong>{t.name}</strong></span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleLeave(t._id)}>
                            Unregister Team
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {myTeams.length > 0 ? (
                      <div className="team-select-group">
                        <select 
                          className="form-control"
                          value={selectedTeamId || (myTeams[0]?._id ? myTeams[0]._id.toString() : '')}
                          onChange={(e) => setSelectedTeamId(e.target.value)}
                        >
                          {myTeams.map(t => (
                            <option key={t._id} value={t._id.toString()}>{t.name}</option>
                          ))}
                        </select>
                        {tournament.entryFee > 0 ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={handleJoinWithWallet} disabled={tournament.registeredTeams.length >= tournament.maxTeams} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Wallet size={16} /> Pay ₹{tournament.entryFee} via Arena Wallet
                            </button>
                            <button className="btn btn-secondary" onClick={handleJoin} disabled={tournament.registeredTeams.length >= tournament.maxTeams} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <CreditCard size={16} /> Pay via Razorpay
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-primary" onClick={handleJoin} disabled={tournament.registeredTeams.length >= tournament.maxTeams}>
                            Register Team
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="no-teams-warning">
                        You have no teams. Create one in your <Link to="/player-dashboard">Dashboard</Link> to join.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {joinError && (
            <div className="mt-3 w-full text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <p className="error-text" style={{ margin: 0, fontWeight: '500' }}>{joinError}</p>
              {joinError.toLowerCase().includes('insufficient arena wallet') && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleQuickTopUpAndJoin}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 16px' }}
                >
                  <Sparkles size={14} /> ⚡ Top Up ₹{tournament.entryFee} & Register Now
                </button>
              )}
            </div>
          )}
          {joinSuccess && <p className="success-text mt-2 w-full text-center">{joinSuccess}</p>}
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="details-tabs mt-4">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview & Rules
        </button>
        <button 
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <Megaphone size={16} /> Announcements ({tournament.announcements?.length || 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} /> Live Chat Room
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Star size={16} /> Reviews & Ratings
        </button>
        {(tournament.status === 'completed' || tournament.winnerName) && (
          <button 
            className={`tab-btn ${activeTab === 'highlights' ? 'active' : ''}`}
            onClick={() => setActiveTab('highlights')}
          >
            <Sparkles size={16} /> 🌟 Highlights & Social Share
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'bracket' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('bracket');
          }}
        >
          {isBattleRoyale ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} style={{ color: '#f97316' }} /> 🔥 Battle Royale Standings
            </span>
          ) : isClashSquad ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Swords size={16} style={{ color: '#818cf8' }} /> ⚔️ Clash Squad Bracket
            </span>
          ) : (
            'Tournament Bracket'
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          {tournament.type === 'solo' ? 'Players' : 'Registered Teams'}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="tab-panels-content mt-4">
        {activeTab === 'overview' && (
          <div className="panel-overview glass-panel">
            <h3><BookOpen size={18} /> Tournament Rules & Info</h3>
            <div className="rules-content">
              {tournament.rules.split('\n').map((rule, idx) => (
                <p key={idx}>{rule}</p>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="panel-announcements flex-col gap-4">
            {/* Post Announcement Form for Organizer/Admin */}
            {isOrganizer && (
              <div className="glass-panel post-announcement-box">
                <h4 className="flex items-center gap-2 mb-3">
                  <Megaphone size={18} className="text-primary" /> Post Organizer Announcement
                </h4>
                <form onSubmit={handlePostAnnouncement} className="form-grid-one">
                  <div className="form-group">
                    <label className="form-label">Announcement Title</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Schedule Update / Lobby ID & Password" 
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group mt-3">
                    <label className="form-label">Message Content</label>
                    <textarea 
                      rows="3" 
                      className="form-control" 
                      placeholder="Enter announcement details for all registered competitors..." 
                      value={announcementContent}
                      onChange={(e) => setAnnouncementContent(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mt-3 text-right" style={{ textAlign: 'right' }}>
                    <button type="submit" className="btn btn-primary" disabled={postingAnnouncement}>
                      <Send size={16} />
                      <span>{postingAnnouncement ? 'Broadcasting...' : 'Broadcast & Notify Competitors'}</span>
                    </button>
                  </div>
                  {announcementMsg && (
                    <p className={`mt-2 text-xs text-center ${announcementMsg.startsWith('Error') ? 'error-text' : 'success-text'}`}>
                      {announcementMsg}
                    </p>
                  )}
                </form>
              </div>
            )}

            {/* Announcements Feed */}
            <div className="glass-panel">
              <h3><Megaphone size={18} /> Organizer Announcements</h3>
              {tournament.announcements && tournament.announcements.length > 0 ? (
                <div className="announcements-feed mt-3">
                  {tournament.announcements.map((a, idx) => (
                    <div key={idx} className="announcement-feed-card">
                      <div className="announcement-card-header">
                        <div className="announcement-title-group">
                          <span className="megaphone-badge">📢</span>
                          <strong className="announcement-feed-title">{a.title}</strong>
                        </div>
                        <span className="announcement-feed-date text-muted text-xs">
                          {new Date(a.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="announcement-feed-content mt-2">{a.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4">No organizer announcements broadcast yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="panel-chat">
            <TournamentChat tournamentId={id} isOrganizer={isOrganizer} />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="panel-reviews">
            <TournamentReviews 
              tournamentId={id} 
              organizerId={tournament.organizer?._id || tournament.organizer} 
              isRegistered={isRegisteredSolo || registeredUserTeams.length > 0 || isOrganizer}
              tournamentStatus={tournament.status}
            />
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="panel-highlights">
            <TournamentHighlights tournamentId={id} />
          </div>
        )}
        {activeTab === 'bracket' && (
          <div className="panel-bracket">
            {isBattleRoyale ? (
              tournament.status === 'draft' ? (
                <div className="text-center py-4 glass-panel">
                  <Flame size={36} className="warning-icon mb-4" style={{ margin: '0 auto 12px auto', color: '#f97316' }} />
                  <h3>Battle Royale Matches Not Scheduled Yet</h3>
                  <p className="text-secondary text-sm">The Free Fire Battle Royale tournament is currently in draft mode. Click below to schedule matches and go live!</p>
                  {isOrganizer && (
                    <div className="mt-4 flex-col items-center">
                      <button 
                        className="btn btn-primary py-3 px-4" 
                        onClick={handleDirectPublish}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', borderRadius: '12px' }}
                      >
                        <Globe size={20} /> 🚀 Publish Tournament & Schedule Matches
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <BattleRoyaleView 
                  tournament={tournament}
                  isOrganizer={isOrganizer}
                  getAuthHeader={getAuthHeader}
                  onResultsUpdated={fetchDetails}
                />
              )
            ) : isClashSquad ? (
              tournament.status === 'draft' ? (
                <div className="text-center py-4 glass-panel">
                  <Swords size={36} className="warning-icon mb-4" style={{ margin: '0 auto 12px auto', color: '#6366f1' }} />
                  <h3>Clash Squad Bracket Not Generated Yet</h3>
                  <p className="text-secondary text-sm">The Clash Squad knockout tournament is in draft mode. Click below to generate the Team vs Team bracket and go live!</p>
                  {isOrganizer && (
                    <div className="mt-4 flex-col items-center">
                      <button 
                        className="btn btn-primary py-3 px-4" 
                        onClick={handleDirectPublish}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', borderRadius: '12px' }}
                      >
                        <Globe size={20} /> 🚀 Publish Tournament & Generate Clash Squad Bracket
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ClashSquadTeamView 
                    tournament={tournament}
                    matches={matches}
                    user={user}
                    myTeams={myTeams}
                  />
                  <div className="glass-panel" style={{ padding: '16px' }}>
                    <BracketView 
                      matches={matches} 
                      isOrganizer={isOrganizer} 
                      onUpdateScore={handleUpdateScore} 
                    />
                  </div>
                </div>
              )
            ) : (
              // Standard bracket for other games
              <div className="glass-panel" style={{ padding: '16px' }}>
                {tournament.status === 'draft' ? (
                  <div className="text-center py-4">
                    <AlertTriangle size={32} className="warning-icon mb-4" style={{ margin: '0 auto 12px auto' }} />
                    <h3>Bracket Not Generated Yet</h3>
                    <p className="text-secondary text-sm">The tournament is currently in draft mode. Click below to publish and make it live!</p>
                    {isOrganizer && (
                      <div className="mt-4 flex-col items-center">
                        <button 
                          className="btn btn-primary py-3 px-4" 
                          onClick={handleDirectPublish}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', borderRadius: '12px' }}
                        >
                          <Globe size={20} /> 🚀 Publish Tournament & Generate Live Bracket
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <BracketView 
                    matches={matches} 
                    isOrganizer={isOrganizer} 
                    onUpdateScore={handleUpdateScore} 
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="panel-participants glass-panel">
            <h3>Registered Participants</h3>
            {tournament.type === 'solo' ? (
              <div className="participants-list">
                {tournament.registeredPlayers.length === 0 ? (
                  <p className="text-muted">No players have registered yet.</p>
                ) : (
                  tournament.registeredPlayers.map(p => (
                    <div key={p._id} className="participant-item">
                      <div className="avatar-small">
                        <img 
                          src={p.profile?.avatar || '/images/default-avatar.png'} 
                          alt={p.username} 
                        />
                      </div>
                      <span>{p.username}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="participants-list">
                {tournament.registeredTeams.length === 0 ? (
                  <p className="text-muted">No teams have registered yet.</p>
                ) : (
                  tournament.registeredTeams.map(t => (
                    <div key={t._id} className="participant-item">
                      <div className="avatar-small">
                        {t.logo ? <img src={t.logo} alt={t.name} /> : t.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{t.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispute Reporting Modal */}
      <DisputeModal 
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        tournamentId={id}
      />

      {/* 3508x2480 High-Res Esports Certificate Hub Modal */}
      <EsportsCertificateModal 
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        tournament={tournament || {}}
        initialWinnerName={effectiveWinner}
        initialRunnerUpName={effectiveRunnerUp}
        initialType={certModalType}
      />

      {/* Live Stream Configuration Modal */}
      {showStreamModal && (
        <div className="modal-overlay" onClick={() => setShowStreamModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio className="text-danger" size={20} /> Configure Tournament Live Stream
              </h3>
              <button className="btn-close" onClick={() => setShowStreamModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setStreamSaveLoading(true);
              setStreamSaveMsg('');
              try {
                const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/stream`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader(),
                  },
                  body: JSON.stringify({
                    streamUrl: streamUrlInput,
                    streamTitle: streamTitleInput,
                    streamPlatform: streamPlatformInput,
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Failed to update stream link');
                setStreamSaveMsg(data.message);
                setTournament(data.tournament);
                setTimeout(() => setShowStreamModal(false), 1000);
              } catch (err) {
                setStreamSaveMsg(err.message);
              } finally {
                setStreamSaveLoading(false);
              }
            }} className="modal-body">
              <p className="text-secondary text-xs mb-3">
                Paste the URL of your live stream (YouTube, Twitch, or Kick). This stream will be embedded here and broadcast across the site in the <strong>Live Streams Hub</strong>.
              </p>

              {streamSaveMsg && (
                <p className={streamSaveMsg.includes('Failed') ? 'error-text text-xs mb-2' : 'success-text text-xs mb-2'}>
                  {streamSaveMsg}
                </p>
              )}

              <div className="form-group mb-3">
                <label className="form-label text-xs">Live Stream URL (YouTube, Twitch, or Kick)</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://www.youtube.com/watch?v=... or https://twitch.tv/..."
                  value={streamUrlInput}
                  onChange={(e) => setStreamUrlInput(e.target.value)}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label text-xs">Broadcast Title (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. ArenaVerse Winter Cup - Grand Finals LIVE"
                  value={streamTitleInput}
                  onChange={(e) => setStreamTitleInput(e.target.value)}
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label text-xs">Platform</label>
                <select
                  className="form-control"
                  value={streamPlatformInput}
                  onChange={(e) => setStreamPlatformInput(e.target.value)}
                >
                  <option value="youtube">YouTube Live</option>
                  <option value="twitch">Twitch</option>
                  <option value="kick">Kick</option>
                  <option value="custom">Other / Custom</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {tournament.streamUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      setStreamUrlInput('');
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/stream`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...getAuthHeader(),
                          },
                          body: JSON.stringify({ streamUrl: '', streamTitle: '' }),
                        });
                        const data = await res.json();
                        setTournament(data.tournament);
                        setShowStreamModal(false);
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                  >
                    Clear Stream
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={streamSaveLoading}
                >
                  {streamSaveLoading ? 'Saving...' : 'Save & Publish Live Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tournament Replay VOD Configuration Modal */}
      {showReplayModal && (
        <div className="modal-overlay" onClick={() => setShowReplayModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film className="text-primary" size={20} /> Publish Tournament Replay VOD
              </h3>
              <button className="btn-close" onClick={() => setShowReplayModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setReplaySaveLoading(true);
              setReplaySaveMsg('');
              try {
                const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/replay`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader(),
                  },
                  body: JSON.stringify({
                    replayUrl: replayUrlInput,
                    replayTitle: replayTitleInput,
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Failed to update replay link');
                setReplaySaveMsg(data.message);
                setTournament(data.tournament);
                setTimeout(() => setShowReplayModal(false), 1000);
              } catch (err) {
                setReplaySaveMsg(err.message);
              } finally {
                setReplaySaveLoading(false);
              }
            }} className="modal-body">
              <p className="text-secondary text-xs mb-3">
                Add the link of the tournament match replay or VOD recording. It will be showcased on this tournament page and permanently archived in the <strong>Replay VOD Hub</strong>.
              </p>

              {replaySaveMsg && (
                <p className={replaySaveMsg.includes('Failed') ? 'error-text text-xs mb-2' : 'success-text text-xs mb-2'}>
                  {replaySaveMsg}
                </p>
              )}

              <div className="form-group mb-3">
                <label className="form-label text-xs">Replay VOD URL (YouTube or Twitch)</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={replayUrlInput}
                  onChange={(e) => setReplayUrlInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label text-xs">VOD Title (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Grand Finals VOD - Full Match Replay"
                  value={replayTitleInput}
                  onChange={(e) => setReplayTitleInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {tournament.replayUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      setReplayUrlInput('');
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/replay`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...getAuthHeader(),
                          },
                          body: JSON.stringify({ replayUrl: '', replayTitle: '' }),
                        });
                        const data = await res.json();
                        setTournament(data.tournament);
                        setShowReplayModal(false);
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                  >
                    Clear Replay
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={replaySaveLoading}
                >
                  {replaySaveLoading ? 'Saving...' : 'Publish to Replay Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetails;
