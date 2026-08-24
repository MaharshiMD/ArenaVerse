const express = require('express');
const router = express.Router();
const { toggleFollow, getFollowStatus, getActivityFeed, getGlobalActivityFeed } = require('../controllers/followController');
const { protect } = require('../middleware/auth');

router.post('/toggle', protect, toggleFollow);
router.get('/status', getFollowStatus);
router.get('/activity-feed', protect, getActivityFeed);
router.get('/global-activity-feed', getGlobalActivityFeed);

module.exports = router;
