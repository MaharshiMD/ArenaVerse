const ChatMessage = require('../models/ChatMessage');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');

// Helper to verify if user can access/participate in tournament chat
const isAuthorizedParticipant = async (user, tournament) => {
  if (!user || !tournament) return false;
  const userIdStr = user._id.toString();

  // Admin or Organizer
  if (user.role === 'admin') return true;
  if (tournament.organizer.toString() === userIdStr) return true;

  // Solo participant check
  if (tournament.type === 'solo') {
    return (tournament.registeredPlayers || []).some(id => id.toString() === userIdStr);
  }

  // Team participant check
  if (tournament.registeredTeams && tournament.registeredTeams.length > 0) {
    const registeredTeamDocs = await Team.find({ _id: { $in: tournament.registeredTeams } });
    return registeredTeamDocs.some(team => team.members.some(mId => mId.toString() === userIdStr));
  }

  return false;
};

// @desc    Get chat messages and pinned message for a tournament
// @route   GET /api/tournaments/:id/chat
// @access  Private (Registered Participants / Organizer / Admin)
const getTournamentChat = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const canAccess = await isAuthorizedParticipant(req.user, tournament);
    if (!canAccess) {
      return res.status(403).json({
        message: 'Only registered participants and organizers can access this tournament chat room.',
        canChat: false,
      });
    }

    const messages = await ChatMessage.find({ tournament: tournament._id })
      .populate('sender', 'username profile.avatar role')
      .sort({ createdAt: 1 })
      .limit(100);

    const pinnedMessage = messages.find(m => m.isPinned) || await ChatMessage.findOne({ tournament: tournament._id, isPinned: true }).populate('sender', 'username profile.avatar role');

    res.json({
      messages,
      pinnedMessage: pinnedMessage || null,
      canChat: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a chat message to tournament chat room
// @route   POST /api/tournaments/:id/chat
// @access  Private (Registered Participants / Organizer / Admin)
const sendChatMessage = async (req, res) => {
  const { text } = req.body;

  try {
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const canAccess = await isAuthorizedParticipant(req.user, tournament);
    if (!canAccess) {
      return res.status(403).json({ message: 'Only registered participants can chat in this tournament room' });
    }

    const message = await ChatMessage.create({
      tournament: tournament._id,
      sender: req.user._id,
      text: text.trim(),
    });

    const populatedMessage = await ChatMessage.findById(message._id).populate('sender', 'username profile.avatar role');

    // Emit live Socket.io event to tournament room
    if (req.io) {
      req.io.to(`tournament_${tournament._id.toString()}`).emit('chat_message', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pin a chat message (Organizer/Admin only)
// @route   PUT /api/tournaments/:id/chat/:messageId/pin
// @access  Private (Organizer/Admin only)
const pinChatMessage = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Authorization check
    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Only the organizer can pin messages' });
    }

    // Unpin all previous pinned messages for this tournament
    await ChatMessage.updateMany(
      { tournament: tournament._id, isPinned: true },
      { $set: { isPinned: false, pinnedAt: null } }
    );

    const message = await ChatMessage.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.isPinned = true;
    message.pinnedAt = new Date();
    await message.save();

    const populatedMessage = await ChatMessage.findById(message._id).populate('sender', 'username profile.avatar role');

    // Emit live Socket.io event for pinned message
    if (req.io) {
      req.io.to(`tournament_${tournament._id.toString()}`).emit('chat_pinned', populatedMessage);
    }

    res.json({ message: 'Message pinned successfully', pinnedMessage: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unpin chat message (Organizer/Admin only)
// @route   PUT /api/tournaments/:id/chat/:messageId/unpin
// @access  Private (Organizer/Admin only)
const unpinChatMessage = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Only the organizer can unpin messages' });
    }

    await ChatMessage.updateMany(
      { tournament: tournament._id, isPinned: true },
      { $set: { isPinned: false, pinnedAt: null } }
    );

    if (req.io) {
      req.io.to(`tournament_${tournament._id.toString()}`).emit('chat_pinned', null);
    }

    res.json({ message: 'Pinned message removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTournamentChat,
  sendChatMessage,
  pinChatMessage,
  unpinChatMessage,
};
