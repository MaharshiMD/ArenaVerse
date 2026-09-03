const User = require('../models/User');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const TournamentResult = require('../models/TournamentResult');
const { buildGameRegex } = require('../utils/gameUtils');

// @desc    Get global, game-wise, weekly, monthly, and all-time player rankings
// @route   GET /api/leaderboard
// @access  Public
const getLeaderboard = async (req, res) => {
  try {
    const { game, timeframe } = req.query;

    // Build timeframe date query
    let dateFilter = null;
    const now = new Date();
    if (timeframe === 'weekly') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'monthly') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Find all users (players/competitors), excluding admins and organizers
    const players = await User.find({ role: { $nin: ['admin', 'organizer'] } }).select('username profile role');

    // Fetch all teams for team membership lookups
    const teams = await Team.find({}).select('name members');

    // Build tournament filter for game
    let tournamentQuery = {};
    const gameRegex = buildGameRegex(game);
    if (gameRegex) {
      tournamentQuery.game = gameRegex;
    }
    if (dateFilter) {
      tournamentQuery.startDate = { $gte: dateFilter };
    }

    const filteredTournaments = await Tournament.find(tournamentQuery).select('_id name game startDate');
    const tournamentIds = filteredTournaments.map(t => t._id);

    // Query tournament results matching tournament filter
    let resultQuery = { tournament: { $in: tournamentIds } };
    if (dateFilter) {
      resultQuery.createdAt = { $gte: dateFilter };
    }

    const allResults = await TournamentResult.find(resultQuery).populate('tournament', 'name game startDate');

    // Query matches matching tournament filter
    let matchQuery = { tournament: { $in: tournamentIds } };
    if (dateFilter) {
      matchQuery.createdAt = { $gte: dateFilter };
    }
    const allMatches = await Match.find(matchQuery);

    // Compute ranking stats per player
    const leaderboardData = players.map(user => {
      // Find current team
      const userTeam = teams.find(t => t.members.some(m => m.toString() === user._id.toString()));

      // Filter player's tournament results
      const userResults = allResults.filter(r => r.player && r.player.toString() === user._id.toString());

      const totalTournaments = userResults.length;
      const wins = userResults.filter(r => r.placement === 1).length;
      const runnerUps = userResults.filter(r => r.placement === 2).length;
      const podiums = userResults.filter(r => r.placement >= 1 && r.placement <= 3).length;
      const prizeMoney = userResults.reduce((sum, r) => sum + (r.prizeWon || 0), 0);
      const winRate = totalTournaments > 0 ? Number(((wins / totalTournaments) * 100).toFixed(1)) : 0;

      // Find user's matches
      const userTeamIds = teams.filter(t => t.members.some(m => m.toString() === user._id.toString())).map(t => t._id.toString());
      const userMatches = allMatches.filter(m => {
        const isTeamA = m.teamA.id && (m.teamA.id.toString() === user._id.toString() || userTeamIds.includes(m.teamA.id.toString()));
        const isTeamB = m.teamB.id && (m.teamB.id.toString() === user._id.toString() || userTeamIds.includes(m.teamB.id.toString()));
        return isTeamA || isTeamB;
      });

      const totalMatches = userMatches.length;
      const matchesWon = userMatches.filter(m => {
        if (m.status !== 'completed' || !m.winner) return false;
        const winnerId = m.winner.toString();
        return winnerId === user._id.toString() || userTeamIds.includes(winnerId);
      }).length;

      // Calculate rating points formula:
      // (Wins * 100) + (RunnerUps * 60) + (Podiums * 30) + (MatchesWon * 10) + Math.floor(Prize / 100) + Math.floor(WinRate)
      const points = (wins * 100) + (runnerUps * 60) + (podiums * 30) + (matchesWon * 10) + Math.floor(prizeMoney / 100) + Math.floor(winRate);

      return {
        user: {
          id: user._id,
          username: user.username,
          avatar: user.profile?.avatar || '',
          role: user.role,
        },
        teamName: userTeam ? userTeam.name : 'Free Agent',
        totalTournaments,
        wins,
        runnerUps,
        podiums,
        matchesWon,
        totalMatches,
        winRate,
        prizeMoney,
        points,
      };
    });

    // Sort by points descending, then wins descending, then prizeMoney descending
    leaderboardData.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.prizeMoney - a.prizeMoney;
    });

    // Assign ranks
    const rankedLeaderboard = leaderboardData.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    // Available games for filtering across all tournaments in the system
    const distinctGames = await Tournament.distinct('game');
    const availableGames = ['all', ...distinctGames.filter(Boolean)];

    res.json({
      leaderboard: rankedLeaderboard,
      filters: {
        game: game || 'all',
        timeframe: timeframe || 'all',
        availableGames,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLeaderboard,
};
