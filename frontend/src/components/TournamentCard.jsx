import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Coins, Users, Award, IndianRupee } from 'lucide-react';
import './TournamentCard.css';

const TournamentCard = ({ tournament }) => {
  const { _id, name, game, banner, startDate, entryFee, prizePool, type, status } = tournament;

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  const defaultBanner = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600';

  return (
    <div className="tournament-card glass-panel">
      <div className="card-banner-wrapper">
        <img 
          src={banner || defaultBanner} 
          alt={name} 
          className="card-banner"
          onError={(e) => { e.target.src = defaultBanner; }}
        />
        <div className="card-badge-container">
          <span className={`badge badge-${status}`}>{status}</span>
          <span className={`badge badge-${type}`}>{type}</span>
        </div>
      </div>

      <div className="card-content">
        <span className="card-game">{game}</span>
        <h3 className="card-title" title={name}>{name}</h3>

        <div className="card-meta-list">
          <div className="card-meta-item">
            <Calendar size={16} />
            <span>{formatDate(startDate)}</span>
          </div>

          <div className="card-meta-row">
            <div className="card-meta-item">
              <Award size={16} className="icon-award" />
              <span>Pool: <strong>₹{prizePool}</strong></span>
            </div>
            <div className="card-meta-item">
              <IndianRupee size={16} className="icon-fee" />
              <span>Fee: <strong>{entryFee === 0 ? 'Free' : `₹${entryFee}`}</strong></span>
            </div>
          </div>
        </div>

        <div className="card-action">
          <Link to={`/tournaments/${_id}`} className="btn btn-primary btn-full">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TournamentCard;
