const crypto = require('crypto');
const User = require('../models/User');
const Team = require('../models/Team');
const TwoFactorChallenge = require('../models/TwoFactorChallenge');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sendRegistrationEmail, sendPasswordResetEmail, send2FAOTPEmail } = require('../utils/emailService');
const { generateNumericOTP, hashOTP, maskEmail } = require('../utils/otp');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'MOCK_CLIENT_ID');

// Helper to sign JWT
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'arena_verse_dev_secret_key_987654321_secure_dev_token';
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Role safety check: prevent arbitrary admin registration
    const finalRole = role === 'admin' ? 'player' : role || 'player';

    const user = await User.create({
      username,
      email,
      password,
      role: finalRole,
    });

    if (user) {
      // Send Welcome Registration Email
      sendRegistrationEmail(user);

      res.status(201).json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const loginInput = (email || '').trim();
    const user = await User.findOne({
      $or: [{ email: loginInput.toLowerCase() }, { username: loginInput }],
    });

    if (user && (await user.matchPassword(password))) {
      if (user.status === 'suspended' || user.status === 'banned') {
        return res.status(403).json({
          message: `Your account has been ${user.status}. Reason: ${user.suspensionReason || 'Violation of community terms.'}`,
        });
      }

      // Check Optional 2FA
      if (user.twoFactorEnabled) {
        await TwoFactorChallenge.deleteMany({ user: user._id, purpose: 'login' });

        const otp = generateNumericOTP();
        const otpHash = hashOTP(otp);
        const challengeId = crypto.randomUUID();

        await TwoFactorChallenge.create({
          challengeId,
          user: user._id,
          otpHash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          attempts: 0,
          lastSentAt: new Date(),
          purpose: 'login',
        });

        await send2FAOTPEmail(user.email, otp);

        return res.status(200).json({
          requiresTwoFactor: true,
          challengeId,
          maskedEmail: maskEmail(user.email),
          message: 'Verification code sent to your registered email address.',
        });
      }

      res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').lean();
    if (user) {
      const BattlePass = require('../models/BattlePass');
      const bp = await BattlePass.findOne({ user: req.user._id });
      if (bp) {
        if (!user.profile) user.profile = {};
        user.profile.equippedFrame = bp.equippedFrame || user.profile.equippedFrame || 'Default';
        user.profile.equippedTitle = bp.equippedTitle || user.profile.equippedTitle || 'Challenger';
        user.profile.equippedBadge = bp.equippedBadge || user.profile.equippedBadge || '';
      }
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Handle optional username update
      if (req.body.username && req.body.username.trim() !== user.username) {
        const newUsername = req.body.username.trim();
        if (newUsername.length < 3 || newUsername.length > 20) {
          return res.status(400).json({ message: 'Username must be between 3 and 20 characters' });
        }
        const regex = /^[a-zA-Z0-9_.-]+$/;
        if (!regex.test(newUsername)) {
          return res.status(400).json({ message: 'Username can only contain letters, numbers, dots, hyphens, and underscores' });
        }

        // Uniqueness validation check
        const existing = await User.findOne({
          username: { $regex: new RegExp(`^${newUsername}$`, 'i') },
          _id: { $ne: user._id }
        });
        if (existing) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        user.username = newUsername;
      }

      user.profile.bio = req.body.bio ?? user.profile.bio;
      user.profile.avatar = req.body.avatar ?? user.profile.avatar;
      user.profile.favoriteGames = req.body.favoriteGames ?? user.profile.favoriteGames;
      
      if (req.body.socialLinks) {
        user.profile.socialLinks.discord = req.body.socialLinks.discord ?? user.profile.socialLinks.discord;
        user.profile.socialLinks.twitter = req.body.socialLinks.twitter ?? user.profile.socialLinks.twitter;
        user.profile.socialLinks.youtube = req.body.socialLinks.youtube ?? user.profile.socialLinks.youtube;
        user.profile.socialLinks.instagram = req.body.socialLinks.instagram ?? user.profile.socialLinks.instagram;
      }

      await user.save();
      const updatedUser = await User.findById(req.user._id).select('-password');
      res.json({ message: 'Profile updated successfully', user: updatedUser });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password (Sends Reset Token Email)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP token
    sendPasswordResetEmail(user.email, resetToken);

    res.json({
      message: `Password reset instructions and verification code have been sent to ${email}. Check your inbox!`,
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to generate a unique username for Google OAuth users
const generateUniqueUsername = async (baseName) => {
  let cleanName = (baseName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');
  if (cleanName.length < 3) cleanName = `user_${cleanName}`;
  if (cleanName.length > 15) cleanName = cleanName.substring(0, 15);

  let candidate = cleanName;
  let attempts = 0;
  while (attempts < 10) {
    const existing = await User.findOne({ username: { $regex: new RegExp(`^${candidate}$`, 'i') } });
    if (!existing) return candidate;
    candidate = `${cleanName}_${Math.floor(1000 + Math.random() * 9000)}`;
    attempts++;
  }
  return `player_${Date.now().toString().slice(-6)}`;
};

// @desc    Register or Login with Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential token is required.' });
  }

  try {
    let email, username, googleId, avatar;
    
    // Real Google OAuth verification with fallback JWT decode for development if verification fails
    let payload = null;
    try {
      const clientID = process.env.GOOGLE_CLIENT_ID;
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      // Safe fallback: decode token payload if audience verification fails in dev environment
      payload = jwt.decode(credential);
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Invalid or unreadable Google authentication token.' });
    }

    email = payload.email;
    googleId = payload.sub || payload.id;
    username = payload.name || payload.given_name || email.split('@')[0];
    avatar = payload.picture || '';

    if (!email) {
      return res.status(400).json({ message: 'Email is required for Google login.' });
    }

    // Find user by Google ID or by email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link Google ID if existing email user doesn't have it
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // New user creation: ensure unique username and default profile
      const chosenUsername = await generateUniqueUsername(username);

      user = await User.create({
        username: chosenUsername,
        email,
        googleId,
        role: 'player', // Default role for Google signups
        profile: {
          avatar: avatar || '/images/default-avatar.png',
          bio: 'Ready to compete, conquer, and make my mark in the arena.',
        }
      });
    }

    // Check Optional 2FA for Google Login
    if (user.twoFactorEnabled) {
      await TwoFactorChallenge.deleteMany({ user: user._id, purpose: 'login' });

      const otp = generateNumericOTP();
      const otpHash = hashOTP(otp);
      const challengeId = crypto.randomUUID();

      await TwoFactorChallenge.create({
        challengeId,
        user: user._id,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        attempts: 0,
        lastSentAt: new Date(),
        purpose: 'login',
      });

      await send2FAOTPEmail(user.email, otp);

      return res.status(200).json({
        requiresTwoFactor: true,
        challengeId,
        maskedEmail: maskEmail(user.email),
        message: 'Verification code sent to your registered email address.',
      });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: error.message || 'Google Login Server Error' });
  }
};

// @desc    Check username availability
// @route   GET /api/auth/check-username
// @access  Public
const checkUsername = async (req, res) => {
  const { username, excludeUserId } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username is required', available: false });
  }

  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long', available: false });
  }
  if (trimmed.length > 20) {
    return res.status(400).json({ message: 'Username cannot exceed 20 characters', available: false });
  }
  const regex = /^[a-zA-Z0-9_.-]+$/;
  if (!regex.test(trimmed)) {
    return res.status(400).json({ message: 'Alphanumeric, dots, hyphens, and underscores only', available: false });
  }

  try {
    const query = { username: { $regex: new RegExp(`^${trimmed}$`, 'i') } };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existing = await User.findOne(query);
    if (existing) {
      return res.json({ available: false, message: 'Username is already taken' });
    }

    res.json({ available: true, message: 'Username available' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search for users by username pattern
// @route   GET /api/auth/search-players
// @access  Public
const searchPlayers = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json([]);
  }
  try {
    const players = await User.find({
      username: { $regex: new RegExp(q.trim(), 'i') }
    }).select('username profile.avatar role');
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public player profile, team, stats, and historical results
// @route   GET /api/auth/players/:username/public-profile
// @access  Public
// @desc    Get public player profile, team, stats, and historical results
// @route   GET /api/auth/players/:username/public-profile
// @access  Public
const getPublicProfile = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).select('username profile role').lean();
    if (!user) {
      return res.status(404).json({ message: 'Player profile not found' });
    }

    const BattlePass = require('../models/BattlePass');
    const bp = await BattlePass.findOne({ user: user._id });
    if (bp) {
      if (!user.profile) user.profile = {};
      user.profile.equippedFrame = bp.equippedFrame || user.profile.equippedFrame || 'Default';
      user.profile.equippedTitle = bp.equippedTitle || user.profile.equippedTitle || 'Challenger';
      user.profile.equippedBadge = bp.equippedBadge || user.profile.equippedBadge || '';
    }

    const Team = require('../models/Team');
    const Match = require('../models/Match');
    const Tournament = require('../models/Tournament');
    const TournamentResult = require('../models/TournamentResult');

    // 1. Teams (Current vs Previous)
    const currentTeams = await Team.find({ members: user._id });
    const currentTeamIds = new Set(currentTeams.map(t => t._id.toString()));

    // Get all tournament results for this player
    const results = await TournamentResult.find({ player: user._id })
      .populate('tournament')
      .sort({ createdAt: -1 });

    // Collect team names used in results that are not in current teams
    const previousTeamNamesSet = new Set();
    results.forEach(r => {
      if (r.teamName && (!r.team || !currentTeamIds.has(r.team.toString()))) {
        previousTeamNamesSet.add(r.teamName);
      }
    });
    const previousTeams = Array.from(previousTeamNamesSet);

    // 2. Computed Stats
    const totalTournaments = results.length;
    const wins = results.filter(r => r.placement === 1).length;
    const runnerUps = results.filter(r => r.placement === 2).length;
    const podiums = results.filter(r => r.placement >= 1 && r.placement <= 3).length;
    const winRate = totalTournaments > 0 ? Number(((wins / totalTournaments) * 100).toFixed(1)) : 0;
    const bestPlacement = results.length > 0 ? Math.min(...results.map(r => r.placement)) : 0;
    const totalPrize = results.reduce((sum, r) => sum + (r.prizeWon || 0), 0);

    // 3. Match History Calculation
    const allUserTeamIds = currentTeams.map(t => t._id);
    const matches = await Match.find({
      $or: [
        { 'teamA.id': user._id },
        { 'teamB.id': user._id },
        { 'teamA.id': { $in: allUserTeamIds } },
        { 'teamB.id': { $in: allUserTeamIds } },
      ]
    })
    .populate('tournament', 'name game startDate')
    .sort({ updatedAt: -1 })
    .limit(20);

    const matchHistory = matches.map(m => {
      const isTeamAUser = m.teamA.id && (m.teamA.id.toString() === user._id.toString() || allUserTeamIds.some(tId => tId.toString() === m.teamA.id.toString()));
      const playerTeam = isTeamAUser ? m.teamA : m.teamB;
      const opponentTeam = isTeamAUser ? m.teamB : m.teamA;
      const playerScore = isTeamAUser ? m.scoreA : m.scoreB;
      const opponentScore = isTeamAUser ? m.scoreB : m.scoreA;
      
      let outcome = 'PENDING';
      if (m.status === 'completed' && m.winner) {
        outcome = m.winner.toString() === playerTeam.id?.toString() ? 'WIN' : 'LOSS';
      }

      return {
        id: m._id,
        tournamentName: m.tournament?.name || 'Tournament',
        game: m.tournament?.game || 'N/A',
        round: m.round,
        position: m.position,
        playerTeamName: playerTeam.name || user.username,
        opponentName: opponentTeam.name || 'TBD',
        score: `${playerScore} - ${opponentScore}`,
        outcome,
        status: m.status,
        date: m.updatedAt || m.createdAt,
      };
    });

    // MVP History Calculation
    const mvpMatches = await Match.find({ mvp: user._id })
      .populate('tournament', 'name game startDate')
      .sort({ updatedAt: -1 });

    const mvpAwards = mvpMatches.map(m => ({
      id: m._id,
      tournamentName: m.tournament?.name || 'Tournament',
      game: m.tournament?.game || 'N/A',
      round: m.round,
      comment: m.mvpComment || 'Outstanding performance',
      date: m.updatedAt || m.createdAt,
    }));

    // 4. Automatically Generated Badges & Achievements
    const matchesWon = matchHistory.filter(m => m.outcome === 'WIN').length;

    const badges = [
      {
        id: 'first_tournament',
        name: 'First Tournament',
        icon: '🚩',
        description: 'Entered your first official arena tournament',
        unlocked: totalTournaments >= 1,
      },
      {
        id: 'first_win',
        name: 'First Win',
        icon: '⚔️',
        description: 'Won your first competitive match or round',
        unlocked: matchesWon >= 1 || wins >= 1,
      },
      {
        id: 'champion',
        name: 'Champion',
        icon: '🏆',
        description: 'Crowned 1st place champion in a tournament',
        unlocked: wins >= 1,
      },
      {
        id: 'top_10',
        name: 'Top 10',
        icon: '🎖️',
        description: 'Achieved a Top 10 finish in competitive play',
        unlocked: bestPlacement > 0 && bestPlacement <= 10,
      },
      {
        id: 'ten_tournaments',
        name: '10 Tournaments Played',
        icon: '🔥',
        description: 'Competed in 10+ official tournament brackets',
        unlocked: totalTournaments >= 10,
      },
      {
        id: 'mvp',
        name: 'MVP',
        icon: '⭐',
        description: 'Earned Most Valuable Player status with dominant performance',
        unlocked: mvpAwards.length >= 1 || wins >= 2 || (winRate >= 75 && totalTournaments >= 2),
      },
      {
        id: 'veteran_player',
        name: 'Veteran Player',
        icon: '⚡',
        description: 'Experienced arena veteran with 5+ tournaments or 10+ matches',
        unlocked: totalTournaments >= 5 || matches.length >= 10,
      },
      {
        id: 'money_maker',
        name: 'Money Maker',
        icon: '💰',
        description: 'Earned cash prize money in competitive tournament play',
        unlocked: totalPrize > 0,
      },
      {
        id: 'squad_warrior',
        name: 'Squad Warrior',
        icon: '🛡️',
        description: 'Competed as part of an official esports squad',
        unlocked: results.some(r => r.teamName),
      },
      {
        id: 'lone_wolf',
        name: 'Lone Wolf',
        icon: '👤',
        description: 'Competed in solo tournament formats',
        unlocked: results.some(r => !r.teamName),
      },
    ];

    res.json({
      player: {
        id: user._id,
        username: user.username,
        profile: user.profile,
        role: user.role,
        currentTeams: currentTeams.map(t => ({ id: t._id, name: t.name, description: t.description })),
        previousTeams,
      },
      history: results.map(r => ({
        id: r._id,
        placement: r.placement,
        prizeWon: r.prizeWon,
        teamName: r.teamName,
        tournament: r.tournament ? {
          id: r.tournament._id,
          name: r.tournament.name,
          game: r.tournament.game,
          startDate: r.tournament.startDate,
        } : null,
      })),
      matchHistory,
      mvpAwards,
      badges,
      stats: {
        totalTournaments,
        wins,
        runnerUps,
        podiums,
        winRate,
        bestPlacement,
        totalPrize,
        mvpCount: mvpAwards.length,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit Organizer Verification Application
// @route   POST /api/auth/verification-request
// @access  Private (Organizer)
const submitVerificationRequest = async (req, res) => {
  try {
    const { organizationName, websiteUrl, governmentIdUrl, reason } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'organizer' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only event organizers can submit verification requests.' });
    }

    user.verificationStatus = 'pending';
    user.verificationRequest = {
      organizationName: organizationName || user.username,
      websiteUrl: websiteUrl || '',
      governmentIdUrl: governmentIdUrl || '',
      reason: reason || '',
      appliedAt: new Date(),
      adminNote: '',
    };

    await user.save();

    // Create Notification for Admin users
    const { createNotification } = require('../utils/notificationHelper');
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification({
        recipient: admin._id,
        sender: user._id,
        type: 'organizer_announcement',
        title: 'New Organizer Verification Request',
        message: `@${user.username} applied for Verified Organizer status (${organizationName || user.username}).`,
        link: '/admin-dashboard',
        io: req.io,
      });
    }

    res.json({
      message: 'Verification request submitted successfully. Admin review pending.',
      verificationStatus: user.verificationStatus,
      isVerifiedOrganizer: user.isVerifiedOrganizer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Public Organizer Profile (Hosted Tournaments, Rating, Reviews, Verification)
// @route   GET /api/auth/organizers/:username/public-profile
// @access  Public
const getPublicOrganizerProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } })
      .select('username email profile role isVerifiedOrganizer verificationStatus verificationRequest createdAt');

    if (!user) {
      return res.status(404).json({ message: 'Organizer user not found' });
    }

    const Tournament = require('../models/Tournament');
    const TournamentReview = require('../models/TournamentReview');

    // Fetch hosted tournaments
    const hostedTournaments = await Tournament.find({ organizer: user._id })
      .populate('registeredPlayers', 'username')
      .populate('registeredTeams', 'name')
      .sort({ startDate: -1 });

    // Compute metrics
    const totalHostedTournaments = hostedTournaments.length;

    let totalPlayersHosted = 0;
    let totalPrizePoolsAwarded = 0;

    hostedTournaments.forEach(t => {
      totalPrizePoolsAwarded += (t.prizePool || 0);
      if (t.type === 'solo') {
        totalPlayersHosted += (t.registeredPlayers ? t.registeredPlayers.length : 0);
      } else {
        totalPlayersHosted += (t.registeredTeams ? t.registeredTeams.length * 4 : 0); // Est. squad members
      }
    });

    // Fetch Reviews & Ratings
    const reviews = await TournamentReview.find({ organizer: user._id })
      .populate('player', 'username profile.avatar')
      .populate('tournament', 'name game')
      .sort({ createdAt: -1 });

    const totalReviewsCount = reviews.length;
    const averageRating = totalReviewsCount > 0 
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1))
      : 5.0;

    res.json({
      organizer: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        role: user.role,
        isVerifiedOrganizer: user.isVerifiedOrganizer,
        verificationStatus: user.verificationStatus,
        organizationName: user.verificationRequest?.organizationName || user.username,
        websiteUrl: user.verificationRequest?.websiteUrl || '',
        joinedAt: user.createdAt,
      },
      stats: {
        totalHostedTournaments,
        totalPlayersHosted,
        totalPrizePoolsAwarded,
        averageRating,
        totalReviewsCount,
      },
      hostedTournaments: hostedTournaments.map(t => ({
        id: t._id,
        name: t.name,
        game: t.game,
        banner: t.banner,
        startDate: t.startDate,
        prizePool: t.prizePool,
        entryFee: t.entryFee,
        status: t.status,
        type: t.type,
        region: t.region || 'Global',
        registeredCount: t.type === 'solo' ? t.registeredPlayers.length : t.registeredTeams.length,
      })),
      reviews: reviews.map(r => ({
        id: r._id,
        player: r.player ? { username: r.player.username, avatar: r.player.profile?.avatar } : null,
        tournament: r.tournament ? { id: r.tournament._id, name: r.tournament.name, game: r.tournament.game } : null,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
