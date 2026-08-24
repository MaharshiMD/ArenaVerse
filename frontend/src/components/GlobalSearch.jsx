import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trophy } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './GlobalSearch.css';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    const timer = setTimeout(async () => {
      try {
        let res;
        if (trimmed.startsWith('@')) {
          // Player Search mode
          const searchVal = trimmed.slice(1).trim();
          res = await fetch(`${API_BASE_URL}/api/auth/search-players?q=${encodeURIComponent(searchVal)}`);
        } else {
          // Tournament Search mode
          res = await fetch(`${API_BASE_URL}/api/tournaments?name=${encodeURIComponent(trimmed)}`);
        }

        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Global search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (item, isPlayer) => {
    setQuery('');
    setIsOpen(false);
    if (isPlayer) {
      navigate(`/players/${item.username}`);
    } else {
      navigate(`/tournaments/${item._id}`);
    }
  };

  const isPlayerSearch = query.trim().startsWith('@');

  return (
    <div className="global-search-container" ref={searchRef}>
      <div className="global-search-input-wrapper">
        <Search className="global-search-icon" size={16} />
        <input
          type="text"
          className="global-search-control"
          placeholder="Search tournaments or @players..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
        />
        {loading && (
          <div className="global-search-spinner-wrapper">
            <div className="global-search-spinner"></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="global-search-dropdown glass-panel">
          {loading ? (
            <div className="global-search-loading-text">
              Searching {isPlayerSearch ? 'players' : 'tournaments'}...
            </div>
          ) : results.length > 0 ? (
            <div className="global-search-results-list">
              {results.map((item) => {
                if (isPlayerSearch) {
                  const avatar = item.profile?.avatar || '/images/default-avatar.png';
                  return (
                    <div
                      key={item._id}
                      className="global-search-item"
                      onClick={() => handleSelectResult(item, true)}
                    >
                      <img src={avatar} alt={item.username} className="global-search-avatar" />
                      <div className="global-search-info">
                        <span className="global-search-name">@{item.username}</span>
                        <span className="global-search-sub text-muted">Role: {item.role}</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={item._id}
                      className="global-search-item"
                      onClick={() => handleSelectResult(item, false)}
                    >
                      <div className="global-search-trophy-icon-wrapper">
                        <Trophy className="global-search-trophy-icon" size={16} />
                      </div>
                      <div className="global-search-info">
                        <span className="global-search-name">{item.name}</span>
                        <span className="global-search-sub text-muted">
                          Game: {item.game} | Status: {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="global-search-empty-text">
              {isPlayerSearch ? 'No players found.' : 'No tournaments found.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
