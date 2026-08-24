import React, { useState } from 'react';
import { Sparkles, Palette, FileText, Image, MessageSquare, Briefcase, Wand2, Gamepad2, Download, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import './AICreativeStudio.css';

const ALL_GAMES = [
  'Battlegrounds Mobile India (BGMI)',
  'VALORANT',
  'Counter-Strike 2',
  'Call of Duty: Mobile',
  'Call of Duty: Black Ops 7',
  'Call of Duty: Warzone',
  'Free Fire MAX',
  'PUBG Mobile',
  'PUBG: Battlegrounds',
  'Apex Legends',
  'League of Legends',
  'Dota 2',
  'Mobile Legends: Bang Bang',
  'Honor of Kings',
  'Overwatch 2',
  'Rainbow Six Siege',
  'Crossfire',
  'EA Sports FC 26',
  'eFootball',
  'Rocket League',
  'Tekken 8',
  'Street Fighter 6',
  'Mortal Kombat 1',
  'Fatal Fury: City of the Wolves',
  'Fortnite',
  'Clash Royale',
  'Clash of Clans',
  'Brawl Stars',
  'Pokémon UNITE',
  'Teamfight Tactics',
  'Hearthstone',
  'Trackmania',
  'Gran Turismo 7',
  'Chess',
  'Custom / Other Game',
];

const AICreativeStudio = () => {
  const { user, getAuthHeader } = useAuth();
  const [assetType, setAssetType] = useState('tournament_poster');
  const [prompt, setPrompt] = useState('');
  const [game, setGame] = useState('Battlegrounds Mobile India (BGMI)');
  const [customGame, setCustomGame] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (user && user.role !== 'organizer' && user.role !== 'admin') {
    return (
      <div className="container py-5 mt-4 text-center">
        <div className="glass-panel p-5" style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(15, 15, 25, 0.8)' }}>
          <Shield className="text-warning mb-3" size={56} style={{ color: '#f59e0b', margin: '0 auto 16px auto' }} />
          <h2 className="text-white font-bold text-xl mb-2">Access Restricted to Organizers & Admins</h2>
          <p className="text-secondary text-sm mb-4">
            The <strong>AI Creative Studio & Esports Suite</strong> is reserved exclusively for verified Hosts, Organizers, and Platform Admins to generate tournament posters, team logos, official rulebooks, and sponsorship proposals.
          </p>
          <a href="/player-dashboard" className="btn btn-primary">
            Return to Competitor Dashboard
          </a>
        </div>
      </div>
    );
  }

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const selectedGame = game === 'Custom / Other Game' ? (customGame.trim() || 'Esports') : game;

    try {
      const res = await fetch(`${API_BASE_URL}/api/ultimate/ai-creative-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ assetType, prompt, game: selectedGame }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
      else alert(data.message || 'Failed to generate AI asset.');
    } catch (err) {
      alert('Failed to generate AI asset.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!result || !result.imageBase64) return;
    const mime = result.mimeType || 'image/png';
    const dataUrl = `data:${mime};base64,${result.imageBase64}`;
    const sanitizedTitle = (prompt || 'creative_asset').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `${result.assetType || assetType}_${sanitizedTitle}_${Date.now()}.png`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="ai-creative-studio-page container py-4 mt-4">
      <div className="mb-4">
        <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles className="text-primary" size={32} /> AI Creative Studio & Esports Suite
        </h1>
        <p className="section-subtitle">Generate dynamic tournament posters, team logos, official rulebooks, sponsorship proposals, and social captions with AI.</p>
      </div>

      <div className="grid-2 gap-4">
        {/* Input Panel */}
        <div className="glass-panel p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Wand2 size={20} className="text-primary" /> Asset Generator Settings
          </h3>
          <form onSubmit={handleGenerate} className="flex-col gap-3">
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <select className="form-control" value={assetType} onChange={e => setAssetType(e.target.value)}>
                <option value="tournament_poster">🖼️ Dynamic Tournament Poster</option>
                <option value="team_logo">🎨 Esports Team Logo Blueprint</option>
                <option value="rulebook">📜 Official Tournament Rulebook</option>
                <option value="sponsor_proposal">💼 AI Sponsor Proposal</option>
                <option value="social_caption">📱 Social Media Captions & Tweets</option>
                <option value="ai_coach">🤖 AI Tactical Coach Advice</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label flex items-center justify-between">
                <span>Target Game</span>
                <span className="text-muted text-xs">({ALL_GAMES.length} Available)</span>
              </label>
              <select className="form-control" value={game} onChange={e => setGame(e.target.value)}>
                {ALL_GAMES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {game === 'Custom / Other Game' && (
              <div className="form-group">
                <label className="form-label">Specify Custom Game Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Valorant Mobile, FIFA 24, Genshin TCG..."
                  value={customGame}
                  onChange={e => setCustomGame(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Custom Keywords / Tournament Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. BGMI Masters Pro League Season 1"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Wand2 size={16} />
              <span>
                {loading
                  ? (assetType === 'tournament_poster' || assetType === 'team_logo'
                      ? 'Generating image — this can take up to 30 seconds...'
                      : 'Generating AI Asset...')
                  : 'Generate AI Creative Asset'}
              </span>
            </button>
          </form>
        </div>

        {/* Output Panel */}
        <div className="glass-panel p-4">
          <h3 className="text-white font-bold mb-3">Generated AI Output</h3>
          {loading ? (
            <div className="text-center py-5">
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(139, 92, 246, 0.2)', borderTop: '3px solid #8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px auto' }} />
              <p className="text-white font-semibold text-sm m-0">
                {assetType === 'tournament_poster' || assetType === 'team_logo'
                  ? 'Generating image — this can take up to 30 seconds...'
                  : 'Generating AI Asset...'}
              </p>
              <p className="text-muted text-xs mt-1">Please keep this window open while AI crafts your asset.</p>
            </div>
          ) : !result ? (
            <div className="text-center py-5 text-muted">
              <Sparkles size={40} className="mb-2 opacity-50 text-primary" />
              <p>Configure parameters on the left and click Generate.</p>
            </div>
          ) : result.contentType === 'image' && result.imageBase64 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="ai-generated-image-card">
                <img
                  src={`data:${result.mimeType || 'image/png'};base64,${result.imageBase64}`}
                  alt="Generated asset"
                  className="ai-generated-img"
                />
                <div className="ai-image-download-bar">
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleDownloadImage} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={16} />
                    <span>Download Image</span>
                  </button>
                </div>
              </div>

              {result.generatedContent && (
                <div className="glass-panel p-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color-glow)', borderRadius: '12px', color: 'var(--text-primary)' }}>
                  <h4 className="text-primary font-bold text-sm mb-2 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                    <Sparkles size={16} /> Gemini AI Creative Concept & Blueprint
                  </h4>
                  <pre className="font-mono text-xs whitespace-pre-wrap m-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    {result.generatedContent}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color-glow)', borderRadius: '12px', color: 'var(--text-primary)' }}>
              <pre className="font-mono text-xs whitespace-pre-wrap m-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {result.generatedContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICreativeStudio;
