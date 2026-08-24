const express = require('express');
const router = express.Router();
const { updateMatchScore, checkInMatch, processMatchWalkover, setMatchMVP, sendMatchReminder } = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');

router.put('/:id/score', protect, authorize('organizer', 'admin'), updateMatchScore);
router.post('/:id/checkin', protect, checkInMatch);
router.post('/:id/walkover', protect, processMatchWalkover);
router.put('/:id/mvp', protect, authorize('organizer', 'admin'), setMatchMVP);
router.post('/:id/remind', protect, authorize('organizer', 'admin'), sendMatchReminder);

module.exports = router;
