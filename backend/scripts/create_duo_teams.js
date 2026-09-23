require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');

const pairs = [
  {
    name: 'Apex Strikers',
    captainEmail: 'wisew18270@daugr.com',
    memberEmail: 'fomepik292@daugr.com',
    description: 'Duo unit of Noober and MenAce, dominating the arena.',
  },
  {
    name: 'Phantom Vipers',
    captainEmail: 'sicit60383@daugr.com',
    memberEmail: 'kiter69069@daugr.com',
    description: 'Pro and Noob synergy duo bringing unmatched precision.',
  },
  {
    name: 'Delta Force',
    captainEmail: 'beroce1718@daugr.com',
    memberEmail: 'heyexe4755@daugr.com',
    description: 'Delete & Wota elite duo squadron.',
  },
  {
    name: 'Titan Vanguard',
    captainEmail: 'nixet89249@fidhost.com',
    memberEmail: 'defopo6108@fidhost.com',
    description: 'Vasu & Priyank representing fidhost vanguard.',
  },
  {
    name: 'Phoenix Syndicate',
    captainEmail: 'domobek718@fidhost.com',
    memberEmail: 'cayinox430@fidhost.com',
    description: 'Ujjas & Cayinox rising to the challenge.',
  },
  {
    name: 'Vortex Duo',
    captainEmail: 'sisoy73745@hideam.com',
    memberEmail: 'bapesi5410@hideam.com',
    description: 'Duo & Squad combination from hideam.',
  },
  {
    name: 'Aero Wolves',
    captainEmail: 'fikek78818@hideam.com',
    memberEmail: 'noseco6207@findize.com',
    description: 'Solo & SoloEnough pairing up into a ferocious pack.',
  },
  {
    name: 'Nexus Dynasty',
    captainEmail: 'xeboya9221@findize.com',
    memberEmail: 'bifod93314@findize.com',
    description: 'DuoEnough & SquadEnough joining forces to conquer.',
  },
];

const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');

    // 1. Ensure cayinox430@fidhost.com exists
    let cayinox = await User.findOne({ email: 'cayinox430@fidhost.com' });
    if (!cayinox) {
      console.log('User cayinox430@fidhost.com does not exist. Creating user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password@123', salt);
      cayinox = await User.create({
        username: 'Cayinox',
        email: 'cayinox430@fidhost.com',
        password: hashedPassword,
        role: 'player',
        status: 'active',
        profile: {
          bio: 'Ready to compete, conquer, and make my mark in the arena.',
          avatar: '/images/default-avatar.png',
          equippedFrame: 'Default',
          equippedTitle: 'Challenger',
        },
      });
      console.log('Created user:', cayinox.username, `(${cayinox.email}) - ID: ${cayinox._id}`);
    } else {
      console.log('Found user:', cayinox.username, `(${cayinox.email})`);
    }

    const createdTeams = [];

    for (const pair of pairs) {
      const captain = await User.findOne({ email: pair.captainEmail.toLowerCase().trim() });
      const member = await User.findOne({ email: pair.memberEmail.toLowerCase().trim() });

      if (!captain) {
        throw new Error(`Captain user not found for email: ${pair.captainEmail}`);
      }
      if (!member) {
        throw new Error(`Member user not found for email: ${pair.memberEmail}`);
      }

      // Check if team already exists by name
      let team = await Team.findOne({ name: pair.name });
      if (team) {
        console.log(`Team "${pair.name}" already exists. Updating members to exactly 2...`);
        team.captain = captain._id;
        team.members = [captain._id, member._id];
        team.maxMembers = 2;
        team.memberRoles = [
          { user: captain._id, role: 'Captain' },
          { user: member._id, role: 'Player' },
        ];
        await team.save();
      } else {
        let inviteCode = generateInviteCode();
        while (await Team.findOne({ inviteCode })) {
          inviteCode = generateInviteCode();
        }

        team = await Team.create({
          name: pair.name,
          description: pair.description,
          captain: captain._id,
          members: [captain._id, member._id],
          inviteCode,
          maxMembers: 2,
          memberRoles: [
            { user: captain._id, role: 'Captain' },
            { user: member._id, role: 'Player' },
          ],
        });
        console.log(`Successfully created team: "${team.name}" (Invite: ${team.inviteCode})`);
      }

      createdTeams.push({
        teamId: team._id,
        teamName: team.name,
        inviteCode: team.inviteCode,
        captain: { username: captain.username, email: captain.email },
        member: { username: member.username, email: member.email },
        memberCount: team.members.length,
      });
    }

    console.log('\n================ ALL TEAMS CREATED / UPDATED ================');
    console.log(JSON.stringify(createdTeams, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Execution error:', error);
    process.exit(1);
  }
}

run();
