const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
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
} = require('../controllers/moderatorController');

// All endpoints require authentication
router.use(protect);

// Allow any logged-in user to file a complaint ticket
router.post('/complaints', createComplaint);

// Staff Moderator & Admin restricted endpoints
router.use(authorize('moderator', 'admin'));

router.get('/stats', getModeratorStats);
router.get('/complaints', getComplaints);
router.patch('/complaints/:id', updateComplaint);
router.post('/warnings', issueWarning);
router.post('/temp-ban', applyTempBan);
router.post('/lift-ban/:userId', liftTempBan);
router.get('/teams', getTeams);
router.delete('/teams/:teamId/members/:userId', removeTeamMember);
router.post('/broadcast', sendBroadcast);

module.exports = router;
