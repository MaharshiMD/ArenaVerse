import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Send, X, Building, Link as LinkIcon, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './VerificationModal.css';

const VerificationModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, getAuthHeader } = useAuth();
  const [organizationName, setOrganizationName] = useState(user?.username || '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [governmentIdUrl, setGovernmentIdUrl] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || submitting) return;

    if (!organizationName.trim()) {
      setError('Please provide your Organization or Host Brand Name.');
      return;
    }

    if (!reason.trim()) {
      setError('Please describe your tournament hosting experience.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verification-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          websiteUrl: websiteUrl.trim(),
          governmentIdUrl: governmentIdUrl.trim(),
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit application');

      alert('Organizer verification application submitted successfully! Admin review is pending.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content verification-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header verification-modal-header">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-primary" />
            <h3 className="m-0">Apply for Verified Organizer Badge</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && <p className="error-text mb-3 p-2 rounded bg-danger-light">{error}</p>}

          <p className="text-secondary text-xs mb-4">
            Verified organizers carry a blue checkmark badge, gaining higher visibility and player trust across ArenaVerse.
          </p>

          <div className="form-group mb-3">
            <label className="form-label">Organization / Host Brand Name</label>
            <div className="input-icon-wrapper">
              <input 
                type="text" 
                className="form-control"
                placeholder="e.g. Apex Esports India or ESL Gaming"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Website / Portfolio / Social Media URL (Optional)</label>
            <input 
              type="url" 
              className="form-control"
              placeholder="https://apexesports.com or https://twitter.com/apexesports"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Proof of ID / License URL (Optional)</label>
            <input 
              type="url" 
              className="form-control"
              placeholder="Link to Company Registration document or ID proof"
              value={governmentIdUrl}
              onChange={(e) => setGovernmentIdUrl(e.target.value)}
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Tournament Hosting Experience & Details</label>
            <textarea 
              rows="3" 
              className="form-control" 
              placeholder="Tell us about tournaments you have hosted, community size, or gaming leagues..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={16} /> <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default VerificationModal;
