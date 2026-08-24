import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, AlertTriangle, Send, X } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './DisputeModal.css';

const DisputeModal = ({ isOpen, onClose, tournamentId, matchId, defaultReportedUser }) => {
  const { user, getAuthHeader } = useAuth();
  const [category, setCategory] = useState('Cheating');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || submitting) return;

    if (!description.trim()) {
      setError('Please provide details describing the violation or dispute.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          tournamentId,
          matchId,
          reportedUserId: defaultReportedUser?._id || defaultReportedUser || null,
          category,
          description: description.trim(),
          evidenceUrl: evidenceUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit report');

      setSuccess('Dispute report submitted successfully. Tournament Organizers and Admins have been notified.');
      setTimeout(() => {
        onClose();
        setSuccess('');
        setDescription('');
        setEvidenceUrl('');
      }, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content dispute-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header dispute-modal-header">
          <div className="flex items-center gap-2">
            <ShieldAlert size={22} className="text-danger" />
            <h3 className="m-0">File Dispute & Incident Report</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && <p className="error-text mb-3 p-2 rounded bg-danger-light">{error}</p>}
          {success && <p className="success-text mb-3 p-2 rounded bg-success-light">{success}</p>}

          <div className="form-group mb-3">
            <label className="form-label">Violation Category</label>
            <select 
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Cheating">🚨 Cheating / Hacking / Exploiting</option>
              <option value="Toxic behavior">🤬 Toxic Behavior / Harassment</option>
              <option value="Fake scores">📊 Fake / Incorrect Match Scores</option>
              <option value="Rule violations">📜 Rule Violations / Roster Bypassing</option>
              <option value="Other">⚠️ Other Issue</option>
            </select>
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Dispute Details & Description</label>
            <textarea 
              rows="4" 
              className="form-control" 
              placeholder="Describe what happened, match round, offending player, or rule breached..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Evidence URL / Screenshot Link (Optional)</label>
            <input 
              type="url" 
              className="form-control" 
              placeholder="https://imgur.com/screenshot.png or Twitch/YouTube clip link"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              <Send size={16} /> <span>{submitting ? 'Submitting...' : 'File Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default DisputeModal;
