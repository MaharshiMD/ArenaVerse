const express = require('express');
const router = express.Router();
const brTournamentController = require('../controllers/brTournamentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Group generation for a tournament
router.post(
  '/:tournamentId/groups',
  protect,
  restrictTo('admin', 'organizer'),
  brTournamentController.generateGroups
);

// Match schedule generation for a stage
router.post(
  '/stages/:stageId/matches',
  protect,
  restrictTo('admin', 'organizer'),
  brTournamentController.generateMatchSchedule
);

// Match result submission
router.post(
  '/matches/:matchId/results',
  protect,
  restrictTo('admin', 'organizer', 'referee'),
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
  restrictTo('admin', 'organizer'),
  brTournamentController.qualifyTeams
);

module.exports = router;
