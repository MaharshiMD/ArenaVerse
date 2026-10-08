import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  CheckCircle2,
  Mic,
  ChevronDown,
  Check,
  Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './NewsVideoPreview.css';

const AVAILABLE_HUMAN_VOICES = [
  { id: 'en-US-ChristopherNeural', key: 'christopher', name: 'Christopher', label: 'Christopher (Studio Shoutcaster)', gender: 'Male', style: 'Energetic Esports Shoutcaster' },
  { id: 'en-US-JennyNeural', key: 'jenny', name: 'Jenny', label: 'Jenny (Broadcast Host)', gender: 'Female', style: 'Expressive Broadcast Anchor' },
  { id: 'en-US-GuyNeural', key: 'guy', name: 'Guy', label: 'Guy (News Anchor)', gender: 'Male', style: 'Authoritative Pro News Anchor' },
  { id: 'en-US-AvaNeural', key: 'ava', name: 'Ava', label: 'Ava (Lively Host)', gender: 'Female', style: 'Vibrant Modern Gaming Streamer' },
  { id: 'en-US-AndrewNeural', key: 'andrew', name: 'Andrew', label: 'Andrew (Tournament Narrator)', gender: 'Male', style: 'Deep Narrative Tournament Storyteller' },
];

/**
 * Filter and select natural, human-sounding voices from browser Web Speech API
 */
const selectNaturalHumanVoice = (synth) => {
  if (!synth) return null;
  const voices = synth.getVoices ? synth.getVoices() : [];
  if (!voices || voices.length === 0) return null;

  // Filter for natural/online voices, avoiding robotic desktop voices
  const naturalVoices = voices.filter(v => 
    v.lang.startsWith('en') && (
      v.name.includes('Natural') || 
      v.name.includes('Online') || 
      v.name.includes('Neural') || 
      v.name.includes('Google') || 
      v.name.includes('Samantha') || 
      v.name.includes('Daniel')
    ) && !v.name.includes('Desktop')
  );

  if (naturalVoices.length > 0) {
    const preferred = naturalVoices.find(v => 
      v.name.includes('Christopher') || 
      v.name.includes('Guy') || 
      v.name.includes('Jenny') || 
      v.name.includes('Google US')
    );
    return preferred || naturalVoices[0];
  }

  // Fallback to non-desktop English voice
  return voices.find(v => v.lang.startsWith('en') && !v.name.includes('Desktop')) || voices[0] || null;
};

const NewsVideoPreview = ({ article, onClose, onArticleUpdate }) => {
  const [videoData, setVideoData] = useState(article.videoPreview || {});
  const [isSwitchingVoice, setIsSwitchingVoice] = useState(false);
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const voiceMenuRef = useRef(null);

  // Sync internal state if article prop changes externally
  useEffect(() => {
    if (article?.videoPreview) {
      setVideoData(article.videoPreview);
    }
  }, [article]);

  const hasDbAudio = !!videoData.audioUrl;
  const currentVoice = videoData.voice || AVAILABLE_HUMAN_VOICES[0];
  const activeVoiceName = currentVoice.name || 'Christopher';

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
  const activeWordElemRef = useRef(null);
  const subtitleBoxRef = useRef(null);

  // Close voice dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target)) {
        setVoiceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-index subtitles with stable global indices
  const indexedSubtitles = useMemo(() => {
    return subtitles.map((sub, idx) => ({
      ...sub,
      globalIdx: idx
    }));
  }, [subtitles]);

  // Active Scene based on currentTime
  const currentScene = scenes.find(s => currentTime >= s.timeStart && currentTime <= s.timeEnd) || scenes[0];

  // Synchronize audio playback timestamp to active subtitle word
  const syncTimeToWord = (time) => {
    setCurrentTime(time);
    if (!indexedSubtitles || indexedSubtitles.length === 0) return;

    let activeIdx = -1;
    for (let i = 0; i < indexedSubtitles.length; i++) {
      if (time >= indexedSubtitles[i].startTime && time < indexedSubtitles[i].endTime) {
        activeIdx = i;
        break;
      }
    }

    if (activeIdx === -1) {
      for (let i = indexedSubtitles.length - 1; i >= 0; i--) {
        if (time >= indexedSubtitles[i].startTime) {
          activeIdx = i;
          break;
        }
      }
    }

    if (activeIdx !== -1) {
      setActiveWordIndex(activeIdx);
    }
  };

  // Initialize playback immediately from DB audio or speech fallback
  useEffect(() => {
    if (hasDbAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

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
        setCurrentTime(audio.duration || duration);
        setActiveWordIndex(indexedSubtitles.length > 0 ? indexedSubtitles.length - 1 : 0);
      };

      audio.ontimeupdate = () => {
        syncTimeToWord(audio.currentTime);
      };

      audio.play().catch(() => {
        setIsPlaying(false);
      });

      return () => {
        audio.pause();
        audio.src = '';
      };
    } else {
      // Natural human voice speech synthesis fallback
      const text = `ArenaVerse Flash Report: ${article.title}. ${article.summary}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const humanVoice = selectNaturalHumanVoice(synthRef.current);
      if (humanVoice) {
        utterance.voice = humanVoice;
      }

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
  }, [videoData.audioUrl, hasDbAudio]);

  // Smooth scroll active word into view within the subtitle box
  useEffect(() => {
    if (activeWordElemRef.current && subtitleBoxRef.current) {
      const container = subtitleBoxRef.current;
      const word = activeWordElemRef.current;
      const wordTop = word.offsetTop;
      const containerHeight = container.clientHeight;

      container.scrollTo({
        top: Math.max(0, wordTop - containerHeight / 2 + 16),
        behavior: 'smooth'
      });
    }
  }, [activeWordIndex]);

  // High-precision 60FPS animation loop for UI sync
  useEffect(() => {
    const updateLoop = () => {
      if (hasDbAudio && audioRef.current && !audioRef.current.paused) {
        syncTimeToWord(audioRef.current.currentTime);
      } else if (!hasDbAudio && isPlaying) {
        setCurrentTime(prev => {
          const next = prev + 0.05;
          syncTimeToWord(next);
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
  }, [isPlaying, hasDbAudio, indexedSubtitles, duration]);

  // Switch voice caster handler
  const handleSwitchVoice = async (voiceObj) => {
    if (currentVoice.id === voiceObj.id || isSwitchingVoice) {
      setVoiceMenuOpen(false);
      return;
    }

    setIsSwitchingVoice(true);
    setVoiceMenuOpen(false);

    if (audioRef.current) {
      audioRef.current.pause();
    }
    synthRef.current?.cancel();
    setIsPlaying(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/esports-news/${article._id}/regenerate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voice: voiceObj.id })
      });

      const data = await res.json();
      if (res.ok && data.videoPreview) {
        setVideoData(data.videoPreview);
        setDuration(data.videoPreview.duration || 12);
        setCurrentTime(0);
        setActiveWordIndex(0);

        if (onArticleUpdate) {
          onArticleUpdate({
            ...article,
            videoPreview: data.videoPreview
          });
        }
      }
    } catch (err) {
      console.error('Failed to switch voice caster:', err);
    } finally {
      setIsSwitchingVoice(false);
    }
  };

  const togglePlayPause = () => {
    if (hasDbAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (currentTime >= duration - 0.2) {
          audioRef.current.currentTime = 0;
          syncTimeToWord(0);
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
          syncTimeToWord(0);
          synthRef.current?.cancel();
          if (utteranceRef.current) synthRef.current?.speak(utteranceRef.current);
        }
      }
    }
  };

  const restartVideo = () => {
    if (hasDbAudio && audioRef.current) {
      audioRef.current.currentTime = 0;
      syncTimeToWord(0);
      audioRef.current.play().catch(console.error);
    } else {
      synthRef.current?.cancel();
      syncTimeToWord(0);
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
    syncTimeToWord(targetTime);
  };

  const handleWordClick = (targetTime) => {
    if (hasDbAudio && audioRef.current) {
      audioRef.current.currentTime = targetTime;
      if (!isPlaying) audioRef.current.play().catch(console.error);
    }
    syncTimeToWord(targetTime);
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
              <span>STUDIO HUMAN VOICE • 100% SYNCED SUBTITLES</span>
            </div>
            <h3 title={article.title}>{article.title}</h3>
          </div>

          <div className="header-actions">
            {/* Voice Caster Switcher */}
            <div className="voice-selector-wrapper" ref={voiceMenuRef}>
              <button 
                type="button"
                className={`voice-selector-btn ${voiceMenuOpen ? 'active' : ''}`}
                onClick={() => setVoiceMenuOpen(!voiceMenuOpen)}
                disabled={isSwitchingVoice}
                title="Change Human Voice Caster"
              >
                <Mic size={14} className="text-purple-400" />
                <span className="voice-name-label">
                  Voice: <strong>{activeVoiceName}</strong>
                </span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {voiceMenuOpen && (
                <div className="voice-dropdown-menu">
                  <div className="voice-dropdown-header">
                    <span className="dropdown-title">Select Studio Caster</span>
                    <span className="dropdown-subtitle">Powered by Neural Human Audio</span>
                  </div>
                  <div className="voice-list">
                    {AVAILABLE_HUMAN_VOICES.map((v) => {
                      const isSelected = (currentVoice.id === v.id) || (currentVoice.name === v.name);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          className={`voice-option-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSwitchVoice(v)}
                        >
                          <div className="voice-option-info">
                            <div className="voice-option-name">
                              <span>{v.name}</span>
                              <span className="voice-gender-pill">{v.gender}</span>
                            </div>
                            <span className="voice-option-style">{v.style}</span>
                          </div>
                          {isSelected && <Check size={16} className="text-emerald-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
          {/* Switching Voice Loading Overlay */}
          {isSwitchingVoice && (
            <div className="voice-switching-overlay">
              <Loader2 className="animate-spin text-purple-400 mb-2" size={38} />
              <h4>Generating Real Human Voice...</h4>
              <p>Re-synthesizing studio narration with precision-synced subtitles</p>
            </div>
          )}

          {/* Animated Background Layers */}
          <div className="dynamic-bg-layer"></div>
          <div className={`particles-layer particles-${vfxTheme.particlesStyle || 'cyber-sparks'}`}></div>
          <div className="cyber-grid-overlay"></div>
          <div className="scanlines-fx"></div>

          {/* Top HUD Badges */}
          <div className="video-ui-overlay">
            <div className="hud-left">
              <span className="live-badge">STUDIO BROADCAST</span>
              <span className="voice-hud-badge">
                <Mic size={11} /> {activeVoiceName.toUpperCase()} (HUMAN VOICE)
              </span>
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

          {/* Dynamic Audio Visualizer Waves */}
          <div className="visualizer-container">
            {waveformBars.slice(0, 24).map((height, barIndex) => {
              const animatedHeight = isPlaying 
                ? Math.min(100, Math.max(15, (height * (0.35 + 0.65 * Math.sin((currentTime * 9) + barIndex)))))
                : 12;
              return (
                <div 
                  key={barIndex} 
                  className="visualizer-bar"
                  style={{
                    height: `${animatedHeight}%`,
                    animationDelay: `${(barIndex * 0.04)}s`
                  }}
                />
              );
            })}
          </div>

          {/* Precision Synchronized Subtitle Display */}
          <div className="subtitle-display" ref={subtitleBoxRef}>
            <p className="subtitle-text">
              {indexedSubtitles.length > 0 ? (
                indexedSubtitles.map((wordItem) => {
                  const isActive = wordItem.globalIdx === activeWordIndex;
                  const isRead = wordItem.globalIdx < activeWordIndex;

                  return (
                    <span 
                      key={`${wordItem.word}-${wordItem.globalIdx}`} 
                      ref={isActive ? activeWordElemRef : null}
                      className={`subtitle-word ${isActive ? 'active-word' : ''} ${isRead ? 'read-word' : 'upcoming-word'}`}
                      onClick={() => handleWordClick(wordItem.startTime)}
                      title={`Jump to ${wordItem.startTime}s`}
                    >
                      {wordItem.word}{' '}
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
            title="Click to seek anywhere"
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
                🎙️ Narrator: {activeVoiceName} • Studio Human Voice
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
