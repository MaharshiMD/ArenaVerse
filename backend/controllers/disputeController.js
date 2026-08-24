const DisputeReport = require('../models/DisputeReport');
const Tournament = require('../models/Tournament');
const User = require('../models/User');

// @desc    Submit a new dispute or rule violation report
// @route   POST /api/disputes
// @access  Private (Logged-in Competitors)
const createDispute = async (req, res) => {
  const { tournamentId, matchId, reportedUserId, category, description, evidenceUrl } = req.body;

  try {
    if (!tournamentId || !category || !description) {
      return res.status(400).json({ message: 'Tournament ID, category, and description are required' });
    }

    const validCategories = ['Cheating', 'Toxic behavior', 'Fake scores', 'Rule violations', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid report category' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const report = await DisputeReport.create({
      tournament: tournament._id,
      match: matchId || null,
      reportedBy: req.user._id,
      reportedUser: reportedUserId || null,
      category,
      description: description.trim(),
      evidenceUrl: evidenceUrl ? evidenceUrl.trim() : '',
    });

    const populatedReport = await DisputeReport.findById(report._id)
      .populate('tournament', 'name game status')
      .populate('reportedBy', 'username profile.avatar role')
      .populate('reportedUser', 'username profile.avatar role');

    // Notify Organizer and Admin
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: tournament.organizer,
      sender: req.user._id,
      type: 'organizer_announcement',
      title: `🚨 Dispute Reported: ${category}`,
      message: `@${req.user.username} filed a ${category} report in "${tournament.name}": "${description.trim()}"`,
      link: `/tournaments/${tournament._id}`,
      io: req.io,
    });

    // Emit live Socket.io event
    if (req.io) {
      req.io.to(`tournament_${tournament._id.toString()}`).emit('dispute_created', populatedReport);
    }

    res.status(201).json({
      message: 'Dispute report submitted successfully. Organizer & Admin have been notified.',
      report: populatedReport,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get disputes for a specific tournament
// @route   GET /api/disputes/tournament/:tournamentId
// @access  Private
const getTournamentDisputes = async (req, res) => {
  try {
    const disputes = await DisputeReport.find({ tournament: req.params.tournamentId })
      .populate('reportedBy', 'username profile.avatar role')
      .populate('reportedUser', 'username profile.avatar role')
      .populate('resolvedBy', 'username role')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all disputes (Admin / Organizers)
// @route   GET /api/disputes/all
// @access  Private (Admin / Organizer)
const getAllDisputes = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'organizer') {
      const myTournaments = await Tournament.find({ organizer: req.user._id }).select('_id');
      const tournamentIds = myTournaments.map(t => t._id);
      query = { tournament: { $in: tournamentIds } };
    }

    const disputes = await DisputeReport.find(query)
      .populate('tournament', 'name game status organizer')
      .populate('reportedBy', 'username profile.avatar role')
      .populate('reportedUser', 'username profile.avatar role')
      .populate('resolvedBy', 'username role')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resolve or update dispute status (Organizer / Admin)
// @route   PUT /api/disputes/:id/resolve
// @access  Private (Organizer / Admin)
const resolveDispute = async (req, res) => {
  const { status, resolutionNote } = req.body;

  try {
    const validStatuses = ['pending', 'under_review', 'resolved', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const report = await DisputeReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Dispute report not found' });
    }

    const tournament = await Tournament.findById(report.tournament);
    if (
      req.user.role !== 'admin' &&
      (!tournament || tournament.organizer.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized to resolve disputes for this tournament' });
    }

    report.status = status;
    report.resolutionNote = resolutionNote ? resolutionNote.trim() : 'Resolved by tournament authority.';
    report.resolvedBy = req.user._id;
    await report.save();

    const populatedReport = await DisputeReport.findById(report._id)
      .populate('tournament', 'name game status')
      .populate('reportedBy', 'username profile.avatar role')
      .populate('reportedUser', 'username profile.avatar role')
      .populate('resolvedBy', 'username role');

    // Send notification to reporting player
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: report.reportedBy,
      sender: req.user._id,
      type: 'organizer_announcement',
      title: `✅ Dispute ${status.toUpperCase()}: ${report.category}`,
      message: `Your ${report.category} report has been updated to "${status.toUpperCase()}". Note: ${report.resolutionNote}`,
      link: `/tournaments/${report.tournament}`,
      io: req.io,
    });

    res.json({
      message: `Dispute report successfully marked as ${status.toUpperCase()}`,
      report: populatedReport,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDispute,
  getTournamentDisputes,
  getAllDisputes,
  resolveDispute,
};
