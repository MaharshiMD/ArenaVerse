const Tournament = require('../models/Tournament');
const TournamentResult = require('../models/TournamentResult');
const Team = require('../models/Team');
const { generateCertificateStream } = require('../utils/certificateGenerator');

// Helper function to format tournament result declare date (e.g. AUG. 13TH 2026)
const formatCertificateDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[validDate.getMonth()];
  const day = validDate.getDate();
  const year = validDate.getFullYear();

  let suffix = 'TH';
  if (day === 1 || day === 21 || day === 31) suffix = 'ST';
  else if (day === 2 || day === 22) suffix = 'ND';
  else if (day === 3 || day === 23) suffix = 'RD';

  return `${month}. ${day}${suffix} ${year}`;
};

// @desc    Generate and download downloadable PDF certificate
// @route   GET /api/tournaments/:id/certificate
// @access  Private (Only Tournament Champion / Runner-Up for their own certificate)
const downloadTournamentCertificate = async (req, res) => {
  try {
    let { type } = req.query; // 'champion' or 'runnerup'
    const tournamentId = req.params.id || req.params.tournamentId;

    if (!type || (type !== 'champion' && type !== 'runnerup')) {
      return res.status(400).json({
        message: 'Invalid certificate type. Only Champion and Runner-Up certificates are available.',
      });
    }

    const tournament = await Tournament.findById(tournamentId).populate('organizer', 'username');
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'completed') {
      return res.status(400).json({
        message: 'Certificates can only be downloaded after the tournament is completed.',
      });
    }

    const userIdStr = req.user._id.toString();
    const usernameLower = (req.user.username || '').toLowerCase();

    // Check user's teams
    const userTeams = await Team.find({ members: req.user._id });
    const userTeamIds = new Set(userTeams.map(t => t._id.toString()));
    const userTeamNames = new Set(userTeams.map(t => (t.name || '').toLowerCase()));

    // Get official tournament placement results
    const results = await TournamentResult.find({ tournament: tournamentId }).populate('player', 'username');
    const champResult = results.find(r => r.placement === 1);
    const runnerResult = results.find(r => r.placement === 2);

    // Verify if user is Champion
    const isSoloChampion = (
      (champResult && champResult.player && (champResult.player._id?.toString() === userIdStr || champResult.player.toString() === userIdStr)) ||
      (tournament.winner && tournament.winner.toString() === userIdStr) ||
      (tournament.winnerName && tournament.winnerName !== 'TBD' && tournament.winnerName.toLowerCase() === usernameLower)
    );

    const isTeamChampion = (
      (champResult && champResult.team && userTeamIds.has(champResult.team.toString())) ||
      (tournament.winnerName && tournament.winnerName !== 'TBD' && userTeamNames.has(tournament.winnerName.toLowerCase()))
    );

    const isChampion = isSoloChampion || isTeamChampion;

    // Verify if user is Runner-Up
    const isSoloRunnerUp = (
      (runnerResult && runnerResult.player && (runnerResult.player._id?.toString() === userIdStr || runnerResult.player.toString() === userIdStr)) ||
      (tournament.runnerUpName && tournament.runnerUpName !== 'TBD' && tournament.runnerUpName.toLowerCase() === usernameLower)
    );

    const isTeamRunnerUp = (
      (runnerResult && runnerResult.team && userTeamIds.has(runnerResult.team.toString())) ||
      (tournament.runnerUpName && tournament.runnerUpName !== 'TBD' && userTeamNames.has(tournament.runnerUpName.toLowerCase()))
    );

    const isRunnerUp = isSoloRunnerUp || isTeamRunnerUp;

    // Strict Authorization: Only the winner can download champion certificate, only runner-up can download runner-up certificate
    if (type === 'champion' && !isChampion) {
      return res.status(403).json({
        message: 'Access Denied: Only the Champion player/team can download this Champion Certificate.',
      });
    }

    if (type === 'runnerup' && !isRunnerUp) {
      return res.status(403).json({
        message: 'Access Denied: Only the Runner-Up player/team can download this Runner-Up Certificate.',
      });
    }

    // Determine recipient name strictly for the authenticated player
    let recipientName = req.user.username;
    if (tournament.type === 'team') {
      if (type === 'champion' && tournament.winnerName && tournament.winnerName !== 'TBD') {
        recipientName = `${req.user.username} (${tournament.winnerName})`;
      } else if (type === 'runnerup' && tournament.runnerUpName && tournament.runnerUpName !== 'TBD') {
        recipientName = `${req.user.username} (${tournament.runnerUpName})`;
      }
    }

    let prizeWon = 0;
    if (type === 'champion') {
      prizeWon = champResult ? champResult.prizeWon : Math.round((tournament.prizePool || 0) * 0.7);
    } else if (type === 'runnerup') {
      prizeWon = runnerResult ? runnerResult.prizeWon : Math.round((tournament.prizePool || 0) * 0.3);
    }

    const certId = `AV-${tournament._id.toString().slice(-6).toUpperCase()}-${type.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const resultDeclareDate = tournament.completedAt || tournament.updatedAt || tournament.endDate || tournament.createdAt || Date.now();
    const formattedDateString = formatCertificateDate(resultDeclareDate);

    // Stream PDF certificate to client
    generateCertificateStream({
      res,
      recipientName,
      tournamentName: tournament.name,
      gameTitle: tournament.game,
      type,
      prizeWon,
      dateString: formattedDateString,
      certificateId: certId,
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get certificates earned by current logged-in user
// @route   GET /api/certificates/my-certificates
// @access  Private
const getUserCertificates = async (req, res) => {
  try {
    const userIdStr = req.user._id.toString();
    const usernameLower = (req.user.username || '').toLowerCase();

    const userTeams = await Team.find({ members: req.user._id });
    const userTeamIds = new Set(userTeams.map(t => t._id.toString()));
    const userTeamNames = new Set(userTeams.map(t => (t.name || '').toLowerCase()));

    // 1. Find from TournamentResult where user has placement 1 or 2
    const results = await TournamentResult.find({
      $or: [
        { player: req.user._id, placement: { $in: [1, 2] } },
        { team: { $in: Array.from(userTeamIds) }, placement: { $in: [1, 2] } },
      ],
    }).populate('tournament');

    const certMap = new Map();

    results.forEach((r) => {
      if (!r.tournament || r.tournament.status !== 'completed') return;
      const tId = r.tournament._id.toString();
      const certType = r.placement === 1 ? 'champion' : 'runnerup';
      const key = `${tId}_${certType}`;
      if (!certMap.has(key)) {
        certMap.set(key, {
          tournament: r.tournament,
          certType,
          placement: r.placement,
          recipientName: req.user.username,
          prizeWon: r.prizeWon || (r.placement === 1 ? Math.round((r.tournament.prizePool || 0) * 0.7) : Math.round((r.tournament.prizePool || 0) * 0.3)),
          date: r.tournament.completedAt || r.tournament.updatedAt || r.tournament.endDate,
        });
      }
    });

    // 2. Also check completed tournaments matching winnerName/runnerUpName
    const completedTournaments = await Tournament.find({ status: 'completed' });
    completedTournaments.forEach((t) => {
      const tId = t._id.toString();

      // Check champion
      const isChamp = (
        (t.winner && t.winner.toString() === userIdStr) ||
        (t.winnerName && t.winnerName !== 'TBD' && (t.winnerName.toLowerCase() === usernameLower || userTeamNames.has(t.winnerName.toLowerCase())))
      );
      if (isChamp && !certMap.has(`${tId}_champion`)) {
        certMap.set(`${tId}_champion`, {
          tournament: t,
          certType: 'champion',
          placement: 1,
          recipientName: req.user.username,
          prizeWon: Math.round((t.prizePool || 0) * 0.7),
          date: t.completedAt || t.updatedAt || t.endDate,
        });
      }

      // Check runner-up
      const isRunner = (
        (t.runnerUpName && t.runnerUpName !== 'TBD' && (t.runnerUpName.toLowerCase() === usernameLower || userTeamNames.has(t.runnerUpName.toLowerCase())))
      );
      if (isRunner && !certMap.has(`${tId}_runnerup`)) {
        certMap.set(`${tId}_runnerup`, {
          tournament: t,
          certType: 'runnerup',
          placement: 2,
          recipientName: req.user.username,
          prizeWon: Math.round((t.prizePool || 0) * 0.3),
          date: t.completedAt || t.updatedAt || t.endDate,
        });
      }
    });

    res.json({
      certificates: Array.from(certMap.values()),
    });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  downloadTournamentCertificate,
  getUserCertificates,
};
