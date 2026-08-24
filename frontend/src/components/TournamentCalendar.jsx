import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import './TournamentCalendar.css';

const TournamentCalendar = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments`);
      if (res.ok) {
        const data = await res.json();
        setTournaments(data.tournaments || data || []);
      }
    } catch (err) {
      console.error('Failed to load scheduler calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Calendar Days Computation
  const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(new Date(year, currentDate.getMonth(), d));
  }

  const getEventsForDay = (dateObj) => {
    if (!dateObj) return [];
    const dateStr = dateObj.toISOString().split('T')[0];
    return tournaments.filter((t) => {
      if (!t.startDate) return false;
      const tDateStr = new Date(t.startDate).toISOString().split('T')[0];
      return tDateStr === dateStr;
    });
  };

  return (
    <div className="tournament-calendar-container glass-panel p-4">
      {/* Header Bar */}
      <div className="calendar-header mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon className="text-primary" size={22} />
          <h3 className="text-white font-bold m-0">{monthName} {year} Tournament Scheduler</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="calendar-weekdays grid-7 gap-1 text-center mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
      </div>

      {/* Days Grid */}
      <div className="calendar-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={idx} className="calendar-day-cell empty"></div>;

          const events = getEventsForDay(day);
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div key={idx} className={`calendar-day-cell glass-panel ${isToday ? 'today' : ''}`} style={{ minHeight: '80px', padding: '6px', fontSize: '0.75rem' }}>
              <span className={`day-number ${isToday ? 'badge badge-primary' : 'text-white'}`}>{day.getDate()}</span>
              <div className="day-events-list flex-col gap-1 mt-1">
                {events.map(ev => (
                  <Link key={ev._id} to={`/tournaments/${ev._id}`} className="calendar-event-pill" style={{ display: 'block', background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', padding: '2px 4px', borderRadius: '4px', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    🏆 {ev.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TournamentCalendar;
