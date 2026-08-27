const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TwoFactorChallenge = require('../models/TwoFactorChallenge');
const { generateNumericOTP, hashOTP, verifyOTP, maskEmail } = require('../utils/otp');
const { send2FAOTPEmail } = require('../utils/emailService');

// Helper to sign JWT (consistent with authController.js)
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'arena_verse_dev_secret_key_987654321_secure_dev_token';
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

// @desc    Initiate Enable 2FA (Sends OTP to user email)
// @route   POST /api/auth/2fa/enable
// @access  Private
const enable2FARequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-Factor Authentication is already enabled on your account.' });
    }

    // Rate limit cooldown check (60s)
    const existing = await TwoFactorChallenge.findOne({ user: user._id, purpose: 'enable' });
    if (existing && Date.now() - existing.lastSentAt.getTime() < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - existing.lastSentAt.getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting another code.` });
    }

    // Clear any stale enable challenge for this user
    await TwoFactorChallenge.deleteMany({ user: user._id, purpose: 'enable' });

    const otp = generateNumericOTP();
    const otpHash = hashOTP(otp);
    const challengeId = crypto.randomUUID();

    await TwoFactorChallenge.create({
      challengeId,
      user: user._id,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes logical expiry
      attempts: 0,
      lastSentAt: new Date(),
      purpose: 'enable',
    });

    const emailSent = await send2FAOTPEmail(user.email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: "We couldn't send the verification code. Please try again later." });
    }

    res.json({
      message: 'Verification code sent to your registered email address.',
      challengeId,
      maskedEmail: maskEmail(user.email),
      cooldownSeconds: 60,
    });
  } catch (error) {
    console.error('Error in enable2FARequest:', error);
    res.status(500).json({ message: 'Server error initiating 2FA enable request.' });
  }
};

// @desc    Verify OTP and Enable 2FA
// @route   POST /api/auth/2fa/enable/verify
// @access  Private
const enable2FAVerify = async (req, res) => {
  const { challengeId, otp } = req.body;

  if (!challengeId || !otp) {
    return res.status(400).json({ message: 'Challenge ID and 6-digit OTP code are required.' });
  }

  try {
    const challenge = await TwoFactorChallenge.findOne({
      challengeId,
      user: req.user.id || req.user._id,
      purpose: 'enable',
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      if (challenge) await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    if (challenge.attempts >= 5) {
      await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Too many verification attempts. Please restart the process.' });
    }

    const isValid = verifyOTP(otp, challenge.otpHash);
    if (!isValid) {
      challenge.attempts += 1;
      await challenge.save();

      if (challenge.attempts >= 5) {
        await TwoFactorChallenge.deleteOne({ _id: challenge._id });
        return res.status(400).json({ message: 'Too many verification attempts. Please restart the process.' });
      }

      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Success: Invalidate challenge & set twoFactorEnabled = true
    await TwoFactorChallenge.deleteOne({ _id: challenge._id });

    const user = await User.findById(req.user.id || req.user._id);
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      message: 'Two-Factor Authentication has been enabled successfully.',
      twoFactorEnabled: true,
    });
  } catch (error) {
    console.error('Error in enable2FAVerify:', error);
    res.status(500).json({ message: 'Server error verifying 2FA enable code.' });
  }
};

// @desc    Initiate Disable 2FA (Requires current password & sends OTP)
// @route   POST /api/auth/2fa/disable/request
// @access  Private
const disable2FARequest = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Current password is required to disable Two-Factor Authentication.' });
  }

  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-Factor Authentication is not enabled on your account.' });
    }

    // Password verification check
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password.' });
    }

    // Cooldown check (60s)
    const existing = await TwoFactorChallenge.findOne({ user: user._id, purpose: 'disable' });
    if (existing && Date.now() - existing.lastSentAt.getTime() < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - existing.lastSentAt.getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting another code.` });
    }

    await TwoFactorChallenge.deleteMany({ user: user._id, purpose: 'disable' });

    const otp = generateNumericOTP();
    const otpHash = hashOTP(otp);
    const challengeId = crypto.randomUUID();

    await TwoFactorChallenge.create({
      challengeId,
      user: user._id,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
      purpose: 'disable',
    });

    const emailSent = await send2FAOTPEmail(user.email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: "We couldn't send the verification code. Please try again later." });
    }

    res.json({
      message: 'Verification code sent to your registered email to confirm disabling 2FA.',
      challengeId,
      maskedEmail: maskEmail(user.email),
      cooldownSeconds: 60,
    });
  } catch (error) {
    console.error('Error in disable2FARequest:', error);
    res.status(500).json({ message: 'Server error initiating 2FA disable request.' });
  }
};

// @desc    Verify OTP and Disable 2FA
// @route   POST /api/auth/2fa/disable/verify
// @access  Private
const disable2FAVerify = async (req, res) => {
  const { challengeId, otp } = req.body;

  if (!challengeId || !otp) {
    return res.status(400).json({ message: 'Challenge ID and 6-digit OTP code are required.' });
  }

  try {
    const challenge = await TwoFactorChallenge.findOne({
      challengeId,
      user: req.user.id || req.user._id,
      purpose: 'disable',
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      if (challenge) await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    if (challenge.attempts >= 5) {
      await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Too many verification attempts. Please restart the process.' });
    }

    const isValid = verifyOTP(otp, challenge.otpHash);
    if (!isValid) {
      challenge.attempts += 1;
      await challenge.save();

      if (challenge.attempts >= 5) {
        await TwoFactorChallenge.deleteOne({ _id: challenge._id });
        return res.status(400).json({ message: 'Too many verification attempts. Please restart the process.' });
      }

      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Success: Invalidate challenge & set twoFactorEnabled = false
    await TwoFactorChallenge.deleteOne({ _id: challenge._id });

    const user = await User.findById(req.user.id || req.user._id);
    user.twoFactorEnabled = false;
    await user.save();

    res.json({
      message: 'Two-Factor Authentication has been disabled successfully.',
      twoFactorEnabled: false,
    });
  } catch (error) {
    console.error('Error in disable2FAVerify:', error);
    res.status(500).json({ message: 'Server error disabling 2FA.' });
  }
};

// @desc    Verify Login OTP Challenge and issue JWT
// @route   POST /api/auth/2fa/verify
// @access  Public
const verifyLoginOTP = async (req, res) => {
  const { challengeId, otp } = req.body;

  if (!challengeId || !otp) {
    return res.status(400).json({ message: 'Challenge ID and 6-digit OTP code are required.' });
  }

  try {
    const challenge = await TwoFactorChallenge.findOne({
      challengeId,
      purpose: 'login',
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      if (challenge) await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    if (challenge.attempts >= 5) {
      await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Too many verification attempts. Please restart the login process.' });
    }

    const isValid = verifyOTP(otp, challenge.otpHash);
    if (!isValid) {
      challenge.attempts += 1;
      await challenge.save();

      if (challenge.attempts >= 5) {
        await TwoFactorChallenge.deleteOne({ _id: challenge._id });
        return res.status(400).json({ message: 'Too many verification attempts. Please restart the login process.' });
      }

      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Success: Immediately invalidate OTP challenge so it cannot be reused
    await TwoFactorChallenge.deleteOne({ _id: challenge._id });

    const user = await User.findById(challenge.user);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    if (user.status === 'suspended' || user.status === 'banned') {
      return res.status(403).json({
        message: `Your account has been ${user.status}. Reason: ${user.suspensionReason || 'Violation of community terms.'}`,
      });
    }

    // Create final authenticated JWT & return user profile payload
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error in verifyLoginOTP:', error);
    res.status(500).json({ message: 'Server error verifying 2FA login code.' });
  }
};

// @desc    Resend 2FA OTP Code
const resendOTP = async (req, res) => {
  const { challengeId } = req.body;

  if (!challengeId) {
    return res.status(400).json({ message: 'Challenge ID is required to resend verification code.' });
  }

  try {
    const challenge = await TwoFactorChallenge.findOne({ challengeId });
    if (!challenge || challenge.expiresAt < new Date()) {
      if (challenge) await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Verification session expired. Please restart the process.' });
    }

    // Rate limit cooldown check (60 seconds)
    const timeElapsed = Date.now() - challenge.lastSentAt.getTime();
    if (timeElapsed < 60000) {
      const waitSeconds = Math.ceil((60000 - timeElapsed) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds} seconds before requesting another code.` });
    }

    let targetEmail = null;
    if (challenge.user) {
      const user = await User.findById(challenge.user);
      if (user) targetEmail = user.email;
    } else if (challenge.pendingRegistration?.email) {
      targetEmail = challenge.pendingRegistration.email;
    }

    if (!targetEmail) {
      return res.status(404).json({ message: 'Associated verification email address not found.' });
    }

    // Generate new OTP, hash, reset attempts and expiration
    const newOtp = generateNumericOTP();
    challenge.otpHash = hashOTP(newOtp);
    challenge.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    challenge.attempts = 0;
    challenge.lastSentAt = new Date();
    await challenge.save();

    const emailSent = await send2FAOTPEmail(targetEmail, newOtp);
    if (!emailSent) {
      return res.status(500).json({ message: "We couldn't send the verification code. Please try again later." });
    }

    res.json({
      message: 'A new verification code has been sent to your registered email address.',
      cooldownSeconds: 60,
    });
  } catch (error) {
    console.error('Error in resendOTP:', error);
    res.status(500).json({ message: 'Server error resending 2FA verification code.' });
  }
};

// @desc    Initiate Registration OTP (Sends 6-digit code to email before account creation)
// @route   POST /api/auth/2fa/register/initiate
// @access  Public
const initiateRegisterOTP = async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  try {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if user already exists
    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    if (userExists) {
      if (userExists.email === cleanEmail) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Clear any stale registration challenges for this email
    await TwoFactorChallenge.deleteMany({ 'pendingRegistration.email': cleanEmail, purpose: 'registration' });

    const otp = generateNumericOTP();
    const otpHash = hashOTP(otp);
    const challengeId = crypto.randomUUID();

    await TwoFactorChallenge.create({
      challengeId,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
      purpose: 'registration',
      pendingRegistration: {
        username: cleanUsername,
        email: cleanEmail,
        password: password,
        role: role || 'player',
      },
    });

    const emailSent = await send2FAOTPEmail(cleanEmail, otp);
    if (!emailSent) {
      return res.status(500).json({ message: "We couldn't send the verification code. Please try again." });
    }

    res.json({
      message: 'Verification code sent to your email address.',
      challengeId,
      maskedEmail: maskEmail(cleanEmail),
      cooldownSeconds: 60,
      devOtp: (!process.env.SMTP_HOST || !process.env.SMTP_USER) ? otp : undefined
    });
  } catch (error) {
    console.error('Error in initiateRegisterOTP:', error);
    res.status(500).json({ message: 'Server error initiating registration OTP.' });
  }
};

// @desc    Verify Registration OTP and Create User Account in DB
// @route   POST /api/auth/2fa/register/verify
// @access  Public
const verifyRegisterOTP = async (req, res) => {
  const { challengeId, otp } = req.body;

  if (!challengeId || !otp) {
    return res.status(400).json({ message: 'Challenge ID and 6-digit OTP code are required.' });
  }

  try {
    const challenge = await TwoFactorChallenge.findOne({
      challengeId,
      purpose: 'registration',
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      if (challenge) await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    if (challenge.attempts >= 5) {
      await TwoFactorChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'Too many verification attempts. Please restart registration.' });
    }

    const isValid = verifyOTP(otp, challenge.otpHash);
    if (!isValid) {
      challenge.attempts += 1;
      await challenge.save();

      if (challenge.attempts >= 5) {
        await TwoFactorChallenge.deleteOne({ _id: challenge._id });
        return res.status(400).json({ message: 'Too many verification attempts. Please restart registration.' });
      }

      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Success: Create User document in MongoDB
    const pending = challenge.pendingRegistration;
    const user = await User.create({
      username: pending.username,
      email: pending.email,
      password: pending.password,
      role: pending.role || 'player',
    });

    // Delete challenge
    await TwoFactorChallenge.deleteOne({ _id: challenge._id });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error in verifyRegisterOTP:', error);
    res.status(500).json({ message: error.message || 'Server error completing registration.' });
  }
};

module.exports = {
  enable2FARequest,
  enable2FAVerify,
  disable2FARequest,
  disable2FAVerify,
  verifyLoginOTP,
  resendOTP,
  initiateRegisterOTP,
  verifyRegisterOTP,
};
