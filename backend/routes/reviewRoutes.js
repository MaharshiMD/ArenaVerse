const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  submitReview,
  getTournamentReviews,
  getOrganizerRating,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.get('/', getTournamentReviews);
router.post('/', protect, submitReview);
router.get('/organizer/:organizerId/rating', getOrganizerRating);

module.exports = router;
