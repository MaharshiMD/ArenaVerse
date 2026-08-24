const express = require('express');
const router = express.Router();
const {
  createDispute,
  getTournamentDisputes,
  getAllDisputes,
  resolveDispute,
} = require('../controllers/disputeController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, createDispute);
router.get('/tournament/:tournamentId', protect, getTournamentDisputes);
router.get('/all', protect, authorize('organizer', 'admin'), getAllDisputes);
router.put('/:id/resolve', protect, authorize('organizer', 'admin'), resolveDispute);

module.exports = router;
