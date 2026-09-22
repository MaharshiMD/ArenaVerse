const express = require('express');
const router = express.Router();
const {
  createTournament,
  editTournament,
  deleteTournament,
  getTournaments,
  getTournamentById,
  joinTournament,
  leaveTournament,
  publishTournament,
  getOrganizerAnalytics,
  postAnnouncement,
  inviteTournamentEntrant,
  createPrejoinedDraftTournament,
  createOrScheduleBRMatches,
  getBRTournamentMatches,
  submitBRMatchResult,
  getBRTournamentLeaderboard,
  generateClashSquadBracket,
  getClashSquadBracket,
  getClashSquadMatch,
} = require('../controllers/tournamentController');
const { updateMatchScore } = require('../controllers/matchController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Tournament routes (public GET, protected POST/PUT/DELETE)
router.get('/', optionalAuth, getTournaments);
router.get('/organizer-analytics', protect, authorize('organizer', 'admin'), getOrganizerAnalytics);
router.get('/:id', optionalAuth, getTournamentById);

// Protected routes
router.post('/', protect, authorize('organizer', 'admin'), createTournament);
router.post('/seed-draft', protect, authorize('organizer', 'admin'), createPrejoinedDraftTournament);
router.put('/:id', protect, authorize('organizer', 'admin'), editTournament);
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteTournament);
router.post('/:id/join', protect, joinTournament);
router.post('/:id/leave', protect, leaveTournament);
router.post('/:id/publish', protect, authorize('organizer', 'admin'), publishTournament);
router.post('/:id/announcements', protect, authorize('organizer', 'admin'), postAnnouncement);
router.post('/:id/invite', protect, authorize('organizer', 'admin'), inviteTournamentEntrant);

// Battle Royale Tournament Specific Routes
router.post('/:tournamentId/matches', protect, authorize('organizer', 'admin'), createOrScheduleBRMatches);
router.get('/:tournamentId/matches', getBRTournamentMatches);
router.get('/:tournamentId/br-matches', getBRTournamentMatches);
router.post('/:tournamentId/matches/:matchId/results', protect, authorize('organizer', 'admin', 'referee'), submitBRMatchResult);
router.get('/:tournamentId/leaderboard', getBRTournamentLeaderboard);

// Clash Squad Tournament Specific Routes
router.post('/:tournamentId/bracket/generate', protect, authorize('organizer', 'admin'), generateClashSquadBracket);
router.get('/:tournamentId/bracket', getClashSquadBracket);
router.put('/:tournamentId/matches/:matchId/result', protect, authorize('organizer', 'admin', 'referee'), updateMatchScore);
router.get('/:tournamentId/matches/:matchId', getClashSquadMatch);

// Nested chat, certificate, review & highlights routes
const chatRoutes = require('./chatRoutes');
const certificateRoutes = require('./certificateRoutes');
const reviewRoutes = require('./reviewRoutes');
const highlightRoutes = require('./highlightRoutes');

router.use('/:id/chat', chatRoutes);
router.use('/:id/certificate', certificateRoutes);
router.use('/:id/reviews', reviewRoutes);
router.use('/:id/highlights', highlightRoutes);
router.use('/organizer/:organizerId/rating', reviewRoutes);

module.exports = router;
