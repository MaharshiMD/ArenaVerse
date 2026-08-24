import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Star, MessageSquare, AlertTriangle, Send, CheckCircle2, Shield } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './TournamentReviews.css';

const TournamentReviews = ({ tournamentId, organizerId, isRegistered, tournamentStatus }) => {
  const { user, getAuthHeader } = useAuth();
  const socket = useSocket();

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [issueReportsCount, setIssueReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form States
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [hasIssueReport, setHasIssueReport] = useState(false);
  const [reportedIssueText, setReportedIssueText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const fetchReviews = async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/reviews`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 5.0);
      setTotalReviews(data.totalReviews || 0);
      setIssueReportsCount(data.issueReportsCount || 0);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [tournamentId]);

  // Handle Socket.io real-time review updates
  useEffect(() => {
    if (!socket || !tournamentId) return;

    socket.emit('join_tournament', tournamentId);

    const handleNewReview = (newRev) => {
      setReviews(prev => [newRev, ...prev.filter(r => r._id !== newRev._id)]);
      fetchReviews();
    };

    socket.on('review_added', handleNewReview);

    return () => {
      socket.off('review_added', handleNewReview);
    };
  }, [socket, tournamentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || submitting) return;

    setSubmitting(true);
    setSubmitMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          rating,
          review: reviewText.trim(),
          hasIssueReport,
          reportedIssue: hasIssueReport ? reportedIssueText.trim() : '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      setSubmitMsg('Review submitted successfully!');
      fetchReviews();
    } catch (err) {
      setSubmitMsg(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const DEFAULT_AVATAR = '/images/default-avatar.png';

  return (
    <div className="tournament-reviews-container flex-col gap-4">
      {/* Rating Summary Header Card */}
      <div className="glass-panel rating-summary-card">
        <div className="rating-score-box">
          <div className="star-rating-big">
            <span className="big-rating-number">{averageRating}</span>
            <div className="stars-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  size={20} 
                  className={star <= Math.round(averageRating) ? 'star-filled' : 'star-empty'} 
                />
              ))}
            </div>
            <span className="total-reviews-count">{totalReviews} Competitor Reviews</span>
          </div>
        </div>

        {issueReportsCount > 0 && (
          <div className="issue-reports-badge">
            <AlertTriangle size={16} /> {issueReportsCount} Reported Issues Flagged
          </div>
        )}
      </div>

      {/* Review Submission Form for Registered Participants */}
      {isRegistered && (
        <div className="glass-panel submit-review-box">
          <h4><MessageSquare size={18} className="text-primary" /> Leave Tournament Feedback & Review</h4>
          
          <form onSubmit={handleSubmit} className="mt-3">
            {/* Interactive Star Selector */}
            <div className="form-group mb-3">
              <label className="form-label">Rate Your Experience</label>
              <div className="interactive-stars-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    type="button" 
                    key={star} 
                    className={`star-select-btn ${star <= rating ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                ))}
                <span className="rating-label-text">{rating} / 5 Stars</span>
              </div>
            </div>

            {/* Review Input */}
            <div className="form-group mb-3">
              <label className="form-label">Your Review & Feedback</label>
              <textarea 
                rows="3" 
                className="form-control" 
                placeholder="Share your thoughts on tournament organization, lobby timing, rules..." 
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>

            {/* Report Issue Checkbox */}
            <div className="form-group mb-3">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={hasIssueReport} 
                  onChange={(e) => setHasIssueReport(e.target.checked)} 
                />
                <span className="text-warning font-semibold text-xs">⚠️ Report an Issue / Unfair Dispute to Organizer</span>
              </label>

              {hasIssueReport && (
                <textarea 
                  rows="2" 
                  className="form-control mt-2 text-xs" 
                  placeholder="Describe the rule breach, no-show, or organization dispute..." 
                  value={reportedIssueText}
                  onChange={(e) => setReportedIssueText(e.target.value)}
                  required
                />
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={16} /> <span>{submitting ? 'Submitting...' : 'Submit Review'}</span>
            </button>

            {submitMsg && (
              <p className={`mt-2 text-xs ${submitMsg.startsWith('Error') ? 'error-text' : 'success-text'}`}>
                {submitMsg}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Reviews Feed List */}
      <div className="glass-panel">
        <h4>Competitor Reviews</h4>
        {loading ? (
          <p className="text-muted text-center py-4">Loading tournament reviews...</p>
        ) : reviews.length > 0 ? (
          <div className="reviews-feed mt-3">
            {reviews.map((rev) => (
              <div key={rev._id} className="review-card-item">
                <div className="review-header-row">
                  <div className="review-user-info">
                    <img 
                      src={rev.player?.profile?.avatar || DEFAULT_AVATAR} 
                      alt={rev.player?.username} 
                      className="review-avatar" 
                    />
                    <div>
                      <strong className="review-username">@{rev.player?.username || 'Competitor'}</strong>
                      <div className="review-stars-small">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= rev.rating ? 'star-gold' : 'star-muted'}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <span className="review-date text-muted text-xs">
                    {new Date(rev.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {rev.review && <p className="review-text mt-2">{rev.review}</p>}

                {rev.hasIssueReport && (
                  <div className="reported-issue-alert mt-2">
                    <AlertTriangle size={14} /> <strong>Reported Issue:</strong> {rev.reportedIssue}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-center py-4">No reviews submitted yet.</p>
        )}
      </div>
    </div>
  );
};

export default TournamentReviews;
