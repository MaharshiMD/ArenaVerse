const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const TournamentResult = require('../models/TournamentResult');

const createTournamentResults = async (tournamentId, winnerId, loserId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return;

    // Check if results already exist for this tournament to avoid duplicates
    const count = await TournamentResult.countDocuments({ tournament: tournamentId });
    if (count > 0) return;

    const prizePool = tournament.prizePool || 0;
    const prize1st = Math.round(prizePool * 0.7);
    const prize2nd = Math.round(prizePool * 0.3);

    if (tournament.type === 'solo') {
      if (winnerId) {
        await TournamentResult.create({
          tournament: tournamentId,
          player: winnerId,
          team: null,
          teamName: '',
          placement: 1,
          prizeWon: prize1st,
        });
      }
      if (loserId) {
        await TournamentResult.create({
          tournament: tournamentId,
          player: loserId,
          team: null,
          teamName: '',
          placement: 2,
          prizeWon: prize2nd,
        });
      }
      for (let pId of tournament.registeredPlayers) {
        if (pId.toString() !== winnerId?.toString() && pId.toString() !== loserId?.toString()) {
          await TournamentResult.create({
            tournament: tournamentId,
            player: pId,
            team: null,
            teamName: '',
            placement: 3,
            prizeWon: 0,
          });
        }
      }
    } else {
      if (winnerId) {
        const winnerTeam = await Team.findById(winnerId).populate('members');
        if (winnerTeam) {
          for (let member of winnerTeam.members) {
            await TournamentResult.create({
              tournament: tournamentId,
              player: member._id || member,
              team: winnerTeam._id,
              teamName: winnerTeam.name,
              placement: 1,
              prizeWon: prize1st,
            });
          }
        }
      }
      if (loserId) {
        const loserTeam = await Team.findById(loserId).populate('members');
        if (loserTeam) {
          for (let member of loserTeam.members) {
            await TournamentResult.create({
              tournament: tournamentId,
              player: member._id || member,
              team: loserTeam._id,
              teamName: loserTeam.name,
              placement: 2,
              prizeWon: prize2nd,
            });
          }
        }
      }
      for (let teamId of tournament.registeredTeams) {
        if (teamId.toString() !== winnerId?.toString() && teamId.toString() !== loserId?.toString()) {
          const otherTeam = await Team.findById(teamId).populate('members');
          if (otherTeam) {
            for (let member of otherTeam.members) {
              await TournamentResult.create({
                tournament: tournamentId,
                player: member._id || member,
                team: otherTeam._id,
                teamName: otherTeam.name,
                placement: 3,
                prizeWon: 0,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error creating tournament results:', err);
  }
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

    if (scoreA === scoreB) {
      return res.status(400).json({ message: 'Matches in brackets cannot end in a draw' });
    }

    // Set score and winner
    match.scoreA = Number(scoreA);
    match.scoreB = Number(scoreB);
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
      await createTournamentResults(tournament._id, winnerId, loserId);
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
