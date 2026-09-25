const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const User = require('../models/User');
  const Team = require('../models/Team');

  const organizer = await User.findOne({ email: 'briyenadihora@gmail.com' });
  console.log('Organizer:', organizer ? { id: organizer._id, username: organizer.username, email: organizer.email, role: organizer.role } : 'NOT FOUND');

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

  for (const name of teamNames) {
    const team = await Team.findOne({ name }).populate('captain', 'username email').populate('members', 'username email');
    if (team) {
      console.log(`Team: ${team.name} | ID: ${team._id} | Capt: ${team.captain?.username} (${team.captain?._id}) | Members: ${team.members.length}`);
    } else {
      console.log(`Team: ${name} -> NOT FOUND`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
