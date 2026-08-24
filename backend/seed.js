require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Tournament = require('./models/Tournament');
const Team = require('./models/Team');
const Match = require('./models/Match');
const Bracket = require('./models/Bracket');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arena_verse');
    console.log('Connected to MongoDB for seeding...');

    let stats = {
      usersCreated: 0,
      usersExisting: 0,
      teamsCreated: 0,
      teamsExisting: 0,
      tournamentsCreated: 0,
      tournamentsExisting: 0,
      matchesCreated: 0,
      matchesExisting: 0,
      bracketsCreated: 0,
      bracketsExisting: 0,
    };

    console.log('--- Checking & Seeding Users ---');

    // Admin User
    let admin = await User.findOne({ email: 'admin@arena.com' });
    if (!admin) {
      admin = await User.create({
        username: 'admin',
        email: 'admin@arena.com',
        password: 'password123',
        role: 'admin',
        profile: {
          bio: 'Arena-Verse Platform Administrator',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        },
      });
      stats.usersCreated++;
    } else {
      stats.usersExisting++;
    }

    // Organizers (org1, org2, org3)
    const organizerDefs = [
      {
        username: 'org1',
        email: 'org1@arena.com',
        bio: 'Professional eSports organizer for ESL & Championship Leagues.',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
      },
      {
        username: 'org2',
        email: 'org2@arena.com',
        bio: 'BLAST Premier Tournament Operations Lead.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      },
      {
        username: 'org3',
        email: 'org3@arena.com',
        bio: 'Riot Games Community & Grassroots Events Manager.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      },
    ];

    const organizers = [];
    for (const orgData of organizerDefs) {
      let org = await User.findOne({ email: orgData.email });
      if (!org) {
        org = await User.create({
          username: orgData.username,
          email: orgData.email,
          password: 'password123',
          role: 'organizer',
          profile: {
            bio: orgData.bio,
            avatar: orgData.avatar,
          },
        });
        stats.usersCreated++;
      } else {
        stats.usersExisting++;
      }
      organizers.push(org);
    }
    const [org1, org2, org3] = organizers;

    // Players (20 total)
    const playerAvatars = [
      '/images/default-avatar.png',
    ];

    const players = [];
    for (let i = 1; i <= 20; i++) {
      const email = `play${i}@arena.com`;
      let player = await User.findOne({ $or: [{ email }, { email: `player${i}@arena.com` }] });
      if (!player) {
        player = await User.create({
          username: `player${i}`,
          email,
          password: 'password123',
          role: 'player',
          profile: {
            bio: `Ranked competitor player${i} ready for tournaments!`,
            avatar: playerAvatars[(i - 1) % playerAvatars.length],
          },
        });
        stats.usersCreated++;
      } else {
        stats.usersExisting++;
      }
      players.push(player);
    }
    console.log(`Users check finished. Total: ${1 + organizers.length + players.length}`);

    console.log('--- Checking & Seeding Teams ---');

    const teamDefs = [
      {
        name: 'Cloud9 Reborn',
        description: 'Challengers Valorant Division & Tactical Squad',
        captainIdx: 0,
        memberIndices: [0, 1, 2, 3],
        inviteCode: 'C9CODE',
      },
      {
        name: 'Fnatic Squad',
        description: 'European Valorant & CS Pro League team',
        captainIdx: 4,
        memberIndices: [4, 5, 6, 7],
        inviteCode: 'FNTCODE',
      },
      {
        name: 'Sentinels Alpha',
        description: 'North American Dominant Esports Roster',
        captainIdx: 8,
        memberIndices: [8, 9, 10, 11],
        inviteCode: 'SENCODE',
      },
      {
        name: 'Natus Vincere Pro',
        description: 'Eastern Europe Premier CS2 & FPS Unit',
        captainIdx: 12,
        memberIndices: [12, 13, 14, 15],
        inviteCode: 'NAVICODE',
      },
      {
        name: 'T1 Gaming',
        description: 'World Champion League of Legends Squad',
        captainIdx: 16,
        memberIndices: [16, 17, 18, 19],
        inviteCode: 'T1CODE',
      },
      {
        name: 'G2 Esports',
        description: 'European Powerhouse Alliance',
        captainIdx: 1,
        memberIndices: [1, 5, 9, 13],
        inviteCode: 'G2CODE',
      },
      {
        name: 'Team Liquid',
        description: 'Global Multi-Gaming Esports Organization',
        captainIdx: 2,
        memberIndices: [2, 6, 10, 14],
        inviteCode: 'TLCODE',
      },
      {
        name: 'FaZe Clan',
        description: 'High Impact Competitive Gaming Syndicate',
        captainIdx: 3,
        memberIndices: [3, 7, 11, 15, 19],
        inviteCode: 'FAZECODE',
      },
    ];

    const teams = [];
    for (const tDef of teamDefs) {
      let team = await Team.findOne({ name: tDef.name });
      if (!team) {
        team = await Team.create({
          name: tDef.name,
          description: tDef.description,
          captain: players[tDef.captainIdx]._id,
          members: tDef.memberIndices.map((idx) => players[idx]._id),
          inviteCode: tDef.inviteCode,
        });
        stats.teamsCreated++;
      } else {
        stats.teamsExisting++;
      }
      teams.push(team);
    }
    console.log(`Teams check finished. Total: ${teams.length}`);

    console.log('--- Checking & Seeding Tournaments ---');

    const tournamentDefs = [
      // 1. Draft (Solo)
      {
        name: 'Apex Legends Winter Cup 2026',
        game: 'Apex Legends',
        banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        entryFee: 15,
        prizePool: 1000,
        rules: '1. Standard tournament rules apply.\n2. Hacks, cheats, and exploit abuse lead to instant disqualification.\n3. Matches start within 15 minutes of schedule.',
        maxTeams: 8,
        type: 'solo',
        organizer: org1._id,
        status: 'draft',
        region: 'NA',
        registeredPlayers: [players[0]._id, players[1]._id, players[2]._id, players[3]._id],
      },
      // 2. Published (Team)
      {
        name: 'Valorant Arena Pro League',
        game: 'Valorant',
        banner: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        entryFee: 50,
        prizePool: 5000,
        rules: '1. 5v5 team format.\n2. Must check-in 30 mins before matches.\n3. Tactical pauses limited to 2 per team per map.',
        maxTeams: 16,
        type: 'team',
        organizer: org1._id,
        status: 'published',
        region: 'Global',
        registeredTeams: [teams[0]._id, teams[1]._id, teams[2]._id, teams[3]._id],
      },
      // 3. Published (Team - Free Entry)
      {
        name: 'CS2 Global Masters 2026',
        game: 'Counter-Strike 2',
        banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        entryFee: 0,
        prizePool: 2500,
        rules: '1. MR12 format standard competitive settings.\n2. Anti-cheat mandatory.\n3. Single elimination bracket.',
        maxTeams: 16,
        type: 'team',
        organizer: org2._id,
        status: 'published',
        region: 'EU',
        registeredTeams: [teams[1]._id, teams[3]._id, teams[5]._id, teams[6]._id],
      },
      // 4. Published (Duo)
      {
        name: 'Rocket League 2v2 Showdown',
        game: 'Rocket League',
        banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        entryFee: 10,
        prizePool: 800,
        rules: '1. 2v2 Soccar format, Best of 5.\n2. Standard maps only.\n3. Both team members must check in.',
        maxTeams: 8,
        type: 'duo',
        organizer: org3._id,
        status: 'published',
        region: 'NA',
        registeredTeams: [teams[4]._id, teams[7]._id],
      },
      // 5. Ongoing (Team)
      {
        name: 'League of Legends Rift Championship',
        game: 'League of Legends',
        banner: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        entryFee: 30,
        prizePool: 3000,
        rules: '1. Tournament Draft mode.\n2. Pauses allowed for technical issues up to 10 mins.\n3. Screen share or referee code required.',
        maxTeams: 8,
        type: 'team',
        organizer: org2._id,
        status: 'ongoing',
        region: 'Asia',
        registeredTeams: [teams[0]._id, teams[1]._id, teams[2]._id, teams[4]._id],
      },
      // 6. Ongoing (Solo)
      {
        name: 'Fortnite Solo Frenzy',
        game: 'Fortnite',
        banner: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        entryFee: 0,
        prizePool: 1200,
        rules: '1. Custom lobby code provided 10 mins prior.\n2. Placement points + Victory Royale points system.\n3. Stream sniping forbidden.',
        maxTeams: 16,
        type: 'solo',
        organizer: org3._id,
        status: 'ongoing',
        region: 'Global',
        registeredPlayers: [players[0]._id, players[4]._id, players[8]._id, players[12]._id, players[16]._id, players[17]._id],
      },
      // 7. Completed (Team)
      {
        name: 'Overwatch 2 Summer Clash',
        game: 'Overwatch 2',
        banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        entryFee: 20,
        prizePool: 2000,
        rules: '1. 5v5 Role Queue format.\n2. Map veto system enforced.',
        maxTeams: 8,
        type: 'team',
        organizer: org1._id,
        status: 'completed',
        region: 'NA',
        winnerName: 'Cloud9 Reborn',
        runnerUpName: 'Fnatic Squad',
        registeredTeams: [teams[0]._id, teams[1]._id, teams[2]._id, teams[3]._id],
      },
      // 8. Completed (Solo)
      {
        name: 'Dota 2 International Cup',
        game: 'Dota 2',
        banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        entryFee: 25,
        prizePool: 4000,
        rules: '1. 1v1 Mid Only mode.\n2. First to 2 kills or tower destroyed wins.',
        maxTeams: 8,
        type: 'solo',
        organizer: org2._id,
        status: 'completed',
        region: 'EU',
        winnerName: 'player1',
        runnerUpName: 'player9',
        registeredPlayers: [players[0]._id, players[2]._id, players[6]._id, players[8]._id, players[10]._id, players[14]._id],
      },
    ];

    const tournaments = [];
    for (const tDef of tournamentDefs) {
      let t = await Tournament.findOne({ name: tDef.name });
      if (!t) {
        t = await Tournament.create(tDef);
        stats.tournamentsCreated++;
      } else {
        stats.tournamentsExisting++;
      }
      tournaments.push(t);
    }
    console.log(`Tournaments check finished. Total: ${tournaments.length}`);

    console.log('--- Checking & Seeding Brackets and Matches ---');

    // Helper to create bracket and matches for a tournament
    const seedTournamentBracketAndMatches = async (tournament, matchDefs) => {
      let bracket = await Bracket.findOne({ tournament: tournament._id });
      if (!bracket) {
        bracket = await Bracket.create({
          tournament: tournament._id,
          type: 'single_elimination',
          roundsCount: 2,
          teamsCount: matchDefs.length > 2 ? 4 : 2,
        });
        stats.bracketsCreated++;
      } else {
        stats.bracketsExisting++;
      }

      for (const mDef of matchDefs) {
        let match = await Match.findOne({ tournament: tournament._id, round: mDef.round, position: mDef.position });
        if (!match) {
          match = await Match.create({
            tournament: tournament._id,
            round: mDef.round,
            position: mDef.position,
            bracketType: 'winners',
            participantModel: tournament.type === 'solo' ? 'User' : 'Team',
            teamA: mDef.teamA,
            teamB: mDef.teamB,
            scoreA: mDef.scoreA || 0,
            scoreB: mDef.scoreB || 0,
            winner: mDef.winner || null,
            status: mDef.status || 'scheduled',
          });
          stats.matchesCreated++;
        } else {
          stats.matchesExisting++;
        }
      }
    };

    // T5: LoL Rift Championship (Ongoing, Team)
    const lolTournament = tournaments.find((t) => t.name === 'League of Legends Rift Championship');
    if (lolTournament) {
      await seedTournamentBracketAndMatches(lolTournament, [
        {
          round: 1,
          position: 1,
          teamA: { id: teams[0]._id, name: teams[0].name },
          teamB: { id: teams[1]._id, name: teams[1].name },
          scoreA: 2,
          scoreB: 1,
          winner: teams[0]._id,
          status: 'completed',
        },
        {
          round: 1,
          position: 2,
          teamA: { id: teams[2]._id, name: teams[2].name },
          teamB: { id: teams[4]._id, name: teams[4].name },
          scoreA: 0,
          scoreB: 2,
          winner: teams[4]._id,
          status: 'completed',
        },
        {
          round: 2,
          position: 1,
          teamA: { id: teams[0]._id, name: teams[0].name },
          teamB: { id: teams[4]._id, name: teams[4].name },
          scoreA: 0,
          scoreB: 0,
          winner: null,
          status: 'scheduled',
        },
      ]);
    }

    // T6: Fortnite Solo Frenzy (Ongoing, Solo)
    const fortniteTournament = tournaments.find((t) => t.name === 'Fortnite Solo Frenzy');
    if (fortniteTournament) {
      await seedTournamentBracketAndMatches(fortniteTournament, [
        {
          round: 1,
          position: 1,
          teamA: { id: players[0]._id, name: players[0].username },
          teamB: { id: players[4]._id, name: players[4].username },
          scoreA: 1,
          scoreB: 0,
          winner: players[0]._id,
          status: 'completed',
        },
        {
          round: 1,
          position: 2,
          teamA: { id: players[8]._id, name: players[8].username },
          teamB: { id: players[12]._id, name: players[12].username },
          scoreA: 0,
          scoreB: 1,
          winner: players[12]._id,
          status: 'completed',
        },
        {
          round: 2,
          position: 1,
          teamA: { id: players[0]._id, name: players[0].username },
          teamB: { id: players[12]._id, name: players[12].username },
          scoreA: 0,
          scoreB: 0,
          winner: null,
          status: 'scheduled',
        },
      ]);
    }

    // T7: Overwatch 2 Summer Clash (Completed, Team)
    const owTournament = tournaments.find((t) => t.name === 'Overwatch 2 Summer Clash');
    if (owTournament) {
      await seedTournamentBracketAndMatches(owTournament, [
        {
          round: 1,
          position: 1,
          teamA: { id: teams[0]._id, name: teams[0].name },
          teamB: { id: teams[2]._id, name: teams[2].name },
          scoreA: 3,
          scoreB: 0,
          winner: teams[0]._id,
          status: 'completed',
        },
        {
          round: 1,
          position: 2,
          teamA: { id: teams[1]._id, name: teams[1].name },
          teamB: { id: teams[3]._id, name: teams[3].name },
          scoreA: 3,
          scoreB: 1,
          winner: teams[1]._id,
          status: 'completed',
        },
        {
          round: 2,
          position: 1,
          teamA: { id: teams[0]._id, name: teams[0].name },
          teamB: { id: teams[1]._id, name: teams[1].name },
          scoreA: 3,
          scoreB: 2,
          winner: teams[0]._id,
          status: 'completed',
        },
      ]);
    }

    // T8: Dota 2 International Cup (Completed, Solo)
    const dotaTournament = tournaments.find((t) => t.name === 'Dota 2 International Cup');
    if (dotaTournament) {
      await seedTournamentBracketAndMatches(dotaTournament, [
        {
          round: 1,
          position: 1,
          teamA: { id: players[0]._id, name: players[0].username },
          teamB: { id: players[2]._id, name: players[2].username },
          scoreA: 2,
          scoreB: 0,
          winner: players[0]._id,
          status: 'completed',
        },
        {
          round: 1,
          position: 2,
          teamA: { id: players[8]._id, name: players[8].username },
          teamB: { id: players[10]._id, name: players[10].username },
          scoreA: 2,
          scoreB: 1,
          winner: players[8]._id,
          status: 'completed',
        },
        {
          round: 2,
          position: 1,
          teamA: { id: players[0]._id, name: players[0].username },
          teamB: { id: players[8]._id, name: players[8].username },
          scoreA: 3,
          scoreB: 1,
          winner: players[0]._id,
        },
      ]);
    }

    // Patch any completed tournaments in DB to ensure winnerName & runnerUpName are valid names
    const allCompleted = await Tournament.find({ status: 'completed' });
    for (const ct of allCompleted) {
      let isChanged = false;
      if (!ct.winnerName || ct.winnerName === 'TBD') {
        ct.winnerName = ct.type === 'solo' ? 'player1' : 'Cloud9 Reborn';
        isChanged = true;
      }
      if (!ct.runnerUpName || ct.runnerUpName === 'TBD') {
        ct.runnerUpName = ct.type === 'solo' ? 'player9' : 'Fnatic Squad';
        isChanged = true;
      }
      if (isChanged) {
        await ct.save();
      }
    }

    console.log('\n==================================================');
    console.log('        ArenaVerse Database Seed Summary          ');
    console.log('==================================================');
    console.log(`Users:        Created: ${stats.usersCreated} | Existing: ${stats.usersExisting} | Total: ${stats.usersCreated + stats.usersExisting}`);
    console.log(`Teams:        Created: ${stats.teamsCreated} | Existing: ${stats.teamsExisting} | Total: ${stats.teamsCreated + stats.teamsExisting}`);
    console.log(`Tournaments:  Created: ${stats.tournamentsCreated} | Existing: ${stats.tournamentsExisting} | Total: ${stats.tournamentsCreated + stats.tournamentsExisting}`);
    console.log(`Matches:      Created: ${stats.matchesCreated} | Existing: ${stats.matchesExisting} | Total: ${stats.matchesCreated + stats.matchesExisting}`);
    console.log(`Brackets:     Created: ${stats.bracketsCreated} | Existing: ${stats.bracketsExisting} | Total: ${stats.bracketsCreated + stats.bracketsExisting}`);
    console.log('==================================================\n');

    console.log('Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
