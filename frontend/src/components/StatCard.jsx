import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, icon: Icon, description }) => {
  return (
    <div className="stat-card glass-panel">
      <div className="stat-card-header">
        <div>
          <p className="stat-title">{title}</p>
          <h3 className="stat-value">{value}</h3>
        </div>
        <div className="stat-icon-wrapper">
          {Icon && <Icon className="stat-icon" size={24} />}
        </div>
      </div>
      {description && <p className="stat-desc">{description}</p>}
    </div>
  );
};

export default StatCard;
