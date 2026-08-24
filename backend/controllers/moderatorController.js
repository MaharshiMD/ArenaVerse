const Complaint = require('../models/Complaint');
const Warning = require('../models/Warning');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const crypto = require('crypto');

// @desc    Get Moderator Dashboard Overview Stats
// @route   GET /api/moderator/stats
// @access  Private (Moderator/Admin)
const getModeratorStats = async (req, res) => {
  try {
    const pendingComplaints = await Complaint.countDocuments({ status: { $in: ['pending', 'investigating'] } });
    const totalWarnings = await Warning.countDocuments();
    const activeTempBans = await User.countDocuments({ 'temporaryBan.isBanned': true, 'temporaryBan.bannedUntil': { $gt: new Date() } });
    const totalTeams = await Team.countDocuments();
    const escalatedComplaints = await Complaint.countDocuments({ status: 'escalated' });

    res.json({
      pendingComplaints,
      totalWarnings,
      activeTempBans,
      totalTeams,
      escalatedComplaints,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get list of complaints / reports
// @route   GET /api/moderator/complaints
// @access  Private (Moderator/Admin)
const getComplaints = async (req, res) => {
  try {
    const { status, type, priority } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate('reporter', 'username email avatar role')
      .populate('reportedUser', 'username email role status warningsCount temporaryBan')
      .populate('reportedTeam', 'name tag logo')
      .populate('reportedTournament', 'title game format')
      .populate('assignedModerator', 'username email')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new complaint (Players/Organizers can submit, Moderators can test)
// @route   POST /api/moderator/complaints
// @access  Private
const createComplaint = async (req, res) => {
  try {
    const { reportedUser, reportedTeam, reportedTournament, type, priority, title, description, evidenceUrls } = req.body;
    const ticketId = `TKT-${crypto.randomInt(100000, 999999)}`;

    const complaint = await Complaint.create({
      ticketId,
      reporter: req.user._id,
      reportedUser: reportedUser || null,
      reportedTeam: reportedTeam || null,
      reportedTournament: reportedTournament || null,
      type: type || 'other',
      priority: priority || 'medium',
      title,
      description,
      evidenceUrls: evidenceUrls || [],
    });

    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update complaint status & resolution
// @route   PATCH /api/moderator/complaints/:id
// @access  Private (Moderator/Admin)
const updateComplaint = async (req, res) => {
  try {
    const { status, moderatorNotes, resolutionAction, adminNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint ticket not found' });
    }

    if (status) complaint.status = status;
    if (moderatorNotes !== undefined) complaint.moderatorNotes = moderatorNotes;
    if (resolutionAction) complaint.resolutionAction = resolutionAction;
    if (adminNotes !== undefined) complaint.adminNotes = adminNotes;
    complaint.assignedModerator = req.user._id;

    await complaint.save();
    const updated = await Complaint.findById(complaint._id)
      .populate('reporter', 'username email')
      .populate('reportedUser', 'username email')
      .populate('assignedModerator', 'username email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Issue rule warning to user
// @route   POST /api/moderator/warnings
// @access  Private (Moderator/Admin)
const issueWarning = async (req, res) => {
  try {
    const { userId, category, reason, complaintId } = req.body;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const warning = await Warning.create({
      user: userId,
      issuedBy: req.user._id,
      category: category || 'rule_violation',
      reason,
      complaintRef: complaintId || null,
    });

    // Increment warnings count on user
    targetUser.warningsCount = (targetUser.warningsCount || 0) + 1;
    await targetUser.save();

    if (complaintId) {
      await Complaint.findByIdAndUpdate(complaintId, {
        status: 'resolved',
        resolutionAction: 'warning_issued',
        assignedModerator: req.user._id,
        moderatorNotes: `Warning issued to user. Reason: ${reason}`,
      });
    }

    res.status(201).json({ message: 'Warning issued successfully', warning, warningsCount: targetUser.warningsCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Apply temporary ban to user
// @route   POST /api/moderator/temp-ban
// @access  Private (Moderator/Admin)
const applyTempBan = async (req, res) => {
  try {
    const { userId, durationDays, reason, complaintId } = req.body;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const days = parseInt(durationDays, 10) || 1;
    const bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    targetUser.temporaryBan = {
      isBanned: true,
      bannedUntil,
      banReason: reason,
      bannedBy: req.user._id,
    };
    targetUser.status = 'suspended';
    targetUser.suspensionReason = `Temporary Ban (${days} days): ${reason}`;
    await targetUser.save();

    if (complaintId) {
      await Complaint.findByIdAndUpdate(complaintId, {
        status: 'resolved',
        resolutionAction: 'temporary_ban',
        assignedModerator: req.user._id,
        moderatorNotes: `Applied ${days}-day temporary ban. Reason: ${reason}`,
      });
    }

    res.json({ message: `Temporary ban applied for ${days} days`, user: targetUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lift temporary ban from user
// @route   POST /api/moderator/lift-ban/:userId
// @access  Private (Moderator/Admin)
const liftTempBan = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    targetUser.temporaryBan = {
      isBanned: false,
      bannedUntil: null,
      banReason: '',
      bannedBy: null,
    };
    targetUser.status = 'active';
    targetUser.suspensionReason = '';
    await targetUser.save();

    res.json({ message: 'Temporary ban lifted successfully', user: targetUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Teams for Moderation
// @route   GET /api/moderator/teams
// @access  Private (Moderator/Admin)
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('captain', 'username email')
      .populate('members.user', 'username email role')
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from team (Staff override)
// @route   DELETE /api/moderator/teams/:teamId/members/:userId
// @access  Private (Moderator/Admin)
const removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    team.members = team.members.filter((m) => m.user.toString() !== userId);
    await team.save();

    res.json({ message: 'Team member removed by moderator', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send Staff Broadcast Announcement
// @route   POST /api/moderator/broadcast
// @access  Private (Moderator/Admin)
const sendBroadcast = async (req, res) => {
  try {
    const { title, message, targetRole } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required for broadcast' });
    }

    // Return broadcast confirmation payload
    res.status(200).json({
      message: 'Moderator staff announcement broadcasted successfully.',
      broadcast: {
        title,
        content: message,
        targetRole: targetRole || 'all',
        sender: req.user.username,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getModeratorStats,
  getComplaints,
  createComplaint,
  updateComplaint,
  issueWarning,
  applyTempBan,
  liftTempBan,
  getTeams,
  removeTeamMember,
  sendBroadcast,
};
