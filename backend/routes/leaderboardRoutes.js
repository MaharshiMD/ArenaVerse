const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getLeaderboard);

module.exports = router;
