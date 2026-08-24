const TeamChatMessage = require('../models/TeamChatMessage');
const Team = require('../models/Team');

// Helper to verify if user is a member/captain/admin of the team
const isTeamMember = (user, team) => {
  if (!user || !team) return false;
  if (user.role === 'admin') return true;
  const userIdStr = user._id.toString();
  if (team.captain && team.captain.toString() === userIdStr) return true;
  return (team.members || []).some(mId => mId.toString() === userIdStr);
};

// @desc    Get private team chat history
// @route   GET /api/teams/:id/chat
// @access  Private (Team Members Only)
const getTeamChat = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!isTeamMember(req.user, team)) {
      return res.status(403).json({ message: 'Access denied. Only team members can view private squad chat.' });
    }

    const messages = await TeamChatMessage.find({ team: team._id })
      .populate('sender', 'username profile.avatar role')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({
      messages,
      teamName: team.name,
      captainId: team.captain,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message to private team chat
// @route   POST /api/teams/:id/chat
// @access  Private (Team Members Only)
const sendTeamChatMessage = async (req, res) => {
  const { text } = req.body;

  try {
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!isTeamMember(req.user, team)) {
      return res.status(403).json({ message: 'Access denied. Only team members can send messages to squad chat.' });
    }

    const message = await TeamChatMessage.create({
      team: team._id,
      sender: req.user._id,
      text: text.trim(),
    });

    const populatedMessage = await TeamChatMessage.findById(message._id)
      .populate('sender', 'username profile.avatar role');

    // Emit live Socket.io event to team room
    if (req.io) {
      req.io.to(`team_${team._id.toString()}`).emit('team_chat_message', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTeamChat,
  sendTeamChatMessage,
};
