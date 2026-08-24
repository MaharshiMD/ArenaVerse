import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import TournamentCard from '../components/TournamentCard';
import { Search, Filter, Trophy, Users, Shield, Star, DollarSign, Globe, ArrowRight, RotateCcw, X, Check } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './TournamentList.css';

const PREDEFINED_GAMES = [
  'Valorant',
  'BGMI / PUBG Mobile',
  'Counter-Strike 2',
  'Apex Legends',
  'League of Legends',
  'Dota 2',
  'Fortnite',
  'Overwatch 2',
  'Call of Duty: Warzone',
  'Rocket League',
  'EA Sports FC / FIFA',
  'Free Fire',
  'Tekken 8',
  'Street Fighter 6',
  'Rainbow Six Siege',
  'Chess'
];

const REGIONS_LIST = [
  'Global',
  'Asia/India',
  'North America',
  'Europe',
  'APAC',
  'South America'
];

const TournamentList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Read initial search query from URL ?q=...
  const queryParams = new URLSearchParams(location.search);
  const initialQ = queryParams.get('q') || '';

  const [search, setSearch] = useState(initialQ);
  const [activeType, setActiveType] = useState('all'); // 'all', 'tournaments', 'players', 'teams', 'organizers'
  
  // All 8 Advanced Filters
  const [gameFilter, setGameFilter] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('all'); // 'all', 'free', 'paid'
  const [minPrizeFilter, setMinPrizeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'upcoming', 'today', 'past'
  const [organizerFilter, setOrganizerFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all'); // 'all', 'solo', 'duo', 'team'

  // Dropdown Panel Toggle & Ref
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [searchResults, setSearchResults] = useState({
    tournaments: [],
    players: [],
    teams: [],
    organizers: [],
    counts: { tournaments: 0, players: 0, teams: 0, organizers: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [displayLimit, setDisplayLimit] = useState(12);

  // Active filter count
  const activeFilterCount = [
    gameFilter !== '',
    statusFilter !== 'all',
    formatFilter !== 'all',
    feeTypeFilter !== 'all',
    dateFilter !== 'all',
    regionFilter !== 'all',
    organizerFilter.trim() !== '',
    minPrizeFilter.trim() !== ''
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setGameFilter('');
    setStatusFilter('all');
    setFormatFilter('all');
    setFeeTypeFilter('all');
    setDateFilter('all');
    setRegionFilter('all');
    setOrganizerFilter('');
    setMinPrizeFilter('');
  };

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 12);
  };

  const fetchSearchResults = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('q', search.trim());
      if (activeType !== 'all') params.append('type', activeType);
      if (gameFilter && gameFilter !== 'all') params.append('game', gameFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (feeTypeFilter && feeTypeFilter !== 'all') params.append('feeType', feeTypeFilter);
      if (regionFilter && regionFilter !== 'all') params.append('region', regionFilter);
      if (formatFilter && formatFilter !== 'all') params.append('format', formatFilter);
      if (dateFilter && dateFilter !== 'all') params.append('dateFilter', dateFilter);
      if (organizerFilter.trim()) params.append('organizer', organizerFilter.trim());
      if (minPrizeFilter.trim()) params.append('minPrize', minPrizeFilter.trim());

      const res = await fetch(`${API_BASE_URL}/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("Couldn't reach the server — check your connection and try again");
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || "Couldn't reach the server — check your connection and try again");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearchResults();
  }, [search, activeType, gameFilter, statusFilter, feeTypeFilter, regionFilter, minPrizeFilter, formatFilter, dateFilter, organizerFilter]);

  const DEFAULT_AVATAR = '/images/default-avatar.png';

  const { tournaments, players, teams, organizers, counts } = searchResults;

  return (
    <div className="tournament-list-page container">
      <div className="text-center mb-4 mt-4">
        <h1 className="section-title">Arena-Verse Discovery & Advanced Search</h1>
        <p className="section-subtitle">Find live tournaments, pro players, esports teams, and organizers across the globe.</p>
      </div>

      {/* Main Search Bar & Filters Header Inline */}
      <div className="filter-toolbar glass-panel mb-4">
        <div className="search-bar-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search tournaments, players (@username), teams, organizers, or game titles..." 
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Inline Filters Popover Button & Panel */}
        <div className="filters-container" ref={filterRef}>
          <button 
            type="button"
            className={`filters-button ${isFilterOpen ? 'active' : ''} ${activeFilterCount > 0 ? 'has-active' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            aria-expanded={isFilterOpen}
            aria-haspopup="true"
          >
            <Filter size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="filters-badge-count">{activeFilterCount}</span>
            )}
          </button>

          {/* Filters Dropdown Popover Panel */}
          {isFilterOpen && (
            <div className="filters-dropdown-panel">
              <div className="filters-panel-header">
                <h4 className="filters-panel-title">
                  <Filter size={18} className="text-primary" />
                  <span>Advanced Search Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="badge badge-ongoing text-xs" style={{ marginLeft: '6px' }}>
                      {activeFilterCount} Active
                    </span>
                  )}
                </h4>
                <button 
                  type="button" 
                  className="modal-close" 
                  onClick={() => setIsFilterOpen(false)}
                  title="Close Filters"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 2-Column Responsive Filter Controls Grid */}
              <div className="filters-panel-grid">
                {/* 1. Game Title Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Game Title</label>
                  <div className="select-wrapper">
                    <Filter className="select-icon" size={14} />
                    <select 
                      className="form-control text-xs"
                      value={gameFilter}
                      onChange={(e) => setGameFilter(e.target.value)}
                    >
                      <option value="">All Games</option>
                      {PREDEFINED_GAMES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Tournament Status Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Tournament Status</label>
                  <div className="select-wrapper">
                    <select 
                      className="form-control text-xs"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="published">Published (Upcoming)</option>
                      <option value="ongoing">Ongoing (Live)</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* 3. Tournament Format Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Format / Team Size</label>
                  <div className="select-wrapper">
                    <select 
                      className="form-control text-xs"
                      value={formatFilter}
                      onChange={(e) => setFormatFilter(e.target.value)}
                    >
                      <option value="all">All Formats</option>
                      <option value="solo">Solo (1v1)</option>
                      <option value="duo">Duo (2v2)</option>
                      <option value="team">Team Squad</option>
                    </select>
                  </div>
                </div>

                {/* 4. Entry Fee Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Entry Fee Type</label>
                  <div className="select-wrapper">
                    <select 
                      className="form-control text-xs"
                      value={feeTypeFilter}
                      onChange={(e) => setFeeTypeFilter(e.target.value)}
                    >
                      <option value="all">All Entry Fees</option>
                      <option value="free">Free Entry Only</option>
                      <option value="paid">Paid Entry Only</option>
                    </select>
                  </div>
                </div>

                {/* 5. Date Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Schedule Date</label>
                  <div className="select-wrapper">
                    <select 
                      className="form-control text-xs"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    >
                      <option value="all">All Dates</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="today">Today</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                </div>

                {/* 6. Region Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Region</label>
                  <div className="select-wrapper">
                    <Globe className="select-icon" size={14} />
                    <select 
                      className="form-control text-xs"
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                    >
                      <option value="all">All Regions</option>
                      {REGIONS_LIST.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 7. Organizer Handle Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Organizer Handle</label>
                  <div className="select-wrapper">
                    <input 
                      type="text" 
                      className="form-control text-xs"
                      placeholder="Organizer (@username)"
                      value={organizerFilter}
                      onChange={(e) => setOrganizerFilter(e.target.value)}
                    />
                  </div>
                </div>

                {/* 8. Min Prize Pool Filter */}
                <div className="filter-item-group">
                  <label className="form-label">Min Prize Pool (₹)</label>
                  <div className="select-wrapper">
                    <input 
                      type="number" 
                      min="0"
                      className="form-control text-xs"
                      placeholder="e.g. 5000"
                      value={minPrizeFilter}
                      onChange={(e) => setMinPrizeFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="filters-panel-footer">
                <button 
                  type="button" 
                  className="btn-clear-filters" 
                  onClick={handleClearFilters}
                  disabled={activeFilterCount === 0}
                  style={{ opacity: activeFilterCount === 0 ? 0.5 : 1, cursor: activeFilterCount === 0 ? 'not-allowed' : 'pointer' }}
                >
                  <RotateCcw size={14} />
                  <span>Clear All</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsFilterOpen(false)}
                >
                  <Check size={14} />
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Target Entity Tabs */}
      <div className="status-tabs-container mb-4" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={`status-tab-btn ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveType('all')}
        >
          All Categories
        </button>
        <button
          className={`status-tab-btn ${activeType === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveType('tournaments')}
        >
          🏆 Tournaments ({counts.tournaments || 0})
        </button>
        <button
          className={`status-tab-btn ${activeType === 'players' ? 'active' : ''}`}
          onClick={() => setActiveType('players')}
        >
          👤 Players ({counts.players || 0})
        </button>
        <button
          className={`status-tab-btn ${activeType === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveType('teams')}
        >
          🛡️ Teams ({counts.teams || 0})
        </button>
        <button
          className={`status-tab-btn ${activeType === 'organizers' ? 'active' : ''}`}
          onClick={() => setActiveType('organizers')}
        >
          ⭐ Organizers ({counts.organizers || 0})
        </button>
      </div>

      {loading ? (
        <div className="text-center mt-5">
          <p className="text-secondary text-sm">Searching Arena-Verse database...</p>
        </div>
      ) : error ? (
        <div className="text-center mt-5 error-text">
          <p>{error}</p>
        </div>
      ) : (
        <div className="search-results-wrapper flex-col gap-5">
          {/* Tournaments Results Section */}
          {(activeType === 'all' || activeType === 'tournaments') && (
            <div className="search-section">
              {activeType === 'all' && (
                <h3 className="section-title text-md mb-3" style={{ fontSize: '1.2rem' }}>
                  🏆 Tournaments ({tournaments.length})
                </h3>
              )}

              {tournaments.length > 0 ? (
                <>
                  <div className="grid-3">
                    {tournaments.slice(0, displayLimit).map(tournament => (
                      <TournamentCard key={tournament._id} tournament={tournament} />
                    ))}
                  </div>
                  {tournaments.length > displayLimit && (
                    <div className="text-center mt-4 mb-2">
                      <button className="btn btn-secondary" onClick={handleLoadMore} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}>
                        <span>Load More Tournaments ({tournaments.length - displayLimit} remaining)</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              ) : activeType === 'tournaments' ? (
                <div className="empty-state glass-panel text-center py-5">
                  <Trophy size={40} className="empty-icon" />
                  <h3>No Tournaments Found</h3>
                  <p>Try clearing filters or adjusting your query terms.</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Players Results Section */}
          {(activeType === 'all' || activeType === 'players') && (
            <div className="search-section mt-4">
              {activeType === 'all' && players.length > 0 && (
                <h3 className="section-title text-md mb-3" style={{ fontSize: '1.2rem' }}>
                  👤 Players ({players.length})
                </h3>
              )}

              {players.length > 0 ? (
                <div className="grid-3">
                  {players.map(p => (
                    <div key={p._id} className="player-search-card glass-panel p-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={p.profile?.avatar || DEFAULT_AVATAR} 
                          alt={p.username} 
                          className="avatar-med" 
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong className="text-white">@{p.username}</strong>
                          <span className="badge badge-player text-xs block mt-1">{p.role.toUpperCase()}</span>
                        </div>
                      </div>
                      <p className="text-secondary text-xs mt-2 line-clamp-2">{p.profile?.bio || 'Ready to compete in the arena.'}</p>
                      <Link to={`/players/${p.username}`} className="btn btn-secondary btn-sm w-full mt-3 text-xs" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <span>View Player Career</span> <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : activeType === 'players' ? (
                <div className="empty-state glass-panel text-center py-5">
                  <Users size={40} className="empty-icon" />
                  <h3>No Players Found</h3>
                  <p>No players matched your search criteria.</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Teams Results Section */}
          {(activeType === 'all' || activeType === 'teams') && (
            <div className="search-section mt-4">
              {activeType === 'all' && teams.length > 0 && (
                <h3 className="section-title text-md mb-3" style={{ fontSize: '1.2rem' }}>
                  🛡️ Squad Teams ({teams.length})
                </h3>
              )}

              {teams.length > 0 ? (
                <div className="grid-3">
                  {teams.map(t => (
                    <div key={t._id} className="team-search-card glass-panel p-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar-med flex items-center justify-center bg-primary font-bold text-white" style={{ width: '44px', height: '44px', borderRadius: '8px' }}>
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="text-white">{t.name}</strong>
                          <p className="text-secondary text-xs mt-1">Capt: @{t.captain?.username || 'Unknown'} | {t.members?.length || 0} Members</p>
                        </div>
                      </div>
                      <p className="text-secondary text-xs mt-2 line-clamp-2">{t.description || 'Esports squad team.'}</p>
                    </div>
                  ))}
                </div>
              ) : activeType === 'teams' ? (
                <div className="empty-state glass-panel text-center py-5">
                  <Shield size={40} className="empty-icon" />
                  <h3>No Teams Found</h3>
                  <p>No esports squads matched your query.</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Organizers Results Section */}
          {(activeType === 'all' || activeType === 'organizers') && (
            <div className="search-section mt-4">
              {activeType === 'all' && organizers.length > 0 && (
                <h3 className="section-title text-md mb-3" style={{ fontSize: '1.2rem' }}>
                  ⭐ Event Organizers ({organizers.length})
                </h3>
              )}

              {organizers.length > 0 ? (
                <div className="grid-3">
                  {organizers.map(org => (
                    <div key={org.id} className="organizer-search-card glass-panel p-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={org.profile?.avatar || DEFAULT_AVATAR} 
                          alt={org.username} 
                          className="avatar-med" 
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong className="text-white">@{org.username}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <Star size={14} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                            <span className="text-xs font-bold text-warning">{org.averageRating} / 5.0 ({org.totalReviews} Reviews)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-secondary text-xs mt-2">Hosted Tournaments: <strong>{org.hostedCount} Arenas</strong></p>
                    </div>
                  ))}
                </div>
              ) : activeType === 'organizers' ? (
                <div className="empty-state glass-panel text-center py-5">
                  <Star size={40} className="empty-icon" />
                  <h3>No Organizers Found</h3>
                  <p>No verified event organizers matched your search.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentList;
