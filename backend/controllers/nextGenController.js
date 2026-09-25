const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const TournamentResult = require('../models/TournamentResult');
const Match = require('../models/Match');
const LFTPost = require('../models/LFTPost');
const LFPPost = require('../models/LFPPost');
const Friendship = require('../models/Friendship');
const DirectMessage = require('../models/DirectMessage');
const Wallet = require('../models/Wallet');
const TournamentTemplate = require('../models/TournamentTemplate');
const LoginHistory = require('../models/LoginHistory');
const EsportsNews = require('../models/EsportsNews');
const QRCode = require('qrcode');
const { buildGameRegex } = require('../utils/gameUtils');

// 1. LFT & LFP
const getLFTPosts = async (req, res) => {
  try {
    const { game, region, rank, role } = req.query;
    const query = { status: 'active' };
    const gameRegex = buildGameRegex(game);
    if (gameRegex) query.games = gameRegex;
    if (region && region !== 'all') query.region = new RegExp(region, 'i');
    if (rank && rank !== 'all') query.rank = new RegExp(rank, 'i');
    if (role && role !== 'all') query.role = new RegExp(role, 'i');

    const posts = await LFTPost.find(query)
      .populate('player', 'username profile availabilityStatus')
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createLFTPost = async (req, res) => {
  try {
    const { games, region, rank, role, availability, bio } = req.body;
    if (!games || games.length === 0) {
      return res.status(400).json({ message: 'Preferred games are required' });
    }

    const post = await LFTPost.create({
      player: req.user.id,
      games: Array.isArray(games) ? games : [games],
      region: region || 'Global',
      rank: rank || 'Unranked',
      role: role || 'Flex / Any',
      availability: availability || 'Evenings & Weekends',
      bio: bio || '',
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLFPPosts = async (req, res) => {
  try {
    const { game, region, role } = req.query;
    const query = { status: 'open' };
    const gameRegex = buildGameRegex(game);
    if (gameRegex) query.game = gameRegex;
    if (region && region !== 'all') query.region = new RegExp(region, 'i');
    if (role && role !== 'all') query.requiredRoles = new RegExp(role, 'i');

    const posts = await LFPPost.find(query)
      .populate('team', 'name logo members')
      .populate('captain', 'username profile')
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createLFPPost = async (req, res) => {
  try {
    const { teamId, game, region, minRank, requiredRoles, description } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.captain.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Only team captain can create LFP posts' });
    }

    const post = await LFPPost.create({
      team: team._id,
      captain: req.user.id,
      game,
      region: region || 'Global',
      minRank: minRank || 'Any',
      requiredRoles: Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles],
      description: description || '',
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Friends System & Presence
const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    })
      .populate('requester', 'username profile availabilityStatus createdAt')
      .populate('recipient', 'username profile availabilityStatus createdAt')
      .lean();

    res.json(friendships);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const { recipientUsername } = req.body;
    const recipient = await User.findOne({ username: recipientUsername.trim() });
    if (!recipient) return res.status(404).json({ message: 'Player not found' });
    if (recipient._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot friend yourself' });
    }

    const friendship = await Friendship.create({
      requester: req.user.id,
      recipient: recipient._id,
    });

    res.status(201).json(friendship);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const respondFriendRequest = async (req, res) => {
  try {
    const { friendshipId, action } = req.body; // 'accept', 'reject', 'remove'
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) return res.status(404).json({ message: 'Request not found' });

    if (action === 'accept') {
      friendship.status = 'accepted';
      await friendship.save();
    } else {
      await Friendship.findByIdAndDelete(friendshipId);
    }

    res.json({ message: `Friend request ${action}ed` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Direct Messaging (1-on-1 Chat)
const getDirectMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const messages = await DirectMessage.find({
      $or: [
        { sender: req.user.id, recipient: friendId },
        { sender: friendId, recipient: req.user.id },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, text, attachmentUrl } = req.body;
    if (!text.trim()) return res.status(400).json({ message: 'Message text required' });

    const message = await DirectMessage.create({
      sender: req.user.id,
      recipient: recipientId,
      text: text.trim(),
      attachmentUrl: attachmentUrl || '',
    });

    if (req.io) {
      req.io.to(`user_${recipientId}`).emit('receive_direct_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Digital Arena Wallet
const getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id, balance: 0 });
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const depositWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid deposit amount required' });

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) wallet = await Wallet.create({ user: req.user.id });

    wallet.balance += Number(amount);
    wallet.transactions.push({
      type: 'deposit',
      amount: Number(amount),
      description: 'Wallet Deposit via UPI / Razorpay',
      referenceId: `DEP_${Date.now()}`,
    });

    await wallet.save();
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const withdrawWallet = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const withdrawAmt = Number(amount);

    if (!withdrawAmt || withdrawAmt <= 0) {
      return res.status(400).json({ message: 'Valid withdrawal amount is required' });
    }

    if (!upiId || !upiId.trim()) {
      return res.status(400).json({ message: 'Payout UPI ID or Bank Account details are required for withdrawal' });
    }

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet || wallet.balance < withdrawAmt) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    wallet.balance -= withdrawAmt;
    wallet.transactions.push({
      type: 'withdraw',
      amount: withdrawAmt,
      description: `Wallet Withdrawal to ${upiId.trim()}`,
      referenceId: `WTH_${Date.now()}`,
      status: 'completed',
    });

    await wallet.save();
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Transfer money directly to a specific team member / squadmate
const transferWalletFunds = async (req, res) => {
  try {
    const { recipientId, recipientUsername, amount, teamId, note } = req.body;
    const transferAmount = Number(amount);

    if (!transferAmount || transferAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid transfer amount greater than ₹0.' });
    }

    if (transferAmount < 1) {
      return res.status(400).json({ message: 'Minimum transfer amount is ₹1.' });
    }

    // 1. Locate recipient user
    let recipientUser = null;
    if (recipientId) {
      recipientUser = await User.findById(recipientId);
    } 
    if (!recipientUser && recipientUsername) {
      const cleanInput = recipientUsername.trim().replace(/^@/, '');
      recipientUser = await User.findOne({
        username: { $regex: new RegExp(`^${cleanInput}$`, 'i') }
      });
      if (!recipientUser) {
        recipientUser = await User.findOne({
          email: { $regex: new RegExp(`^${cleanInput}$`, 'i') }
        });
      }
    }

    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient player not found. Please select a valid team member or enter an existing username.' });
    }

    const senderId = (req.user._id || req.user.id).toString();
    const targetRecipientId = (recipientUser._id || recipientUser.id).toString();

    if (senderId === targetRecipientId) {
      return res.status(400).json({ message: 'You cannot transfer funds to yourself.' });
    }

    // 2. Fetch sender wallet
    let senderWallet = await Wallet.findOne({ user: senderId });
    if (!senderWallet || senderWallet.balance < transferAmount) {
      return res.status(400).json({ 
        message: `Insufficient wallet balance. You have ₹${senderWallet?.balance || 0}, but tried to transfer ₹${transferAmount}.` 
      });
    }

    // 3. Optional Team Context
    let teamName = '';
    if (teamId) {
      const teamDoc = await Team.findById(teamId);
      if (teamDoc) teamName = teamDoc.name;
    }

    // 4. Fetch or create recipient wallet
    let recipientWallet = await Wallet.findOne({ user: targetRecipientId });
    if (!recipientWallet) {
      recipientWallet = await Wallet.create({ user: targetRecipientId, balance: 0, transactions: [] });
    }

    const txTimestamp = Date.now();
    const sentRefId = `TRF_OUT_${txTimestamp}_${senderId.slice(-4)}_${targetRecipientId.slice(-4)}`;
    const rcvRefId = `TRF_IN_${txTimestamp}_${senderId.slice(-4)}_${targetRecipientId.slice(-4)}`;

    const sanitizedNote = (note || '').trim();
    const noteSuffix = sanitizedNote ? ` ("${sanitizedNote}")` : '';
    const teamSuffix = teamName ? ` [Squad: ${teamName}]` : '';

    // 5. Deduct from sender
    senderWallet.balance -= transferAmount;
    senderWallet.transactions.push({
      type: 'p2p_transfer_sent',
      amount: transferAmount,
      description: `Transferred ₹${transferAmount} to @${recipientUser.username}${teamSuffix}${noteSuffix}`,
      referenceId: sentRefId,
      status: 'completed',
      createdAt: new Date(),
    });
    await senderWallet.save();

    // 6. Credit to recipient
    recipientWallet.balance += transferAmount;
    recipientWallet.transactions.push({
      type: 'p2p_transfer_received',
      amount: transferAmount,
      description: `Received ₹${transferAmount} from @${req.user.username}${teamSuffix}${noteSuffix}`,
      referenceId: rcvRefId,
      status: 'completed',
      createdAt: new Date(),
    });
    await recipientWallet.save();

    // 7. Notification for recipient
    const { createNotification } = require('../utils/notificationHelper');
    const io = req.app.get('io');
    await createNotification({
      recipient: recipientUser._id,
      sender: req.user._id,
      type: 'wallet_transfer',
      title: `💰 Funds Received: ₹${transferAmount}`,
      message: `@${req.user.username} transferred ₹${transferAmount} directly to your Arena Wallet${teamName ? ` for squad "${teamName}"` : ''}!${sanitizedNote ? ` Message: "${sanitizedNote}"` : ''}`,
      link: '/wallet',
      io,
    });

    // 8. WebSocket emit for real-time live balance update
    if (io) {
      io.to(`user_${targetRecipientId}`).emit('wallet_updated', {
        balanceChange: transferAmount,
        type: 'received',
        sender: req.user.username,
        message: `Received ₹${transferAmount} from @${req.user.username}!`,
      });
      io.emit('wallet_updated', {
        userId: targetRecipientId,
        balanceChange: transferAmount,
      });

      io.to(`user_${senderId}`).emit('wallet_updated', {
        balanceChange: -transferAmount,
        type: 'sent',
        recipient: recipientUser.username,
        message: `Transferred ₹${transferAmount} to @${recipientUser.username}!`,
      });
      io.emit('wallet_updated', {
        userId: senderId,
        balanceChange: -transferAmount,
      });
    }

    res.json({
      message: `🎉 Successfully transferred ₹${transferAmount} to @${recipientUser.username}!`,
      wallet: senderWallet,
      recipient: {
        id: recipientUser._id,
        username: recipientUser.username,
        email: recipientUser.email,
      },
      amount: transferAmount,
      referenceId: sentRefId,
      note: sanitizedNote,
      teamName,
    });
  } catch (error) {
    console.error('[Wallet Transfer Error]:', error);
    res.status(500).json({ message: error.message || 'Failed to complete wallet transfer.' });
  }
};

// 5. QR Code Check-In
const getTournamentQRCode = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const checkInUrl = `http://localhost:5173/tournaments/${tournament._id}?qrcheckin=true`;
    const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl);

    res.json({
      tournamentId: tournament._id,
      tournamentName: tournament.name,
      checkInUrl,
      qrCodeDataUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const scanQRCheckIn = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (!tournament.registeredPlayers.includes(req.user.id)) {
      tournament.registeredPlayers.push(req.user.id);
      await tournament.save();
    }

    res.json({ message: `QR Code Check-In Successful for ${tournament.name}!`, tournament });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Tournament Templates
const getTemplates = async (req, res) => {
  try {
    const templates = await TournamentTemplate.find({ organizer: req.user.id }).lean();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTemplate = async (req, res) => {
  try {
    const template = await TournamentTemplate.create({
      ...req.body,
      organizer: req.user.id,
    });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 7. Hall of Fame
const getHallOfFame = async (req, res) => {
  try {
    const [topEarners, champions, topTeams] = await Promise.all([
      TournamentResult.find({ prizeWon: { $gt: 0 } })
        .populate({
          path: 'player',
          select: 'username profile.avatar profile.equippedFrame profile.equippedTitle profile.equippedBadge',
          match: { role: { $nin: ['admin', 'organizer'] } }
        })
        .sort({ prizeWon: -1 })
        .limit(50)
        .lean(),
      TournamentResult.find({ placement: 1 })
        .populate({
          path: 'player',
          select: 'username profile.avatar profile.equippedFrame profile.equippedTitle profile.equippedBadge',
          match: { role: { $nin: ['admin', 'organizer'] } }
        })
        .populate('tournament', 'name game bannerImage startDate')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Team.find()
        .populate({
          path: 'captain',
          select: 'username profile.avatar profile.equippedFrame profile.equippedTitle',
          match: { role: { $nin: ['admin', 'organizer'] } }
        })
        .sort({ 'stats.wins': -1 })
        .limit(50)
        .lean(),
    ]);

    res.json({
      topEarners: topEarners.filter(t => t.player).slice(0, 10),
      champions: champions.filter(t => t.player).slice(0, 10),
      topTeams: topTeams.filter(t => t.captain).slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. Esports News Feed
const getEsportsNews = async (req, res) => {
  try {
    const news = await EsportsNews.find({ status: 'published' }).sort({ date: -1 }).lean();
    // Fallback message if DB is empty to prevent UI breaking, though it should ideally be seeded
    if (news.length === 0) {
      return res.json([]);
    }
    res.json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 9. AI Match Summary & Recommendations
const generateAIMatchSummary = async (req, res) => {
  try {
    const { tournamentId } = req.body;
    const tournament = await Tournament.findById(tournamentId).populate('organizer', 'username');
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const summaryText = `🤖 **AI Tournament Recap for ${tournament.name}**:\nAfter intense brackets, ${tournament.winnerName || 'The Champions'} secured 1st Place Gold Medal! ${tournament.runnerUpName ? `Runner-up honors awarded to ${tournament.runnerUpName}.` : ''} MVP Honors awarded for dominant K/D performance.`;
    res.json({ summary: summaryText });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAIRecommendations = async (req, res) => {
  try {
    const recommendations = await Tournament.find({ status: 'published' }).limit(3).lean();
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 10. Admin Platform Analytics (DAU, MAU, Revenue, Growth)
const getAdminPlatformAnalytics = async (req, res) => {
  try {
    const [totalUsers, totalTournaments, totalTeams, totalRevenue, gameAggregation] = await Promise.all([
      User.countDocuments(),
      Tournament.countDocuments(),
      Team.countDocuments(),
      Wallet.aggregate([{ $unwind: '$transactions' }, { $match: { 'transactions.type': 'deposit' } }, { $group: { _id: null, total: { $sum: '$transactions.amount' } } }]),
      Tournament.aggregate([
        { $group: { _id: '$game', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 4 },
        { $project: { game: '$_id', count: 1, _id: 0 } }
      ])
    ]);

    res.json({
      dau: totalUsers, // Using actual numbers without artificial padding
      mau: totalUsers,
      newRegistrations: totalUsers,
      totalTournaments,
      totalTeams,
      totalRevenue: totalRevenue[0]?.total || 0,
      mostPlayedGames: gameAggregation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 11. Security, 2FA, Settings & Login History
const updateUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.availabilityStatus) user.availabilityStatus = req.body.availabilityStatus;
    if (req.body.settings) user.settings = { ...user.settings, ...req.body.settings };
    if (req.body.connectedAccounts) user.connectedAccounts = { ...user.connectedAccounts, ...req.body.connectedAccounts };

    await user.save();
    res.json({ message: 'Settings updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLoginHistory = async (req, res) => {
  try {
    let history = await LoginHistory.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10).lean();
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLFTPosts,
  createLFTPost,
  getLFPPosts,
  createLFPPost,
  getFriends,
  sendFriendRequest,
  respondFriendRequest,
  getDirectMessages,
  sendDirectMessage,
  getWallet,
  depositWallet,
  withdrawWallet,
  transferWalletFunds,
  getTournamentQRCode,
  scanQRCheckIn,
  getTemplates,
  createTemplate,
  getHallOfFame,
  getEsportsNews,
  generateAIMatchSummary,
  getAIRecommendations,
  getAdminPlatformAnalytics,
  updateUserSettings,
  getLoginHistory,
};
