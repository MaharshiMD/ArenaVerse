import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  ExternalLink, 
  Calendar, 
  Gamepad2, 
  X, 
  BookOpen, 
  PlaySquare, 
  PlusCircle, 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Film,
  Zap,
  Volume2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import NewsVideoPreview from '../components/NewsVideoPreview';
import './EsportsNews.css';

const EsportsNews = () => {
  const { user, getAuthHeader } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [videoPreviewArticle, setVideoPreviewArticle] = useState(null);

  // New article creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    game: 'VALORANT',
    source: 'ArenaVerse Official',
    summary: '',
    fullContent: '',
    url: ''
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/esports-news`);
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
    } catch (err) {
      console.error('Failed to fetch esports news:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim() || !formData.summary.trim() || !formData.fullContent.trim()) {
      setFormError('Please fill in title, summary, and full content.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/esports-news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to publish article');
      }

      // Add newly created article with its DB-stored video preview to list
      setNews(prev => [data, ...prev]);
      setShowCreateModal(false);
      setFormData({
        title: '',
        game: 'VALORANT',
        source: 'ArenaVerse Official',
        summary: '',
        fullContent: '',
        url: ''
      });

      // Automatically offer to preview the newly generated video
      setVideoPreviewArticle(data);
      setShowVideoPreview(true);
    } catch (err) {
      console.error('Article creation error:', err);
      setFormError(err.message || 'Error publishing article with AI video.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateVideo = async (articleId) => {
    setIsRegenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/esports-news/${articleId}/regenerate-video`, {
        method: 'POST',
        headers: {
          ...getAuthHeader()
        }
      });
      const data = await res.json();
      if (res.ok && data.videoPreview) {
        setNews(prev => prev.map(n => n._id === articleId ? { ...n, videoPreview: data.videoPreview } : n));
        if (selectedArticle && selectedArticle._id === articleId) {
          setSelectedArticle(prev => ({ ...prev, videoPreview: data.videoPreview }));
        }
        if (videoPreviewArticle && videoPreviewArticle._id === articleId) {
          setVideoPreviewArticle(prev => ({ ...prev, videoPreview: data.videoPreview }));
        }
      }
    } catch (err) {
      console.error('Error regenerating video:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const openVideoPreview = (article) => {
    setVideoPreviewArticle(article);
    setShowVideoPreview(true);
  };

  if (loading) {
    return (
      <div className="text-center py-5 mt-5">
        <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
        <p className="text-secondary text-sm">Loading Esports News & Pre-rendered AI Videos...</p>
      </div>
    );
  }

  return (
    <div className="esports-news-page container py-4 mt-4">
      {/* Top Banner & Header */}
      <div className="news-header-container mb-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Newspaper className="text-primary" size={32} /> Esports News & Updates
          </h1>
          <p className="section-subtitle">
            Stay informed with official announcements, patch notes, and pro circuit tournaments. Every article includes a pre-rendered AI Video Preview stored in the database for instant playback.
          </p>
        </div>

        <button 
          className="btn btn-primary add-article-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <PlusCircle size={18} /> Add News Article
        </button>
      </div>

      {/* Grid of Articles */}
      <div className="grid-3 gap-4">
        {news.map((item) => {
          const hasDbVideo = !!item.videoPreview?.hasVideo;
          const videoDuration = item.videoPreview?.duration || 12;

          return (
            <div 
              key={item._id || item.id} 
              className="news-card glass-panel p-4 flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-primary text-xs">{item.game}</span>
                    <span className="text-muted text-xs font-medium">{item.source}</span>
                  </div>
                  {hasDbVideo && (
                    <span className="db-video-badge" title="Stored in Database: Instant 0s Playback">
                      <Zap size={11} className="text-amber-400" />
                      <span>{videoDuration}s AI Video</span>
                    </span>
                  )}
                </div>

                <h3 className="text-white font-bold text-md mb-2 line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-secondary text-xs line-clamp-3 mb-3">
                  {item.summary}
                </p>
              </div>

              <div className="news-card-footer">
                <span className="text-muted text-xs">
                  {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                
                <div className="card-actions-row">
                  <button 
                    className="btn btn-watch-video btn-sm"
                    onClick={() => openVideoPreview(item)}
                    title="Watch pre-rendered summary video from database (0s delay)"
                  >
                    <PlaySquare size={14} /> AI Video
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setSelectedArticle(item)}
                  >
                    <BookOpen size={13} /> Read
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="modal-backdrop">
          <div className="glass-panel p-5 article-modal-content">
            <div className="modal-top-bar">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-primary text-xs">{selectedArticle.game}</span>
                  <span className="text-muted text-xs font-semibold">{selectedArticle.source}</span>
                  {selectedArticle.videoPreview?.hasVideo && (
                    <span className="db-video-badge-modal">
                      <Zap size={11} className="text-amber-400" /> DB Pre-rendered
                    </span>
                  )}
                </div>
                <span className="text-muted text-xs block">
                  Published: {new Date(selectedArticle.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button className="btn btn-secondary btn-sm p-1" onClick={() => setSelectedArticle(null)}>
                <X size={18} />
              </button>
            </div>

            <h2 className="text-white font-extrabold text-lg mb-3" style={{ lineHeight: '1.4' }}>
              {selectedArticle.title}
            </h2>
            
            <div className="glass-panel p-3 mb-4 summary-highlight-box">
              <p className="text-white text-xs font-semibold m-0" style={{ lineHeight: '1.5' }}>
                {selectedArticle.summary}
              </p>
            </div>

            <div className="text-secondary text-sm mb-4 article-body-text">
              {selectedArticle.fullContent}
            </div>

            {/* Instant AI Video Launch Banner */}
            <div className="instant-video-banner mb-4">
              <div className="banner-left">
                <Film className="text-primary" size={24} />
                <div>
                  <h4 className="m-0 text-white text-sm font-bold flex items-center gap-2">
                    AI Summary Video Preview
                    <span className="badge-instant">Instant DB Stream</span>
                  </h4>
                  <p className="m-0 text-muted text-xs">
                    Narration Audio, Equalizer Waveform, and Synchronized VFX pre-stored in database.
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-primary btn-sm flex items-center gap-2"
                onClick={() => {
                  openVideoPreview(selectedArticle);
                }}
              >
                <PlaySquare size={16} /> Watch Preview ({selectedArticle.videoPreview?.duration || 12}s)
              </button>
            </div>

            <div className="modal-bottom-actions">
              <div className="flex gap-2">
                {selectedArticle.url && (
                  <a 
                    href={selectedArticle.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary text-xs flex items-center gap-1"
                  >
                    Visit Official Source <ExternalLink size={14} />
                  </a>
                )}
                {user && (user.role === 'admin' || user.role === 'organizer') && (
                  <button
                    className="btn btn-outline-secondary text-xs flex items-center gap-1"
                    disabled={isRegenerating}
                    onClick={() => handleRegenerateVideo(selectedArticle._id)}
                    title="Regenerate speech audio & VFX storyboard"
                  >
                    <RefreshCw size={13} className={isRegenerating ? "animate-spin" : ""} />
                    {isRegenerating ? 'Regenerating...' : 'Regenerate Video'}
                  </button>
                )}
              </div>
              <button className="btn btn-secondary text-xs" onClick={() => setSelectedArticle(null)}>
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Article Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="glass-panel p-5 article-modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-top-bar mb-3">
              <div>
                <h2 className="text-white font-bold text-lg m-0 flex items-center gap-2">
                  <Sparkles size={20} className="text-primary" /> Publish Esports News Article
                </h2>
                <p className="text-muted text-xs m-0">
                  AI will automatically generate the summary video with narration audio, waveform, and VFX, saving it to the database for instant playback.
                </p>
              </div>
              <button 
                className="btn btn-secondary btn-sm p-1" 
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-3 bg-red-950 border border-red-800 rounded text-red-200 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex-col gap-3">
              <div className="form-group mb-3">
                <label className="text-white text-xs font-semibold block mb-1">Article Title *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Free Fire MAX Pro Series 2026 Grand Finals Announced"
                  className="input-field w-100 text-sm"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid-2 gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="text-white text-xs font-semibold block mb-1">Game *</label>
                  <select 
                    className="input-field w-100 text-sm"
                    value={formData.game}
                    onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                  >
                    <option value="VALORANT">VALORANT</option>
                    <option value="BGMI / PUBG Mobile">BGMI / PUBG Mobile</option>
                    <option value="Counter-Strike 2">Counter-Strike 2</option>
                    <option value="Free Fire MAX">Free Fire MAX</option>
                    <option value="Apex Legends">Apex Legends</option>
                    <option value="Overwatch 2">Overwatch 2</option>
                    <option value="General Esports">General Esports</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="text-white text-xs font-semibold block mb-1">Source / Organizer *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Riot Esports, Krafton, ESL"
                    className="input-field w-100 text-sm"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="text-white text-xs font-semibold block mb-1">
                  Summary (Script for AI Voiceover & Video Preview) *
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Short, punchy 2-3 sentence overview that will be synthesized into speech audio & scenes..."
                  className="input-field w-100 text-sm"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                />
              </div>

              <div className="form-group mb-3">
                <label className="text-white text-xs font-semibold block mb-1">Full Article Content *</label>
                <textarea 
                  required
                  rows={5}
                  placeholder="Detailed match analysis, schedule, bracket info, prize pool breakdowns..."
                  className="input-field w-100 text-sm"
                  value={formData.fullContent}
                  onChange={(e) => setFormData({ ...formData, fullContent: e.target.value })}
                />
              </div>

              <div className="form-group mb-4">
                <label className="text-white text-xs font-semibold block mb-1">Official Reference URL (Optional)</label>
                <input 
                  type="url"
                  placeholder="https://official-esports-website.com"
                  className="input-field w-100 text-sm"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              {isSubmitting ? (
                <div className="ai-generating-status p-3 rounded mb-3 flex items-center gap-3">
                  <Loader2 className="animate-spin text-purple-400" size={24} />
                  <div>
                    <h5 className="text-white text-sm font-bold m-0">Generating AI Video & Audio...</h5>
                    <p className="text-secondary text-xs m-0">
                      Synthesizing voice narration, computing audio waveform, generating VFX scene transitions, and storing directly to MongoDB...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    className="btn btn-secondary text-xs" 
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary text-xs flex items-center gap-2"
                  >
                    <Sparkles size={14} /> Publish & Generate AI Video
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Instant Video Preview Modal */}
      {showVideoPreview && videoPreviewArticle && (
        <NewsVideoPreview 
          article={videoPreviewArticle} 
          onClose={() => {
            setShowVideoPreview(false);
            setVideoPreviewArticle(null);
          }} 
        />
      )}
    </div>
  );
};

export default EsportsNews;
