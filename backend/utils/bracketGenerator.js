const Match = require('../models/Match');
const Bracket = require('../models/Bracket');

/**
 * Fisher-Yates (Knuth) shuffle algorithm to randomize participants array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates single elimination bracket matching EXACTLY the registered participants count N.
 * Supports any N >= 2 (odd or even, e.g. 3, 5, 6, 7, 9...).
 * Eliminates dummy TBD matches in Round 1 by giving top seeds Round 1 Byes directly into Round 2.
 */
async function generateSingleElimination(tournamentId, participants, participantModel) {
  const N = participants.length;
  if (N < 2) {
    throw new Error('Need at least 2 participants to generate a bracket.');
  }

  // Shuffle participants to randomize seeding
  const seedParticipants = shuffleArray(participants);

  // Power of 2 sizing based on actual participant count N
  const P = Math.pow(2, Math.ceil(Math.log2(N))); // e.g. N=5 => P=8, N=3 => P=4, N=2 => P=2
  const totalRounds = Math.log2(P);

  // Create the Bracket document
  const bracket = await Bracket.create({
    tournament: tournamentId,
    type: 'single_elimination',
    roundsCount: totalRounds,
    teamsCount: N,
  });

  // Handle N = 2 edge case (Finals directly)
  if (totalRounds === 1) {
    await Match.create({
      tournament: tournamentId,
      round: 1,
      position: 1,
      bracketType: 'winners',
      participantModel,
      nextMatchId: null,
      teamA: {
        id: seedParticipants[0]._id,
        name: seedParticipants[0].name || seedParticipants[0].username,
      },
      teamB: {
        id: seedParticipants[1]._id,
        name: seedParticipants[1].name || seedParticipants[1].username,
      },
    });
    return bracket;
  }

  const R2Slots = P / 2; // Number of feeder slots into Round 2
  const M1 = N - R2Slots; // Number of actual matches in Round 1
  const B = R2Slots - M1; // Number of Byes directly into Round 2 (= P - N)

  const roundsMatches = {};

  // Step 1: Create Match nodes for Round 2 up to Final Round
  for (let r = totalRounds; r >= 2; r--) {
    const matchesInRound = Math.pow(2, totalRounds - r);
    roundsMatches[r] = [];

    for (let p = 1; p <= matchesInRound; p++) {
      let nextMatch = null;
      if (r < totalRounds) {
        const nextPosition = Math.ceil(p / 2);
        nextMatch = roundsMatches[r + 1][nextPosition - 1];
      }

      const match = new Match({
        tournament: tournamentId,
        round: r,
        position: p,
        bracketType: 'winners',
        participantModel,
        nextMatchId: nextMatch ? nextMatch._id : null,
        nextMatchSlot: p % 2 !== 0 ? 'teamA' : 'teamB',
      });

      roundsMatches[r].push(match);
    }
  }

  // Step 2: Assign Byes (top B seeds) directly to the first B slots in Round 2
  for (let s = 1; s <= B; s++) {
    const r2MatchIndex = Math.ceil(s / 2) - 1;
    const isTeamA = s % 2 !== 0;
    const participant = seedParticipants[s - 1];

    if (isTeamA) {
      roundsMatches[2][r2MatchIndex].teamA.id = participant._id;
      roundsMatches[2][r2MatchIndex].teamA.name = participant.name || participant.username;
    } else {
      roundsMatches[2][r2MatchIndex].teamB.id = participant._id;
      roundsMatches[2][r2MatchIndex].teamB.name = participant.name || participant.username;
    }
  }

  // Save Round 2+ matches to persist IDs
  for (let r = 2; r <= totalRounds; r++) {
    for (let m of roundsMatches[r]) {
      await m.save();
    }
  }

  // Step 3: Create ONLY M1 actual matches in Round 1 for the remaining participants
  roundsMatches[1] = [];
  for (let i = 1; i <= M1; i++) {
    const r2Slot = B + i; // Slot index in Round 2 (B + 1 .. R2Slots)
    const r2MatchIndex = Math.ceil(r2Slot / 2) - 1;
    const nextMatch = roundsMatches[2][r2MatchIndex];

    const teamAIndex = B + 2 * (i - 1);
    const teamBIndex = B + 2 * (i - 1) + 1;

    const teamAParticipant = seedParticipants[teamAIndex];
    const teamBParticipant = seedParticipants[teamBIndex];

    const match = new Match({
      tournament: tournamentId,
      round: 1,
      position: i,
      bracketType: 'winners',
      participantModel,
      nextMatchId: nextMatch ? nextMatch._id : null,
      nextMatchSlot: r2Slot % 2 !== 0 ? 'teamA' : 'teamB',
      teamA: {
        id: teamAParticipant._id,
        name: teamAParticipant.name || teamAParticipant.username,
      },
      teamB: {
        id: teamBParticipant._id,
        name: teamBParticipant.name || teamBParticipant.username,
      },
    });

    await match.save();
    roundsMatches[1].push(match);
  }

  return bracket;
}

/**
 * Standard Double Elimination Bracket Generator strictly based on N participants.
 */
async function generateDoubleElimination(tournamentId, participants, participantModel) {
  const N = participants.length;
  if (N < 4) {
    return generateSingleElimination(tournamentId, participants, participantModel);
  }

  const seedParticipants = shuffleArray(participants);
  const P = Math.pow(2, Math.ceil(Math.log2(N)));
  const K = Math.log2(P); // Total Rounds in Winners Bracket
  const totalLosersRounds = 2 * K - 2; // Total Rounds in Losers Bracket

  const R2Slots = P / 2;
  const M1 = N - R2Slots;
  const B = R2Slots - M1;

  const bracket = await Bracket.create({
    tournament: tournamentId,
    type: 'double_elimination',
    roundsCount: K + totalLosersRounds + 1,
    teamsCount: N,
  });

  // Step 1: Create Grand Final Match (GF)
  const grandFinal = await Match.create({
    tournament: tournamentId,
    round: K + totalLosersRounds + 1,
    position: 1,
    bracketType: 'winners',
    participantModel,
    nextMatchId: null,
  });

  // Step 2: Create Winners Bracket (W)
  const winnersMatches = {};
  for (let r = K; r >= 2; r--) {
    const matchesInRound = Math.pow(2, K - r);
    winnersMatches[r] = [];

    for (let p = 1; p <= matchesInRound; p++) {
      let nextMatch = null;
      if (r < K) {
        const nextPosition = Math.ceil(p / 2);
        nextMatch = winnersMatches[r + 1][nextPosition - 1];
      } else {
        nextMatch = grandFinal;
      }

      const match = new Match({
        tournament: tournamentId,
        round: r,
        position: p,
        bracketType: 'winners',
        participantModel,
        nextMatchId: nextMatch._id,
        nextMatchSlot: r === K ? 'teamA' : (p % 2 !== 0 ? 'teamA' : 'teamB'),
      });

      winnersMatches[r].push(match);
    }
  }

  // Assign Byes (top B seeds) directly to Round 2
  for (let s = 1; s <= B; s++) {
    const r2MatchIndex = Math.ceil(s / 2) - 1;
    const isTeamA = s % 2 !== 0;
    const participant = seedParticipants[s - 1];

    if (isTeamA) {
      winnersMatches[2][r2MatchIndex].teamA.id = participant._id;
      winnersMatches[2][r2MatchIndex].teamA.name = participant.name || participant.username;
    } else {
      winnersMatches[2][r2MatchIndex].teamB.id = participant._id;
      winnersMatches[2][r2MatchIndex].teamB.name = participant.name || participant.username;
    }
  }

  // Save Round 2+ Winners Matches
  for (let r = 2; r <= K; r++) {
    for (let m of winnersMatches[r]) {
      await m.save();
    }
  }

  // Create Round 1 Winners Matches (M1 matches)
  winnersMatches[1] = [];
  for (let i = 1; i <= M1; i++) {
    const r2Slot = B + i;
    const r2MatchIndex = Math.ceil(r2Slot / 2) - 1;
    const nextMatch = winnersMatches[2][r2MatchIndex];

    const teamAIndex = B + 2 * (i - 1);
    const teamBIndex = B + 2 * (i - 1) + 1;

    const teamAParticipant = seedParticipants[teamAIndex];
    const teamBParticipant = seedParticipants[teamBIndex];

    const match = new Match({
      tournament: tournamentId,
      round: 1,
      position: i,
      bracketType: 'winners',
      participantModel,
      nextMatchId: nextMatch ? nextMatch._id : null,
      nextMatchSlot: r2Slot % 2 !== 0 ? 'teamA' : 'teamB',
      teamA: {
        id: teamAParticipant._id,
        name: teamAParticipant.name || teamAParticipant.username,
      },
      teamB: {
        id: teamBParticipant._id,
        name: teamBParticipant.name || teamBParticipant.username,
      },
    });

    await match.save();
    winnersMatches[1].push(match);
  }

  // Step 3: Create Losers Bracket (L) (Minor & Major Stages)
  const losersMatches = {};

  for (let l = totalLosersRounds; l >= 1; l--) {
    const exponent = K - 1 - Math.ceil(l / 2);
    const matchesInRound = Math.pow(2, Math.max(0, exponent));
    losersMatches[l] = [];

    for (let p = 1; p <= matchesInRound; p++) {
      let nextMatch = null;
      let nextSlot = 'teamA';
      if (l < totalLosersRounds) {
        const isMinorToMajor = (l % 2 !== 0);
        const nextPosition = isMinorToMajor ? p : Math.ceil(p / 2);
        nextMatch = losersMatches[l + 1][nextPosition - 1];
        nextSlot = isMinorToMajor ? 'teamA' : (p % 2 !== 0 ? 'teamA' : 'teamB');
      } else {
        nextMatch = grandFinal;
        nextSlot = 'teamB';
      }

      const match = new Match({
        tournament: tournamentId,
        round: l,
        position: p,
        bracketType: 'losers',
        participantModel,
        nextMatchId: nextMatch._id,
        nextMatchSlot: nextSlot,
      });

      losersMatches[l].push(match);
    }
  }

  // Save all Losers Matches
  for (let l = 1; l <= totalLosersRounds; l++) {
    for (let m of losersMatches[l]) {
      await m.save();
    }
  }

  // Step 4: Link Losers Dropping from Winners Bracket
  const w1Matches = winnersMatches[1];
  const l1Matches = losersMatches[1];
  for (let p = 1; p <= w1Matches.length; p++) {
    const targetLPos = Math.ceil(p / 2);
    if (l1Matches && l1Matches[targetLPos - 1]) {
      w1Matches[p - 1].loserDropMatchId = l1Matches[targetLPos - 1]._id;
      await w1Matches[p - 1].save();
    }
  }

  for (let r = 2; r <= K; r++) {
    const targetLRound = 2 * r - 2;
    const wMatches = winnersMatches[r];
    const targetLMatches = losersMatches[targetLRound];

    for (let p = 1; p <= wMatches.length; p++) {
      if (targetLMatches && targetLMatches[p - 1]) {
        wMatches[p - 1].loserDropMatchId = targetLMatches[p - 1]._id;
        await wMatches[p - 1].save();
      }
    }
  }

  return bracket;
}

module.exports = {
  generateSingleElimination,
  generateDoubleElimination,
};
