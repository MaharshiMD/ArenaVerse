const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getTournamentChat,
  sendChatMessage,
  pinChatMessage,
  unpinChatMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getTournamentChat);
router.post('/', protect, sendChatMessage);
router.put('/:messageId/pin', protect, pinChatMessage);
router.put('/:messageId/unpin', protect, unpinChatMessage);

module.exports = router;
