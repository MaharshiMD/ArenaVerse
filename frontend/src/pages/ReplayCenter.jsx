import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Video, Eye, Film, ArrowUpRight } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { API_BASE_URL } from '../config/api';
import './ReplayCenter.css';

const ReplayCenter = () => {
  const socket = useSocket();
  const [replays, setReplays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReplays();
  }, []);

  const fetchReplays = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/replays`);
      if (res.ok) setReplays(await res.json());
    } catch (err) {
      console.error('Failed to fetch replays:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time update when an organizer publishes a tournament replay VOD
  useEffect(() => {
    if (!socket) return;
    const handleReplayUpdate = () => {
      fetchReplays();
    };

    socket.on('tournament_replay_updated', handleReplayUpdate);
    socket.on('tournament_completed', handleReplayUpdate);

    return () => {
      socket.off('tournament_replay_updated', handleReplayUpdate);
      socket.off('tournament_completed', handleReplayUpdate);
    };
  }, [socket]);

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading Tournament Replay Center...</p></div>;
  }

  return (
    <div className="replay-center-page container py-4 mt-4">
      <div className="mb-4">
        <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Film className="text-primary" size={32} /> Tournament Replay & VOD Center
        </h1>
        <p className="section-subtitle">Watch official match replays, clutch highlights, and full tournament VOD archives.</p>
      </div>

      <div className="grid-2 gap-4">
        {replays.map((vod) => (
          <div key={vod._id} className="glass-panel p-4 flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary text-xs">{vod.game}</span>
                <span className="text-muted text-xs flex items-center gap-1"><Eye size={12} /> {vod.views} Views</span>
              </div>
              <h3 className="text-white font-bold text-md mb-3">{vod.title}</h3>
              <div className="video-responsive mb-3" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                <iframe
                  src={vod.vodUrl}
                  title={vod.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>

              {vod.tournament && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="badge badge-completed text-xs">Tournament Archive</span>
                  <Link 
                    to={`/tournaments/${vod.tournament._id || vod.tournament}`} 
                    className="btn btn-primary btn-sm" 
                    style={{ fontSize: '11px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Tournament Podium <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReplayCenter;
