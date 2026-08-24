const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getTeamChat,
  sendTeamChatMessage,
} = require('../controllers/teamChatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getTeamChat);
router.post('/', protect, sendTeamChatMessage);

module.exports = router;
