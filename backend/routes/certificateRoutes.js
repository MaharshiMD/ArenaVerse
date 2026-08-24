const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  downloadTournamentCertificate,
  getUserCertificates,
} = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');

// Route to get all certificates won by the logged-in player
router.get('/my-certificates', protect, getUserCertificates);

// Route to download specific tournament certificate (when mounted at /api/tournaments/:id/certificate)
router.get('/', protect, downloadTournamentCertificate);

// Route to download specific tournament certificate (when mounted at /api/certificates/:id)
router.get('/:id', protect, downloadTournamentCertificate);

module.exports = router;
