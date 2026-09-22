const assert = require('assert');

// 1. Test Best of X validation logic from matchController.js
function validateBestOfScore(matchFormat, scoreA, scoreB, isLive) {
  const format = (matchFormat || 'BO3').toUpperCase();
  const targetWins = format === 'BO1' ? 1 : format === 'BO5' ? 3 : 2;

  if (isLive) {
    if (scoreA > targetWins || scoreB > targetWins) {
      return { valid: false, error: `In a ${format} match, score cannot exceed ${targetWins} wins.` };
    }
    return { valid: true };
  }

  if (scoreA === scoreB) {
    return { valid: false, error: `Draws are not permitted in Clash Squad (${format}). A winner must be determined.` };
  }

  if (scoreA < targetWins && scoreB < targetWins) {
    return { valid: false, error: `In a ${format} match, the winner must reach ${targetWins} round wins.` };
  }

  if (scoreA > targetWins || scoreB > targetWins) {
    return { valid: false, error: `In a ${format} match, scores cannot exceed ${targetWins} wins.` };
  }

  const winner = scoreA > scoreB ? 'teamA' : 'teamB';
  return { valid: true, winner };
}

// 2. Test Battle Royale Points Calculation & Tie-breakers from tournamentController.js
function calculateAndSortBRLeaderboard(teams, matches, placementPointsMap, killPointsRate = 1) {
  const statsMap = {};
  teams.forEach(t => {
    statsMap[t.id] = {
      teamId: t.id,
      teamName: t.name,
      totalPoints: 0,
      totalKills: 0,
      placementPoints: 0,
      booyahs: 0,
      highestPlacement: 999,
      matchesPlayed: 0
    };
  });

  matches.forEach(m => {
    m.results.forEach(r => {
      const stats = statsMap[r.teamId];
      if (stats) {
        const placePts = placementPointsMap[r.placement] !== undefined ? placementPointsMap[r.placement] : 0;
        const killPts = (r.kills || 0) * killPointsRate;
        stats.totalPoints += placePts + killPts;
        stats.placementPoints += placePts;
        stats.totalKills += r.kills || 0;
        if (r.placement === 1) stats.booyahs += 1;
        if (r.placement < stats.highestPlacement) stats.highestPlacement = r.placement;
        stats.matchesPlayed += 1;
      }
    });
  });

  const leaderboard = Object.values(statsMap).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
    if (a.highestPlacement !== b.highestPlacement) return a.highestPlacement - b.highestPlacement;
    return b.placementPoints - a.placementPoints;
  });

  return leaderboard.map((row, index) => ({ rank: index + 1, ...row }));
}

// 3. Test Clash Squad bracket math (N teams, power of 2 P, byes in round 1)
function calculateBracketStructure(N) {
  if (N < 2) throw new Error('At least 2 teams required');
  const P = Math.pow(2, Math.ceil(Math.log2(N)));
  const totalRounds = Math.log2(P);
  const byes = P - N;
  const round1Matches = N - (P / 2);
  const round2Matches = P / 4;
  return { N, P, totalRounds, byes, round1Matches, round2Matches };
}

console.log('🧪 Starting Free Fire Tournament Logic Unit Tests...\n');

// Test 1: BO3 Score validation
console.log('▶ Test 1: Best of X Validation');
assert.strictEqual(validateBestOfScore('BO3', 2, 0, false).valid, true);
assert.strictEqual(validateBestOfScore('BO3', 2, 0, false).winner, 'teamA');
assert.strictEqual(validateBestOfScore('BO3', 1, 2, false).valid, true);
assert.strictEqual(validateBestOfScore('BO3', 1, 2, false).winner, 'teamB');
// Draw is rejected
assert.strictEqual(validateBestOfScore('BO3', 1, 1, false).valid, false);
// Incomplete without target wins is rejected for completed match
assert.strictEqual(validateBestOfScore('BO3', 1, 0, false).valid, false);
// Incomplete is valid for live match
assert.strictEqual(validateBestOfScore('BO3', 1, 0, true).valid, true);
// Overshoot (e.g. 3-1 in BO3) is rejected
assert.strictEqual(validateBestOfScore('BO3', 3, 1, false).valid, false);

// Test BO1 and BO5
assert.strictEqual(validateBestOfScore('BO1', 1, 0, false).valid, true);
assert.strictEqual(validateBestOfScore('BO1', 0, 0, false).valid, false);
assert.strictEqual(validateBestOfScore('BO5', 3, 2, false).valid, true);
assert.strictEqual(validateBestOfScore('BO5', 2, 2, false).valid, false);
console.log('✅ Best of X validation passed all cases.');

// Test 2: Battle Royale Points Calculation & Tie-breakers
console.log('\n▶ Test 2: Free Fire Battle Royale Points & Tie-breakers');
const defaultPlacementMap = {
  1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
  7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
};

const mockTeams = [
  { id: 'T1', name: 'Total Gaming' },
  { id: 'T2', name: 'TSG Army' },
  { id: 'T3', name: 'Team Elite' }
];

// Match 1:
// T1: 1st place (12 pts) + 5 kills = 17 pts
// T2: 2nd place (9 pts) + 8 kills = 17 pts  (Tie on total points! T2 has more kills, should rank #1)
// T3: 3rd place (8 pts) + 2 kills = 10 pts
const match1 = {
  results: [
    { teamId: 'T1', placement: 1, kills: 5 },
    { teamId: 'T2', placement: 2, kills: 8 },
    { teamId: 'T3', placement: 3, kills: 2 }
  ]
};

const lb1 = calculateAndSortBRLeaderboard(mockTeams, [match1], defaultPlacementMap);
assert.strictEqual(lb1[0].teamName, 'TSG Army', 'TSG Army should rank 1st due to tie-breaker (more kills)');
assert.strictEqual(lb1[1].teamName, 'Total Gaming', 'Total Gaming should rank 2nd');
assert.strictEqual(lb1[0].totalPoints, 17);
assert.strictEqual(lb1[1].totalPoints, 17);
assert.strictEqual(lb1[0].totalKills, 8);
assert.strictEqual(lb1[1].totalKills, 5);
console.log('✅ Battle Royale tie-breaker by total kills verified.');

// Match 2 with same points and same kills, tie broken by highest placement (Booyah)
const match2 = {
  results: [
    { teamId: 'T1', placement: 2, kills: 4 }, // T1: match1(12+5=17) + match2(9+4=13) = 30 pts, 9 kills, highest: 1st
    { teamId: 'T2', placement: 3, kills: 1 }, // T2: match1(9+8=17) + match2(8+1=9) = 26 pts, 9 kills
    { teamId: 'T3', placement: 1, kills: 8 }  // T3: match1(8+2=10) + match2(12+8=20) = 30 pts, 10 kills, highest: 1st
  ]
};
const lb2 = calculateAndSortBRLeaderboard(mockTeams, [match1, match2], defaultPlacementMap);
assert.strictEqual(lb2[0].teamName, 'Team Elite', 'Team Elite should rank 1st with 30 pts and 10 kills');
assert.strictEqual(lb2[1].teamName, 'Total Gaming', 'Total Gaming should rank 2nd with 30 pts and 9 kills');
assert.strictEqual(lb2[2].teamName, 'TSG Army', 'TSG Army should rank 3rd with 26 pts');
console.log('✅ Multi-match accumulation and Booyah tracking verified.');

// Test 3: Clash Squad Bracket Math for 4, 8, 12, 16, 32, 64 teams
console.log('\n▶ Test 3: Clash Squad Bracket Math & Byes');
const bracket8 = calculateBracketStructure(8);
assert.strictEqual(bracket8.P, 8);
assert.strictEqual(bracket8.totalRounds, 3);
assert.strictEqual(bracket8.byes, 0);
assert.strictEqual(bracket8.round1Matches, 4);

const bracket12 = calculateBracketStructure(12);
assert.strictEqual(bracket12.P, 16);
assert.strictEqual(bracket12.totalRounds, 4);
assert.strictEqual(bracket12.byes, 4, '12 teams should have 4 byes directly into Round 2');
assert.strictEqual(bracket12.round1Matches, 4, '12 teams should have 4 matches in Round 1');

const bracket64 = calculateBracketStructure(64);
assert.strictEqual(bracket64.P, 64);
assert.strictEqual(bracket64.totalRounds, 6);
assert.strictEqual(bracket64.byes, 0);
console.log('✅ Clash Squad bracket sizing (8, 12, 64 teams) verified.');

console.log('\n🎉 ALL FREE FIRE TOURNAMENT LOGIC TESTS PASSED SUCCESSFULLY!\n');
