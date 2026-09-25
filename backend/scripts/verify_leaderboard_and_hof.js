const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = require('../models/User');
  const Team = require('../models/Team');
  const Match = require('../models/Match');
  const Tournament = require('../models/Tournament');
  const TournamentResult = require('../models/TournamentResult');

  // Query results and compute leaderboard exactly like leaderboardController
  const players = await User.find({ role: { $nin: ['admin', 'organizer'] } }).select('username profile role');
  const teams = await Team.find({}).select('name members stats');
  const allResults = await TournamentResult.find({}).populate('tournament', 'name game startDate');
  const allMatches = await Match.find({});

  console.log(`Found ${players.length} players, ${teams.length} teams, ${allResults.length} tournament results, ${allMatches.length} matches.`);

  const leaderboardData = players.map(user => {
    const userTeam = teams.find(t => t.members.some(m => m.toString() === user._id.toString()));
    const userResults = allResults.filter(r => r.player && r.player.toString() === user._id.toString());

    const totalTournaments = userResults.length;
    const wins = userResults.filter(r => r.placement === 1).length;
    const runnerUps = userResults.filter(r => r.placement === 2).length;
    const podiums = userResults.filter(r => r.placement >= 1 && r.placement <= 3).length;
    const prizeMoney = userResults.reduce((sum, r) => sum + (r.prizeWon || 0), 0);
    const winRate = totalTournaments > 0 ? Number(((wins / totalTournaments) * 100).toFixed(1)) : 0;

    const userTeamIds = teams.filter(t => t.members.some(m => m.toString() === user._id.toString())).map(t => t._id.toString());
    const userMatches = allMatches.filter(m => {
      const isTeamA = m.teamA?.id && (m.teamA.id.toString() === user._id.toString() || userTeamIds.includes(m.teamA.id.toString()));
      const isTeamB = m.teamB?.id && (m.teamB.id.toString() === user._id.toString() || userTeamIds.includes(m.teamB.id.toString()));
      return isTeamA || isTeamB;
    });

    const totalMatches = userMatches.length;
    const matchesWon = userMatches.filter(m => {
      if (m.status !== 'completed' || !m.winner) return false;
      const winnerId = m.winner.toString();
      return winnerId === user._id.toString() || userTeamIds.includes(winnerId);
    }).length;

    const points = (wins * 100) + (runnerUps * 60) + (podiums * 30) + (matchesWon * 10) + Math.floor(prizeMoney / 100) + Math.floor(winRate);

    return {
      username: user.username,
      teamName: userTeam ? userTeam.name : 'Free Agent',
      totalTournaments,
      wins,
      runnerUps,
      podiums,
      matchesWon,
      totalMatches,
      prizeMoney,
      points,
    };
  });

  leaderboardData.sort((a, b) => b.points - a.points);

  console.log('\n=== Top 10 Global Leaderboard Rankings ===');
  leaderboardData.slice(0, 10).forEach((entry, idx) => {
    console.log(`#${idx + 1} @${entry.username} (${entry.teamName}) -> Points: ${entry.points} | Wins: ${entry.wins} | Prize: ₹${entry.prizeMoney} | Matches Won: ${entry.matchesWon}/${entry.totalMatches}`);
  });

  await mongoose.disconnect();
}

test().catch(console.error);
