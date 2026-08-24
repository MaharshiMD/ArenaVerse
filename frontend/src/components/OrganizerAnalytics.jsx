import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, TrendingUp, Users, DollarSign, Trophy, Award, 
  PieChart, Calendar, CheckCircle2, ShieldCheck, Flame, Layers 
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './OrganizerAnalytics.css';

const OrganizerAnalytics = () => {
  const { getAuthHeader } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/organizer-analytics`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        throw new Error('Failed to load analytics data');
      }
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err) {
      setError(err.message || 'Error fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel text-center py-5">
        <p className="text-secondary text-sm">Aggregating organizer analytics and real-time MongoDB stats...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel text-center py-5">
        <p className="error-text">{error || 'Could not load organizer analytics.'}</p>
        <button onClick={fetchAnalytics} className="btn btn-secondary btn-sm mt-3">Retry</button>
      </div>
    );
  }

  const { overview, registrationsChart, revenueChart, tournamentPopularity, playerGrowth, paymentStats, gamePopularity, monthlyTournaments, prizeDistribution } = data;

  // Max calculations for bar percentages
  const maxRegCount = Math.max(...registrationsChart.map(r => r.registeredCount), 1);
  const maxRevenue = Math.max(...revenueChart.map(r => r.revenue), 1);
  const maxMonthlyCount = Math.max(...monthlyTournaments.map(m => m.count), 1);
  const maxGameReg = Math.max(...gamePopularity.map(g => g.registrations), 1);

  return (
    <div className="organizer-analytics-container">
      {/* Overview Stat Cards */}
      <div className="analytics-overview-grid">
        <div className="analytics-card glass-panel">
          <div className="card-icon blue"><Trophy size={20} /></div>
          <div>
            <span className="card-label">Total Tournaments</span>
            <h3>{overview.totalTournaments}</h3>
          </div>
        </div>

        <div className="analytics-card glass-panel">
          <div className="card-icon green"><Users size={20} /></div>
          <div>
            <span className="card-label">Total Registrations</span>
            <h3>{overview.totalRegistrations}</h3>
          </div>
        </div>

        <div className="analytics-card glass-panel">
          <div className="card-icon purple"><DollarSign size={20} /></div>
          <div>
            <span className="card-label">Total Revenue</span>
            <h3>₹{overview.totalRevenue.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="analytics-card glass-panel">
          <div className="card-icon gold"><Award size={20} /></div>
          <div>
            <span className="card-label">Prize Pool Offered</span>
            <h3>₹{overview.totalPrizePool.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Charts Grid */}
      <div className="analytics-charts-grid mt-4">
        
        {/* Chart 1: Tournament Registrations */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><Users size={18} className="text-primary" /> Tournament Registrations</h4>
            <span className="chart-badge">Live Capacity</span>
          </div>
          <div className="bars-list mt-3">
            {registrationsChart.length > 0 ? (
              registrationsChart.slice(0, 6).map((item) => (
                <div key={item.id} className="bar-row">
                  <div className="bar-label-group">
                    <span className="bar-title">{item.name}</span>
                    <span className="bar-value">{item.registeredCount} / {item.maxTeams} ({item.percentageFull}%)</span>
                  </div>
                  <div className="bar-track">
                    <div 
                      className="bar-fill primary-fill" 
                      style={{ width: `${Math.max(5, item.percentageFull)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm py-3 text-center">No registrations recorded yet.</p>
            )}
          </div>
        </div>

        {/* Chart 2: Revenue Statistics */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><DollarSign size={18} className="text-success" /> Revenue Generation (₹)</h4>
            <span className="chart-badge green">Entry Fees</span>
          </div>
          <div className="bars-list mt-3">
            {revenueChart.length > 0 ? (
              revenueChart.slice(0, 6).map((item) => {
                const fillPct = Math.round((item.revenue / maxRevenue) * 100);
                return (
                  <div key={item.id} className="bar-row">
                    <div className="bar-label-group">
                      <span className="bar-title">{item.name}</span>
                      <span className="bar-value text-success">₹{item.revenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill success-fill" 
                        style={{ width: `${Math.max(5, fillPct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted text-sm py-3 text-center">No revenue records available.</p>
            )}
          </div>
        </div>

        {/* Chart 3: Tournament Popularity */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><Flame size={18} className="text-warning" /> Tournament Popularity (Top Ranked)</h4>
            <span className="chart-badge gold">Most Popular</span>
          </div>
          <div className="popularity-list mt-3">
            {tournamentPopularity.length > 0 ? (
              tournamentPopularity.map((t, idx) => (
                <div key={t.id} className="popularity-item">
                  <div className="rank-num">#{idx + 1}</div>
                  <div className="pop-details">
                    <strong className="pop-name">{t.name}</strong>
                    <span className="pop-game text-secondary">{t.game}</span>
                  </div>
                  <div className="pop-reg-badge">
                    <span>{t.registeredCount} Competitors</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm py-3 text-center">No popularity data found.</p>
            )}
          </div>
        </div>

        {/* Chart 4: Player Growth */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><TrendingUp size={18} className="text-info" /> Player Growth & Acquisition</h4>
            <span className="chart-badge info">+{playerGrowth.growthRate}</span>
          </div>
          <div className="growth-summary-box mt-3">
            <div className="growth-stat">
              <span className="text-muted text-xs">TOTAL SYSTEM PLAYERS</span>
              <h2>{playerGrowth.totalPlayers}</h2>
            </div>
            <div className="growth-chart-timeline mt-3">
              {playerGrowth.monthlyRegistrations && playerGrowth.monthlyRegistrations.length > 0 ? (
                playerGrowth.monthlyRegistrations.map((m, idx) => (
                  <div key={idx} className="timeline-col">
                    <div className="col-bar-wrapper">
                      <div className="col-bar" style={{ height: `${Math.min(100, (m.registrations + 1) * 20)}%` }}></div>
                    </div>
                    <span className="col-label">{m.month}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted text-sm py-2">Consistent new player registration flow</p>
              )}
            </div>
          </div>
        </div>

        {/* Chart 5: Payment Statistics */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><ShieldCheck size={18} className="text-primary" /> Payment Statistics & Gateways</h4>
            <span className="chart-badge">Gateway Volume</span>
          </div>
          <div className="payment-stats-grid mt-3">
            <div className="pay-mini-card">
              <span className="pay-label">Total Volume</span>
              <h4 className="text-success">₹{paymentStats.totalVolume.toLocaleString('en-IN')}</h4>
            </div>
            <div className="pay-mini-card">
              <span className="pay-label">Completed Payments</span>
              <h4>{paymentStats.successfulCount}</h4>
            </div>
            <div className="pay-mini-card">
              <span className="pay-label">Paid Tournaments</span>
              <h4>{paymentStats.paidTournamentsCount}</h4>
            </div>
            <div className="pay-mini-card">
              <span className="pay-label">Free Tournaments</span>
              <h4>{paymentStats.freeTournamentsCount}</h4>
            </div>
          </div>
        </div>

        {/* Chart 6: Game Popularity */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><PieChart size={18} className="text-warning" /> Game Title Popularity</h4>
            <span className="chart-badge">By Participation</span>
          </div>
          <div className="bars-list mt-3">
            {gamePopularity.length > 0 ? (
              gamePopularity.map((g) => {
                const fillPct = Math.round((g.registrations / maxGameReg) * 100);
                return (
                  <div key={g.game} className="bar-row">
                    <div className="bar-label-group">
                      <span className="bar-title">🎮 {g.game}</span>
                      <span className="bar-value">{g.registrations} Players ({g.tournamentCount} Tournaments)</span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill warning-fill" 
                        style={{ width: `${Math.max(5, fillPct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted text-sm py-3 text-center">No game statistics available.</p>
            )}
          </div>
        </div>

        {/* Chart 7: Monthly Tournaments */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><Calendar size={18} className="text-primary" /> Monthly Tournaments Hosted</h4>
            <span className="chart-badge">Activity Trend</span>
          </div>
          <div className="bars-list mt-3">
            {monthlyTournaments.length > 0 ? (
              monthlyTournaments.map((m) => {
                const fillPct = Math.round((m.count / maxMonthlyCount) * 100);
                return (
                  <div key={m.monthKey} className="bar-row">
                    <div className="bar-label-group">
                      <span className="bar-title">🗓️ {m.month}</span>
                      <span className="bar-value">{m.count} Tournaments (₹{m.prizePool.toLocaleString('en-IN')} Prize)</span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill primary-fill" 
                        style={{ width: `${Math.max(5, fillPct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted text-sm py-3 text-center">No monthly tournament data recorded.</p>
            )}
          </div>
        </div>

        {/* Chart 8: Prize Distribution */}
        <div className="chart-box glass-panel">
          <div className="chart-header">
            <h4><Award size={18} className="text-gold" /> Prize Pool Distribution</h4>
            <span className="chart-badge gold">Payout Status</span>
          </div>
          <div className="prize-distribution-content mt-3">
            <div className="prize-row-box">
              <span className="text-muted text-xs">TOTAL PRIZE POOL OFFERED</span>
              <h3 className="text-gold">₹{prizeDistribution.totalOffered.toLocaleString('en-IN')}</h3>
            </div>
            <div className="prize-split-meter mt-3">
              <div 
                className="prize-awarded-segment"
                style={{ width: `${prizeDistribution.totalOffered > 0 ? Math.min(100, Math.round((prizeDistribution.totalAwarded / prizeDistribution.totalOffered) * 100)) : 100}%` }}
                title="Awarded Prizes"
              ></div>
            </div>
            <div className="prize-legend-grid mt-3">
              <div>
                <span className="legend-dot awarded"></span>
                <span className="text-xs text-secondary">Awarded (Completed): </span>
                <strong>₹{prizeDistribution.totalAwarded.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="legend-dot pending"></span>
                <span className="text-xs text-secondary">Active / Pending: </span>
                <strong>₹{prizeDistribution.pendingDistribution.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrganizerAnalytics;
