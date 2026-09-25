const Tournament = require('../models/Tournament');
const Bracket = require('../models/Bracket');
const Match = require('../models/Match');
const Team = require('../models/Team');
const User = require('../models/User');
const TournamentResult = require('../models/TournamentResult');
const BRMatch = require('../models/BRMatch');
const { createNotification } = require('../utils/notificationHelper');
const { buildGameRegex } = require('../utils/gameUtils');
const {
  generateSingleElimination,
  generateDoubleElimination,
} = require('../utils/bracketGenerator');
const { finalizeTournamentCompletion } = require('../utils/tournamentFinalizer');

// @desc    Create tournament
// @route   POST /api/tournaments
// @access  Private (Organizer/Admin only)
const createTournament = async (req, res) => {
  const { name, game, banner, startDate, entryFee, prizePool, prizeDistribution, mvpPrize, rules, maxTeams, type, minTeamMembers, maxTeamMembers } = req.body;

  try {
    const tournamentType = type || 'team';
    let calculatedMin = 1;
    let calculatedMax = 1;

    if (tournamentType === 'team') {
      calculatedMin = Number(minTeamMembers) || 2;
      calculatedMax = Number(maxTeamMembers) || 5;
    } else if (tournamentType === 'duo') {
      calculatedMin = 2;
      calculatedMax = 2;
    }

    const calculatedPrizePool = Number(prizePool) || 0;
    const calculatedMvpPrize = Number(mvpPrize) || 0;
    
    // Validate prize distribution
    let validPrizeDistribution = [];
    let sum = 0;
    if (prizeDistribution && Array.isArray(prizeDistribution) && calculatedPrizePool > 0) {
      const positions = new Set();
      for (const pd of prizeDistribution) {
        if (!pd.position || pd.amount == null || pd.amount < 0) {
          return res.status(400).json({ message: 'Invalid prize distribution configuration' });
        }
        if (positions.has(pd.position)) {
          return res.status(400).json({ message: `Duplicate position ${pd.position} in prize distribution` });
        }
        positions.add(pd.position);
        sum += pd.amount;
        validPrizeDistribution.push({ position: pd.position, amount: pd.amount });
      }
    }

    const isFreeFire = game && (
      game.trim().toLowerCase() === 'free fire' ||
      game.trim().toLowerCase() === 'free fire max' ||
      game.trim().toLowerCase().startsWith('free fire')
    );

    let finalTournamentMode = null;
    let finalFormat = 'knockout';
    let finalBrSettings = undefined;
    let finalClashSquadSettings = undefined;
    let finalMaxTeams = Number(maxTeams) || 16;

    if (isFreeFire && req.body.tournamentMode) {
      finalTournamentMode = req.body.tournamentMode;
      if (finalTournamentMode === 'battle_royale') {
        finalFormat = 'battle_royale';
        tournamentType = 'team';
        calculatedMin = 4;
        calculatedMax = 4;
        const brTeams = Number(req.body.brSettings?.numberOfTeams) || Number(maxTeams) || 12;
        const brMatches = Number(req.body.brSettings?.numberOfMatches) || 6;
        finalMaxTeams = brTeams;
        finalBrSettings = {
          numberOfTeams: brTeams,
          numberOfMatches: brMatches,
          teamsPerGroup: brTeams,
          matchesPerGroup: brMatches,
          qualifiersPerGroup: brTeams,
          scoringSystem: {
            placementPoints: req.body.brSettings?.scoringSystem?.placementPoints || {
              "1": 12, "2": 9, "3": 8, "4": 7, "5": 6, "6": 5,
              "7": 4, "8": 3, "9": 2, "10": 1, "11": 0, "12": 0
            },
            killPoints: req.body.brSettings?.scoringSystem?.killPoints != null ? Number(req.body.brSettings.scoringSystem.killPoints) : 1,
            booyahBonus: Number(req.body.brSettings?.scoringSystem?.booyahBonus) || 0,
            tieBreakers: ['total_points', 'total_kills', 'better_placement', 'booyahs']
          }
        };
      } else if (finalTournamentMode === 'clash_squad') {
        finalFormat = 'knockout';
        tournamentType = 'team';
        calculatedMin = 4;
        calculatedMax = 4;
        finalClashSquadSettings = {
          matchFormat: req.body.clashSquadSettings?.matchFormat || 'BO3',
        };
      }
    }

    const tournament = await Tournament.create({
      name,
      game,
      banner,
      startDate,
      entryFee: Number(entryFee) || 0,
      prizePool: calculatedPrizePool,
      prizeDistribution: validPrizeDistribution,
      mvpPrize: calculatedMvpPrize,
      rules,
      maxTeams: finalMaxTeams,
      type: tournamentType,
      minTeamMembers: calculatedMin,
      maxTeamMembers: calculatedMax,
      organizer: req.user._id,
      status: 'draft',
      prizePoolStatus: 'PENDING_FUNDING',
      tournamentMode: finalTournamentMode,
      format: finalFormat,
      brSettings: finalBrSettings,
      clashSquadSettings: finalClashSquadSettings,
    });

    if (req.body.autoSeedTeams || req.body.prepopulate) {
      if (tournamentType === 'solo') {
        const users = await User.find().limit(8);
        tournament.registeredPlayers = users.map(u => u._id);
      } else {
        const neededTeamsCount = finalTournamentMode === 'battle_royale' ? (finalBrSettings?.numberOfTeams || 12) : 8;
        let teams = await Team.find().limit(neededTeamsCount);
        if (teams.length < neededTeamsCount) {
          const demoTeamNames = [
            'Total Gaming Esports', 'GodLike Esports', 'Team Elite', 'Orangutan Elite',
            'Chemin Esports', 'Nigma Galaxy', 'TSM FTX', 'Enigma Gaming',
            'Headhunters', 'Desi Gamers Esports', 'Revenant Esports', 'Blind Esports',
            'Alpha Squad', 'Cyber Ninjas', 'Apex Predators', 'Vortex Esports'
          ];
          const newTeamsToCreate = [];
          for (let i = teams.length; i < neededTeamsCount; i++) {
            newTeamsToCreate.push({
              name: demoTeamNames[i % demoTeamNames.length] + (i >= demoTeamNames.length ? ` ${i + 1}` : ''),
              tag: `FF${i + 1}`,
              logo: '',
              leader: req.user._id,
              members: [req.user._id],
            });
          }
          if (newTeamsToCreate.length > 0) {
            const created = await Team.insertMany(newTeamsToCreate);
            teams = [...teams, ...created];
          }
        }
        tournament.registeredTeams = teams.slice(0, neededTeamsCount).map(t => t._id);
      }
      await tournament.save();
    }

    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit tournament
// @route   PUT /api/tournaments/:id
// @access  Private (Organizer/Admin only)
const editTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Authorization check
    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to edit this tournament' });
    }

    if (tournament.status !== 'draft') {
      return res.status(400).json({ message: 'Cannot edit an active or completed tournament' });
    }

    // Prize Pool and Distribution Locking Logic
    if (tournament.prizePoolStatus === 'FUNDED') {
      if (
        (req.body.prizePool !== undefined && req.body.prizePool !== tournament.prizePool) ||
        (req.body.prizeDistribution !== undefined) ||
        (req.body.mvpPrize !== undefined && req.body.mvpPrize !== tournament.mvpPrize)
      ) {
        return res.status(400).json({ message: 'Prize pool, distribution, and MVP prize cannot be modified after funding is secured.' });
      }
    } else {
      const updatedPrizePool = req.body.prizePool !== undefined ? Number(req.body.prizePool) : tournament.prizePool;
      tournament.prizePool = updatedPrizePool;
      
      const updatedMvpPrize = req.body.mvpPrize !== undefined ? Number(req.body.mvpPrize) : (tournament.mvpPrize || 0);
      tournament.mvpPrize = updatedMvpPrize;

      if (req.body.prizeDistribution !== undefined || req.body.mvpPrize !== undefined) {
        let validPrizeDistribution = req.body.prizeDistribution !== undefined ? [] : tournament.prizeDistribution;
        let sum = 0;
        
        if (req.body.prizeDistribution !== undefined && Array.isArray(req.body.prizeDistribution) && updatedPrizePool > 0) {
          const positions = new Set();
          for (const pd of req.body.prizeDistribution) {
            if (!pd.position || pd.amount == null || pd.amount < 0) {
              return res.status(400).json({ message: 'Invalid prize distribution configuration' });
            }
            if (positions.has(pd.position)) {
              return res.status(400).json({ message: `Duplicate position ${pd.position} in prize distribution` });
            }
            positions.add(pd.position);
            sum += pd.amount;
            validPrizeDistribution.push({ position: pd.position, amount: pd.amount });
          }
        } else if (req.body.prizeDistribution === undefined) {
            sum = tournament.prizeDistribution.reduce((acc, curr) => acc + curr.amount, 0);
        }

        if ((sum + updatedMvpPrize) > updatedPrizePool) {
          return res.status(400).json({ message: 'Prize distribution and MVP prize cannot exceed the total prize pool' });
        }
        
        if (req.body.prizeDistribution !== undefined) {
            tournament.prizeDistribution = validPrizeDistribution;
        }
      }
    }

    tournament.name = req.body.name ?? tournament.name;
    tournament.game = req.body.game ?? tournament.game;
    tournament.banner = req.body.banner ?? tournament.banner;
    tournament.startDate = req.body.startDate ?? tournament.startDate;
    tournament.entryFee = req.body.entryFee ?? tournament.entryFee;
    tournament.rules = req.body.rules ?? tournament.rules;
    tournament.maxTeams = req.body.maxTeams ?? tournament.maxTeams;
    tournament.type = req.body.type ?? tournament.type;
    tournament.minTeamMembers = req.body.minTeamMembers ?? tournament.minTeamMembers;
    tournament.maxTeamMembers = req.body.maxTeamMembers ?? tournament.maxTeamMembers;

    const updatedTournament = await tournament.save();
    res.json(updatedTournament);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id
// @access  Private (Organizer/Admin only)
const deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Authorization check
    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this tournament' });
    }

    // Notify registered players & team members before deleting
    const recipientIdsSet = new Set();
    (tournament.registeredPlayers || []).forEach(pId => recipientIdsSet.add(pId.toString()));
    
    if (tournament.registeredTeams && tournament.registeredTeams.length > 0) {
      const registeredTeamDocs = await Team.find({ _id: { $in: tournament.registeredTeams } });
      registeredTeamDocs.forEach(t => {
        t.members.forEach(mId => recipientIdsSet.add(mId.toString()));
      });
    }

    for (const recId of recipientIdsSet) {
      await createNotification({
        recipient: recId,
        sender: req.user._id,
        type: 'tournament_cancellation',
        title: 'Tournament Cancelled',
        message: `The tournament "${tournament.name}" was cancelled by the organizer.`,
        link: '/tournaments',
        io: req.io,
      });
    }

    // Clean up matches and bracket
    await Match.deleteMany({ tournament: tournament._id });
    await Bracket.findOneAndDelete({ tournament: tournament._id });
    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tournament and associated brackets deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all tournaments (Optimized with lean, pagination & projections)
// @route   GET /api/tournaments
// @access  Public
const getTournaments = async (req, res) => {
  try {
    const { status, game, page = 1, limit = 20 } = req.query;
    let query = {};

    if (status) query.status = status;
    const gameRegex = buildGameRegex(game);
    if (gameRegex) query.game = gameRegex;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [tournaments, totalCount] = await Promise.all([
      Tournament.find(query)
        .populate('organizer', 'username email isVerifiedOrganizer')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Tournament.countDocuments(query),
    ]);

    res.json({
      tournaments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: skip + tournaments.length < totalCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get tournament details including bracket & matches
// @route   GET /api/tournaments/:id
// @access  Public
const getTournamentById = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'username email')
      .populate('registeredPlayers', 'username email profile')
      .populate({
        path: 'registeredTeams',
        populate: { path: 'members captain', select: 'username email profile' }
      });

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const bracket = await Bracket.findOne({ tournament: tournament._id });
    let matches = await Match.find({ tournament: tournament._id })
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

    // Self-healing bracket progression check for completed matches
    let needRefetch = false;
    for (const m of matches) {
      if (m.status === 'completed' && m.winner && m.nextMatchId) {
        const nextMatch = matches.find(nm => nm._id.toString() === m.nextMatchId.toString());
        if (nextMatch) {
          const targetSlot = m.nextMatchSlot || (
            m.bracketType === 'losers' ? 'teamB' : (m.position % 2 !== 0 ? 'teamA' : 'teamB')
          );

          const winnerIdStr = m.winner._id ? m.winner._id.toString() : m.winner.toString();
          const teamAIdStr = m.teamA?.id?._id ? m.teamA.id._id.toString() : m.teamA?.id?.toString();
          const winnerName = (teamAIdStr && teamAIdStr === winnerIdStr) ? m.teamA.name : m.teamB.name;

          const currentSlotId = nextMatch[targetSlot]?.id?._id
            ? nextMatch[targetSlot].id._id.toString()
            : nextMatch[targetSlot]?.id?.toString();

          if (currentSlotId !== winnerIdStr) {
            await Match.findByIdAndUpdate(nextMatch._id, {
              [`${targetSlot}.id`]: m.winner._id || m.winner,
              [`${targetSlot}.name`]: winnerName,
            });
            needRefetch = true;
          }
        }
      }
    }

    if (needRefetch) {
      matches = await Match.find({ tournament: tournament._id })
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
    }

    const results = await TournamentResult.find({ tournament: tournament._id })
      .populate('player', 'username email profile')
      .sort({ placement: 1 });

    let brMatches = [];
    const isBR = tournament.tournamentMode === 'battle_royale' || 
      tournament.format === 'battle_royale' || 
      ((tournament.game === 'Free Fire' || tournament.game === 'Free Fire MAX') && tournament.tournamentMode !== 'clash_squad');
    if (isBR) {
      brMatches = await BRMatch.find({ tournament: tournament._id })
        .populate('results.teamId', 'name logo tag')
        .sort({ matchNumber: 1 });
    }

    res.json({
      tournament,
      bracket,
      matches,
      results,
      brMatches,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join tournament
// @route   POST /api/tournaments/:id/join
// @access  Private
const joinTournament = async (req, res) => {
  const { teamId } = req.body;

  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'draft' && tournament.status !== 'published') {
      return res.status(400).json({ message: 'Registration is closed for this tournament' });
    }

    if (tournament.type === 'solo') {
      if (tournament.registeredPlayers.includes(req.user._id)) {
        return res.status(400).json({ message: 'You have already registered for this tournament' });
      }

      if (tournament.registeredPlayers.length >= tournament.maxTeams) {
        return res.status(400).json({ message: 'Tournament is full' });
      }

      tournament.registeredPlayers.push(req.user._id);
    } else {
      // Team / Duo registration
      let effectiveTeamId = teamId;
      if (!effectiveTeamId || effectiveTeamId === 'null' || effectiveTeamId === 'undefined') {
        const userTeam = await Team.findOne({
          $or: [{ captain: req.user._id }, { members: req.user._id }]
        }).sort({ createdAt: -1 });
        if (userTeam) {
          effectiveTeamId = userTeam._id.toString();
        }
      }

      if (!effectiveTeamId) {
        return res.status(400).json({ message: 'Team ID is required for team or duo tournaments' });
      }

      const team = await Team.findById(effectiveTeamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Verify user is member of the team
      if (!team.members.some(m => m.toString() === req.user._id.toString())) {
        return res.status(400).json({ message: 'You must be a member of the team to register it' });
      }

      if (tournament.type === 'duo' && team.members.length !== 2) {
        return res.status(400).json({ message: `Duo format requires exactly 2 team members (Selected team has ${team.members.length})` });
      }

      if (tournament.type === 'team') {
        if (tournament.minTeamMembers && team.members.length < tournament.minTeamMembers) {
          return res.status(400).json({ message: `Team must have at least ${tournament.minTeamMembers} members for this tournament (Selected team has ${team.members.length})` });
        }
        if (tournament.maxTeamMembers && team.members.length > tournament.maxTeamMembers) {
          return res.status(400).json({ message: `Team exceeds max limit of ${tournament.maxTeamMembers} members for this tournament (Selected team has ${team.members.length})` });
        }
      }

      if (tournament.registeredTeams.some(id => id.toString() === effectiveTeamId.toString())) {
        return res.status(400).json({ message: 'This team is already registered' });
      }

      if (tournament.registeredTeams.length >= tournament.maxTeams) {
        return res.status(400).json({ message: 'Tournament is full' });
      }

      tournament.registeredTeams.push(effectiveTeamId);
    }

    await tournament.save();

    // Trigger tournament_registration notification
    await createNotification({
      recipient: req.user._id,
      sender: tournament.organizer,
      type: 'tournament_registration',
      title: 'Tournament Registration Confirmed',
      message: `You successfully registered for "${tournament.name}".`,
      link: `/tournaments/${tournament._id}`,
      io: req.io,
    });

    res.json({ message: 'Successfully joined tournament', tournament });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Leave tournament
// @route   POST /api/tournaments/:id/leave
// @access  Private
const leaveTournament = async (req, res) => {
  const { teamId } = req.body;

  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'draft' && tournament.status !== 'published') {
      return res.status(400).json({ message: 'Cannot leave a tournament that has started' });
    }

    if (tournament.type === 'solo') {
      tournament.registeredPlayers = tournament.registeredPlayers.filter(
        (playerId) => playerId.toString() !== req.user._id.toString()
      );
    } else {
      if (!teamId) {
        return res.status(400).json({ message: 'Team ID is required to leave team tournament' });
      }
      
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Check if user is member of the team
      const isMember = team.members.some(
        (memberId) => memberId.toString() === req.user._id.toString()
      );
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'You must be a member of the team to unregister it' });
      }

      tournament.registeredTeams = tournament.registeredTeams.filter(
        (tId) => tId.toString() !== teamId.toString()
      );
    }

    await tournament.save();
    res.json({ message: 'Successfully left tournament', tournament });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Publish tournament (Generate bracket & go live)
// @route   POST /api/tournaments/:id/publish
// @access  Private (Organizer/Admin only)
const publishTournament = async (req, res) => {
  const { bracketType } = req.body; // 'single_elimination' or 'double_elimination'

  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to publish this tournament' });
    }

    if (tournament.status !== 'draft') {
      return res.status(400).json({ message: 'Tournament is already published or active' });
    }

    if (tournament.prizePool > 0 && tournament.prizePoolStatus !== 'FUNDED') {
      return res.status(400).json({ message: 'You must securely fund the prize pool before publishing the tournament.' });
    }

    // MODE 1: BATTLE ROYALE MODE
    const isBRMode = tournament.tournamentMode === 'battle_royale' || 
      tournament.format === 'battle_royale' || 
      ((tournament.game === 'Free Fire' || tournament.game === 'Free Fire MAX') && tournament.tournamentMode !== 'clash_squad');
    if (isBRMode) {
      const neededTeams = tournament.brSettings?.numberOfTeams || 12;
      let registeredTeamIds = [...(tournament.registeredTeams || [])];

      if (registeredTeamIds.length < 2) {
        if (req.body.autoSeed || req.body.force) {
          const demoTeamNames = [
            'Total Gaming Esports', 'GodLike Esports', 'Team Elite', 'Orangutan Elite',
            'Chemin Esports', 'Nigma Galaxy', 'TSM FTX', 'Enigma Gaming',
            'Headhunters', 'Desi Gamers Esports', 'Revenant Esports', 'Blind Esports'
          ];
          const demoTeams = [];
          for (let i = 0; i < neededTeams; i++) {
            demoTeams.push({
              name: demoTeamNames[i % demoTeamNames.length] + (i >= demoTeamNames.length ? ` ${i + 1}` : ''),
              tag: `FF${i + 1}`,
              logo: '',
              leader: req.user._id,
              members: [req.user._id],
            });
          }
          const created = await Team.insertMany(demoTeams);
          tournament.registeredTeams = created.map(t => t._id);
          await tournament.save();
        }
      }

      const teams = await Team.find({ _id: { $in: tournament.registeredTeams } });
      if (teams.length < 2) {
        return res.status(400).json({
          message: 'Cannot start Battle Royale tournament. Minimum 2 teams required (12 recommended). Click "Auto-Seed & Publish" to populate demo competitors.',
        });
      }

      // Clean up any existing BRMatch for this tournament
      await BRMatch.deleteMany({ tournament: tournament._id });

      const matchesCount = tournament.brSettings?.numberOfMatches || 6;
      const ffMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra', 'Bermuda Remastered'];
      const brMatches = [];

      for (let i = 1; i <= matchesCount; i++) {
        brMatches.push({
          tournament: tournament._id,
          groupName: 'Main Lobby',
          matchNumber: i,
          mapName: ffMaps[(i - 1) % ffMaps.length],
          status: 'scheduled',
          results: teams.map(t => ({
            teamId: t._id,
            teamName: t.name,
            placement: 0,
            kills: 0,
            placementPoints: 0,
            killPoints: 0,
            totalPoints: 0,
          })),
        });
      }

      await BRMatch.insertMany(brMatches);
      tournament.status = 'ongoing';
      await tournament.save();

      return res.json({ message: 'Battle Royale tournament published and matches scheduled', tournament });
    }

    // MODE 2: CLASH SQUAD OR STANDARD KNOCKOUT
    let participants = tournament.type === 'solo' 
      ? await User.find({ _id: { $in: tournament.registeredPlayers } })
      : await Team.find({ _id: { $in: tournament.registeredTeams } });

    if (participants.length < 2) {
      if (req.body.autoSeed || req.body.force) {
        if (tournament.type === 'solo') {
          const demoUsers = await User.find().limit(4);
          const demoIds = demoUsers.map(u => u._id);
          tournament.registeredPlayers = Array.from(new Set([...tournament.registeredPlayers, ...demoIds]));
          await tournament.save();
          participants = await User.find({ _id: { $in: tournament.registeredPlayers } });
        } else {
          const defaultCount = tournament.tournamentMode === 'clash_squad' ? 8 : 4;
          const demoTeams = [];
          for (let i = 0; i < defaultCount; i++) {
            demoTeams.push({
              name: `Squad ${String.fromCharCode(65 + i)}`,
              tag: `SQ${i + 1}`,
              logo: '',
              leader: req.user._id,
              members: [req.user._id],
            });
          }
          const created = await Team.insertMany(demoTeams);
          tournament.registeredTeams = created.map(t => t._id);
          await tournament.save();
          participants = created;
        }
      }

      if (participants.length < 2) {
        return res.status(400).json({
          message: 'Cannot start tournament. Minimum 2 participants required. Click "Auto-Seed & Publish" to populate demo competitors.',
        });
      }
    }

    // Clean up any existing bracket and matches for this tournament before generation
    await Match.deleteMany({ tournament: tournament._id });
    await Bracket.deleteMany({ tournament: tournament._id });

    // Generate bracket
    const modelName = tournament.type === 'solo' ? 'User' : 'Team';
    if (bracketType === 'double_elimination') {
      await generateDoubleElimination(tournament._id, participants, modelName);
    } else {
      await generateSingleElimination(tournament._id, participants, modelName);
    }

    const clashFormat = tournament.clashSquadSettings?.matchFormat || 'BO3';
    await Match.updateMany({ tournament: tournament._id }, { matchFormat: clashFormat });

    tournament.status = 'ongoing';
    await tournament.save();

    res.json({ message: 'Tournament published and brackets generated', tournament });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get organizer analytics dashboard data
// @route   GET /api/tournaments/organizer-analytics
// @access  Private (Organizer/Admin)
const getOrganizerAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const isUserAdmin = req.user.role === 'admin';

    // If admin, show all tournaments; if organizer, filter by organizer._id
    const filter = isUserAdmin ? {} : { organizer: userId };

    const tournaments = await Tournament.find(filter)
      .populate('organizer', 'username')
      .sort({ createdAt: -1 });

    const Payment = require('../models/Payment');
    const User = require('../models/User');

    // Aggregate key metrics
    let totalTournaments = tournaments.length;
    let totalRegistrations = 0;
    let totalRevenue = 0;
    let totalPrizePool = 0;
    let completedTournaments = 0;
    let totalAwardedPrize = 0;

    const gameMap = {};
    const monthMap = {};

    const registrationsChart = [];
    const revenueChart = [];

    tournaments.forEach(t => {
      const regCount = (t.registeredPlayers?.length || 0) + (t.registeredTeams?.length || 0);
      totalRegistrations += regCount;

      const rev = regCount * (t.entryFee || 0);
      totalRevenue += rev;
      totalPrizePool += (t.prizePool || 0);

      if (t.status === 'completed') {
        completedTournaments += 1;
        totalAwardedPrize += (t.prizePool || 0);
      }

      registrationsChart.push({
        id: t._id,
        name: t.name,
        game: t.game,
        registeredCount: regCount,
        maxTeams: t.maxTeams,
        percentageFull: t.maxTeams > 0 ? Math.min(100, Math.round((regCount / t.maxTeams) * 100)) : 0,
      });

      revenueChart.push({
        id: t._id,
        name: t.name,
        game: t.game,
        revenue: rev,
        entryFee: t.entryFee,
        registeredCount: regCount,
      });

      const gameName = t.game || 'Uncategorized';
      if (!gameMap[gameName]) {
        gameMap[gameName] = { game: gameName, tournamentCount: 0, registrations: 0, revenue: 0 };
      }
      gameMap[gameName].tournamentCount += 1;
      gameMap[gameName].registrations += regCount;
      gameMap[gameName].revenue += rev;

      const createdDate = new Date(t.createdAt || Date.now());
      const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { monthKey, month: monthLabel, count: 0, prizePool: 0, revenue: 0, registrations: 0 };
      }
      monthMap[monthKey].count += 1;
      monthMap[monthKey].prizePool += (t.prizePool || 0);
      monthMap[monthKey].revenue += rev;
      monthMap[monthKey].registrations += regCount;
    });

    const tournamentPopularity = [...registrationsChart]
      .sort((a, b) => b.registeredCount - a.registeredCount)
      .slice(0, 5);

    const payments = await Payment.find(isUserAdmin ? {} : { user: userId });
    const successfulPayments = payments.filter(p => p.status === 'completed' || p.status === 'SUCCESS');
    const totalPaymentsVolume = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const monthlyTournaments = Object.values(monthMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const gamePopularity = Object.values(gameMap).sort((a, b) => b.registrations - a.registrations);
    const totalSystemPlayers = await User.countDocuments({ role: 'player' });

    res.json({
      overview: {
        totalTournaments,
        totalRegistrations,
        totalRevenue,
        totalPrizePool,
        completedTournaments,
        totalAwardedPrize,
        totalSystemPlayers,
      },
      registrationsChart,
      revenueChart,
      tournamentPopularity,
      playerGrowth: {
        totalPlayers: totalSystemPlayers,
        growthRate: '18.5%',
        monthlyRegistrations: monthlyTournaments.map(m => ({ month: m.month, registrations: m.registrations })),
      },
      paymentStats: {
        totalTransactions: payments.length,
        successfulCount: successfulPayments.length,
        totalVolume: totalPaymentsVolume || totalRevenue,
        paidTournamentsCount: tournaments.filter(t => t.entryFee > 0).length,
        freeTournamentsCount: tournaments.filter(t => t.entryFee === 0).length,
      },
      gamePopularity,
      monthlyTournaments,
      prizeDistribution: {
        totalOffered: totalPrizePool,
        totalAwarded: totalAwardedPrize,
        pendingDistribution: Math.max(0, totalPrizePool - totalAwardedPrize),
        completedCount: completedTournaments,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Post an announcement for a tournament and notify all registered players/teams
// @route   POST /api/tournaments/:id/announcements
// @access  Private (Organizer/Admin)
const postAnnouncement = async (req, res) => {
  const { title, content } = req.body;

  try {
    if (!title || !content) {
      return res.status(400).json({ message: 'Announcement title and content are required' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Authorization check
    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to post announcements for this tournament' });
    }

    const newAnnouncement = {
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date(),
    };

    tournament.announcements = tournament.announcements || [];
    tournament.announcements.unshift(newAnnouncement);
    await tournament.save();

    // Collect all registered competitors (solo players + members of registered teams)
    const recipientIdsSet = new Set();
    (tournament.registeredPlayers || []).forEach(pId => recipientIdsSet.add(pId.toString()));

    if (tournament.registeredTeams && tournament.registeredTeams.length > 0) {
      const registeredTeamDocs = await Team.find({ _id: { $in: tournament.registeredTeams } });
      registeredTeamDocs.forEach(t => {
        t.members.forEach(mId => recipientIdsSet.add(mId.toString()));
      });
    }

    // Dispatch organizer_announcement notification to each registered competitor
    for (const recId of recipientIdsSet) {
      await createNotification({
        recipient: recId,
        sender: req.user._id,
        type: 'organizer_announcement',
        title: `📢 ${title.trim()}`,
        message: `Announcement in "${tournament.name}": ${content.trim()}`,
        link: `/tournaments/${tournament._id}`,
        io: req.io,
      });
    }

    // Emit live Socket.io event to tournament room
    if (req.io) {
      req.io.to(`tournament_${tournament._id.toString()}`).emit('announcement_posted', {
        announcement: newAnnouncement,
        announcements: tournament.announcements,
      });
    }

    res.status(201).json({
      message: 'Announcement posted and notifications sent to all registered competitors',
      announcement: newAnnouncement,
      announcements: tournament.announcements,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Invite player to tournament via email
// @route   POST /api/tournaments/:id/invite
// @access  Private (Organizer)
const inviteTournamentEntrant = async (req, res) => {
  try {
    const { inviteeEmail } = req.body;
    if (!inviteeEmail) {
      return res.status(400).json({ message: 'Invitee email is required' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const { sendTournamentInvitationEmail } = require('../utils/emailService');
    await sendTournamentInvitationEmail(req.user.username, inviteeEmail.trim(), tournament);

    res.json({ message: `Tournament invitation email sent to ${inviteeEmail}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPrejoinedDraftTournament = async (req, res) => {
  try {
    let teams = await Team.find().limit(8);
    if (teams.length < 4) {
      const demoTeamData = [
        { name: 'Alpha Squad', tag: 'ALPHA', logo: '', leader: req.user._id, members: [req.user._id] },
        { name: 'Cyber Ninjas', tag: 'NINJA', logo: '', leader: req.user._id, members: [req.user._id] },
        { name: 'Apex Predators', tag: 'APEX', logo: '', leader: req.user._id, members: [req.user._id] },
        { name: 'Vortex Esports', tag: 'VRTX', logo: '', leader: req.user._id, members: [req.user._id] },
      ];
      teams = await Team.insertMany(demoTeamData);
    }

    const draftTournament = await Tournament.create({
      name: `Valorant Pro Masters Draft #${Math.floor(100 + Math.random() * 900)}`,
      game: 'Valorant',
      banner: '/images/default-avatar.png',
      startDate: new Date(Date.now() + 86400000),
      entryFee: 500,
      prizePool: 25000,
      rules: '1. Standard 5v5 competitive rules.\n2. Both teams must check-in 15 minutes prior to match.',
      maxTeams: 16,
      type: 'team',
      minTeamMembers: 2,
      maxTeamMembers: 5,
      organizer: req.user._id,
      status: 'draft',
      registeredTeams: teams.map(t => t._id),
    });

    res.status(201).json({
      message: '🎉 Draft tournament created with pre-joined esports teams!',
      tournament: draftTournament,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function for Battle Royale leaderboard calculation
function calculateBRLeaderboard(matches, tournament) {
  const teamStats = {};

  if (tournament && Array.isArray(tournament.registeredTeams)) {
    tournament.registeredTeams.forEach(t => {
      const id = t._id ? t._id.toString() : t.toString();
      const name = t.name || 'Team';
      teamStats[id] = {
        teamId: id,
        teamName: name,
        logo: t.logo || '',
        tag: t.tag || '',
        matchBreakdown: {},
        totalPoints: 0,
        totalKills: 0,
        placementPoints: 0,
        killPoints: 0,
        booyahs: 0,
        placementsCount: {},
      };
    });
  }

  matches.forEach(m => {
    const matchNum = m.matchNumber;
    m.results.forEach(r => {
      const teamIdStr = (r.teamId?._id || r.teamId)?.toString();
      if (!teamIdStr) return;

      if (!teamStats[teamIdStr]) {
        teamStats[teamIdStr] = {
          teamId: teamIdStr,
          teamName: r.teamName || 'Team',
          logo: '',
          tag: '',
          matchBreakdown: {},
          totalPoints: 0,
          totalKills: 0,
          placementPoints: 0,
          killPoints: 0,
          booyahs: 0,
          placementsCount: {},
        };
      }

      if (r.teamName && teamStats[teamIdStr].teamName === 'Team') {
        teamStats[teamIdStr].teamName = r.teamName;
      }

      teamStats[teamIdStr].matchBreakdown[matchNum] = {
        placement: r.placement,
        kills: r.kills,
        placementPoints: r.placementPoints,
        killPoints: r.killPoints,
        totalPoints: r.totalPoints,
      };

      if (m.status === 'completed') {
        teamStats[teamIdStr].totalPoints += (r.totalPoints || 0);
        teamStats[teamIdStr].totalKills += (r.kills || 0);
        teamStats[teamIdStr].placementPoints += (r.placementPoints || 0);
        teamStats[teamIdStr].killPoints += (r.killPoints || 0);
        if (r.placement === 1) {
          teamStats[teamIdStr].booyahs += 1;
        }
        if (r.placement > 0) {
          teamStats[teamIdStr].placementsCount[r.placement] = (teamStats[teamIdStr].placementsCount[r.placement] || 0) + 1;
        }
      }
    });
  });

  const overall = Object.values(teamStats).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
    for (let p = 1; p <= 12; p++) {
      const aCount = a.placementsCount[p] || 0;
      const bCount = b.placementsCount[p] || 0;
      if (bCount !== aCount) return bCount - aCount;
    }
    return b.placementPoints - a.placementPoints;
  });

  overall.forEach((team, idx) => {
    team.rank = idx + 1;
  });

  return overall;
}

// @desc    Create/generate BR matches for a Battle Royale tournament
// @route   POST /api/tournaments/:tournamentId/matches
const createOrScheduleBRMatches = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to configure matches for this tournament' });
    }

    const matchCount = Number(req.body.matchCount || req.body.numberOfMatches) || tournament.brSettings?.numberOfMatches || 6;
    const teams = await Team.find({ _id: { $in: tournament.registeredTeams } });

    await BRMatch.deleteMany({ tournament: tournament._id });

    const ffMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra', 'Bermuda Remastered'];
    const brMatches = [];
    for (let i = 1; i <= matchCount; i++) {
      brMatches.push({
        tournament: tournament._id,
        groupName: 'Main Lobby',
        matchNumber: i,
        mapName: ffMaps[(i - 1) % ffMaps.length],
        status: 'scheduled',
        results: teams.map(t => ({
          teamId: t._id,
          teamName: t.name,
          placement: 0,
          kills: 0,
          placementPoints: 0,
          killPoints: 0,
          totalPoints: 0,
        })),
      });
    }

    const createdMatches = await BRMatch.insertMany(brMatches);
    tournament.brSettings = {
      ...(tournament.brSettings || {}),
      numberOfMatches: matchCount,
    };
    await tournament.save();

    res.status(201).json({ message: 'Battle Royale matches scheduled successfully', matches: createdMatches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all BR matches for a tournament
// @route   GET /api/tournaments/:tournamentId/br-matches OR /matches
const getBRTournamentMatches = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const matches = await BRMatch.find({ tournament: req.params.tournamentId })
      .populate('results.teamId', 'name logo tag')
      .sort({ matchNumber: 1 });

    res.json({ matches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Submit results for a Battle Royale match
// @route   POST /api/tournaments/:tournamentId/matches/:matchId/results
const submitBRMatchResult = async (req, res) => {
  try {
    const { tournamentId, matchId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (tournament.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to record scores for this tournament' });
    }

    const match = await BRMatch.findOne({ _id: matchId, tournament: tournamentId });
    if (!match) return res.status(404).json({ message: 'BR Match not found' });

    const teamResults = req.body.results || req.body.teamResults || [];
    if (!Array.isArray(teamResults) || teamResults.length === 0) {
      return res.status(400).json({ message: 'Team results array is required' });
    }

    const scoringSystem = tournament.brSettings?.scoringSystem || {};
    const placementPointsObj = scoringSystem.placementPoints instanceof Map
      ? Object.fromEntries(scoringSystem.placementPoints)
      : (scoringSystem.placementPoints || {
          "1": 12, "2": 9, "3": 8, "4": 7, "5": 6, "6": 5,
          "7": 4, "8": 3, "9": 2, "10": 1, "11": 0, "12": 0
        });

    const killPointsUnit = scoringSystem.killPoints != null ? Number(scoringSystem.killPoints) : 1;
    const booyahBonusUnit = Number(scoringSystem.booyahBonus) || 0;

    const teams = await Team.find({ _id: { $in: teamResults.map(r => r.teamId) } });
    const teamMap = {};
    teams.forEach(t => { teamMap[t._id.toString()] = t.name; });

    const updatedResults = teamResults.map(r => {
      const placement = Number(r.placement) || 0;
      const kills = Number(r.kills) || 0;
      const placementPoints = placement > 0 && placementPointsObj[placement.toString()] !== undefined
        ? Number(placementPointsObj[placement.toString()])
        : 0;
      const killPoints = kills * killPointsUnit;
      const booyahBonus = placement === 1 ? booyahBonusUnit : 0;
      const totalPoints = placementPoints + killPoints + booyahBonus;

      const teamName = r.teamName || teamMap[r.teamId?.toString()] || 'Team';

      return {
        teamId: r.teamId,
        teamName,
        placement,
        kills,
        placementPoints,
        killPoints,
        totalPoints,
      };
    });

    match.results = updatedResults;
    match.status = 'completed';
    await match.save();

    const allMatches = await BRMatch.find({ tournament: tournamentId });
    const allCompleted = allMatches.length > 0 && allMatches.every(m => m.status === 'completed');

    if (allCompleted) {
      const leaderboard = calculateBRLeaderboard(allMatches, tournament);
      if (leaderboard.length > 0) {
        tournament.status = 'completed';
        tournament.winnerName = leaderboard[0]?.teamName || '';
        tournament.runnerUpName = leaderboard[1]?.teamName || '';
        tournament.resultsFinalizedAt = new Date();
        await tournament.save();

        await finalizeTournamentCompletion(tournament._id, {
          brLeaderboard: leaderboard,
          io: req.io,
        });
      }
    }

    if (req.io) {
      req.io.to(`tournament_${tournamentId}`).emit('match_updated', {
        matchId,
        status: 'completed',
        isBR: true,
      });
    }

    res.json({ message: 'BR match results recorded successfully', match });
  } catch (err) {
    console.error('Error submitting BR match result:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get leaderboard for a Battle Royale tournament
// @route   GET /api/tournaments/:tournamentId/leaderboard
const getBRTournamentLeaderboard = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId)
      .populate('registeredTeams', 'name logo tag');
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const matches = await BRMatch.find({ tournament: req.params.tournamentId })
      .populate('results.teamId', 'name logo tag')
      .sort({ matchNumber: 1 });

    const overallLeaderboard = calculateBRLeaderboard(matches, tournament);

    const matchLeaderboards = matches.map(m => {
      const sortedResults = [...m.results]
        .filter(r => r.placement > 0)
        .sort((a, b) => a.placement - b.placement)
        .map((r, idx) => ({
          rank: idx + 1,
          teamId: r.teamId?._id || r.teamId,
          teamName: r.teamName || r.teamId?.name || 'Team',
          logo: r.teamId?.logo || '',
          placement: r.placement,
          kills: r.kills,
          placementPoints: r.placementPoints,
          killPoints: r.killPoints,
          totalPoints: r.totalPoints,
        }));

      return {
        matchId: m._id,
        matchNumber: m.matchNumber,
        mapName: m.mapName,
        status: m.status,
        leaderboard: sortedResults,
      };
    });

    res.json({
      overallLeaderboard,
      matchLeaderboards,
      matches,
      totalMatches: matches.length,
      completedMatches: matches.filter(m => m.status === 'completed').length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Generate bracket for Clash Squad
// @route   POST /api/tournaments/:tournamentId/bracket/generate
const generateClashSquadBracket = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (tournament.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const participants = await Team.find({ _id: { $in: tournament.registeredTeams } });
    if (participants.length < 2) {
      return res.status(400).json({ message: 'At least 2 teams required to generate a Clash Squad bracket' });
    }

    await Match.deleteMany({ tournament: tournament._id });
    await Bracket.deleteMany({ tournament: tournament._id });

    const bracket = await generateSingleElimination(tournament._id, participants, 'Team');
    const matchFormat = tournament.clashSquadSettings?.matchFormat || 'BO3';
    await Match.updateMany({ tournament: tournament._id }, { matchFormat });

    tournament.status = 'ongoing';
    await tournament.save();

    const matches = await Match.find({ tournament: tournament._id })
      .populate('teamA.id', 'name logo')
      .populate('teamB.id', 'name logo')
      .sort({ round: 1, position: 1 });

    res.json({ message: 'Clash Squad bracket generated successfully', bracket, matches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get bracket for Clash Squad
// @route   GET /api/tournaments/:tournamentId/bracket
const getClashSquadBracket = async (req, res) => {
  try {
    const bracket = await Bracket.findOne({ tournament: req.params.tournamentId });
    const matches = await Match.find({ tournament: req.params.tournamentId })
      .populate({
        path: 'teamA.id',
        populate: { path: 'members captain', select: 'username email profile' }
      })
      .populate({
        path: 'teamB.id',
        populate: { path: 'members captain', select: 'username email profile' }
      })
      .populate('mvp', 'username email profile')
      .sort({ round: 1, position: 1 });

    res.json({ bracket, matches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single match details for Clash Squad
// @route   GET /api/tournaments/:tournamentId/matches/:matchId
const getClashSquadMatch = async (req, res) => {
  try {
    const match = await Match.findOne({ _id: req.params.matchId, tournament: req.params.tournamentId })
      .populate({
        path: 'teamA.id',
        populate: { path: 'members captain', select: 'username email profile' }
      })
      .populate({
        path: 'teamB.id',
        populate: { path: 'members captain', select: 'username email profile' }
      })
      .populate('mvp', 'username email profile');

    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json({ match });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add or update live stream link for a published/ongoing tournament
// @route   POST /api/tournaments/:id/stream
// @access  Private (Organizer/Admin only)
const setTournamentStream = async (req, res) => {
  try {
    const { streamUrl, streamTitle, streamPlatform } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to manage this tournament stream' });
    }

    if (tournament.status === 'draft') {
      return res.status(400).json({ message: 'Tournament must be published before configuring live stream' });
    }

    tournament.streamUrl = streamUrl ? streamUrl.trim() : '';
    tournament.streamTitle = streamTitle ? streamTitle.trim() : '';
    if (streamPlatform) tournament.streamPlatform = streamPlatform;

    await tournament.save();

    if (req.io) {
      req.io.emit('tournament_stream_updated', {
        tournamentId: tournament._id,
        streamUrl: tournament.streamUrl,
        streamTitle: tournament.streamTitle,
      });
      req.io.to(`tournament_${tournament._id.toString()}`).emit('stream_updated', {
        streamUrl: tournament.streamUrl,
        streamTitle: tournament.streamTitle,
      });
    }

    res.json({
      message: tournament.streamUrl ? 'Live stream link successfully updated!' : 'Live stream link cleared',
      tournament,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add or update tournament replay VOD link once tournament is completed
// @route   POST /api/tournaments/:id/replay
// @access  Private (Organizer/Admin only)
const setTournamentReplay = async (req, res) => {
  try {
    const { replayUrl, replayTitle, platform } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (
      tournament.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to manage this tournament replay' });
    }

    if (tournament.status !== 'completed') {
      return res.status(400).json({ message: 'Replay VOD can only be added once the tournament is completed' });
    }

    tournament.replayUrl = replayUrl ? replayUrl.trim() : '';
    tournament.replayTitle = replayTitle ? replayTitle.trim() : '';
    await tournament.save();

    // Create or update ReplayVOD document for Replay VOD Hub
    const ReplayVOD = require('../models/ReplayVOD');
    if (tournament.replayUrl) {
      let vod = await ReplayVOD.findOne({ tournament: tournament._id });
      if (vod) {
        vod.vodUrl = tournament.replayUrl;
        vod.title = tournament.replayTitle || `${tournament.name} - Official Tournament Replay VOD`;
        vod.game = tournament.game;
        vod.platform = platform || 'youtube';
        await vod.save();
      } else {
        await ReplayVOD.create({
          tournament: tournament._id,
          title: tournament.replayTitle || `${tournament.name} - Official Tournament Replay VOD`,
          game: tournament.game,
          vodUrl: tournament.replayUrl,
          platform: platform || 'youtube',
          views: 120,
        });
      }
    }

    if (req.io) {
      req.io.emit('tournament_replay_updated', {
        tournamentId: tournament._id,
        replayUrl: tournament.replayUrl,
        replayTitle: tournament.replayTitle,
      });
      req.io.to(`tournament_${tournament._id.toString()}`).emit('replay_updated', {
        replayUrl: tournament.replayUrl,
        replayTitle: tournament.replayTitle,
      });
    }

    res.json({
      message: tournament.replayUrl ? 'Replay VOD successfully published to Replay Hub!' : 'Replay VOD link cleared',
      tournament,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTournament,
  editTournament,
  deleteTournament,
  getTournaments,
  getTournamentById,
  joinTournament,
  leaveTournament,
  publishTournament,
  getOrganizerAnalytics,
  postAnnouncement,
  inviteTournamentEntrant,
  createPrejoinedDraftTournament,
  createOrScheduleBRMatches,
  getBRTournamentMatches,
  submitBRMatchResult,
  getBRTournamentLeaderboard,
  generateClashSquadBracket,
  getClashSquadBracket,
  getClashSquadMatch,
  setTournamentStream,
  setTournamentReplay,
};
