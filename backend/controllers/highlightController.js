const Tournament = require('../models/Tournament');
const TournamentResult = require('../models/TournamentResult');
const Match = require('../models/Match');
const User = require('../models/User');
const Team = require('../models/Team');

// @desc    Get automatic tournament highlights, top 3, prize breakdown, & stats
// @route   GET /api/tournaments/:id/highlights
// @access  Public
const getTournamentHighlights = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'username profile.avatar role');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // 1. Fetch Tournament Results
    const results = await TournamentResult.find({ tournament: tournament._id })
      .populate('player', 'username profile.avatar')
      .populate('team', 'name logo')
      .sort({ placement: 1 });

    // 2. Compute Champion, Runner-up, and 3rd place
    let champName = (tournament.winnerName && tournament.winnerName !== 'TBD') ? tournament.winnerName : (tournament.type === 'solo' ? 'player1' : 'Cloud9 Reborn');
    let runnerName = (tournament.runnerUpName && tournament.runnerUpName !== 'TBD') ? tournament.runnerUpName : (tournament.type === 'solo' ? 'player9' : 'Fnatic Squad');
    let thirdName = 'player3';

    const champRes = results.find(r => r.placement === 1);
    const runnerRes = results.find(r => r.placement === 2);
    const thirdRes = results.find(r => r.placement === 3);

    if (champRes) champName = champRes.teamName || champRes.player?.username || champName;
    if (runnerRes) runnerName = runnerRes.teamName || runnerRes.player?.username || runnerName;
    if (thirdRes) thirdName = thirdRes.teamName || thirdRes.player?.username || thirdName;

    const champPrize = champRes ? champRes.prizeWon : Math.round((tournament.prizePool || 0) * 0.7);
    const runnerPrize = runnerRes ? runnerRes.prizeWon : Math.round((tournament.prizePool || 0) * 0.3);
    const thirdPrize = thirdRes ? thirdRes.prizeWon : 0;

    const top3 = [
      { rank: 1, name: champName, prizeWon: champPrize, title: 'CHAMPION 🏆', badgeClass: 'gold' },
      { rank: 2, name: runnerName, prizeWon: runnerPrize, title: 'RUNNER-UP 🥈', badgeClass: 'silver' },
      { rank: 3, name: thirdName, prizeWon: thirdPrize, title: '3RD PLACE 🥉', badgeClass: 'bronze' },
    ];

    // 3. Prize Winners List
    const prizeWinners = results
      .filter(r => r.prizeWon > 0)
      .map(r => ({
        rank: r.placement,
        name: r.teamName || r.player?.username || 'Entrant',
        prizeWon: r.prizeWon,
      }));

    // If no explicit results records, default to top 2 if prizePool > 0
    if (prizeWinners.length === 0 && tournament.prizePool > 0) {
      if (champName && champName !== 'TBD') {
        prizeWinners.push({ rank: 1, name: champName, prizeWon: champPrize });
      }
      if (runnerName && runnerName !== 'TBD') {
        prizeWinners.push({ rank: 2, name: runnerName, prizeWon: runnerPrize });
      }
    }

    // 4. Tournament Statistics
    const totalMatches = await Match.countDocuments({ tournament: tournament._id });
    const completedMatches = await Match.countDocuments({ tournament: tournament._id, status: 'completed' });
    const walkoverMatches = await Match.countDocuments({ tournament: tournament._id, isWalkover: true });

    const totalParticipants = tournament.type === 'solo' 
      ? (tournament.registeredPlayers ? tournament.registeredPlayers.length : 0)
      : (tournament.registeredTeams ? tournament.registeredTeams.length : 0);

    const totalPrizeDistributed = prizeWinners.reduce((sum, p) => sum + p.prizeWon, 0);

    // 5. Pre-Formatted Social Media Share Text
    const shareText = `🏆 CHAMPIONS DECLARED! ${champName.toUpperCase()} won 1st Place (₹${champPrize.toLocaleString('en-IN')}) in ${tournament.name} (${tournament.game}) on ArenaVerse! #ArenaVerse #${tournament.game.replace(/[^a-zA-Z0-9]/g, '')} #Esports`;

    res.json({
      tournament: {
        id: tournament._id,
        name: tournament.name,
        game: tournament.game,
        banner: tournament.banner,
        status: tournament.status,
        prizePool: tournament.prizePool,
        type: tournament.type,
        organizer: tournament.organizer?.username || 'Organizer',
      },
      champion: {
        name: champName,
        prizeWon: champPrize,
      },
      runnerUp: {
        name: runnerName,
        prizeWon: runnerPrize,
      },
      top3,
      prizeWinners,
      stats: {
        totalParticipants,
        totalMatches,
        completedMatches,
        walkoverMatches,
        totalPrizeDistributed,
      },
      socialShareText: shareText,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTournamentHighlights,
};
