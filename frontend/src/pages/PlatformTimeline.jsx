import React, { useState, useEffect } from 'react';
import { History, Milestone, Image, Award, Trophy } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './PlatformTimeline.css';

const PlatformTimeline = () => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/milestones`);
      if (res.ok) setMilestones(await res.json());
    } catch (err) {
      console.error('Failed to fetch milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5 mt-5"><p className="text-secondary text-sm">Loading Platform Timeline...</p></div>;
  }

  return (
    <div className="platform-timeline-page container py-4 mt-4">
      <div className="mb-4">
        <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Milestone className="text-primary" size={32} /> Platform Milestones & Media Gallery
        </h1>
        <p className="section-subtitle">Celebrating historical esports milestones, record prize pools, and tournament highlights.</p>
      </div>

      {/* Timeline List */}
      <div className="timeline-wrapper flex-col gap-4 mb-5" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
        {milestones.map((m, idx) => (
          <div key={m.id || idx} className="timeline-item glass-panel p-4" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="badge badge-primary text-xs">{m.date}</span>
              <Trophy size={18} className="text-warning" />
            </div>
            <h3 className="text-white font-bold text-md mb-1">{m.title}</h3>
            <p className="text-secondary text-xs m-0">{m.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformTimeline;
