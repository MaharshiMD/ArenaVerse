import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Calendar, Gamepad2, X, BookOpen, PlaySquare } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import NewsVideoPreview from '../components/NewsVideoPreview';
import './EsportsNews.css';

const EsportsNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/esports-news`);
      if (res.ok) setNews(await res.json());
    } catch (err) {
      console.error('Failed to fetch esports news:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading Esports News Feed...</p></div>;
  }

  return (
    <div className="esports-news-page container py-4 mt-4">
      <div className="mb-4">
        <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Newspaper className="text-primary" size={32} /> Esports News & Updates
        </h1>
        <p className="section-subtitle">Stay informed with official announcements, patch notes, and pro circuit tournaments.</p>
      </div>

      <div className="grid-3 gap-4">
        {news.map((item) => (
          <div key={item.id} className="news-card glass-panel p-4 flex-col justify-between" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="flex items-center gap-2 mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary text-xs">{item.game}</span>
                <span className="text-muted text-xs">{item.source}</span>
              </div>
              <h3 className="text-white font-bold text-md mb-2">{item.title}</h3>
              <p className="text-secondary text-xs">{item.summary}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-muted" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs">{new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <button 
                className="btn btn-primary btn-sm text-xs" 
                onClick={() => setSelectedArticle(item)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <BookOpen size={13} /> Read Article
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel p-5 flex-col" style={{ width: '620px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="badge badge-primary text-xs">{selectedArticle.game}</span>
                  <span className="text-muted text-xs font-semibold">{selectedArticle.source}</span>
                </div>
                <span className="text-muted text-xs block">Published: {new Date(selectedArticle.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <button className="btn btn-secondary btn-sm p-1" onClick={() => setSelectedArticle(null)}>
                <X size={18} />
              </button>
            </div>

            <h2 className="text-white font-extrabold text-lg mb-3" style={{ lineHeight: '1.4' }}>{selectedArticle.title}</h2>
            
            <div className="glass-panel p-3 mb-4" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <p className="text-white text-xs font-semibold m-0" style={{ lineHeight: '1.5' }}>{selectedArticle.summary}</p>
            </div>

            <div className="text-secondary text-sm mb-4" style={{ lineHeight: '1.8', whiteSpace: 'pre-line' }}>
              {selectedArticle.fullContent}
            </div>

            <button 
              className="btn btn-outline-primary w-100 mb-4 flex items-center justify-center gap-2" 
              onClick={() => setShowVideoPreview(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <PlaySquare size={18} /> Watch AI Video Preview
            </button>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {selectedArticle.url && (
                <a 
                  href={selectedArticle.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary flex-1 text-xs" 
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  Visit Official Source <ExternalLink size={14} />
                </a>
              )}
              <button className="btn btn-secondary text-xs" onClick={() => setSelectedArticle(null)}>
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {showVideoPreview && selectedArticle && (
        <NewsVideoPreview 
          article={selectedArticle} 
          onClose={() => setShowVideoPreview(false)} 
        />
      )}
    </div>
  );
};

export default EsportsNews;
