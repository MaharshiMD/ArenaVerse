const express = require('express');
const router = express.Router();
const {
  getSmurfAlerts,
  getAntiCheatReports,
  createAntiCheatReport,
  getReplays,
  getAIMatchPrediction,
  getBattlePass,
  getRewardStoreItems,
  buyStoreItem,
  equipCosmetic,
  claimMission,
  getMissions,
  getClubs,
  getForumPosts,
  createForumPost,
  toggleLikeForumPost,
  addForumComment,
  getPolls,
  votePoll,
  getStreams,
  getPlatformMilestones,
} = require('../controllers/enterpriseController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Anti-Smurf & Anti-Cheat
router.get('/smurf-alerts', protect, authorize('admin'), getSmurfAlerts);
router.get('/anticheat', protect, getAntiCheatReports);
router.post('/anticheat', protect, createAntiCheatReport);

// Replays & Predictions
router.get('/replays', optionalAuth, getReplays);
router.post('/ai-prediction', protect, getAIMatchPrediction);

// Progression, Battle Pass & Store
router.get('/battlepass', protect, getBattlePass);
router.get('/store/items', optionalAuth, getRewardStoreItems);
router.post('/store/buy', protect, buyStoreItem);
router.post('/store/equip', protect, equipCosmetic);
router.get('/missions', protect, getMissions);
router.post('/missions/:missionId/claim', protect, claimMission);

// Clubs, Forums & Polls
router.get('/clubs', optionalAuth, getClubs);
router.get('/forums', optionalAuth, getForumPosts);
router.post('/forums', protect, createForumPost);
router.post('/forums/:id/like', protect, toggleLikeForumPost);
router.post('/forums/:id/comment', protect, addForumComment);
router.get('/polls', optionalAuth, getPolls);
router.post('/polls/:id/vote', protect, votePoll);

// Streams & Milestones
router.get('/streams', optionalAuth, getStreams);
router.get('/milestones', optionalAuth, getPlatformMilestones);

module.exports = router;
