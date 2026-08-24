const express = require('express');
const router = express.Router();
const {
  getLFTPosts,
  createLFTPost,
  getLFPPosts,
  createLFPPost,
  getFriends,
  sendFriendRequest,
  respondFriendRequest,
  getDirectMessages,
  sendDirectMessage,
  getWallet,
  depositWallet,
  withdrawWallet,
  getTournamentQRCode,
  scanQRCheckIn,
  getTemplates,
  createTemplate,
  getHallOfFame,
  getEsportsNews,
  generateAIMatchSummary,
  getAIRecommendations,
  getAdminPlatformAnalytics,
  updateUserSettings,
  getLoginHistory,
} = require('../controllers/nextGenController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// LFT & LFP
router.get('/lft', optionalAuth, getLFTPosts);
router.post('/lft', protect, createLFTPost);
router.get('/lfp', optionalAuth, getLFPPosts);
router.post('/lfp', protect, createLFPPost);

// Friends & Direct Messages
router.get('/friends', protect, getFriends);
router.post('/friends/request', protect, sendFriendRequest);
router.post('/friends/respond', protect, respondFriendRequest);
router.get('/direct-messages/:friendId', protect, getDirectMessages);
router.post('/direct-messages', protect, sendDirectMessage);

// Wallet
router.get('/wallet', protect, getWallet);
router.post('/wallet/deposit', protect, depositWallet);
router.post('/wallet/withdraw', protect, withdrawWallet);

// QR Code Check-In
router.get('/tournaments/:id/qr-code', protect, getTournamentQRCode);
router.post('/tournaments/:id/qr-checkin', protect, scanQRCheckIn);

// Templates
router.get('/templates', protect, authorize('organizer', 'admin'), getTemplates);
router.post('/templates', protect, authorize('organizer', 'admin'), createTemplate);

// Hall of Fame & Esports News
router.get('/hall-of-fame', optionalAuth, getHallOfFame);
router.get('/esports-news', optionalAuth, getEsportsNews);

// AI Features
router.post('/ai-match-summary', protect, generateAIMatchSummary);
router.get('/ai-recommendations', protect, getAIRecommendations);

// Admin Analytics
router.get('/admin-analytics', protect, authorize('admin'), getAdminPlatformAnalytics);

// Settings & Security
router.post('/settings', protect, updateUserSettings);
router.get('/login-history', protect, getLoginHistory);

module.exports = router;
