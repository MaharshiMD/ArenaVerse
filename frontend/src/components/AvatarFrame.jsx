import React from 'react';
import './AvatarFrame.css';

const AvatarFrame = ({ src, alt, size = 48, frame = 'Default', onError, className = '' }) => {
  const getFrameClass = () => {
    if (!frame || frame === 'Default') return 'frame-default';
    const lower = frame.toLowerCase();
    if (lower.includes('flame') || lower.includes('void')) return 'frame-void-flame';
    if (lower.includes('neon') || lower.includes('cyber')) return 'frame-cyber-neon';
    if (lower.includes('gold') || lower.includes('legend')) return 'frame-gold-border';
    return 'frame-custom';
  };

  const frameClass = getFrameClass();

  return (
    <div className={`avatar-frame-container ${frameClass} ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <img
        src={src || '/images/default-avatar.png'}
        alt={alt || 'User Avatar'}
        className="avatar-frame-img"
        onError={(e) => {
          if (onError) onError(e);
          else {
            e.target.onerror = null;
            e.target.src = '/images/default-avatar.png';
          }
        }}
      />
      {frameClass === 'frame-void-flame' && <span className="flame-particle-effect">🔥</span>}
    </div>
  );
};

export default AvatarFrame;
