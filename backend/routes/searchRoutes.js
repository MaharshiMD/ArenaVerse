const express = require('express');
const router = express.Router();
const { searchAdvanced } = require('../controllers/searchController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, searchAdvanced);

module.exports = router;
