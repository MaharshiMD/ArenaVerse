const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Team = require('../models/Team');
const TournamentReview = require('../models/TournamentReview');
const { buildGameRegex } = require('../utils/gameUtils');

// @desc    Advanced Multi-Entity Search & Filtering
// @route   GET /api/search
// @access  Public
const searchAdvanced = async (req, res) => {
  try {
    const {
      q = '',
      type = 'all',
      game = '',
      status = '',
      minPrize,
      maxPrize,
      minFee,
      maxFee,
      feeType = '',
      region = '',
      format = '', // 'solo', 'duo', 'team'
      organizer = '', // Organizer username or ID
      dateFilter = '', // 'upcoming', 'today', 'past'
    } = req.query;

    const searchRegex = q.trim() ? new RegExp(q.trim(), 'i') : null;
    const gameRegex = buildGameRegex(game);

    let tournaments = [];
    let players = [];
    let teams = [];
    let organizers = [];

    // Build queries for all 4 categories
    const tourneyQuery = {};
    if (searchRegex) {
      tourneyQuery.$or = [
        { name: searchRegex },
        { game: searchRegex },
        { rules: searchRegex },
      ];
    }
    if (gameRegex) {
      tourneyQuery.game = { $regex: gameRegex };
    }
    if (status && status !== 'all') {
      tourneyQuery.status = status;
    }
    if (region && region !== 'all') {
      tourneyQuery.region = { $regex: new RegExp(region.trim(), 'i') };
    }
    if (format && format !== 'all') {
      tourneyQuery.type = format;
    }
    if (dateFilter === 'upcoming') {
      tourneyQuery.startDate = { $gte: new Date() };
    } else if (dateFilter === 'past') {
      tourneyQuery.startDate = { $lt: new Date() };
    } else if (dateFilter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      tourneyQuery.startDate = { $gte: startOfDay, $lte: endOfDay };
    }
    if (organizer && organizer !== 'all') {
      const orgUser = await User.findOne({ username: { $regex: new RegExp(`^${organizer.trim()}$`, 'i') } });
      if (orgUser) {
        tourneyQuery.organizer = orgUser._id;
      }
    }
    if (feeType === 'free') {
      tourneyQuery.entryFee = 0;
    } else if (feeType === 'paid') {
      tourneyQuery.entryFee = { $gt: 0 };
    } else if (minFee || maxFee) {
      tourneyQuery.entryFee = {};
      if (minFee !== undefined && minFee !== '') tourneyQuery.entryFee.$gte = Number(minFee);
      if (maxFee !== undefined && maxFee !== '') tourneyQuery.entryFee.$lte = Number(maxFee);
    }
    if (minPrize || maxPrize) {
      tourneyQuery.prizePool = {};
      if (minPrize !== undefined && minPrize !== '') tourneyQuery.prizePool.$gte = Number(minPrize);
      if (maxPrize !== undefined && maxPrize !== '') tourneyQuery.prizePool.$lte = Number(maxPrize);
    }

    const playerQuery = { role: 'player' };
    if (searchRegex) {
      playerQuery.$or = [
        { username: searchRegex },
        { 'profile.bio': searchRegex },
        { 'profile.favoriteGames': searchRegex },
      ];
    }
    if (gameRegex) {
      playerQuery['profile.favoriteGames'] = { $regex: gameRegex };
    }

    const teamQuery = {};
    if (searchRegex) {
      teamQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    const organizerQuery = { role: { $in: ['organizer', 'admin'] } };
    if (searchRegex) {
      organizerQuery.$or = [
        { username: searchRegex },
        { 'profile.bio': searchRegex },
      ];
    }

    // Always count documents across all 4 categories
    const [tournamentsCount, playersCount, teamsCount, organizersCount] = await Promise.all([
      Tournament.countDocuments(tourneyQuery),
      User.countDocuments(playerQuery),
      Team.countDocuments(teamQuery),
      User.countDocuments(organizerQuery),
    ]);

    // Fetch items based on active type filter
    if (type === 'all' || type === 'tournaments') {
      tournaments = await Tournament.find(tourneyQuery)
        .populate('organizer', 'username profile.avatar role isVerifiedOrganizer')
        .sort({ startDate: 1 })
        .lean();
    }

    if (type === 'all' || type === 'players') {
      players = await User.find(playerQuery)
        .select('username profile role createdAt')
        .limit(20);
    }

    if (type === 'all' || type === 'teams') {
      teams = await Team.find(teamQuery)
        .populate('captain', 'username profile.avatar')
        .populate('members', 'username profile.avatar')
        .limit(20);
    }

    if (type === 'all' || type === 'organizers') {
      const organizerDocs = await User.find(organizerQuery)
        .select('username profile role createdAt')
        .limit(20);

      organizers = await Promise.all(
        organizerDocs.map(async (org) => {
          const reviews = await TournamentReview.find({ organizer: org._id });
          const totalReviews = reviews.length;
          const avgRating = totalReviews > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)) : 5.0;
          const hostedCount = await Tournament.countDocuments({ organizer: org._id });

          return {
            id: org._id,
            username: org.username,
            profile: org.profile,
            role: org.role,
            averageRating: avgRating,
            totalReviews,
            hostedCount,
          };
        })
      );
    }

    res.json({
      tournaments,
      players,
      teams,
      organizers,
      counts: {
        tournaments: tournamentsCount,
        players: playersCount,
        teams: teamsCount,
        organizers: organizersCount,
      },
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  searchAdvanced,
};
