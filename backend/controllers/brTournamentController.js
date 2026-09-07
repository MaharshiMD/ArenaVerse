const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const TournamentStage = require('../models/TournamentStage');
const BRMatch = require('../models/BRMatch');

// Utility to shuffle an array (Fisher-Yates)
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// 1. Generate Groups for Group Stage
exports.generateGroups = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.format !== 'battle_royale') return res.status(400).json({ message: 'Not a BR tournament' });

    // Use registered teams
    const teams = [...tournament.registeredTeams];
    if (teams.length === 0) return res.status(400).json({ message: 'No registered teams' });

    const teamsPerGroup = tournament.brSettings.teamsPerGroup || 12;
    const numGroups = Math.ceil(teams.length / teamsPerGroup);
    
    // Shuffle teams for random draw
    shuffleArray(teams);

    const groups = [];
    for (let i = 0; i < numGroups; i++) {
      const groupName = `Group ${String.fromCharCode(65 + i)}`; // Group A, Group B...
      const groupTeams = teams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup).map(teamId => ({
        teamId,
        seed: 0,
        qualified: false
      }));
      
      groups.push({
        name: groupName,
        teams: groupTeams,
        matchesCount: tournament.brSettings.matchesPerGroup || 6,
        status: 'pending'
      });
    }

    // Create Group Stage
    const stage = new TournamentStage({
      tournament: tournamentId,
      name: 'Group Stage',
      type: 'group',
      groups,
      status: 'pending'
    });

    await stage.save();

    res.status(201).json({ message: 'Groups generated successfully', stage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. Generate Match Schedule for a Stage
exports.generateMatchSchedule = async (req, res) => {
  try {
    const { stageId } = req.params;
    const stage = await TournamentStage.findById(stageId).populate('tournament');

    if (!stage) return res.status(404).json({ message: 'Stage not found' });
    const matchesCount = stage.groups[0]?.matchesCount || 6;

    const matches = [];

    for (const group of stage.groups) {
      for (let i = 1; i <= matchesCount; i++) {
        const match = new BRMatch({
          tournament: stage.tournament._id,
          stage: stage._id,
          groupName: group.name,
          matchNumber: i,
          status: 'scheduled',
          results: group.teams.map(t => ({
            teamId: t.teamId,
            placement: 0,
            kills: 0,
            placementPoints: 0,
            killPoints: 0,
            totalPoints: 0
          }))
        });
        matches.push(match);
      }
    }

    await BRMatch.insertMany(matches);
    
    stage.status = 'ongoing';
    await stage.save();

    res.status(201).json({ message: 'Match schedule generated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Submit Match Results
exports.submitMatchResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { teamResults } = req.body; // Array of { teamId, placement, kills }

    const match = await BRMatch.findById(matchId).populate('tournament');
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const tournament = match.tournament;
    const { placementPoints, killPoints, booyahBonus } = tournament.brSettings.scoringSystem;

    // Default placement points mapping if Map is populated
    const placementPointsObj = placementPoints instanceof Map ? Object.fromEntries(placementPoints) : placementPoints;

    const updatedResults = teamResults.map(result => {
      const placementStr = result.placement.toString();
      const placementPts = placementPointsObj[placementStr] !== undefined ? placementPointsObj[placementStr] : 0;
      const killPts = result.kills * killPoints;
      const bonus = result.placement === 1 ? booyahBonus : 0;

      const totalPoints = placementPts + killPts + bonus;

      return {
        teamId: result.teamId,
        placement: result.placement,
        kills: result.kills,
        placementPoints: placementPts,
        killPoints: killPts,
        totalPoints: totalPoints
      };
    });

    match.results = updatedResults;
    match.status = 'completed';
    await match.save();

    res.status(200).json({ message: 'Match results submitted successfully', match });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 4. Get Leaderboard for a Stage
exports.getStageLeaderboard = async (req, res) => {
  try {
    const { stageId } = req.params;
    const matches = await BRMatch.find({ stage: stageId, status: 'completed' });
    const stage = await TournamentStage.findById(stageId);

    if (!stage) return res.status(404).json({ message: 'Stage not found' });

    // Calculate aggregated stats per group
    const leaderboard = {};

    for (const group of stage.groups) {
      leaderboard[group.name] = {};
      // Initialize team stats
      for (const team of group.teams) {
        leaderboard[group.name][team.teamId] = {
          teamId: team.teamId,
          totalPoints: 0,
          placementPoints: 0,
          killPoints: 0,
          kills: 0,
          booyahs: 0,
        };
      }
    }

    // Aggregate match results
    for (const match of matches) {
      const groupName = match.groupName;
      if (!leaderboard[groupName]) continue;

      for (const result of match.results) {
        const teamStats = leaderboard[groupName][result.teamId];
        if (teamStats) {
          teamStats.totalPoints += result.totalPoints;
          teamStats.placementPoints += result.placementPoints;
          teamStats.killPoints += result.killPoints;
          teamStats.kills += result.kills;
          if (result.placement === 1) {
            teamStats.booyahs += 1;
          }
        }
      }
    }

    // Convert to sorted arrays and apply tie-breakers (assuming standard tiebreakers for now: Total Pts > Booyahs > Kills > Placement Pts)
    const sortedLeaderboard = {};
    for (const groupName in leaderboard) {
      sortedLeaderboard[groupName] = Object.values(leaderboard[groupName]).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
        if (b.kills !== a.kills) return b.kills - a.kills;
        return b.placementPoints - a.placementPoints;
      });
    }

    res.status(200).json({ leaderboard: sortedLeaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 5. Qualify Teams to Next Stage (Grand Final)
exports.qualifyTeams = async (req, res) => {
  try {
    const { stageId } = req.params;
    const stage = await TournamentStage.findById(stageId).populate('tournament');
    
    if (!stage || stage.type !== 'group') return res.status(400).json({ message: 'Invalid stage' });

    const tournament = stage.tournament;
    const qualifiersPerGroup = tournament.brSettings.qualifiersPerGroup || 6;

    // Get current leaderboard
    const matches = await BRMatch.find({ stage: stageId, status: 'completed' });
    const leaderboard = {};

    for (const group of stage.groups) {
      leaderboard[group.name] = {};
      for (const team of group.teams) {
        leaderboard[group.name][team.teamId] = { teamId: team.teamId, totalPoints: 0, booyahs: 0, kills: 0, placementPoints: 0 };
      }
    }

    for (const match of matches) {
      const groupName = match.groupName;
      if (!leaderboard[groupName]) continue;
      for (const result of match.results) {
        const teamStats = leaderboard[groupName][result.teamId];
        if (teamStats) {
          teamStats.totalPoints += result.totalPoints;
          teamStats.booyahs += (result.placement === 1 ? 1 : 0);
          teamStats.kills += result.kills;
          teamStats.placementPoints += result.placementPoints;
        }
      }
    }

    let qualifiedTeamIds = [];

    for (const group of stage.groups) {
      const sortedTeams = Object.values(leaderboard[group.name]).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs;
        if (b.kills !== a.kills) return b.kills - a.kills;
        return b.placementPoints - a.placementPoints;
      });

      const qualifiers = sortedTeams.slice(0, qualifiersPerGroup).map(t => t.teamId);
      qualifiedTeamIds.push(...qualifiers);

      // Update qualification status in DB
      for (let t of group.teams) {
        if (qualifiers.some(qId => qId.toString() === t.teamId.toString())) {
          t.qualified = true;
        }
      }
    }

    stage.status = 'completed';
    await stage.save();

    // Create Grand Final Stage
    const finalStage = new TournamentStage({
      tournament: tournament._id,
      name: 'Grand Final',
      type: 'final',
      groups: [{
        name: 'Finals',
        teams: qualifiedTeamIds.map(teamId => ({ teamId, seed: 0, qualified: false })),
        matchesCount: tournament.brSettings.matchesPerGroup || 6,
        status: 'pending'
      }],
      status: 'pending'
    });

    await finalStage.save();

    res.status(200).json({ message: 'Teams qualified to Grand Final successfully', nextStage: finalStage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
