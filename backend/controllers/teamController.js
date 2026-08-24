const Team = require('../models/Team');
const crypto = require('crypto');

// Helper to generate invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private (Player role preferred, but allowed for all authenticated users)
const createTeam = async (req, res) => {
  const { name, description, logo } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const teamExists = await Team.findOne({ name: name.trim() });
    if (teamExists) {
      return res.status(400).json({ message: 'Team name is already taken' });
    }

    const inviteCode = generateInviteCode();

    const team = await Team.create({
      name: name.trim(),
      description,
      logo,
      captain: req.user._id,
      members: [req.user._id],
      inviteCode,
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join team by invite code
// @route   POST /api/teams/join
// @access  Private
const joinTeam = async (req, res) => {
  const { inviteCode } = req.body;

  try {
    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const team = await Team.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!team) {
      return res.status(404).json({ message: 'Invalid invite code. Team not found' });
    }

    if (team.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    if (team.members.length >= (team.maxMembers || 10)) {
      return res.status(400).json({ message: 'Team is already full (maximum capacity reached)' });
    }

    team.members.push(req.user._id);
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('captain', 'username email')
      .populate('members', 'username email profile');

    res.json({ message: 'Successfully joined team', team: populatedTeam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Leave team
// @route   POST /api/teams/:id/leave
// @access  Private
const leaveTeam = async (req, res) => {
  const teamId = req.params.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!team.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are not a member of this team' });
    }

    // If leaving member is the captain
    if (team.captain.toString() === req.user._id.toString()) {
      // If there are other members, delegate captain to next member
      const otherMembers = team.members.filter(
        (memberId) => memberId.toString() !== req.user._id.toString()
      );

      if (otherMembers.length > 0) {
        team.captain = otherMembers[0];
        team.members = otherMembers;
        await team.save();
      } else {
        // No other members, delete the team
        await Team.findByIdAndDelete(teamId);
        return res.json({ message: 'Captain left. Team has been disbanded.' });
      }
    } else {
      // Normal member leaving
      team.members = team.members.filter(
        (memberId) => memberId.toString() !== req.user._id.toString()
      );
      await team.save();
    }

    res.json({ message: 'Successfully left the team' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's teams
// @route   GET /api/teams/my
// @access  Private
const getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({ members: req.user._id })
      .populate('captain', 'username email')
      .populate('members', 'username email profile')
      .populate('joinRequests', 'username email profile')
      .populate('invitedPlayers', 'username email profile');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get team by ID details
// @route   GET /api/teams/:id
// @access  Private
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('captain', 'username email')
      .populate('members', 'username email profile')
      .populate('joinRequests', 'username email profile')
      .populate('invitedPlayers', 'username email profile');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search all existing teams dynamically
// @route   GET /api/teams
// @access  Private
const searchTeams = async (req, res) => {
  const { name } = req.query;
  try {
    const query = {};
    if (name) {
      query.name = { $regex: name.trim(), $options: 'i' };
    }
    const teams = await Team.find(query)
      .populate('captain', 'username email')
      .populate('members', 'username email profile');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's incoming invitations
// @route   GET /api/teams/invitations
// @access  Private
const getInvites = async (req, res) => {
  try {
    const teams = await Team.find({ invitedPlayers: req.user._id })
      .populate('captain', 'username email')
      .populate('members', 'username email profile');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request to join a team
// @route   POST /api/teams/:id/request-join
// @access  Private
const requestJoin = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.members.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    if (team.joinRequests.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You have already requested to join this team' });
    }

    if (team.members.length >= (team.maxMembers || 10)) {
      return res.status(400).json({ message: 'Team is already full (maximum capacity reached)' });
    }

    team.joinRequests.push(req.user._id);
    await team.save();

    // Trigger join_request notification for team captain
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: team.captain,
      sender: req.user._id,
      type: 'join_request',
      title: 'New Squad Join Request',
      message: `@${req.user.username} requested to join your squad "${team.name}".`,
      link: '/player-dashboard',
      io: req.io,
    });

    res.json({ message: 'Join request submitted successfully', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept/Reject join request (Captain only)
// @route   POST /api/teams/:id/requests/:userId/respond
// @access  Private
const respondToJoinRequest = async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  const { userId } = req.params;

  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Authorization check: Only captain (or admin)
    if (team.captain.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the team captain can respond to join requests' });
    }

    // Check if user has pending request
    if (!team.joinRequests.some(id => id.toString() === userId.toString())) {
      return res.status(400).json({ message: 'No request found for this user' });
    }

    // Remove from request list
    team.joinRequests = team.joinRequests.filter(id => id.toString() !== userId.toString());

    if (action === 'accept') {
      if (team.members.length >= (team.maxMembers || 10)) {
        return res.status(400).json({ message: 'Team is already full (maximum capacity reached)' });
      }
      if (!team.members.some(id => id.toString() === userId.toString())) {
        team.members.push(userId);
      }
    }

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('captain', 'username email')
      .populate('members', 'username email profile')
      .populate('joinRequests', 'username email profile')
      .populate('invitedPlayers', 'username email profile');

    res.json({ message: `Request successfully ${action}ed`, team: populatedTeam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Captain invites a player to the team
// @route   POST /api/teams/:id/invite
// @access  Private
const invitePlayer = async (req, res) => {
  const { usernameOrEmail } = req.body;
  const User = require('../models/User'); // Import User schema inline

  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Authorization check
    if (team.captain.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the team captain can invite players' });
    }

    // Find the player
    const player = await User.findOne({
      $or: [
        { username: usernameOrEmail.trim() },
        { email: usernameOrEmail.trim().toLowerCase() }
      ]
    });

    if (!player) {
      return res.status(404).json({ message: 'Player not found with that username or email' });
    }

    if (team.members.some(id => id.toString() === player._id.toString())) {
      return res.status(400).json({ message: 'Player is already a member of this team' });
    }

    if (team.invitedPlayers.some(id => id.toString() === player._id.toString())) {
      return res.status(400).json({ message: 'Player is already invited to this team' });
    }

    if (team.members.length >= (team.maxMembers || 10)) {
      return res.status(400).json({ message: 'Team is already full (maximum capacity reached)' });
    }

    team.invitedPlayers.push(player._id);
    await team.save();

    // Trigger team_invitation notification for invited player
    const { createNotification } = require('../utils/notificationHelper');
    const { sendTeamInvitationEmail } = require('../utils/emailService');

    await createNotification({
      recipient: player._id,
      sender: req.user._id,
      type: 'team_invitation',
      title: 'Squad Invitation Received',
      message: `You were invited to join "${team.name}" by @${req.user.username}.`,
      link: '/player-dashboard',
      io: req.io,
    });

    // Send Team Invitation Email
    sendTeamInvitationEmail(req.user.username, player.email, team.name);

    res.json({ message: `Invitation successfully sent to ${player.username}`, team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Player accepts/rejects a team invitation
// @route   POST /api/teams/:id/invitations/respond
// @access  Private
const respondToInvitation = async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'

  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify invitation exists
    if (!team.invitedPlayers.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'You have not been invited to this team' });
    }

    // Remove from invitations list
    team.invitedPlayers = team.invitedPlayers.filter(id => id.toString() !== req.user._id.toString());

    if (action === 'accept') {
      if (team.members.length >= (team.maxMembers || 10)) {
        return res.status(400).json({ message: 'Team is already full (maximum capacity reached)' });
      }
      if (!team.members.some(id => id.toString() === req.user._id.toString())) {
        team.members.push(req.user._id);
      }
    }

    await team.save();

    res.json({ message: `Invitation successfully ${action}ed` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTeam,
  joinTeam,
  leaveTeam,
  getMyTeams,
  getTeamById,
  searchTeams,
  getInvites,
  requestJoin,
  respondToJoinRequest,
  invitePlayer,
  respondToInvitation,
};
