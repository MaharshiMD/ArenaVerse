const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');

// @desc    Get admin panel statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalTeams = await Team.countDocuments({});
    const totalTournaments = await Tournament.countDocuments({});
    const totalMatches = await Match.countDocuments({});

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    const teams = await Team.find({}).populate('captain', 'username').sort({ createdAt: -1 });
    const tournaments = await Tournament.find({}).populate('organizer', 'username').sort({ createdAt: -1 });

    res.json({
      stats: {
        totalUsers,
        totalTeams,
        totalTournaments,
        totalMatches,
      },
      users,
      teams,
      tournaments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete an administrator account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role (Admin only)
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin only)
const updateUserRole = async (req, res) => {
  const { role } = req.body;
  try {
    if (!['player', 'organizer', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    userToUpdate.role = role;
    await userToUpdate.save();
    res.json({ message: `User role updated to ${role}`, user: userToUpdate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete tournament (Admin master override)
// @route   DELETE /api/admin/tournaments/:id
// @access  Private (Admin only)
const deleteTournamentAdmin = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    await Match.deleteMany({ tournament: tournament._id });
    await Bracket.findOneAndDelete({ tournament: tournament._id });
    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tournament deleted by Admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete team (Admin master override)
// @route   DELETE /api/admin/teams/:id
// @access  Private (Admin only)
const deleteTeamAdmin = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Team deleted by Admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status (Suspend, Ban, Reactivate)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
const updateUserStatus = async (req, res) => {
  const { status, reason } = req.body;
  try {
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active, suspended, or banned.' });
    }

    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToUpdate.role === 'admin') {
      return res.status(400).json({ message: 'Cannot modify administrator status' });
    }

    userToUpdate.status = status;
    userToUpdate.suspensionReason = reason ? reason.trim() : '';
    await userToUpdate.save();

    // Send notification to user
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: userToUpdate._id,
      sender: req.user._id,
      type: 'organizer_announcement',
      title: `Account Status Notice: ${status.toUpperCase()}`,
      message: status === 'active' 
        ? 'Your account has been reactivated by an administrator.' 
        : `Your account has been ${status}. Reason: ${userToUpdate.suspensionReason || 'Violation of terms.'}`,
      link: '/profile',
      io: req.io,
    });

    res.json({ message: `User account status updated to ${status}`, user: userToUpdate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reported tournament disputes/issues (Admin only)
// @route   GET /api/admin/reports
// @access  Private (Admin only)
const getAdminReports = async (req, res) => {
  try {
    const TournamentReview = require('../models/TournamentReview');
    const reports = await TournamentReview.find({ hasIssueReport: true })
      .populate('tournament', 'name game status')
      .populate('organizer', 'username email')
      .populate('player', 'username email profile.avatar')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resolve reported dispute (Admin only)
// @route   PUT /api/admin/reports/:id/resolve
// @access  Private (Admin only)
const resolveDisputeAdmin = async (req, res) => {
  try {
    const TournamentReview = require('../models/TournamentReview');
    const review = await TournamentReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Reported issue not found' });
    }

    review.hasIssueReport = false;
    await review.save();

    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: review.player,
      sender: req.user._id,
      type: 'organizer_announcement',
      title: '✅ Dispute Resolved by Admin',
      message: 'Your reported tournament dispute has been reviewed and resolved by platform administration.',
      link: `/tournaments/${review.tournament}`,
      io: req.io,
    });

    res.json({ message: 'Dispute marked as resolved by Admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete inappropriate review (Admin only)
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin only)
const deleteReviewAdmin = async (req, res) => {
  try {
    const TournamentReview = require('../models/TournamentReview');
    const review = await TournamentReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await TournamentReview.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inappropriate review deleted by Admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all organizer verification applications (Admin only)
// @route   GET /api/admin/verifications
// @access  Private (Admin only)
const getVerificationsAdmin = async (req, res) => {
  try {
    const organizers = await User.find({ verificationStatus: { $in: ['pending', 'approved', 'rejected'] } })
      .select('username email role status isVerifiedOrganizer verificationStatus verificationRequest createdAt')
      .sort({ 'verificationRequest.appliedAt': -1 });

    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Review & Approve/Reject Organizer Verification (Admin only)
// @route   PUT /api/admin/verifications/:userId/review
// @access  Private (Admin only)
const reviewVerificationAdmin = async (req, res) => {
  try {
    const { status, adminNote } = req.body; // status: 'approved' or 'rejected'
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (status === 'approved') {
      user.isVerifiedOrganizer = true;
      user.verificationStatus = 'approved';
    } else {
      user.isVerifiedOrganizer = false;
      user.verificationStatus = 'rejected';
    }

    if (user.verificationRequest) {
      user.verificationRequest.adminNote = adminNote || '';
    }

    await user.save();

    // Notify Organizer
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: user._id,
      sender: req.user._id,
      type: 'organizer_announcement',
      title: status === 'approved' ? '💙 Verified Organizer Badge Granted!' : '⚠️ Verification Application Status Updated',
      message: status === 'approved' 
        ? 'Congratulations! Your organizer verification request has been approved by ArenaVerse Administration. You now carry the Verified Organizer badge.' 
        : `Your organizer verification application was reviewed: ${adminNote || 'Declined at this time.'}`,
      link: '/organizer-dashboard',
      io: req.io,
    });

    res.json({
      message: `Organizer verification successfully set to ${status.toUpperCase()}`,
      user: {
        id: user._id,
        username: user.username,
        isVerifiedOrganizer: user.isVerifiedOrganizer,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin reset user 2FA (Recovery)
// @route   POST /api/admin/users/:id/reset-2fa
// @access  Private (Admin only)
const resetUser2FA = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.twoFactorEnabled = false;
    await user.save();

    const TwoFactorChallenge = require('../models/TwoFactorChallenge');
    await TwoFactorChallenge.deleteMany({ user: user._id });

    res.json({ message: `2FA successfully reset and disabled for user @${user.username}`, twoFactorEnabled: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get escalated complaints for Admin review
// @route   GET /api/admin/escalated-complaints
// @access  Private (Admin only)
const getEscalatedComplaints = async (req, res) => {
  try {
    const Complaint = require('../models/Complaint');
    const complaints = await Complaint.find({ status: 'escalated' })
      .populate('reporter', 'username email')
      .populate('reportedUser', 'username email status')
      .populate('assignedModerator', 'username email')
      .sort({ updatedAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resolve escalated complaint (Admin final ruling)
// @route   PATCH /api/admin/escalated-complaints/:id
// @access  Private (Admin only)
const resolveEscalatedComplaint = async (req, res) => {
  try {
    const Complaint = require('../models/Complaint');
    const { status, adminNotes, resolutionAction } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (status) complaint.status = status;
    if (adminNotes !== undefined) complaint.adminNotes = adminNotes;
    if (resolutionAction) complaint.resolutionAction = resolutionAction;

    await complaint.save();
    res.json({ message: 'Escalated complaint resolved by Admin', complaint });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminStats,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  deleteTournamentAdmin,
  deleteTeamAdmin,
  getAdminReports,
  resolveDisputeAdmin,
  deleteReviewAdmin,
  getVerificationsAdmin,
  reviewVerificationAdmin,
  resetUser2FA,
  getEscalatedComplaints,
  resolveEscalatedComplaint,
};
