const express = require('express');
const router = express.Router();
const { chatWithAIAssistant } = require('../controllers/aiAssistantController');
const { optionalAuth } = require('../middleware/auth');

router.post('/chat', optionalAuth, chatWithAIAssistant);

module.exports = router;
