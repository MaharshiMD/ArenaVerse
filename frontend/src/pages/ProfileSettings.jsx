import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './Dashboard.css';

const DEFAULT_AVATAR = '/images/default-avatar.png';

const PREDEFINED_GAMES = [
  'Counter-Strike 2',
  'VALORANT',
  'Call of Duty: Black Ops 7',
  'Call of Duty: Warzone',
  'Overwatch 2',
  'Rainbow Six Siege',
  'Crossfire',
  'PUBG: Battlegrounds',
  'PUBG Mobile',
  'Battlegrounds Mobile India (BGMI)',
  'Free Fire MAX',
  'Fortnite',
  'Apex Legends',
  'League of Legends',
  'Dota 2',
  'Mobile Legends: Bang Bang',
  'Honor of Kings',
  'EA Sports FC 26',
  'eFootball',
  'Rocket League',
  'Trackmania',
  'Gran Turismo 7',
  'Tekken 8',
  'Street Fighter 6',
  'Fatal Fury: City of the Wolves',
  'Mortal Kombat 1',
  'Teamfight Tactics',
  'Pokémon UNITE',
  'Brawl Stars',
  'Clash Royale',
  'Clash of Clans',
  'Hearthstone',
  'Chess'
];

const ProfileSettings = () => {
  const { user, getAuthHeader, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Profile update form states
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [favoriteGames, setFavoriteGames] = useState([]);
  const [discord, setDiscord] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  
  const [gameSearch, setGameSearch] = useState('');
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.profile?.bio || '');
      setAvatar(user.profile?.avatar || '');
      setFavoriteGames(user.profile?.favoriteGames || []);
      setDiscord(user.profile?.socialLinks?.discord || '');
      setTwitter(user.profile?.socialLinks?.twitter || '');
      setInstagram(user.profile?.socialLinks?.instagram || '');
    }
  }, [user]);

  // Debounced username checking excluding self
  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameStatus('');
      setUsernameMessage('');
      return;
    }

    if (username.length < 3) {
      setUsernameStatus('short');
      setUsernameMessage('Username must be at least 3 characters long');
      return;
    }

    if (username.length > 20) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username cannot exceed 20 characters');
      return;
    }

    const regex = /^[a-zA-Z0-9_.-]+$/;
    if (!regex.test(username)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Alphanumeric, dots, hyphens, and underscores only');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-username?username=${encodeURIComponent(username)}&excludeUserId=${user.id || user._id}`);
        const data = await res.json();
        if (res.ok) {
          if (data.available) {
            setUsernameStatus('available');
            setUsernameMessage('✓ Username available');
          } else {
            setUsernameStatus('taken');
            setUsernameMessage('✗ Username already taken');
          }
        } else {
          setUsernameStatus('invalid');
          setUsernameMessage(data.message || 'Error checking availability');
        }
      } catch (err) {
        setUsernameStatus('invalid');
        setUsernameMessage('Could not connect to server to verify username');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [username, user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddGame = (game) => {
    if (!favoriteGames.includes(game)) {
      setFavoriteGames([...favoriteGames, game]);
    }
    setGameSearch('');
    setShowGameDropdown(false);
  };

  const handleRemoveGame = (gameToRemove) => {
    setFavoriteGames(favoriteGames.filter(g => g !== gameToRemove));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (usernameStatus && usernameStatus !== 'available') {
      setError('Please choose a valid and available username first.');
      return;
    }
    setProfileSuccess('');
    setError('');
    setLoading(true);
    try {
      await updateProfile({
        username,
        bio,
        avatar,
        favoriteGames,
        socialLinks: { discord, twitter, instagram }
      });
      setProfileSuccess('Profile saved successfully!');
    } catch (err) {
      setError(err.message || 'Profile save failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center mt-4"><p>Access Denied. Please log in.</p></div>;
  }

  return (
    <div className="player-dashboard-page container py-4 mt-4">
      <div className="glass-panel">
        <h3>Player Card Settings</h3>
        <p className="text-secondary text-xs mt-1">
          Customize your competitive card. This data is displayed publicly in brackets and player search.
        </p>
        
        {profileSuccess && <p className="success-text mt-3">{profileSuccess}</p>}
        {error && <p className="error-text mt-3">{error}</p>}

        <form onSubmit={handleUpdateProfile} className="mt-4 form-grid-two">
          {/* Profile Photo Upload */}
          <div className="form-group">
            <label className="form-label">Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="player-avatar-large" style={{ width: '60px', height: '60px', flexShrink: 0, margin: 0 }}>
                <img src={avatar || DEFAULT_AVATAR} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="form-control" 
                  style={{ padding: '6px' }}
                />
              </div>
            </div>
          </div>

          {/* Edit Username */}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="gamer_tag" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            {usernameMessage && (
              <small className={usernameStatus === 'available' ? 'success-text' : 'error-text'} style={{ display: 'block', marginTop: '5px' }}>
                {usernameMessage}
              </small>
            )}
          </div>

          {/* Searchable Favorite Games Multi-Select */}
          <div className="form-group">
            <label className="form-label">Favorite Games</label>
            <div className="game-select-dropdown-container" style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search and select games..." 
                value={gameSearch}
                onChange={e => {
                  setGameSearch(e.target.value);
                  setShowGameDropdown(true);
                }}
                onFocus={() => setShowGameDropdown(true)}
                onBlur={() => setTimeout(() => setShowGameDropdown(false), 200)}
              />
              {showGameDropdown && (
                <div className="dropdown-menu-custom glass-panel" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  backgroundColor: 'rgba(20, 20, 25, 0.98)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  marginTop: '5px'
                }}>
                  {PREDEFINED_GAMES
                    .filter(game => game.toLowerCase().includes(gameSearch.toLowerCase()) && !favoriteGames.includes(game))
                    .map(game => (
                      <div 
                        key={game} 
                        className="dropdown-item-custom" 
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        onMouseDown={() => handleAddGame(game)}
                      >
                        {game}
                      </div>
                    ))
                  }
                  {PREDEFINED_GAMES.filter(game => game.toLowerCase().includes(gameSearch.toLowerCase()) && !favoriteGames.includes(game)).length === 0 && (
                    <div style={{ padding: '8px 12px', color: 'rgba(255, 255, 255, 0.5)' }}>No matching games found</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="favorite-games-chips flex flex-wrap gap-1 mt-2">
              {favoriteGames.map(game => (
                <span key={game} className="badge badge-secondary flex items-center gap-1 text-xs" style={{ display: 'inline-flex', padding: '4px 8px', margin: '2px 2px 0 0' }}>
                  {game}
                  <button 
                    type="button" 
                    className="chip-remove-btn" 
                    style={{ background: 'none', border: 'none', color: '#ff4d4d', marginLeft: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: 0, lineHeight: 1 }}
                    onClick={() => handleRemoveGame(game)}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Discord Tag</label>
            <input type="text" className="form-control" placeholder="gamer#1234" value={discord} onChange={e => setDiscord(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">X Handle / Profile Link</label>
            <input type="text" className="form-control" placeholder="@gamer or link" value={twitter} onChange={e => setTwitter(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Instagram Username / Link</label>
            <input type="text" className="form-control" placeholder="@gamer or link" value={instagram} onChange={e => setInstagram(e.target.value)} />
          </div>

          <div className="form-group w-full">
            <label className="form-label">About Me (Bio)</label>
            <textarea rows="4" className="form-control" placeholder="Pro FPS player looking for active teams." value={bio} onChange={e => setBio(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
