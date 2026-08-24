const Follow = require('../models/Follow');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const TournamentResult = require('../models/TournamentResult');
const Match = require('../models/Match');

// @desc    Toggle Follow/Unfollow a Player, Team, or Organizer
// @route   POST /api/follows/toggle
// @access  Private
const toggleFollow = async (req, res) => {
  try {
    const { targetType, targetId } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({ message: 'Target type and target ID are required.' });
    }

    if (!['player', 'team', 'organizer'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid target type.' });
    }

    const followerId = req.user.id;

    // Prevent self-following
    if ((targetType === 'player' || targetType === 'organizer') && targetId.toString() === followerId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    const existingFollow = await Follow.findOne({
      follower: followerId,
      targetType,
      targetId,
    });

    if (existingFollow) {
      // Unfollow
      await Follow.findByIdAndDelete(existingFollow._id);
      const followerCount = await Follow.countDocuments({ targetType, targetId });

      return res.json({
        message: `Successfully unfollowed ${targetType}`,
        isFollowing: false,
        followerCount,
      });
    }

    // Follow
    const follow = await Follow.create({
      follower: followerId,
      targetType,
      targetId,
    });

    const followerCount = await Follow.countDocuments({ targetType, targetId });

    // Send Notification to Target User / Organizer / Captain
    const { createNotification } = require('../utils/notificationHelper');
    let recipientId = null;
    let notifTitle = 'New Follower';
    let notifMessage = `@${req.user.username} started following you on ArenaVerse!`;
    let notifLink = `/players/${req.user.username}`;

    if (targetType === 'player' || targetType === 'organizer') {
      recipientId = targetId;
      notifTitle = targetType === 'organizer' ? 'New Organizer Follower' : 'New Career Follower';
    } else if (targetType === 'team') {
      const team = await Team.findById(targetId);
      if (team) {
        recipientId = team.captain;
        notifTitle = 'New Squad Follower';
        notifMessage = `@${req.user.username} is now following your squad "${team.name}"!`;
      }
    }

    if (recipientId) {
      await createNotification({
        recipient: recipientId,
        sender: followerId,
        type: 'organizer_announcement',
        title: notifTitle,
        message: notifMessage,
        link: notifLink,
        io: req.io,
      });
    }

    res.status(201).json({
      message: `Successfully followed ${targetType}`,
      isFollowing: true,
      followerCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get follow status and follower count for a target
// @route   GET /api/follows/status
// @access  Public (Optional User)
const getFollowStatus = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({ message: 'Target type and target ID required' });
    }

    const followerCount = await Follow.countDocuments({ targetType, targetId });

    let isFollowing = false;
    if (req.user) {
      const existing = await Follow.findOne({
        follower: req.user.id,
        targetType,
        targetId,
      });
      isFollowing = !!existing;
    }

    res.json({
      targetType,
      targetId,
      isFollowing,
      followerCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Activity Feed from followed Players, Teams, & Organizers
// @route   GET /api/follows/activity-feed
// @access  Private
const getActivityFeed = async (req, res) => {
  try {
    const myFollows = await Follow.find({ follower: req.user.id });

    if (myFollows.length === 0) {
      return res.json({
        activities: [],
        followingCount: 0,
      });
    }

    const followedOrganizers = myFollows.filter(f => f.targetType === 'organizer').map(f => f.targetId);
    const followedPlayers = myFollows.filter(f => f.targetType === 'player').map(f => f.targetId);
    const followedTeams = myFollows.filter(f => f.targetType === 'team').map(f => f.targetId);

    const activities = [];

    // 1. Tournaments created by followed organizers
    if (followedOrganizers.length > 0) {
      const tournaments = await Tournament.find({ organizer: { $in: followedOrganizers } })
        .populate('organizer', 'username profile.avatar')
        .sort({ createdAt: -1 })
        .limit(10);

      tournaments.forEach(t => {
        activities.push({
          id: `tourney_${t._id}`,
          type: 'organizer_tournament',
          title: `🏆 New Arena: ${t.name}`,
          message: `@${t.organizer?.username} created a new ${t.game} tournament with prize pool ₹${t.prizePool.toLocaleString('en-IN')}`,
          targetName: t.organizer?.username,
          link: `/tournaments/${t._id}`,
          timestamp: t.createdAt,
        });
      });
    }

    // 2. Tournament Results / Podiums by followed players or teams
    if (followedPlayers.length > 0 || followedTeams.length > 0) {
      const results = await TournamentResult.find({
        $or: [
          { player: { $in: followedPlayers } },
          { team: { $in: followedTeams } },
        ]
      })
        .populate('player', 'username profile.avatar')
        .populate('team', 'name logo')
        .populate('tournament', 'name game')
        .sort({ createdAt: -1 })
        .limit(10);

      results.forEach(r => {
        const entityName = r.team ? r.team.name : (r.player ? `@${r.player.username}` : 'Competitor');
        activities.push({
          id: `result_${r._id}`,
          type: 'tournament_result',
          title: `🥇 #${r.placement} Finish in ${r.tournament?.name || 'Tournament'}`,
          message: `${entityName} achieved Rank #${r.placement} finish (Prize Won: ₹${r.prizeWon.toLocaleString('en-IN')})`,
          targetName: entityName,
          link: r.tournament ? `/tournaments/${r.tournament._id}` : '/leaderboard',
          timestamp: r.createdAt,
        });
      });
    }

    // Sort all activities chronologically
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      activities: activities.slice(0, 20),
      followingCount: myFollows.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Global Arena Activity Feed across 6 categories (Tournaments, Champions, Teams, Matches, Badges, Achievements)
// @route   GET /api/follows/global-activity-feed
// @access  Public
const getGlobalActivityFeed = async (req, res) => {
  try {
    const activities = [];

    // 1. New Tournaments
    const tournaments = await Tournament.find({ status: { $in: ['published', 'ongoing', 'completed'] } })
      .populate('organizer', 'username isVerifiedOrganizer')
      .sort({ createdAt: -1 })
      .limit(6);

    tournaments.forEach(t => {
      activities.push({
        id: `tourney_${t._id}`,
        category: 'tournaments',
        icon: '🏆',
        title: `New Tournament Announced: ${t.name}`,
        message: `${t.game} arena hosted by @${t.organizer?.username || 'Organizer'} (Prize Pool: ₹${(t.prizePool || 0).toLocaleString('en-IN')})`,
        link: `/tournaments/${t._id}`,
        timestamp: t.createdAt,
      });
    });

    // 2. New Champions
    const champions = await TournamentResult.find({ placement: 1 })
      .populate('player', 'username')
      .populate('team', 'name')
      .populate('tournament', 'name game')
      .sort({ createdAt: -1 })
      .limit(6);

    champions.forEach(c => {
      const champName = c.team ? c.team.name : (c.player ? `@${c.player.username}` : 'Champion');
      activities.push({
        id: `champ_${c._id}`,
        category: 'champions',
        icon: '👑',
        title: `Crowned Champion: ${champName}`,
        message: `Won 1st Place Gold Medal in ${c.tournament?.name || 'Tournament'} (Prize Won: ₹${(c.prizeWon || 0).toLocaleString('en-IN')})`,
        link: c.tournament ? `/tournaments/${c.tournament._id}` : '/leaderboard',
        timestamp: c.createdAt,
      });
    });

    // 3. Team Creation
    const teams = await Team.find()
      .populate('captain', 'username')
      .sort({ createdAt: -1 })
      .limit(6);

    teams.forEach(tm => {
      activities.push({
        id: `team_${tm._id}`,
        category: 'teams',
        icon: '🛡️',
        title: `New Squad Formed: "${tm.name}"`,
        message: `Esports squad created by Captain @${tm.captain?.username || 'Captain'} (${tm.members?.length || 1} members)`,
        link: '/player-dashboard',
        timestamp: tm.createdAt,
      });
    });

    // 4. Match Results
    const matches = await Match.find({ status: 'completed' })
      .populate('tournament', 'name game')
      .sort({ updatedAt: -1 })
      .limit(6);

    matches.forEach(m => {
      activities.push({
        id: `match_${m._id}`,
        category: 'matches',
        icon: '⚔️',
        title: `Match Result Finalized (Round ${m.round})`,
        message: `Score in ${m.tournament?.name || 'Tournament'}: ${m.teamAName || 'Team A'} (${m.scoreA}) vs ${m.teamBName || 'Team B'} (${m.scoreB})`,
        link: m.tournament ? `/tournaments/${m.tournament._id}` : '/tournaments',
        timestamp: m.updatedAt,
      });
    });

    // 5. New Badges & MVP Awards
    const mvpMatches = await Match.find({ mvp: { $ne: null } })
      .populate('mvp', 'username')
      .populate('tournament', 'name')
      .sort({ updatedAt: -1 })
      .limit(6);

    mvpMatches.forEach(m => {
      if (m.mvp) {
        activities.push({
          id: `badge_mvp_${m._id}`,
          category: 'badges',
          icon: '⭐',
          title: `Match MVP Honor Awarded`,
          message: `@${m.mvp.username} earned Most Valuable Player honors in ${m.tournament?.name || 'Tournament'}!`,
          link: `/players/${m.mvp.username}`,
          timestamp: m.updatedAt,
        });
      }
    });

    // 6. Player Achievements (Podium Finishers)
    const podiums = await TournamentResult.find({ placement: { $in: [2, 3] } })
      .populate('player', 'username')
      .populate('team', 'name')
      .populate('tournament', 'name')
      .sort({ createdAt: -1 })
      .limit(6);

    podiums.forEach(p => {
      const runnerName = p.team ? p.team.name : (p.player ? `@${p.player.username}` : 'Competitor');
      activities.push({
        id: `podium_${p._id}`,
        category: 'achievements',
        icon: p.placement === 2 ? '🥈' : '🥉',
        title: `Podium Finish: ${runnerName}`,
        message: `Secured #${p.placement} Place Finish in ${p.tournament?.name || 'Tournament'}!`,
        link: p.player ? `/players/${p.player.username}` : '/leaderboard',
        timestamp: p.createdAt,
      });
    });

    // Sort all activities chronologically
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      activities: activities.slice(0, 30),
      totalCount: activities.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  toggleFollow,
  getFollowStatus,
  getActivityFeed,
  getGlobalActivityFeed,
};
