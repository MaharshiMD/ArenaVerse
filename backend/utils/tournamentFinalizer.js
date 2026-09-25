const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const User = require('../models/User');
const TournamentResult = require('../models/TournamentResult');
const Wallet = require('../models/Wallet');
const FinancialTransaction = require('../models/FinancialTransaction');
const { createNotification } = require('./notificationHelper');

/**
 * Deliver prize payout directly to a user's wallet and log financial transaction
 */
const deliverPrizeToWallet = async (tournament, userId, amount, position, details) => {
  if (!userId || !amount || Number(amount) <= 0) return null;

  try {
    const existingPayout = await FinancialTransaction.findOne({
      tournament: tournament._id,
      user: userId,
      type: 'PRIZE_PAYOUT',
      'metadata.position': position,
    });
    if (existingPayout) {
      console.log(`[Payout] Payout for tournament ${tournament._id}, user ${userId}, pos ${position} already exists.`);
      return null;
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: 0, transactions: [] });
    }

    // Secondary check: verify wallet does not already contain payout for this tournament
    const tourneyIdSuffix = tournament._id ? tournament._id.toString().slice(-6) : '';
    const alreadyCredited = wallet.transactions.some(tx => 
      tx.type === 'prize_payout' &&
      (
        (tourneyIdSuffix && tx.referenceId?.includes(tourneyIdSuffix)) ||
        (tournament.name && tx.description?.includes(tournament.name) && tx.description?.includes(`Position ${position}`))
      )
    );
    if (alreadyCredited) {
      console.log(`[Payout] Wallet for user ${userId} already credited for tournament "${tournament.name}" position ${position}. Skipping duplicate.`);
      return null;
    }

    const numericAmount = Number(amount);
    wallet.balance += numericAmount;
    const refId = `PRIZE_${Date.now()}_${tournament._id.toString().slice(-6)}_${userId.toString().slice(-6)}`;

    wallet.transactions.push({
      type: 'prize_payout',
      amount: numericAmount,
      description: `Tournament Prize: Position ${position} in "${tournament.name}" (${details || ''})`,
      referenceId: refId,
      status: 'completed',
      createdAt: new Date(),
    });
    await wallet.save();

    await FinancialTransaction.create({
      transactionId: refId,
      tournament: tournament._id,
      user: userId,
      type: 'PRIZE_PAYOUT',
      amount: numericAmount,
      currency: tournament.prizePoolCurrency || 'INR',
      status: 'SUCCESS',
      metadata: {
        position,
        tournamentName: tournament.name,
        details,
      },
    });

    return refId;
  } catch (err) {
    console.error(`[Payout Error] Failed to deliver prize to wallet for user ${userId}:`, err);
    return null;
  }
};

/**
 * Finalize tournament:
 * 1. Deliver prize money directly to team captain's account wallet (or solo player wallet).
 * 2. Update team stats (wins/losses/matchesPlayed) for Hall of Fame & rankings.
 * 3. Record TournamentResult entries for all placements.
 * 4. Mark tournament completed and PRIZES_PAID.
 * 5. Emit real-time WebSocket events across the entire site (leaderboard, hall of fame, dashboard).
 */
const finalizeTournamentCompletion = async (tournamentId, { winnerId, loserId, brLeaderboard, io } = {}) => {
  try {
    const tournament = await Tournament.findById(tournamentId)
      .populate('registeredTeams')
      .populate('registeredPlayers');
    if (!tournament) return;

    // Check if prize payout was already performed to prevent duplicate payouts
    const existingPayoutsCount = await FinancialTransaction.countDocuments({
      tournament: tournament._id,
      type: 'PRIZE_PAYOUT',
    });

    const isBR = Array.isArray(brLeaderboard) && brLeaderboard.length > 0;
    let actualWinnerId = winnerId;
    let actualLoserId = loserId;
    let actualWinnerName = tournament.winnerName;
    let actualRunnerUpName = tournament.runnerUpName;

    if (isBR) {
      actualWinnerId = brLeaderboard[0]?.teamId;
      actualWinnerName = brLeaderboard[0]?.teamName || 'Winner Squad';
      actualLoserId = brLeaderboard[1]?.teamId;
      actualRunnerUpName = brLeaderboard[1]?.teamName || 'Runner-Up Squad';
    }

    // Determine prize distribution
    const getPrizeForPosition = (pos) => {
      if (Array.isArray(tournament.prizeDistribution) && tournament.prizeDistribution.length > 0) {
        const pd = tournament.prizeDistribution.find((d) => Number(d.position) === Number(pos));
        if (pd && Number(pd.amount) > 0) return Number(pd.amount);
      }
      if (Number(tournament.prizePool) > 0) {
        if (pos === 1) return Math.round(Number(tournament.prizePool) * 0.70);
        if (pos === 2) return Math.round(Number(tournament.prizePool) * 0.30);
      }
      return 0;
    };

    const prize1st = getPrizeForPosition(1);
    const prize2nd = getPrizeForPosition(2);

    let winnerCaptainId = null;
    let runnerCaptainId = null;

    const hasAlreadyPaidPrizes = existingPayoutsCount > 0 || tournament.prizePoolStatus === 'PRIZES_PAID';

    if (!hasAlreadyPaidPrizes) {
      // Remove any previously recorded results for this tournament to ensure fresh accurate state
      await TournamentResult.deleteMany({ tournament: tournament._id });

      if (tournament.type === 'solo') {
        // Solo tournament
        if (actualWinnerId) {
          winnerCaptainId = actualWinnerId;
          await TournamentResult.create({
            tournament: tournament._id,
            player: actualWinnerId,
            team: null,
            teamName: '',
            placement: 1,
            prizeWon: prize1st,
          });

          if (prize1st > 0) {
            await deliverPrizeToWallet(tournament, actualWinnerId, prize1st, 1, 'Solo 1st Place Champion');
          }

          await createNotification({
            recipient: actualWinnerId,
            sender: tournament.organizer,
            type: 'tournament_winner',
            title: `🏆 Tournament Champion: ${tournament.name}`,
            message: `Congratulations! You won 1st Place in "${tournament.name}"! Prize of ₹${prize1st} has been credited to your Arena Wallet.`,
            link: `/tournaments/${tournament._id}`,
            io,
          });
        }

        if (actualLoserId) {
          runnerCaptainId = actualLoserId;
          await TournamentResult.create({
            tournament: tournament._id,
            player: actualLoserId,
            team: null,
            teamName: '',
            placement: 2,
            prizeWon: prize2nd,
          });

          if (prize2nd > 0) {
            await deliverPrizeToWallet(tournament, actualLoserId, prize2nd, 2, 'Solo 2nd Place Runner-Up');
          }

          await createNotification({
            recipient: actualLoserId,
            sender: tournament.organizer,
            type: 'tournament_winner',
            title: `🥈 Tournament Runner-Up: ${tournament.name}`,
            message: `Congratulations! You secured 2nd Place in "${tournament.name}"! Prize of ₹${prize2nd} has been credited to your Arena Wallet.`,
            link: `/tournaments/${tournament._id}`,
            io,
          });
        }

        // Remaining registered players
        for (const p of tournament.registeredPlayers || []) {
          const pId = p._id || p;
          if (pId.toString() !== actualWinnerId?.toString() && pId.toString() !== actualLoserId?.toString()) {
            await TournamentResult.create({
              tournament: tournament._id,
              player: pId,
              team: null,
              teamName: '',
              placement: 3,
              prizeWon: 0,
            });
          }
        }
      } else {
        // Team / Duo / Clash Squad / Battle Royale
        // 1st Place Winning Squad
        if (actualWinnerId) {
          const winnerTeam = await Team.findById(actualWinnerId).populate('members');
          if (winnerTeam) {
            actualWinnerName = winnerTeam.name;
            winnerCaptainId = winnerTeam.captain?._id || winnerTeam.captain;

            // DELIVER 1ST PLACE PRIZE AUTOMATICALLY TO TEAM CAPTAIN'S WALLET
            if (prize1st > 0 && winnerCaptainId) {
              await deliverPrizeToWallet(
                tournament,
                winnerCaptainId,
                prize1st,
                1,
                `Squad Captain of "${winnerTeam.name}" - 1st Place Champion`
              );

              await createNotification({
                recipient: winnerCaptainId,
                sender: tournament.organizer,
                type: 'tournament_winner',
                title: `🏆 Squad Champions - Prize Delivered!`,
                message: `Congratulations Captain! Your team "${winnerTeam.name}" won 1st Place in "${tournament.name}". ₹${prize1st} has been credited directly to your Arena Wallet!`,
                link: `/wallet`,
                io,
              });
            }

            // Create TournamentResult for all members of the winning squad
            for (const m of winnerTeam.members) {
              const mId = m._id || m;
              const isCap = mId.toString() === winnerCaptainId?.toString();
              await TournamentResult.create({
                tournament: tournament._id,
                player: mId,
                team: winnerTeam._id,
                teamName: winnerTeam.name,
                placement: 1,
                prizeWon: isCap ? prize1st : 0,
              });

              if (!isCap) {
                await createNotification({
                  recipient: mId,
                  sender: tournament.organizer,
                  type: 'tournament_winner',
                  title: `🏆 Tournament Victory: ${winnerTeam.name}`,
                  message: `Your squad "${winnerTeam.name}" achieved 1st Place in "${tournament.name}"! Championship trophy awarded!`,
                  link: `/tournaments/${tournament._id}`,
                  io,
                });
              }
            }

            // Update winner team stats (for Hall of Fame & rankings)
            winnerTeam.stats = winnerTeam.stats || {};
            winnerTeam.stats.wins = (winnerTeam.stats.wins || 0) + 1;
            winnerTeam.stats.totalTournaments = (winnerTeam.stats.totalTournaments || 0) + 1;
            winnerTeam.stats.matchesPlayed = (winnerTeam.stats.matchesPlayed || 0) + 1;
            winnerTeam.stats.prizeMoney = (winnerTeam.stats.prizeMoney || 0) + prize1st;
            winnerTeam.stats.winRate = winnerTeam.stats.totalTournaments > 0 
              ? Math.round((winnerTeam.stats.wins / winnerTeam.stats.totalTournaments) * 100) 
              : 100;
            await winnerTeam.save();
          }
        }

        // 2nd Place Runner-Up Squad
        if (actualLoserId) {
          const loserTeam = await Team.findById(actualLoserId).populate('members');
          if (loserTeam) {
            actualRunnerUpName = loserTeam.name;
            runnerCaptainId = loserTeam.captain?._id || loserTeam.captain;

            // DELIVER 2ND PLACE PRIZE AUTOMATICALLY TO RUNNER-UP CAPTAIN'S WALLET
            if (prize2nd > 0 && runnerCaptainId) {
              await deliverPrizeToWallet(
                tournament,
                runnerCaptainId,
                prize2nd,
                2,
                `Squad Captain of "${loserTeam.name}" - 2nd Place Runner-Up`
              );

              await createNotification({
                recipient: runnerCaptainId,
                sender: tournament.organizer,
                type: 'tournament_winner',
                title: `🥈 Runner-Up Prize Delivered!`,
                message: `Congratulations! Your team "${loserTeam.name}" secured 2nd Place in "${tournament.name}". ₹${prize2nd} has been credited directly to your Arena Wallet!`,
                link: `/wallet`,
                io,
              });
            }

            for (const m of loserTeam.members) {
              const mId = m._id || m;
              const isCap = mId.toString() === runnerCaptainId?.toString();
              await TournamentResult.create({
                tournament: tournament._id,
                player: mId,
                team: loserTeam._id,
                teamName: loserTeam.name,
                placement: 2,
                prizeWon: isCap ? prize2nd : 0,
              });
            }

            loserTeam.stats = loserTeam.stats || {};
            loserTeam.stats.losses = (loserTeam.stats.losses || 0) + 1;
            loserTeam.stats.totalTournaments = (loserTeam.stats.totalTournaments || 0) + 1;
            loserTeam.stats.matchesPlayed = (loserTeam.stats.matchesPlayed || 0) + 1;
            loserTeam.stats.prizeMoney = (loserTeam.stats.prizeMoney || 0) + prize2nd;
            loserTeam.stats.winRate = loserTeam.stats.totalTournaments > 0 
              ? Math.round(((loserTeam.stats.wins || 0) / loserTeam.stats.totalTournaments) * 100) 
              : 0;
            await loserTeam.save();
          }
        }

        // Remaining teams in tournament
        if (isBR) {
          for (let i = 2; i < brLeaderboard.length; i++) {
            const entry = brLeaderboard[i];
            const otherTeam = await Team.findById(entry.teamId).populate('members');
            if (otherTeam) {
              otherTeam.stats = otherTeam.stats || {};
              otherTeam.stats.totalTournaments = (otherTeam.stats.totalTournaments || 0) + 1;
              otherTeam.stats.matchesPlayed = (otherTeam.stats.matchesPlayed || 0) + 1;
              otherTeam.stats.losses = (otherTeam.stats.losses || 0) + 1;
              await otherTeam.save();

              for (const m of otherTeam.members) {
                await TournamentResult.create({
                  tournament: tournament._id,
                  player: m._id || m,
                  team: otherTeam._id,
                  teamName: otherTeam.name,
                  placement: entry.placement || i + 1,
                  prizeWon: 0,
                });
              }
            }
          }
        } else {
          for (const t of tournament.registeredTeams || []) {
            const tId = t._id || t;
            if (tId.toString() !== actualWinnerId?.toString() && tId.toString() !== actualLoserId?.toString()) {
              const otherTeam = await Team.findById(tId).populate('members');
              if (otherTeam) {
                otherTeam.stats = otherTeam.stats || {};
                otherTeam.stats.totalTournaments = (otherTeam.stats.totalTournaments || 0) + 1;
                otherTeam.stats.matchesPlayed = (otherTeam.stats.matchesPlayed || 0) + 1;
                otherTeam.stats.losses = (otherTeam.stats.losses || 0) + 1;
                await otherTeam.save();

                for (const m of otherTeam.members) {
                  await TournamentResult.create({
                    tournament: tournament._id,
                    player: m._id || m,
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
      }
    }

    // Finalize tournament record
    tournament.status = 'completed';
    tournament.prizePoolStatus = 'PRIZES_PAID';
    tournament.resultsFinalizedAt = new Date();
    if (actualWinnerName) tournament.winnerName = actualWinnerName;
    if (actualRunnerUpName) tournament.runnerUpName = actualRunnerUpName;
    await tournament.save();

    console.log(`[Tournament Finalized] "${tournament.name}" completed. Winner: ${actualWinnerName}, Runner-Up: ${actualRunnerUpName}`);

    // REAL-TIME BROADCAST TO ENTIRE SITE
    if (io) {
      // 1. Broad site-wide tournament completion event
      io.emit('tournament_completed', {
        tournamentId: tournament._id,
        tournamentName: tournament.name,
        game: tournament.game,
        winnerName: actualWinnerName,
        runnerUpName: actualRunnerUpName,
      });

      // 2. Global Leaderboard update event
      io.emit('leaderboard_updated', {
        tournamentId: tournament._id,
      });

      // 3. Global Hall of Fame update event
      io.emit('hall_of_fame_updated', {
        tournamentId: tournament._id,
      });

      // 4. Site stats update event
      io.emit('site_stats_updated', {
        tournamentId: tournament._id,
      });

      // 5. Individual wallet update event for captains
      if (winnerCaptainId) {
        io.to(`user_${winnerCaptainId.toString()}`).emit('wallet_updated', {
          balanceChange: prize1st,
          tournamentId: tournament._id,
        });
        io.emit('wallet_updated', {
          userId: winnerCaptainId.toString(),
          tournamentId: tournament._id,
        });
      }
      if (runnerCaptainId) {
        io.to(`user_${runnerCaptainId.toString()}`).emit('wallet_updated', {
          balanceChange: prize2nd,
          tournamentId: tournament._id,
        });
        io.emit('wallet_updated', {
          userId: runnerCaptainId.toString(),
          tournamentId: tournament._id,
        });
      }

      // 6. Tournament room update
      io.to(`tournament_${tournament._id.toString()}`).emit('match_updated', {
        tournamentId: tournament._id,
        status: 'completed',
        tournament: tournament,
      });
    }

    return {
      success: true,
      tournament,
      winnerName: actualWinnerName,
      runnerUpName: actualRunnerUpName,
      prize1st,
      prize2nd,
    };
  } catch (error) {
    console.error('Error finalizing tournament completion:', error);
    throw error;
  }
};

module.exports = {
  finalizeTournamentCompletion,
  deliverPrizeToWallet,
};
