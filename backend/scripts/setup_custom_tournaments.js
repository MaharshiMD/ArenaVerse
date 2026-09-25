const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Tournament = require('../models/Tournament');
const Bracket = require('../models/Bracket');
const Match = require('../models/Match');
const Team = require('../models/Team');
const User = require('../models/User');
const TournamentResult = require('../models/TournamentResult');
const Wallet = require('../models/Wallet');
const FinancialTransaction = require('../models/FinancialTransaction');
const { generateSingleElimination } = require('../utils/bracketGenerator');
const { finalizeTournamentCompletion } = require('../utils/tournamentFinalizer');

async function playMatchAndAdvance(match, scoreA, scoreB) {
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  const winnerId = scoreA > scoreB ? match.teamA.id : match.teamB.id;
  const winnerName = scoreA > scoreB ? match.teamA.name : match.teamB.name;
  const loserId = scoreA > scoreB ? match.teamB.id : match.teamA.id;
  const loserName = scoreA > scoreB ? match.teamB.name : match.teamA.name;

  match.winner = winnerId;
  match.status = 'completed';
  await match.save();

  if (match.nextMatchId) {
    const nextMatch = await Match.findById(match.nextMatchId);
    if (nextMatch) {
      const targetSlot = match.nextMatchSlot || (match.position % 2 !== 0 ? 'teamA' : 'teamB');
      if (targetSlot === 'teamA') {
        nextMatch.teamA.id = winnerId;
        nextMatch.teamA.name = winnerName;
      } else {
        nextMatch.teamB.id = winnerId;
        nextMatch.teamB.name = winnerName;
      }
      nextMatch.status = 'scheduled';
      await nextMatch.save();
    }
  }

  return { winnerId, winnerName, loserId, loserName };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Database');

  const organizer = await User.findOne({ email: 'briyenadihora@gmail.com' });
  if (!organizer) {
    throw new Error('Organizer briyenadihora@gmail.com not found');
  }
  console.log(`Using organizer: ${organizer.username} (${organizer._id})`);

  // Fetch all 10 required teams
  const teamNames = [
    'Revenant x Spark',
    'Nexus Dynasty',
    'Aero Wolves',
    'Vortex Duo',
    'Phoenix Syndicate',
    'Titan Vanguard',
    'Delta Force',
    'Phantom Vipers',
    'Apex Strikers',
    'Desi Gamers'
  ];

  const teamsMap = {};
  for (const name of teamNames) {
    const t = await Team.findOne({ name }).populate('captain').populate('members');
    if (!t) throw new Error(`Required team "${name}" not found`);
    teamsMap[name] = t;
  }
  console.log('All 10 required teams loaded successfully.');

  const tournamentNames = [
    'Apex Legends Winter Duo Championship',
    'Free Fire MAX Pro Clash Squad Cup',
    'BGMI Champions Trophy 2026',
    'Free Fire MAX Clash Squad Masters',
    'Valorant Radiant Duo Invitational',
    'Call of Duty: Warzone Duo Battle',
  ];

  // Clean up any previously created instances of these exact tournaments
  for (const name of tournamentNames) {
    const existing = await Tournament.find({ name, organizer: organizer._id });
    for (const t of existing) {
      await Match.deleteMany({ tournament: t._id });
      await Bracket.deleteMany({ tournament: t._id });
      await TournamentResult.deleteMany({ tournament: t._id });
      await FinancialTransaction.deleteMany({ tournament: t._id });
      await Tournament.findByIdAndDelete(t._id);
      console.log(`Cleaned existing tournament: "${name}"`);
    }
  }

  // =========================================================================
  // TOURNAMENT 1: Completed - "Apex Legends Winter Duo Championship"
  // =========================================================================
  console.log('\n--- Creating Tournament 1: Apex Legends Winter Duo Championship (COMPLETED) ---');
  const t1Teams = [
    teamsMap['Revenant x Spark'],
    teamsMap['Nexus Dynasty'],
    teamsMap['Aero Wolves'],
    teamsMap['Vortex Duo'],
    teamsMap['Phoenix Syndicate'],
    teamsMap['Titan Vanguard'],
    teamsMap['Delta Force'],
    teamsMap['Phantom Vipers']
  ];

  const t1 = await Tournament.create({
    name: 'Apex Legends Winter Duo Championship',
    game: 'Apex Legends',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    entryFee: 0,
    prizePool: 30000,
    prizePoolCurrency: 'INR',
    prizeDistribution: [
      { position: 1, amount: 21000 },
      { position: 2, amount: 9000 },
    ],
    rules: 'Best of 3 Duo single elimination bracket. Official competitive rule set.',
    maxTeams: 8,
    type: 'team',
    minTeamMembers: 2,
    maxTeamMembers: 5,
    status: 'ongoing',
    organizer: organizer._id,
    registeredTeams: t1Teams.map(t => t._id),
    registeredPlayers: t1Teams.flatMap(t => t.members.map(m => m._id)),
  });

  // Generate Bracket
  await generateSingleElimination(t1._id, t1Teams, 'Team');
  const t1Matches = await Match.find({ tournament: t1._id }).sort({ round: 1, position: 1 });
  console.log(`Generated ${t1Matches.length} bracket matches for Tournament 1.`);

  // Play Round 1 (Quarterfinals, Round 1)
  const t1R1 = t1Matches.filter(m => m.round === 1);
  for (let i = 0; i < t1R1.length; i++) {
    const m = await Match.findById(t1R1[i]._id);
    // Give Revenant x Spark and Nexus Dynasty wins to set up a legendary grand final
    if (m.teamA.name === 'Revenant x Spark' || m.teamB.name === 'Nexus Dynasty') {
      await playMatchAndAdvance(m, 2, 0);
    } else if (m.teamB.name === 'Revenant x Spark' || m.teamA.name === 'Nexus Dynasty') {
      await playMatchAndAdvance(m, 0, 2);
    } else {
      await playMatchAndAdvance(m, 2, 1);
    }
  }

  // Play Round 2 (Semifinals)
  const t1R2 = await Match.find({ tournament: t1._id, round: 2 }).sort({ position: 1 });
  for (let m of t1R2) {
    const freshM = await Match.findById(m._id);
    if (freshM.teamA.name === 'Revenant x Spark') {
      await playMatchAndAdvance(freshM, 2, 0);
    } else if (freshM.teamB.name === 'Revenant x Spark') {
      await playMatchAndAdvance(freshM, 0, 2);
    } else if (freshM.teamA.name === 'Nexus Dynasty') {
      await playMatchAndAdvance(freshM, 2, 1);
    } else if (freshM.teamB.name === 'Nexus Dynasty') {
      await playMatchAndAdvance(freshM, 1, 2);
    } else {
      await playMatchAndAdvance(freshM, 2, 0);
    }
  }

  // Play Round 3 (Grand Final)
  const t1Final = await Match.findOne({ tournament: t1._id, round: 3 });
  const finalWinnerTeam = teamsMap['Revenant x Spark'];
  const finalRunnerUpTeam = teamsMap['Nexus Dynasty'];

  t1Final.teamA.id = finalWinnerTeam._id;
  t1Final.teamA.name = finalWinnerTeam.name;
  t1Final.teamB.id = finalRunnerUpTeam._id;
  t1Final.teamB.name = finalRunnerUpTeam.name;
  t1Final.scoreA = 3;
  t1Final.scoreB = 1;
  t1Final.winner = finalWinnerTeam._id;
  t1Final.status = 'completed';
  await t1Final.save();

  // Finalize tournament, pay captain wallet, update team stats & rankings
  await finalizeTournamentCompletion(t1._id, {
    winnerId: finalWinnerTeam._id,
    loserId: finalRunnerUpTeam._id,
  });
  console.log(`Tournament 1 Finalized! Winner: ${finalWinnerTeam.name}, Runner-Up: ${finalRunnerUpTeam.name}`);

  // =========================================================================
  // TOURNAMENT 2: Completed - "Free Fire MAX Pro Clash Squad Cup"
  // =========================================================================
  console.log('\n--- Creating Tournament 2: Free Fire MAX Pro Clash Squad Cup (COMPLETED) ---');
  const t2Teams = [
    teamsMap['Phoenix Syndicate'],
    teamsMap['Desi Gamers'],
    teamsMap['Apex Strikers'],
    teamsMap['Titan Vanguard']
  ];

  const t2 = await Tournament.create({
    name: 'Free Fire MAX Pro Clash Squad Cup',
    game: 'Free Fire MAX',
    tournamentMode: 'clash_squad',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    entryFee: 0,
    prizePool: 20000,
    prizePoolCurrency: 'INR',
    prizeDistribution: [
      { position: 1, amount: 14000 },
      { position: 2, amount: 6000 },
    ],
    rules: 'Clash Squad 4v4 competitive format. Best of 7 rounds per match.',
    maxTeams: 4,
    type: 'team',
    minTeamMembers: 2,
    maxTeamMembers: 5,
    status: 'ongoing',
    organizer: organizer._id,
    registeredTeams: t2Teams.map(t => t._id),
    registeredPlayers: t2Teams.flatMap(t => t.members.map(m => m._id)),
  });

  await generateSingleElimination(t2._id, t2Teams, 'Team');
  const t2Matches = await Match.find({ tournament: t2._id }).sort({ round: 1, position: 1 });

  // Play Semifinals (Round 1 for 4 teams)
  const t2R1 = t2Matches.filter(m => m.round === 1);
  for (let m of t2R1) {
    const freshM = await Match.findById(m._id);
    if (freshM.teamA.name === 'Phoenix Syndicate' || freshM.teamB.name === 'Desi Gamers') {
      await playMatchAndAdvance(freshM, 4, 1);
    } else if (freshM.teamB.name === 'Phoenix Syndicate' || freshM.teamA.name === 'Desi Gamers') {
      await playMatchAndAdvance(freshM, 1, 4);
    } else {
      await playMatchAndAdvance(freshM, 4, 2);
    }
  }

  // Play Grand Final (Round 2)
  const t2Final = await Match.findOne({ tournament: t2._id, round: 2 });
  const t2Winner = teamsMap['Phoenix Syndicate'];
  const t2RunnerUp = teamsMap['Desi Gamers'];

  t2Final.teamA.id = t2Winner._id;
  t2Final.teamA.name = t2Winner.name;
  t2Final.teamB.id = t2RunnerUp._id;
  t2Final.teamB.name = t2RunnerUp.name;
  t2Final.scoreA = 4;
  t2Final.scoreB = 2;
  t2Final.winner = t2Winner._id;
  t2Final.status = 'completed';
  await t2Final.save();

  await finalizeTournamentCompletion(t2._id, {
    winnerId: t2Winner._id,
    loserId: t2RunnerUp._id,
  });
  console.log(`Tournament 2 Finalized! Winner: ${t2Winner.name}, Runner-Up: ${t2RunnerUp.name}`);

  // =========================================================================
  // TOURNAMENT 3: Ongoing with Brackets Generated - "BGMI Champions Trophy 2026"
  // =========================================================================
  console.log('\n--- Creating Tournament 3: BGMI Champions Trophy 2026 (ONGOING) ---');
  const t3Teams = [
    teamsMap['Revenant x Spark'],
    teamsMap['Nexus Dynasty'],
    teamsMap['Aero Wolves'],
    teamsMap['Vortex Duo'],
    teamsMap['Phoenix Syndicate'],
    teamsMap['Titan Vanguard'],
    teamsMap['Delta Force'],
    teamsMap['Phantom Vipers']
  ];

  const t3 = await Tournament.create({
    name: 'BGMI Champions Trophy 2026',
    game: 'Battlegrounds Mobile India (BGMI)',
    banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
    startDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    entryFee: 50,
    prizePool: 50000,
    prizePoolCurrency: 'INR',
    prizeDistribution: [
      { position: 1, amount: 35000 },
      { position: 2, amount: 15000 },
    ],
    rules: 'Official BGIS points system & bracket guidelines. Live stream verification required.',
    maxTeams: 8,
    type: 'team',
    minTeamMembers: 2,
    maxTeamMembers: 5,
    status: 'ongoing',
    organizer: organizer._id,
    registeredTeams: t3Teams.map(t => t._id),
    registeredPlayers: t3Teams.flatMap(t => t.members.map(m => m._id)),
  });

  await generateSingleElimination(t3._id, t3Teams, 'Team');
  const t3Matches = await Match.find({ tournament: t3._id }).sort({ round: 1, position: 1 });

  // Play Round 1 (Quarterfinals) so Semifinals are populated and live/scheduled!
  const t3R1 = t3Matches.filter(m => m.round === 1);
  for (let m of t3R1) {
    const freshM = await Match.findById(m._id);
    await playMatchAndAdvance(freshM, 2, 1);
  }

  // Set Round 2 (Semifinals) to live and upcoming
  const t3R2 = await Match.find({ tournament: t3._id, round: 2 });
  if (t3R2[0]) {
    t3R2[0].status = 'live';
    t3R2[0].scoreA = 1;
    t3R2[0].scoreB = 0;
    await t3R2[0].save();
  }
  if (t3R2[1]) {
    t3R2[1].status = 'upcoming';
    await t3R2[1].save();
  }
  console.log(`Tournament 3 Created! Status: ONGOING, Brackets generated with live Semifinals.`);

  // =========================================================================
  // TOURNAMENT 4: Ongoing with Brackets Generated - "Free Fire MAX Clash Squad Masters"
  // =========================================================================
  console.log('\n--- Creating Tournament 4: Free Fire MAX Clash Squad Masters (ONGOING) ---');
  const t4Teams = [
    teamsMap['Vortex Duo'],
    teamsMap['Aero Wolves'],
    teamsMap['Apex Strikers'],
    teamsMap['Delta Force']
  ];

  const t4 = await Tournament.create({
    name: 'Free Fire MAX Clash Squad Masters',
    game: 'Free Fire MAX',
    tournamentMode: 'clash_squad',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    startDate: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    entryFee: 0,
    prizePool: 16000,
    prizePoolCurrency: 'INR',
    prizeDistribution: [
      { position: 1, amount: 11200 },
      { position: 2, amount: 4800 },
    ],
    rules: 'Double elimination Clash Squad Masters. Fast paced 4v4 action.',
    maxTeams: 4,
    type: 'team',
    minTeamMembers: 2,
    maxTeamMembers: 5,
    status: 'ongoing',
    organizer: organizer._id,
    registeredTeams: t4Teams.map(t => t._id),
    registeredPlayers: t4Teams.flatMap(t => t.members.map(m => m._id)),
  });

  await generateSingleElimination(t4._id, t4Teams, 'Team');
  const t4Matches = await Match.find({ tournament: t4._id }).sort({ round: 1, position: 1 });

  // Play Semifinals (Round 1)
  const t4R1 = t4Matches.filter(m => m.round === 1);
  for (let m of t4R1) {
    const freshM = await Match.findById(m._id);
    await playMatchAndAdvance(freshM, 4, 3);
  }

  // Grand Final is now scheduled and active
  const t4Final = await Match.findOne({ tournament: t4._id, round: 2 });
  if (t4Final) {
    t4Final.status = 'live';
    t4Final.scoreA = 2;
    t4Final.scoreB = 2;
    await t4Final.save();
  }
  console.log(`Tournament 4 Created! Status: ONGOING, Brackets generated with live Grand Final.`);

  // =========================================================================
  // TOURNAMENT 5: Open to Participate - "Valorant Radiant Duo Invitational"
  // =========================================================================
  console.log('\n--- Creating Tournament 5: Valorant Radiant Duo Invitational (OPEN) ---');
  const t5Teams = [
    teamsMap['Apex Strikers'],
    teamsMap['Titan Vanguard']
  ];

  const t5 = await Tournament.create({
    name: 'Valorant Radiant Duo Invitational',
    game: 'VALORANT',
    banner: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
    startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // in 4 days
    entryFee: 0,
    prizePool: 40000,
    prizePoolCurrency: 'INR',
    prizeDistribution: [
      { position: 1, amount: 28000 },
      { position: 2, amount: 12000 },
    ],
    rules: 'Standard Spike Plant / Defusal 5v5 / Duo scrim rules. Anti-cheat client mandatory.',
    maxTeams: 8,
    type: 'team',
    minTeamMembers: 2,
    maxTeamMembers: 5,
    status: 'published',
    organizer: organizer._id,
    registeredTeams: t5Teams.map(t => t._id),
    registeredPlayers: t5Teams.flatMap(t => t.members.map(m => m._id)),
  });
  console.log(`Tournament 5 Created! Status: PUBLISHED (Open to participate, 2/8 slots filled).`);

  // =========================================================================
  // TOURNAMENT 6: Open to Participate - "Call of Duty: Warzone Duo Battle"
  // =========================================================================
  console.log('\n--- Creating Tournament 6: Call of Duty: Warzone Duo Battle (OPEN) ---');
  const t6Teams = [
    teamsMap['Desi Gamers']
  ];

  const t6 = await Tournament.create({
    name: 'Call of Duty: Warzone Duo Battle',
    game: 'Call of Duty: Warzone',
    banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // in 6 days
    entryFee: 100,
    prizePool: 25000,
    prizePoolCurrency: 'INR',
    prizeDistribution: [
      { position: 1, amount: 17500 },
      { position: 2, amount: 7500 },
    ],
    rules: 'Custom lobbies Battle Royale. Kill race scoring + placement multiplier.',
    maxTeams: 8,
    type: 'team',
    minTeamMembers: 2,
    maxTeamMembers: 5,
    status: 'published',
    organizer: organizer._id,
    registeredTeams: t6Teams.map(t => t._id),
    registeredPlayers: t6Teams.flatMap(t => t.members.map(m => m._id)),
  });
  console.log(`Tournament 6 Created! Status: PUBLISHED (Open to participate, 1/8 slots filled).`);

  // =========================================================================
  // VERIFY WALLETS & HALL OF FAME
  // =========================================================================
  console.log('\n--- Verifying Captain Wallets Payout ---');
  const mouseUser = teamsMap['Revenant x Spark'].captain;
  const duoEnoughUser = teamsMap['Nexus Dynasty'].captain;
  const ujjasUser = teamsMap['Phoenix Syndicate'].captain;
  const killerUser = teamsMap['Desi Gamers'].captain;

  const mouseWallet = await Wallet.findOne({ user: mouseUser._id });
  const duoEnoughWallet = await Wallet.findOne({ user: duoEnoughUser._id });
  const ujjasWallet = await Wallet.findOne({ user: ujjasUser._id });
  const killerWallet = await Wallet.findOne({ user: killerUser._id });

  console.log(`Captain @Mouse (Revenant x Spark): Balance ₹${mouseWallet?.balance || 0}`);
  console.log(`Captain @DuoEnough (Nexus Dynasty): Balance ₹${duoEnoughWallet?.balance || 0}`);
  console.log(`Captain @Ujjas (Phoenix Syndicate): Balance ₹${ujjasWallet?.balance || 0}`);
  console.log(`Captain @Killer (Desi Gamers): Balance ₹${killerWallet?.balance || 0}`);

  console.log('\n--- Verifying Hall of Fame Top Earners ---');
  const topEarners = await TournamentResult.find({ prizeWon: { $gt: 0 } })
    .populate('player', 'username')
    .sort({ prizeWon: -1 })
    .limit(5);
  for (const e of topEarners) {
    console.log(`Player @${e.player?.username} | Prize Won: ₹${e.prizeWon} | Squad: ${e.teamName} | Placement: #${e.placement}`);
  }

  console.log('\n--- Verifying Top Teams By Wins ---');
  const topTeams = await Team.find().sort({ 'stats.wins': -1 }).limit(5);
  for (const t of topTeams) {
    console.log(`Team: ${t.name} | Wins: ${t.stats?.wins || 0} | Matches: ${t.stats?.matchesPlayed || 0}`);
  }

  await mongoose.disconnect();
  console.log('\nAll tournaments, brackets, payouts, rankings, and Hall of Fame successfully initialized!');
}

run().catch(console.error);
