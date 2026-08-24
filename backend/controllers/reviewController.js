const TournamentReview = require('../models/TournamentReview');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');

// Helper to verify if user is a registered participant
const isRegisteredParticipant = async (user, tournament) => {
  if (!user || !tournament) return false;
  if (user.role === 'admin') return true;
  const userIdStr = user._id.toString();

  // Solo registration check
  if (tournament.type === 'solo') {
    return (tournament.registeredPlayers || []).some(pId => pId.toString() === userIdStr);
  }

  // Team registration check
  if (tournament.registeredTeams && tournament.registeredTeams.length > 0) {
    const registeredTeamDocs = await Team.find({ _id: { $in: tournament.registeredTeams } });
    return registeredTeamDocs.some(team => team.members.some(mId => mId.toString() === userIdStr));
  }

  return false;
};

// @desc    Submit rating, review, or issue report for a completed tournament
// @route   POST /api/tournaments/:id/reviews
// @access  Private (Registered Participants)
const submitReview = async (req, res) => {
  const { rating, review, hasIssueReport, reportedIssue } = req.body;

  try {
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5 stars' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const isParticipant = await isRegisteredParticipant(req.user, tournament);
    if (!isParticipant) {
      return res.status(403).json({ message: 'Only registered participants can review this tournament' });
    }

    // Upsert review (one review per user per tournament)
    let reviewDoc = await TournamentReview.findOne({
      tournament: tournament._id,
      player: req.user._id,
    });

    if (reviewDoc) {
      reviewDoc.rating = Number(rating);
      reviewDoc.review = review ? review.trim() : '';
      reviewDoc.hasIssueReport = Boolean(hasIssueReport);
      reviewDoc.reportedIssue = hasIssueReport && reportedIssue ? reportedIssue.trim() : '';
      await reviewDoc.save();
    } else {
      reviewDoc = await TournamentReview.create({
        tournament: tournament._id,
        organizer: tournament.organizer,
        player: req.user._id,
        rating: Number(rating),
        review: review ? review.trim() : '',
        hasIssueReport: Boolean(hasIssueReport),
        reportedIssue: hasIssueReport && reportedIssue ? reportedIssue.trim() : '',
      });
    }

    const populatedReview = await TournamentReview.findById(reviewDoc._id)
      .populate('player', 'username profile.avatar role');

    // Notify organizer if an issue is reported
    if (hasIssueReport && reportedIssue) {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification({
        recipient: tournament.organizer,
        sender: req.user._id,
        type: 'organizer_announcement',
        title: '⚠️ Tournament Issue Reported',
        message: `@${req.user.username} reported an issue in "${tournament.name}": ${reportedIssue.trim()}`,
        link: `/tournaments/${tournament._id}`,
        io: req.io,
      });
    }

    // Emit live Socket.io update event
    if (req.io) {
      req.io.to(`tournament_${tournament._id.toString()}`).emit('review_added', populatedReview);
    }

    res.status(201).json({
      message: 'Review submitted successfully',
      review: populatedReview,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews and average rating for a tournament
// @route   GET /api/tournaments/:id/reviews
// @access  Public
const getTournamentReviews = async (req, res) => {
  try {
    const reviews = await TournamentReview.find({ tournament: req.params.id })
      .populate('player', 'username profile.avatar role')
      .sort({ createdAt: -1 });

    const total = reviews.length;
    const averageRating = total > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)) : 0;
    const issueReportsCount = reviews.filter(r => r.hasIssueReport).length;

    res.json({
      reviews,
      averageRating,
      totalReviews: total,
      issueReportsCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public aggregate rating for an organizer
// @route   GET /api/tournaments/organizer/:organizerId/rating
// @access  Public
const getOrganizerRating = async (req, res) => {
  try {
    const { organizerId } = req.params;
    const reviews = await TournamentReview.find({ organizer: organizerId });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)) : 5.0;
    const issueReportsCount = reviews.filter(r => r.hasIssueReport).length;

    res.json({
      averageRating,
      totalReviews,
      issueReportsCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitReview,
  getTournamentReviews,
  getOrganizerRating,
};
