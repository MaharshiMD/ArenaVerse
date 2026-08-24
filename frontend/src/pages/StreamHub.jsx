import React, { useState, useEffect } from 'react';
import { Tv, Radio, Users, Eye } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './StreamHub.css';

const StreamHub = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/streams`);
      if (res.ok) setStreams(await res.json());
    } catch (err) {
      console.error('Failed to fetch streams:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading Live Streaming Hub...</p></div>;
  }

  return (
    <div className="stream-hub-page container py-4 mt-4">
      <div className="mb-4">
        <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Tv className="text-primary" size={32} /> Live Esports Streaming Hub
        </h1>
        <p className="section-subtitle">Watch live broadcasts from featured creators, Twitch streams, and official esports matches.</p>
      </div>

      <div className="grid-2 gap-4">
        {streams.map((stream) => (
          <div key={stream.id} className="glass-panel p-4 flex-col justify-between">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="badge badge-ongoing text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Radio size={12} className="animate-pulse" /> LIVE STREAM
                </span>
                <span className="text-white text-xs font-bold flex items-center gap-1">
                  <Eye size={12} className="text-primary" /> {stream.viewers.toLocaleString()} Viewers
                </span>
              </div>
              <h3 className="text-white font-bold text-md mb-1">{stream.title}</h3>
              <p className="text-secondary text-xs mb-3">Creator: <strong>@{stream.creator}</strong> | Game: {stream.game}</p>
              <div className="video-responsive mb-2" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                <iframe
                  src={stream.url}
                  title={stream.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamHub;
