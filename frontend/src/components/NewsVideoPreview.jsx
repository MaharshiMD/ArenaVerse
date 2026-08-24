import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import './NewsVideoPreview.css';

const NewsVideoPreview = ({ article, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const synth = window.speechSynthesis;
  const utteranceRef = useRef(null);
  const animationRef = useRef(null);
  const [speechDuration, setSpeechDuration] = useState(10);
  
  // Extract words for the animation
  const summaryText = `Here is a summary of: ${article.title}. ${article.summary}`;
  const words = summaryText.split(/\s+/);
  
  useEffect(() => {
    // Initialize speech utterance
    const utterance = new SpeechSynthesisUtterance(summaryText);
    
    // Try to get a premium English voice
    const voices = synth.getVoices();
    const preferredVoices = [
      'Microsoft Zira',
      'Microsoft David',
      'Google UK English Female',
      'Google UK English Male',
      'Google US English',
      'en-US',
      'en-GB'
    ];
    
    let selectedVoice = null;
    for (let pref of preferredVoices) {
      const match = voices.find(v => v.name.includes(pref) || v.lang === pref);
      if (match) {
        selectedVoice = match;
        break;
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 0.95; // Slightly slower for better pacing
    utterance.pitch = 1.05; // Slightly higher pitch for energy

    utterance.onstart = () => {
      setIsPlaying(true);
      setCurrentWordIndex(0);
      setSpeechDuration(summaryText.length / 15);
      startAnimation();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        // Calculate which word we are on based on char index
        const charIndex = event.charIndex;
        let charCount = 0;
        let wordIdx = 0;
        for (let i = 0; i < words.length; i++) {
          charCount += words[i].length + 1; // +1 for space
          if (charCount > charIndex) {
            wordIdx = i;
            break;
          }
        }
        setCurrentWordIndex(wordIdx);
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
      setCurrentWordIndex(words.length);
      cancelAnimationFrame(animationRef.current);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    };

    utteranceRef.current = utterance;

    // Start playing automatically
    synth.cancel(); // Clear queue
    synth.speak(utterance);

    return () => {
      synth.cancel();
      cancelAnimationFrame(animationRef.current);
    };
  }, [article, synth]);

  const startAnimation = () => {
    const startTime = Date.now();
    
    const updateProgress = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const percent = Math.min((elapsed / speechDuration) * 100, 100);
      
      setProgress(percent);
      
      if (percent < 100 && synth.speaking && !synth.paused) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    };
    
    animationRef.current = requestAnimationFrame(updateProgress);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      synth.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    } else {
      if (synth.paused) {
        synth.resume();
        setIsPlaying(true);
        startAnimation();
      } else {
        // If ended, restart
        synth.cancel();
        setProgress(0);
        synth.speak(utteranceRef.current);
      }
    }
  };

  const restartVideo = () => {
    synth.cancel();
    setProgress(0);
    setCurrentWordIndex(-1);
    setIsPlaying(false);
    cancelAnimationFrame(animationRef.current);
    
    setTimeout(() => {
      synth.speak(utteranceRef.current);
    }, 100);
  };

  return (
    <div className="news-video-preview-overlay">
      <div className="news-video-player">
        <div className="video-header">
          <h3>AI Video Preview: {article.title}</h3>
          <button className="close-video-btn" onClick={() => { synth.cancel(); onClose(); }}>
            <X size={18} />
          </button>
        </div>

        <div className={`video-content-area ${isPlaying ? 'is-playing' : ''}`}>
          {/* Animated Background Elements */}
          <div className="dynamic-bg-layer"></div>
          <div className="particles-layer"></div>
          
          <div className="video-ui-overlay">
            <span className="live-badge">PREVIEW</span>
            <span className="game-badge">{article.game || 'Esports'}</span>
          </div>

          <div className="visualizer-container">
            {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
              <div key={bar} className="visualizer-bar"></div>
            ))}
          </div>
          
          <div className="subtitle-display">
            <p className="subtitle-text">
              {words.map((word, index) => (
                <span 
                  key={index} 
                  className={`subtitle-word ${index === currentWordIndex ? 'active-word' : ''} ${index < currentWordIndex ? 'read-word' : ''}`}
                >
                  {word}{' '}
                </span>
              ))}
            </p>
          </div>
        </div>

        <div className="video-controls">
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="controls-row">
            <button className="restart-btn" onClick={restartVideo} title="Restart">
              <RotateCcw size={18} />
            </button>
            <button className="play-pause-btn" onClick={togglePlayPause}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsVideoPreview;
