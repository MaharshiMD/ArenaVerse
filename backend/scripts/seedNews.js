require('dotenv').config();
const mongoose = require('mongoose');
const EsportsNews = require('../models/EsportsNews');

const seedNewsData = [
  {
    title: 'BGMI Pro Series (BMPS) 2026 Announced with ₹1,00,00,000 Prize Pool',
    game: 'BGMI / PUBG Mobile',
    source: 'Krafton India Official',
    date: new Date('2026-08-15'),
    summary: 'Krafton India officially unveils the competitive roadmap for BMPS 2026, featuring 128 top qualified squads competing for ₹1 Crore INR in cash prizes.',
    url: 'https://www.battlegroundsmobileindia.com/',
    fullContent: `Krafton India has officially announced the upcoming BGMI Pro Series (BMPS) 2026, set to begin next month with a total cash prize pool of ₹1,00,00,000 (1 Crore INR).

Key Tournament Highlights:
• Total Prize Pool: ₹100,00,000 INR
• Champions Share: ₹50,00,000 INR + BMPS Gold Trophy
• Open Community Qualifiers: Registrations open for all verified esports teams in ArenaVerse.
• Format: 3-Week Round Robin League Stage leading into 16-Team Grand Finals.

"We are committed to elevating Indian mobile esports to international championship standards," stated Krafton Esports Lead. Community teams can track official tournament brackets directly within ArenaVerse.`,
    status: 'published'
  },
  {
    title: 'Valorant Champions Tour (VCT) 2026: Pacific Stage 2 Grand Finals Revealed',
    game: 'VALORANT',
    source: 'Riot Esports',
    date: new Date('2026-08-12'),
    summary: 'VCT Pacific Stage 2 brackets are officially locked in. Top Asian Pacific rosters fight for direct seeds to the Champions World Finals.',
    url: 'https://valorantesports.com/',
    fullContent: `The Valorant Champions Tour (VCT) 2026 Pacific Stage 2 Playoffs have reached their peak, with the top 4 regional teams advancing to the Grand Finals in Seoul, South Korea.

Match Highlights & Meta Updates:
• Featured Matchups: Paper Rex vs. Gen.G Esports in the Upper Bracket Final.
• Agent Pick Meta: High picking rates for Controller Omen and Duelist Iso following Patch 8.11 balance adjustments.
• Map Pool: Ascent, Lotus, Sunset, and Haven.

The winning roster secures a $250,000 prize bonus and guaranteed #1 seed in the VCT Champions World Finals.`,
    status: 'published'
  },
  {
    title: 'CS2 Major Patch Update: Sub-Tick Matchmaking & Weapon Recoil Balance',
    game: 'Counter-Strike 2',
    source: 'Valve News / HLTV',
    date: new Date('2026-08-10'),
    summary: 'Valve deploys sub-tick latency enhancements, M4A4 economy price reductions, and competitive map pool adjustments for the 2026 Major.',
    url: 'https://www.hltv.org/',
    fullContent: `Valve has released a major competitive patch for Counter-Strike 2, introducing critical sub-tick network optimizations and economy weapon balancing ahead of the CS2 World Major.

Patch Release Highlights:
• Network Sub-Tick: Reduced hit registration delay by 18ms across high-ping competitive servers.
• M4A4 Economy: Reduced price from $3,100 to $2,900 to balance CT side economy strategy.
• Smoke Grenade Physics: Updated volumetric smoke dispersion timing near molotov flames.
• Map Pool: Replaced Overpass with Dust II in official competitive tournament rotation.`,
    status: 'published'
  },
  {
    title: 'Free Fire India Championship (FFIC) 2026: Open Battle Royale Registration',
    game: 'Free Fire MAX',
    source: 'Garena Esports',
    date: new Date('2026-08-05'),
    summary: 'Garena opens official registrations for FFIC 2026 with 128 open lobby tournament slots for grassroots competitive rosters.',
    url: 'https://ff.garena.com/',
    fullContent: `Garena has announced the return of the Free Fire India Championship (FFIC) 2026. Grassroots squads across the country can now register their official 4-man squad rosters.

Registration Details:
• Total Lobbies: 128 Competitive Battle Royale Lobbies
• Scoring Matrix: 12 Points per Booyah + 1 Point per Elimination
• Direct Seed: The Top 2 FFIC finalists secure direct qualification to the Asia International Cup.`,
    status: 'published'
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Seeding...');

    // Clear existing news to prevent duplicates
    await EsportsNews.deleteMany({});
    console.log('Cleared existing EsportsNews data.');

    // Insert new data
    await EsportsNews.insertMany(seedNewsData);
    console.log('Successfully seeded EsportsNews data into the database!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDatabase();
