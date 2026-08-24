const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  forgotPassword,
  googleLogin,
  checkUsername,
  searchPlayers,
  getPublicProfile,
  submitVerificationRequest,
  getPublicOrganizerProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.get('/check-username', checkUsername);
router.get('/search-players', searchPlayers);
router.get('/players/:username/public-profile', getPublicProfile);
router.get('/organizers/:username/public-profile', getPublicOrganizerProfile);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/verification-request', protect, submitVerificationRequest);
router.use('/2fa', require('./twoFactorRoutes'));

module.exports = router;
