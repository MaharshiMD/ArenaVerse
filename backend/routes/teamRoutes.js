const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

router.use(protect); // All team actions require authentication

router.get('/', searchTeams);
router.get('/invitations', getInvites);
router.post('/', createTeam);
router.post('/join', joinTeam);
router.get('/my', getMyTeams);
router.get('/:id', getTeamById);
router.post('/:id/leave', leaveTeam);
router.post('/:id/request-join', requestJoin);
router.post('/:id/requests/:userId/respond', respondToJoinRequest);
router.post('/:id/invite', invitePlayer);
router.post('/:id/invitations/respond', respondToInvitation);

// Nested team chat routes
const teamChatRoutes = require('./teamChatRoutes');
router.use('/:id/chat', teamChatRoutes);

module.exports = router;
