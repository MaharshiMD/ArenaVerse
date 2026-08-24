const express = require('express');
const router = express.Router({ mergeParams: true });
const { getTournamentHighlights } = require('../controllers/highlightController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getTournamentHighlights);

module.exports = router;
