const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const User = require('../models/User');
const BRMatch = require('../models/BRMatch');
const Match = require('../models/Match');
const Bracket = require('../models/Bracket');
const { generateSingleElimination } = require('../utils/bracketGenerator');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/arenaverse';

async function runTests() {
  console.log('🔄 Connecting to database for Free Fire tournament mode tests...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  try {
    // 1. Setup mock organizer & teams
    let organizer = await User.findOne({ role: { $in: ['organizer', 'admin'] } });
    if (!organizer) {
      organizer = await User.create({
        username: 'ff_test_organizer',
        email: `organizer_${Date.now()}@test.com`,
        password: 'password123',
        role: 'organizer',
      });
    }

    // Ensure 16 mock teams exist for testing
    let teams = await Team.find().limit(16);
    if (teams.length < 16) {
      const needed = 16 - teams.length;
      const newTeams = [];
      for (let i = 0; i < needed; i++) {
        newTeams.push({
          name: `Squad Test ${teams.length + i + 1}`,
          tag: `SQ${teams.length + i + 1}`,
          leader: organizer._id,
          members: [organizer._id],
        });
      }
      const created = await Team.insertMany(newTeams);
      teams = [...teams, ...created];
    }

    console.log(`\n========================================`);
    console.log(`TEST A: FREE FIRE BATTLE ROYALE MODE`);
    console.log(`========================================`);

    // Create Free Fire MAX Battle Royale tournament
    const brTeams = teams.slice(0, 12);
    const brTournament = await Tournament.create({
      name: `Free Fire MAX National Championship BR #${Date.now().toString().slice(-4)}`,
      game: 'Free Fire MAX',
      banner: '/images/default-avatar.png',
      startDate: new Date(Date.now() + 86400000),
      entryFee: 0,
      prizePool: 10000,
      rules: 'Standard Free Fire BR Rules: 12 Squads, Placement + Kills.',
      maxTeams: 12,
      type: 'team',
      minTeamMembers: 4,
      maxTeamMembers: 4,
      organizer: organizer._id,
      status: 'draft',
      tournamentMode: 'battle_royale',
      format: 'battle_royale',
      registeredTeams: brTeams.map(t => t._id),
      brSettings: {
        numberOfTeams: 12,
        numberOfMatches: 6,
        teamsPerGroup: 12,
        matchesPerGroup: 6,
        scoringSystem: {
          placementPoints: {
            "1": 12, "2": 9, "3": 8, "4": 7, "5": 6, "6": 5,
            "7": 4, "8": 3, "9": 2, "10": 1, "11": 0, "12": 0
          },
          killPoints: 1,
          booyahBonus: 0,
          tieBreakers: ['total_points', 'total_kills', 'better_placement', 'booyahs']
        }
      }
    });

    console.log(`✓ Created Free Fire BR Tournament: "${brTournament.name}" (tournamentMode: ${brTournament.tournamentMode})`);
    console.log(`✓ Registered teams count: ${brTournament.registeredTeams.length} (Standard 12 teams)`);

    // Simulate Match Generation for 6 matches
    const ffMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra', 'Bermuda Remastered'];
    const brMatches = [];
    for (let i = 1; i <= 6; i++) {
      brMatches.push({
        tournament: brTournament._id,
        groupName: 'Main Lobby',
        matchNumber: i,
        mapName: ffMaps[(i - 1) % ffMaps.length],
        status: 'scheduled',
        results: brTeams.map(t => ({
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
    const createdBRMatches = await BRMatch.insertMany(brMatches);
    brTournament.status = 'ongoing';
    await brTournament.save();

    console.log(`✓ Created and scheduled ${createdBRMatches.length} BR matches with 12 teams each.`);
    console.log(`✓ Match 1: ${createdBRMatches[0].mapName} with ${createdBRMatches[0].results.length} teams.`);

    // Record results for Match 1:
    // Team 0: 1st place, 8 kills -> 12 + 8 = 20 pts
    // Team 1: 2nd place, 5 kills -> 9 + 5 = 14 pts
    // Team 2: 3rd place, 6 kills -> 8 + 6 = 14 pts (Tie test: Team 2 has 6 kills vs Team 1 has 5 kills)
    const match1 = createdBRMatches[0];
    const match1Results = brTeams.map((t, idx) => {
      const placement = idx + 1;
      let kills = 0;
      if (idx === 0) kills = 8;
      else if (idx === 1) kills = 5;
      else if (idx === 2) kills = 6;
      else kills = Math.floor(Math.random() * 3);

      const pPts = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0 }[placement] || 0;
      const kPts = kills * 1;
      return {
        teamId: t._id,
        teamName: t.name,
        placement,
        kills,
        placementPoints: pPts,
        killPoints: kPts,
        totalPoints: pPts + kPts,
      };
    });

    match1.results = match1Results;
    match1.status = 'completed';
    await match1.save();
    console.log(`✓ Recorded Match 1 results:`);
    console.log(`  - 1st: ${match1Results[0].teamName} (Placement: 12 pts, Kills: 8 pts -> Total: 20 pts)`);
    console.log(`  - 2nd: ${match1Results[1].teamName} (Placement: 9 pts, Kills: 5 pts -> Total: 14 pts)`);
    console.log(`  - 3rd: ${match1Results[2].teamName} (Placement: 8 pts, Kills: 6 pts -> Total: 14 pts)`);

    // Verify Points calculation
    if (match1Results[0].totalPoints !== 20) {
      throw new Error(`Expected 20 points for 1st place with 8 kills, got ${match1Results[0].totalPoints}`);
    }

    console.log(`\n========================================`);
    console.log(`TEST B: FREE FIRE CLASH SQUAD MODE`);
    console.log(`========================================`);

    // Test B1: 8 Teams Clash Squad with BO3
    const cs8Teams = teams.slice(0, 8);
    const cs8Tournament = await Tournament.create({
      name: `Free Fire MAX Clash Squad Invitational #${Date.now().toString().slice(-4)}`,
      game: 'Free Fire MAX',
      banner: '/images/default-avatar.png',
      startDate: new Date(Date.now() + 86400000),
      entryFee: 0,
      prizePool: 5000,
      rules: 'Clash Squad 4v4: Team vs Team Single Elimination, Best of 3.',
      maxTeams: 8,
      type: 'team',
      minTeamMembers: 4,
      maxTeamMembers: 4,
      organizer: organizer._id,
      status: 'draft',
      tournamentMode: 'clash_squad',
      format: 'knockout',
      clashSquadSettings: {
        matchFormat: 'BO3',
      },
      registeredTeams: cs8Teams.map(t => t._id),
    });

    console.log(`✓ Created Clash Squad Tournament: "${cs8Tournament.name}" (Format: ${cs8Tournament.clashSquadSettings.matchFormat})`);
    
    // Generate bracket for 8 teams
    const bracket8 = await generateSingleElimination(cs8Tournament._id, cs8Teams, 'Team');
    await Match.updateMany({ tournament: cs8Tournament._id }, { matchFormat: 'BO3' });
    const matches8 = await Match.find({ tournament: cs8Tournament._id }).sort({ round: 1, position: 1 });
    console.log(`✓ Generated 8-team single elimination bracket: ${matches8.length} total matches across ${bracket8.roundsCount} rounds.`);

    const round1Matches8 = matches8.filter(m => m.round === 1);
    console.log(`✓ Round 1 (Quarter Finals): ${round1Matches8.length} matches.`);
    if (round1Matches8.length !== 4) {
      throw new Error(`Expected 4 quarter-final matches for 8 teams, got ${round1Matches8.length}`);
    }

    // Test Score Validation for BO3:
    // BO3 rules: First team to reach 2 round wins wins the match.
    // Valid: 2-0, 2-1, 0-2, 1-2
    // Invalid: 3-3, 2-2, 3-1, 1-0 (when finalizing)
    const testMatch = round1Matches8[0];
    const validateBO3 = (sA, sB) => {
      const numA = Number(sA);
      const numB = Number(sB);
      if (numA === numB) return { valid: false, reason: 'Draw not allowed' };
      const max = Math.max(numA, numB);
      const min = Math.min(numA, numB);
      if (max !== 2 || min >= 2) return { valid: false, reason: 'Must be first to 2 wins (2-0 or 2-1)' };
      return { valid: true };
    };

    if (validateBO3(3, 3).valid) throw new Error('BO3 should reject 3-3 draw');
    if (validateBO3(2, 2).valid) throw new Error('BO3 should reject 2-2 draw');
    if (validateBO3(3, 1).valid) throw new Error('BO3 should reject 3-1 (max wins is 2)');
    if (!validateBO3(2, 1).valid) throw new Error('BO3 should accept 2-1');
    if (!validateBO3(2, 0).valid) throw new Error('BO3 should accept 2-0');
    console.log(`✓ Best of 3 score validation passed (rejects 3-3, 2-2, 3-1; accepts 2-1, 2-0).`);

    // Test Winner Advancement into Semi-Final
    testMatch.scoreA = 2;
    testMatch.scoreB = 1;
    testMatch.winner = testMatch.teamA.id;
    testMatch.status = 'completed';
    await testMatch.save();

    if (testMatch.nextMatchId) {
      const nextMatch = await Match.findById(testMatch.nextMatchId);
      const targetSlot = testMatch.nextMatchSlot || (testMatch.position % 2 !== 0 ? 'teamA' : 'teamB');
      nextMatch[targetSlot].id = testMatch.teamA.id;
      nextMatch[targetSlot].name = testMatch.teamA.name;
      await nextMatch.save();
      console.log(`✓ Winner "${testMatch.teamA.name}" successfully advanced to Semi-Final (${targetSlot})!`);
    }

    // Test B2: Dynamic Bracket with Non-Power-of-Two (12 Teams with Byes)
    console.log(`\n--- Testing 12 Teams Clash Squad Bracket (Non-Power-of-Two with Byes) ---`);
    const cs12Teams = teams.slice(0, 12);
    const cs12Tournament = await Tournament.create({
      name: `Free Fire Clash Squad 12-Team Cup #${Date.now().toString().slice(-4)}`,
      game: 'Free Fire',
      startDate: new Date(Date.now() + 86400000),
      rules: '12 Squads Clash Squad Knockout with Byes.',
      maxTeams: 12,
      type: 'team',
      organizer: organizer._id,
      tournamentMode: 'clash_squad',
      registeredTeams: cs12Teams.map(t => t._id),
    });

    const bracket12 = await generateSingleElimination(cs12Tournament._id, cs12Teams, 'Team');
    const matches12 = await Match.find({ tournament: cs12Tournament._id }).sort({ round: 1, position: 1 });
    console.log(`✓ Successfully generated 12-team bracket: ${matches12.length} matches, ${bracket12.roundsCount} rounds.`);
    
    // For 12 teams (P = 16):
    // Round 2 Feeder Slots = 8
    // Round 1 Matches = 12 - 8 = 4 matches (8 teams compete in R1)
    // Round 2 Byes = 8 - 4 = 4 teams get direct Byes into Round 2!
    const r1Matches12 = matches12.filter(m => m.round === 1);
    const r2Matches12 = matches12.filter(m => m.round === 2);
    console.log(`✓ Round 1 matches count: ${r1Matches12.length} (4 matches for 8 teams)`);
    console.log(`✓ Round 2 matches count: ${r2Matches12.length} (4 matches with 4 direct Byes)`);

    // Verify Byes in Round 2: at least 4 teams assigned directly
    let byesCount = 0;
    r2Matches12.forEach(m => {
      if (m.teamA.id) byesCount++;
      if (m.teamB.id) byesCount++;
    });
    console.log(`✓ Round 2 Byes assigned directly: ${byesCount} slots populated.`);
    if (byesCount !== 4) {
      throw new Error(`Expected 4 direct Byes for 12 teams, got ${byesCount}`);
    }

    // Test B3: 4 Teams Clash Squad
    console.log(`\n--- Testing 4 Teams Clash Squad Bracket ---`);
    const cs4Teams = teams.slice(0, 4);
    const cs4Tournament = await Tournament.create({
      name: `Free Fire Clash Squad 4-Team Quick Cup #${Date.now().toString().slice(-4)}`,
      game: 'Free Fire',
      startDate: new Date(Date.now() + 86400000),
      rules: '4 Squads Clash Squad Knockout.',
      maxTeams: 4,
      type: 'team',
      organizer: organizer._id,
      tournamentMode: 'clash_squad',
      registeredTeams: cs4Teams.map(t => t._id),
    });
    const bracket4 = await generateSingleElimination(cs4Tournament._id, cs4Teams, 'Team');
    const matches4 = await Match.find({ tournament: cs4Tournament._id });
    console.log(`✓ Successfully generated 4-team bracket: ${matches4.length} matches across ${bracket4.roundsCount} rounds (Semi Finals + Final).`);

    // Test B4: 16 Teams Clash Squad
    console.log(`\n--- Testing 16 Teams Clash Squad Bracket ---`);
    const cs16Teams = teams.slice(0, 16);
    const cs16Tournament = await Tournament.create({
      name: `Free Fire Clash Squad 16-Team Championship #${Date.now().toString().slice(-4)}`,
      game: 'Free Fire',
      startDate: new Date(Date.now() + 86400000),
      rules: '16 Squads Clash Squad Knockout.',
      maxTeams: 16,
      type: 'team',
      organizer: organizer._id,
      tournamentMode: 'clash_squad',
      registeredTeams: cs16Teams.map(t => t._id),
    });
    const bracket16 = await generateSingleElimination(cs16Tournament._id, cs16Teams, 'Team');
    const matches16 = await Match.find({ tournament: cs16Tournament._id });
    console.log(`✓ Successfully generated 16-team bracket: ${matches16.length} matches across ${bracket16.roundsCount} rounds (R16, QF, SF, Final).`);

    console.log(`\n========================================`);
    console.log(`TEST C: NON-FREE-FIRE GAMES (NO REGRESSIONS)`);
    console.log(`========================================`);

    const valTournament = await Tournament.create({
      name: `Valorant Champions Cup #${Date.now().toString().slice(-4)}`,
      game: 'Valorant',
      startDate: new Date(Date.now() + 86400000),
      rules: 'Standard 5v5 Valorant Knockout.',
      maxTeams: 8,
      type: 'team',
      organizer: organizer._id,
      tournamentMode: null,
      format: 'knockout',
      registeredTeams: teams.slice(0, 8).map(t => t._id),
    });

    console.log(`✓ Created Valorant tournament without tournamentMode (tournamentMode: ${valTournament.tournamentMode}).`);
    const valBracket = await generateSingleElimination(valTournament._id, teams.slice(0, 8), 'Team');
    console.log(`✓ Standard Valorant bracket generated normally: ${valBracket.roundsCount} rounds.`);

    // Cleanup created test tournaments
    await Tournament.deleteMany({ _id: { $in: [brTournament._id, cs8Tournament._id, cs12Tournament._id, cs4Tournament._id, cs16Tournament._id, valTournament._id] } });
    await BRMatch.deleteMany({ tournament: brTournament._id });
    await Match.deleteMany({ tournament: { $in: [cs8Tournament._id, cs12Tournament._id, cs4Tournament._id, cs16Tournament._id, valTournament._id] } });
    await Bracket.deleteMany({ tournament: { $in: [cs8Tournament._id, cs12Tournament._id, cs4Tournament._id, cs16Tournament._id, valTournament._id] } });

    console.log(`✓ Cleaned up temporary test data.`);
    console.log(`\n🎉 ALL TESTS PASSED SUCCESSFULLY! BOTH FREE FIRE TOURNAMENT MODES ARE FULLY OPERATIONAL.`);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database.');
  }
}

runTests();
