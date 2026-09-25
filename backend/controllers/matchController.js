const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const TournamentResult = require('../models/TournamentResult');
const Wallet = require('../models/Wallet');
const FinancialTransaction = require('../models/FinancialTransaction');
const { finalizeTournamentCompletion } = require('../utils/tournamentFinalizer');

const processPayout = async (tournamentId, userId, amount, position) => {
  if (!amount || amount <= 0) return;
  
  const existingPayout = await FinancialTransaction.findOne({
    tournament: tournamentId,
    user: userId,
    type: 'PRIZE_PAYOUT'
  });
  if (existingPayout) return; 
  
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, balance: 0 });
  }
  
  wallet.balance += amount;
  const refId = `PAYOUT_${Date.now()}_${tournamentId.toString().slice(-6)}_${userId.toString().slice(-6)}`;
  wallet.transactions.push({
    type: 'prize_payout',
    amount: amount,
    description: `Prize Payout for Position ${position} in tournament.`,
    referenceId: refId,
    status: 'completed',
    createdAt: new Date(),
  });
  await wallet.save();

  await FinancialTransaction.create({
    transactionId: refId,
    tournament: tournamentId,
    user: userId,
    type: 'PRIZE_PAYOUT',
    amount: amount,
    currency: 'INR',
    status: 'SUCCESS'
  });
};

const getPrizeAmount = (distribution, position) => {
  if (!distribution || !Array.isArray(distribution)) return 0;
  const pd = distribution.find(d => d.position === position);
  return pd ? pd.amount : 0;
};

const createTournamentResults = async (tournamentId, winnerId, loserId, io) => {
  return await finalizeTournamentCompletion(tournamentId, { winnerId, loserId, io });
};

// @desc    Update match score and progress winner
// @route   PUT /api/matches/:id/score
// @access  Private (Organizer/Admin only)
const updateMatchScore = async (req, res) => {
  const { scoreA, scoreB } = req.body;
  const matchId = req.params.id;

  try {
    const match = await Match.findById(matchId).populate('tournament');
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const tournament = match.tournament;

    // Check authorization
    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to record scores for this match' });
    }

    const numScoreA = Number(scoreA);
    const numScoreB = Number(scoreB);

    if (isNaN(numScoreA) || isNaN(numScoreB) || numScoreA < 0 || numScoreB < 0) {
      return res.status(400).json({ message: 'Valid non-negative scores are required' });
    }

    const matchFormat = match.matchFormat || tournament.clashSquadSettings?.matchFormat;
    let targetWins = null;
    if (matchFormat === 'BO1') targetWins = 1;
    else if (matchFormat === 'BO3') targetWins = 2;
    else if (matchFormat === 'BO5') targetWins = 3;

    const requestedStatus = req.body.status || 'completed';

    // If organizer is marking the match as ongoing / live with a partial score
    if (requestedStatus === 'live') {
      match.scoreA = numScoreA;
      match.scoreB = numScoreB;
      match.status = 'live';
      await match.save();

      if (req.io) {
        req.io.to(`tournament_${tournament._id.toString()}`).emit('match_updated', {
          matchId: match._id,
          status: 'live',
          scoreA: match.scoreA,
          scoreB: match.scoreB,
        });
      }
      return res.json({ message: 'Match is now live', match });
    }

    if (numScoreA === numScoreB) {
      return res.status(400).json({ message: 'Matches in brackets cannot end in a draw' });
    }

    if (targetWins !== null) {
      const maxScore = Math.max(numScoreA, numScoreB);
      const minScore = Math.min(numScoreA, numScoreB);
      if (maxScore !== targetWins || minScore >= targetWins) {
        return res.status(400).json({
          message: `Invalid score for ${matchFormat}. First team to reach ${targetWins} win(s) wins the match (e.g. ${targetWins}-0 or ${targetWins}-${targetWins - 1}).`,
        });
      }
    }

    // Set score and winner
    match.scoreA = numScoreA;
    match.scoreB = numScoreB;
    const winnerId = match.scoreA > match.scoreB ? match.teamA.id : match.teamB.id;
    const winnerName = match.scoreA > match.scoreB ? match.teamA.name : match.teamB.name;
    const loserId = match.scoreA > match.scoreB ? match.teamB.id : match.teamA.id;
    const loserName = match.scoreA > match.scoreB ? match.teamB.name : match.teamA.name;

    match.winner = winnerId;
    match.status = 'completed';
    await match.save();

    // Progress Winner
    if (match.nextMatchId) {
      const nextMatch = await Match.findById(match.nextMatchId);
      if (nextMatch) {
        // Determine target slot in next match (teamA or teamB)
        const targetSlot = match.nextMatchSlot || (
          match.bracketType === 'losers' ? 'teamB' : (match.position % 2 !== 0 ? 'teamA' : 'teamB')
        );

        if (targetSlot === 'teamA') {
          nextMatch.teamA.id = winnerId;
          nextMatch.teamA.name = winnerName;
        } else {
          nextMatch.teamB.id = winnerId;
          nextMatch.teamB.name = winnerName;
        }
        await nextMatch.save();
      }
    } else {
      // No next match => This is the Grand Final
      tournament.status = 'completed';
      tournament.winnerName = winnerName;
      tournament.runnerUpName = loserName;
      await tournament.save();
      await finalizeTournamentCompletion(tournament._id, {
        winnerId,
        loserId,
        io: req.io,
      });
    }

    // Progress Loser (For Double Elimination Loser Bracket)
    if (match.loserDropMatchId && loserId) {
      const loserMatch = await Match.findById(match.loserDropMatchId);
      if (loserMatch) {
        if (!loserMatch.teamA.id || loserMatch.teamA.name === 'TBD') {
          loserMatch.teamA.id = loserId;
          loserMatch.teamA.name = loserName;
        } else {
          loserMatch.teamB.id = loserId;
          loserMatch.teamB.name = loserName;
        }
        await loserMatch.save();
      }
    }

    // Emit live update event if socket server is attached
    if (req.io) {
      // Fetch all matches and populated tournament to send complete updated payload
      const matches = await Match.find({ tournament: tournament._id })
        .populate({
          path: 'teamA.id',
          populate: { path: 'members captain', select: 'username email profile' }
        })
        .populate({
          path: 'teamB.id',
          populate: { path: 'members captain', select: 'username email profile' }
        })
        .populate('mvp', 'username email profile role')
        .sort({ round: 1, position: 1 });
      const fullTournament = await Tournament.findById(tournament._id)
        .populate('organizer', 'username email')
        .populate('registeredPlayers', 'username email profile')
        .populate({
          path: 'registeredTeams',
          populate: { path: 'members captain', select: 'username email profile' }
        });

      req.io.to(`tournament_${tournament._id.toString()}`).emit('match_updated', {
        matches,
        status: tournament.status,
        tournament: fullTournament,
      });
    }

    // Trigger match_result notifications for teamA and teamB participants
    const { createNotification } = require('../utils/notificationHelper');
    const participantIds = [match.teamA?.id, match.teamB?.id].filter(Boolean);
    for (const pId of participantIds) {
      // If pId is a team, notify team members
      if (tournament.type !== 'solo') {
        const teamDoc = await Team.findById(pId);
        if (teamDoc) {
          for (const mId of teamDoc.members) {
            await createNotification({
              recipient: mId,
              sender: req.user._id,
              type: 'match_result',
              title: `Match Result Finalized - Round ${match.round}`,
              message: `Match score in "${tournament.name}": ${match.teamA.name} (${scoreA}) vs ${match.teamB.name} (${scoreB}).`,
              link: `/tournaments/${tournament._id}`,
              io: req.io,
            });
          }
        }
      } else {
        await createNotification({
          recipient: pId,
          sender: req.user._id,
          type: 'match_result',
          title: `Match Result Finalized - Round ${match.round}`,
          message: `Match score in "${tournament.name}": ${match.teamA.name} (${scoreA}) vs ${match.teamB.name} (${scoreB}).`,
          link: `/tournaments/${tournament._id}`,
          io: req.io,
        });
      }
    }

    res.json({
      message: 'Match score updated and participants progressed successfully',
      match,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check-in for a match (Player / Team member)
// @route   POST /api/matches/:id/checkin
// @access  Private
const checkInMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const userIdStr = req.user._id.toString();
    let isTeamA = false;
    let isTeamB = false;

    if (tournament.type === 'solo') {
      if (match.teamA?.id && match.teamA.id.toString() === userIdStr) isTeamA = true;
      if (match.teamB?.id && match.teamB.id.toString() === userIdStr) isTeamB = true;
    } else {
      if (match.teamA?.id) {
        const teamA = await Team.findById(match.teamA.id);
        if (teamA && teamA.members.some(mId => mId.toString() === userIdStr)) isTeamA = true;
      }
      if (match.teamB?.id) {
        const teamB = await Team.findById(match.teamB.id);
        if (teamB && teamB.members.some(mId => mId.toString() === userIdStr)) isTeamB = true;
      }
    }

    if (!isTeamA && !isTeamB && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not a participant in this match' });
    }

    if (isTeamA) match.checkInA = true;
    if (isTeamB) match.checkInB = true;

    if (!match.checkInDeadline) {
      match.checkInDeadline = new Date(Date.now() + (tournament.checkInWindowMinutes || 15) * 60 * 1000);
    }

    await match.save();

    // Emit live Socket.io update event
    if (req.io) {
      const matches = await Match.find({ tournament: tournament._id }).sort({ round: 1, position: 1 });
      req.io.to(`tournament_${tournament._id.toString()}`).emit('match_updated', {
        matches,
        status: tournament.status,
      });
    }

    res.json({
      message: 'Check-in successful',
      match,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Evaluate check-in deadline and award automatic walkover if configured
// @route   POST /api/matches/:id/walkover
// @access  Private (Organizer / Admin / Internal System)
const processMatchWalkover = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ message: 'Match is already completed' });
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const { createNotification } = require('../utils/notificationHelper');

    // Case 1: Team A checked in, Team B failed to check in
    if (match.checkInA && !match.checkInB) {
      match.isWalkover = true;
      match.walkoverReason = `No-show walkover: ${match.teamB.name} failed to check in before deadline.`;

      // Trigger automatic walkover score update
      req.body = {
        scoreA: 1,
        scoreB: 0,
        winnerId: match.teamA.id.toString(),
        winnerName: match.teamA.name,
      };

      // Notify organizer of walkover
      await createNotification({
        recipient: tournament.organizer,
        sender: req.user._id,
        type: 'organizer_announcement',
        title: `Walkover Declared - Round ${match.round}`,
        message: `${match.walkoverReason} Victory awarded to ${match.teamA.name}.`,
        link: `/tournaments/${tournament._id}`,
        io: req.io,
      });

      return updateMatchScore(req, res);
    }

    // Case 2: Team B checked in, Team A failed to check in
    if (!match.checkInA && match.checkInB) {
      match.isWalkover = true;
      match.walkoverReason = `No-show walkover: ${match.teamA.name} failed to check in before deadline.`;

      req.body = {
        scoreA: 0,
        scoreB: 1,
        winnerId: match.teamB.id.toString(),
        winnerName: match.teamB.name,
      };

      // Notify organizer of walkover
      await createNotification({
        recipient: tournament.organizer,
        sender: req.user._id,
        type: 'organizer_announcement',
        title: `Walkover Declared - Round ${match.round}`,
        message: `${match.walkoverReason} Victory awarded to ${match.teamB.name}.`,
        link: `/tournaments/${tournament._id}`,
        io: req.io,
      });

      return updateMatchScore(req, res);
    }

    // Case 3: Both failed to check in
    if (!match.checkInA && !match.checkInB) {
      // Notify organizer that both failed to check in
      await createNotification({
        recipient: tournament.organizer,
        sender: req.user._id,
        type: 'organizer_announcement',
        title: `Match Double No-Show - Round ${match.round}`,
        message: `Both ${match.teamA.name} and ${match.teamB.name} failed to check in before deadline. Organizer action required.`,
        link: `/tournaments/${tournament._id}`,
        io: req.io,
      });

      return res.json({ message: 'Both teams failed check-in. Organizer notified for manual review.', match });
    }

    res.json({ message: 'Both participants are checked in and ready.', match });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Select Match MVP (Organizer / Admin)
// @route   PUT /api/matches/:id/mvp
// @access  Private (Organizer / Admin)
const setMatchMVP = async (req, res) => {
  const { mvpUserId, comment } = req.body;

  try {
    if (!mvpUserId) {
      return res.status(400).json({ message: 'MVP User ID is required' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Authorization check
    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Only the organizer can award Match MVP' });
    }

    const User = require('../models/User');
    const mvpUser = await User.findById(mvpUserId);
    if (!mvpUser) {
      return res.status(404).json({ message: 'Selected MVP player not found' });
    }

    match.mvp = mvpUser._id;
    match.mvpComment = comment ? comment.trim() : 'Outstanding match performance';
    await match.save();

    const populatedMatch = await Match.findById(match._id)
      .populate('mvp', 'username profile.avatar role');

    // Notify awarded MVP player
    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      recipient: mvpUser._id,
      sender: req.user._id,
      type: 'organizer_announcement',
      title: '🌟 You were awarded Match MVP!',
      message: `Organizer awarded you Match MVP in Round ${match.round} of "${tournament.name}". "${match.mvpComment}"`,
      link: `/tournaments/${tournament._id}`,
      io: req.io,
    });

    // Emit live Socket.io update event
    if (req.io) {
      const matches = await Match.find({ tournament: tournament._id })
        .populate({
          path: 'teamA.id',
          populate: { path: 'members captain', select: 'username email profile' }
        })
        .populate({
          path: 'teamB.id',
          populate: { path: 'members captain', select: 'username email profile' }
        })
        .populate('mvp', 'username profile.avatar role')
        .sort({ round: 1, position: 1 });

      req.io.to(`tournament_${tournament._id.toString()}`).emit('match_updated', {
        matches,
        status: tournament.status,
      });
    }

    res.json({
      message: `Match MVP successfully awarded to @${mvpUser.username}!`,
      match: populatedMatch,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send Match Reminder Email to Match Competitors
// @route   POST /api/matches/:id/remind
// @access  Private (Organizer / Admin)
const sendMatchReminder = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const tournament = await Tournament.findById(match.tournament);
    const tournamentName = tournament ? tournament.name : 'ArenaVerse Tournament';

    const { sendMatchReminderEmail } = require('../utils/emailService');
    const User = require('../models/User');

    // Notify teamA and teamB users
    if (match.teamA?.id) {
      const userA = await User.findById(match.teamA.id);
      if (userA && userA.email) {
        sendMatchReminderEmail(userA.email, match, tournamentName);
      }
    }

    if (match.teamB?.id) {
      const userB = await User.findById(match.teamB.id);
      if (userB && userB.email) {
        sendMatchReminderEmail(userB.email, match, tournamentName);
      }
    }

    res.json({ message: `Match reminder email dispatched for Round ${match.round}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  updateMatchScore,
  checkInMatch,
  processMatchWalkover,
  setMatchMVP,
  sendMatchReminder,
};
