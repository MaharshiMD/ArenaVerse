const express = require('express');
const router = express.Router();
const brTournamentController = require('../controllers/brTournamentController');
const { protect, authorize } = require('../middleware/auth');

// Group generation for a tournament
router.post(
  '/:tournamentId/groups',
  protect,
  authorize('admin', 'organizer'),
  brTournamentController.generateGroups
);

// Match schedule generation for a stage
router.post(
  '/stages/:stageId/matches',
  protect,
  authorize('admin', 'organizer'),
  brTournamentController.generateMatchSchedule
);

// Match result submission
router.post(
  '/matches/:matchId/results',
  protect,
  authorize('admin', 'organizer', 'referee'),
  brTournamentController.submitMatchResult
);

// Get stage leaderboard
router.get(
  '/stages/:stageId/leaderboard',
  brTournamentController.getStageLeaderboard
);

// Qualify teams to the next stage
router.post(
  '/stages/:stageId/qualify',
  protect,
  authorize('admin', 'organizer'),
  brTournamentController.qualifyTeams
);

module.exports = router;
