import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, Sparkles, CheckCircle2 } from 'lucide-react';
import './NewsVideoPreview.css';

const NewsVideoPreview = ({ article, onClose }) => {
  const videoData = article.videoPreview || {};
  const hasDbAudio = !!videoData.audioUrl;
  const scenes = videoData.scenes && videoData.scenes.length > 0 ? videoData.scenes : [
    {
      id: 1,
      badge: 'TOP HEADLINE',
      headline: article.title,
      contentSnippet: article.summary,
      timeStart: 0,
      timeEnd: videoData.duration || 12,
      vfxType: 'cinematic-zoom',
      highlightKeywords: [article.game, 'ArenaVerse', 'Official']
    }
  ];
  const subtitles = videoData.subtitles || [];
  const vfxTheme = videoData.vfxTheme || {
    themeName: 'arena-hyper',
    accentColor: '#8b5cf6',
    secondaryColor: '#ec4899',
    bgGradient: 'linear-gradient(135deg, #09090f 0%, #150d2a 50%, #2e0854 100%)',
    particlesStyle: 'cyber-sparks',
    overlayTag: 'ARENAVERSE REPORT'
  };
  const waveformBars = videoData.audioWaveform && videoData.audioWaveform.length > 0
    ? videoData.audioWaveform
    : [35, 60, 85, 45, 90, 70, 40, 80, 55, 65, 95, 30, 75, 50, 85, 40, 60, 90, 45, 70];

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoData.duration || 12);
  const [isMuted, setIsMuted] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  const audioRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Determine current scene based on currentTime
  const currentScene = scenes.find(s => currentTime >= s.timeStart && currentTime <= s.timeEnd) || scenes[0];

  // Initialize playback immediately from DB audio or speech fallback
  useEffect(() => {
    if (hasDbAudio) {
      const audio = new Audio(videoData.audioUrl);
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(duration);
      };

      // Instant Auto-play from database (zero waiting)
      audio.play().catch(() => {
        // Autoplay policy may require user interaction
        setIsPlaying(false);
      });

      return () => {
        audio.pause();
        audio.src = '';
      };
    } else {
      // Fallback: Web Speech API if legacy article without DB audio
      const text = `ArenaVerse Flash Intel. ${article.title}. ${article.summary}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utteranceRef.current = utterance;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(duration);
      };

      synthRef.current?.cancel();
      synthRef.current?.speak(utterance);

      return () => {
        synthRef.current?.cancel();
      };
    }
  }, [article, hasDbAudio]);

  // High precision time tracker loop
  useEffect(() => {
    const updateLoop = () => {
      if (hasDbAudio && audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);

        // Update active subtitle word
        if (subtitles.length > 0) {
          const idx = subtitles.findIndex(sub => time >= sub.startTime && time <= sub.endTime);
          if (idx !== -1) setActiveWordIndex(idx);
          else if (time >= (subtitles[subtitles.length - 1]?.endTime || duration)) {
            setActiveWordIndex(subtitles.length);
          }
        }
      } else if (!hasDbAudio && isPlaying) {
        setCurrentTime(prev => {
          const next = prev + 0.05;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateLoop);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, hasDbAudio, subtitles, duration]);

  const togglePlayPause = () => {
    if (hasDbAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (currentTime >= duration - 0.2) {
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
        }
        audioRef.current.play().catch(console.error);
      }
    } else {
      if (isPlaying) {
        synthRef.current?.pause();
        setIsPlaying(false);
      } else {
        if (synthRef.current?.paused) {
          synthRef.current.resume();
          setIsPlaying(true);
        } else {
          setCurrentTime(0);
          synthRef.current?.cancel();
          if (utteranceRef.current) synthRef.current?.speak(utteranceRef.current);
        }
      }
    }
  };

  const restartVideo = () => {
    if (hasDbAudio && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setActiveWordIndex(0);
      audioRef.current.play().catch(console.error);
    } else {
      synthRef.current?.cancel();
      setCurrentTime(0);
      setActiveWordIndex(0);
      if (utteranceRef.current) synthRef.current?.speak(utteranceRef.current);
    }
  };

  const toggleMute = () => {
    if (hasDbAudio && audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = seekPercent * duration;

    if (hasDbAudio && audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const remain = s % 60;
    return `${m}:${remain < 10 ? '0' : ''}${remain}`;
  };

  return (
    <div className={`news-video-preview-overlay ${isTheater ? 'theater-mode' : ''}`}>
      <div 
        className="news-video-player"
        style={{
          '--theme-accent': vfxTheme.accentColor || '#8b5cf6',
          '--theme-secondary': vfxTheme.secondaryColor || '#ec4899',
        }}
      >
        {/* Header */}
        <div className="video-header">
          <div className="header-meta">
            <div className="db-ready-tag">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>DB STREAM • INSTANT PREVIEW</span>
            </div>
            <h3 title={article.title}>{article.title}</h3>
          </div>
          <div className="header-actions">
            <button 
              className="theater-toggle-btn"
              onClick={() => setIsTheater(!isTheater)} 
              title={isTheater ? "Normal View" : "Theater View"}
            >
              {isTheater ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
            <button 
              className="close-video-btn" 
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                synthRef.current?.cancel();
                onClose();
              }}
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dynamic Video Stage / VFX Area */}
        <div 
          className={`video-content-area vfx-${currentScene?.vfxType || 'cinematic-zoom'} ${isPlaying ? 'is-playing' : ''}`}
          style={{ background: vfxTheme.bgGradient || undefined }}
        >
          {/* Animated Background Layers */}
          <div className="dynamic-bg-layer"></div>
          <div className={`particles-layer particles-${vfxTheme.particlesStyle || 'cyber-sparks'}`}></div>
          <div className="cyber-grid-overlay"></div>
          <div className="scanlines-fx"></div>

          {/* Top HUD Badges */}
          <div className="video-ui-overlay">
            <div className="hud-left">
              <span className="live-badge">AI BROADCAST</span>
              <span className="game-badge">{article.game || 'Esports'}</span>
            </div>
            <div className="hud-right">
              <span className="scene-indicator-badge">
                <Sparkles size={12} /> {currentScene?.badge || 'SCENE'}
              </span>
            </div>
          </div>

          {/* Scene Headline & Cinematic VFX Content */}
          <div className="scene-stage-container">
            <div className="scene-headline-card">
              <div className="scene-kicker">
                {vfxTheme.overlayTag || 'BREAKING INTEL'}
              </div>
              <h2 className="scene-title">
                {currentScene?.headline || article.title}
              </h2>
              {currentScene?.contentSnippet && (
                <p className="scene-snippet">
                  {currentScene.contentSnippet}
                </p>
              )}

              {/* Dynamic Key Focus Badges */}
              {currentScene?.highlightKeywords && currentScene.highlightKeywords.length > 0 && (
                <div className="scene-keyword-tags">
                  {currentScene.highlightKeywords.map((kw, i) => (
                    <span key={i} className="kw-badge">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Audio Visualizer Waves (Reacting to stored DB frequencies) */}
          <div className="visualizer-container">
            {waveformBars.slice(0, 24).map((height, barIndex) => {
              const animatedHeight = isPlaying 
                ? Math.min(100, Math.max(15, (height * (0.4 + 0.6 * Math.sin((currentTime * 8) + barIndex)))))
                : 12;
              return (
                <div 
                  key={barIndex} 
                  className="visualizer-bar"
                  style={{
                    height: `${animatedHeight}%`,
                    animationDelay: `${(barIndex * 0.05)}s`
                  }}
                />
              );
            })}
          </div>

          {/* Synchronized Subtitle Display */}
          <div className="subtitle-display">
            <p className="subtitle-text">
              {subtitles.length > 0 ? (
                subtitles.map((sub, index) => {
                  const isActive = index === activeWordIndex;
                  const isRead = index < activeWordIndex;
                  return (
                    <span 
                      key={index} 
                      className={`subtitle-word ${isActive ? 'active-word' : ''} ${isRead ? 'read-word' : ''}`}
                    >
                      {sub.word}{' '}
                    </span>
                  );
                })
              ) : (
                <span className="subtitle-word active-word">{article.summary}</span>
              )}
            </p>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="video-controls">
          {/* Interactive Scrubber Bar */}
          <div 
            className="progress-container" 
            onClick={handleSeek}
            title="Click to seek"
          >
            <div className="progress-bg"></div>
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}>
              <div className="scrubber-head"></div>
            </div>
          </div>

          <div className="controls-row">
            <div className="controls-left">
              <button className="ctrl-btn" onClick={restartVideo} title="Restart (0s)">
                <RotateCcw size={16} />
              </button>
              <button 
                className="play-pause-btn" 
                onClick={togglePlayPause} 
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
              </button>
              <div className="time-display">
                <span className="current-time">{formatTime(currentTime)}</span>
                <span className="time-divider">/</span>
                <span className="total-time">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="controls-center">
              <span className="vfx-engine-label">
                <span className="pulse-dot"></span>
                Instant DB Stream • {vfxTheme.themeName?.toUpperCase() || 'VFX HYPER'}
              </span>
            </div>

            <div className="controls-right">
              {hasDbAudio && (
                <button className="ctrl-btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                  {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsVideoPreview;
