const express = require('express');
const router = express.Router();
const {
  enable2FARequest,
  enable2FAVerify,
  disable2FARequest,
  disable2FAVerify,
  verifyLoginOTP,
  resendOTP,
  initiateRegisterOTP,
  verifyRegisterOTP,
} = require('../controllers/twoFactorController');
const { protect } = require('../middleware/auth');

router.post('/enable', protect, enable2FARequest);
router.post('/enable/verify', protect, enable2FAVerify);
router.post('/disable/request', protect, disable2FARequest);
router.post('/disable/verify', protect, disable2FAVerify);
router.post('/verify', verifyLoginOTP);
router.post('/resend', resendOTP);
router.post('/register/initiate', initiateRegisterOTP);
router.post('/register/verify', verifyRegisterOTP);

module.exports = router;
