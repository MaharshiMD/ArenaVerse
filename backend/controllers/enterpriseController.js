const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const SmurfAlert = require('../models/SmurfAlert');
const AntiCheatReport = require('../models/AntiCheatReport');
const ReplayVOD = require('../models/ReplayVOD');
const BattlePass = require('../models/BattlePass');
const Mission = require('../models/Mission');
const EsportsClub = require('../models/EsportsClub');
const ForumPost = require('../models/ForumPost');
const CommunityPoll = require('../models/CommunityPoll');

// 31. Anti-Smurf Alerts
const getSmurfAlerts = async (req, res) => {
  try {
    let alerts = await SmurfAlert.find()
      .populate('user', 'username email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (alerts.length === 0) {
      alerts = [
        {
          _id: 'smurf_1',
          user: { username: 'alt_master99', email: 'alt@arena.com', createdAt: new Date() },
          ipAddress: '192.168.1.45',
          riskScore: 92,
          reasons: ['Same IP as play1@arena.com', 'Account created < 24 hrs ago', 'High win rate jump'],
          status: 'pending',
          createdAt: new Date(),
        },
      ];
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 32. Anti-Cheat Reports
const getAntiCheatReports = async (req, res) => {
  try {
    let reports = await AntiCheatReport.find()
      .populate('reporter', 'username')
      .populate('accusedPlayer', 'username')
      .sort({ createdAt: -1 })
      .lean();

    if (reports.length === 0) {
      reports = [
        {
          _id: 'ac_1',
          reporter: { username: 'play2' },
          accusedPlayer: { username: 'suspect_pro' },
          cheatType: 'aimbot',
          evidenceUrl: 'https://youtube.com/watch?v=demo',
          description: 'Locking onto targets through smoked sightlines in Round 4.',
          status: 'under_investigation',
          createdAt: new Date(),
        },
      ];
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAntiCheatReport = async (req, res) => {
  try {
    const { accusedUsername, matchId, cheatType, evidenceUrl, description } = req.body;
    const accused = await User.findOne({ username: accusedUsername.trim() });
    if (!accused) return res.status(404).json({ message: 'Player not found' });

    const report = await AntiCheatReport.create({
      reporter: req.user.id,
      accusedPlayer: accused._id,
      match: matchId || null,
      cheatType: cheatType || 'aimbot',
      evidenceUrl: evidenceUrl || '',
      description,
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 33. Replays & VOD Library
const getReplays = async (req, res) => {
  try {
    let replays = await ReplayVOD.find().sort({ createdAt: -1 }).lean();
    if (replays.length === 0) {
      replays = [
        {
          _id: 'vod_1',
          title: 'BGMI Arena-Verse Grand Finals 2026 - Match 5 clutch',
          game: 'BGMI / PUBG Mobile',
          platform: 'youtube',
          vodUrl: 'https://www.youtube.com/embed/NtB1wUKNi6E',
          views: 1420,
          createdAt: new Date(),
        },
        {
          _id: 'vod_2',
          title: 'Valorant Champions Cup - Ace Clutch Highlights',
          game: 'VALORANT',
          platform: 'youtube',
          vodUrl: 'https://www.youtube.com/embed/AuZ5vf0rLx8',
          views: 890,
          createdAt: new Date(),
        },
      ];
    }
    res.json(replays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 34 & 35. AI Predictions & Team Balancer
const getAIMatchPrediction = async (req, res) => {
  try {
    const { teamA, teamB } = req.body;
    res.json({
      teamAWinProbability: 64,
      teamBWinProbability: 36,
      expectedMVP: 'play1',
      closeMatchIndicator: 'High Tension Matchup (3-2 predicted score)',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 39, 40, 45, 46. Battle Pass, XP, Store & Arena Coins
const getBattlePass = async (req, res) => {
  try {
    let bp = await BattlePass.findOne({ user: req.user.id });
    if (!bp) {
      bp = await BattlePass.create({
        user: req.user.id,
        level: 5,
        xp: 450,
        arenaCoins: 500,
        equippedFrame: 'Neon Cyber',
        equippedTitle: 'Champion',
        unlockedItems: ['Neon Cyber', 'Champion', 'Gold Border'],
      });
    }
    res.json(bp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRewardStoreItems = async (req, res) => {
  try {
    res.json([
      { id: 'store_1', name: 'Void Flame Animated Frame', category: 'Frame', price: 300, icon: '🔥' },
      { id: 'store_2', name: 'Esports Legend Title', category: 'Title', price: 200, icon: '👑' },
      { id: 'store_3', name: 'Premium Season 1 Battle Pass', category: 'BattlePass', price: 500, icon: '⚡' },
      { id: 'store_4', name: 'Organizer Elite Badge', category: 'Badge', price: 250, icon: '🌟' },
      { id: 'store_5', name: 'Cyber Neon Frame', category: 'Frame', price: 350, icon: '💎' },
      { id: 'store_6', name: 'Grandmaster Title', category: 'Title', price: 400, icon: '🎖️' }
    ]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const buyStoreItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const items = [
      { id: 'store_1', name: 'Void Flame Animated Frame', category: 'Frame', price: 300, icon: '🔥' },
      { id: 'store_2', name: 'Esports Legend Title', category: 'Title', price: 200, icon: '👑' },
      { id: 'store_3', name: 'Premium Season 1 Battle Pass', category: 'BattlePass', price: 500, icon: '⚡' },
      { id: 'store_4', name: 'Organizer Elite Badge', category: 'Badge', price: 250, icon: '🌟' },
      { id: 'store_5', name: 'Cyber Neon Frame', category: 'Frame', price: 350, icon: '💎' },
      { id: 'store_6', name: 'Grandmaster Title', category: 'Title', price: 400, icon: '🎖️' }
    ];

    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) {
      return res.status(404).json({ message: 'Store item not found.' });
    }

    let bp = await BattlePass.findOne({ user: req.user.id });
    if (!bp) {
      bp = await BattlePass.create({
        user: req.user.id,
        level: 1,
        xp: 0,
        arenaCoins: 500,
        unlockedItems: ['Default', 'Challenger'],
      });
    }

    if (bp.unlockedItems.includes(targetItem.name)) {
      return res.status(400).json({ message: `You already own "${targetItem.name}" in your inventory!` });
    }

    if (bp.arenaCoins < targetItem.price) {
      return res.status(400).json({ 
        message: `Insufficient Arena Coins! You need ${targetItem.price} coins, but currently have ${bp.arenaCoins}.` 
      });
    }

    bp.arenaCoins -= targetItem.price;
    bp.unlockedItems.push(targetItem.name);

    if (targetItem.category === 'BattlePass') {
      bp.isPremium = true;
    }

    await bp.save();
    res.json({ message: `🎉 Successfully purchased "${targetItem.name}"!`, battlePass: bp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const equipCosmetic = async (req, res) => {
  try {
    const { itemName, category } = req.body;
    let bp = await BattlePass.findOne({ user: req.user.id });
    if (!bp) {
      return res.status(404).json({ message: 'Battle Pass profile not found.' });
    }

    if (!bp.unlockedItems.includes(itemName) && itemName !== 'Default' && itemName !== 'Challenger' && itemName !== 'Neon Cyber') {
      return res.status(400).json({ message: 'You do not own this cosmetic item.' });
    }

    if (category === 'Frame') bp.equippedFrame = itemName;
    else if (category === 'Title') bp.equippedTitle = itemName;
    else if (category === 'Badge') bp.equippedBadge = itemName;

    await bp.save();

    const userDoc = await User.findById(req.user.id);
    if (userDoc) {
      if (!userDoc.profile) userDoc.profile = {};
      if (category === 'Frame') userDoc.profile.equippedFrame = itemName;
      else if (category === 'Title') userDoc.profile.equippedTitle = itemName;
      else if (category === 'Badge') userDoc.profile.equippedBadge = itemName;
      await userDoc.save();
    }

    res.json({ message: `✨ Equipped "${itemName}" as active ${category}!`, battlePass: bp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrCreateMissions = async (userId) => {
  let missions = await Mission.find({ user: userId });
  if (missions.length === 0) {
    missions = await Mission.create([
      {
        user: userId,
        type: 'daily',
        title: 'Win 2 Competitive Matches',
        description: 'Achieve victory in 2 arena tournament matches.',
        rewardXP: 150,
        rewardCoins: 50,
        progress: 1,
        target: 2,
        completed: false,
      },
      {
        user: userId,
        type: 'weekly',
        title: 'Join 1 Official Tournament',
        description: 'Register and check in for an official tournament.',
        rewardXP: 500,
        rewardCoins: 200,
        progress: 1,
        target: 1,
        completed: false,
      },
    ]);
  }
  return missions;
};

const claimMission = async (req, res) => {
  try {
    const { missionId } = req.params;
    let missions = await getOrCreateMissions(req.user.id);
    let mission = missions.find(m => m._id.toString() === missionId.toString());

    if (!mission) {
      return res.status(404).json({ message: 'Mission challenge not found.' });
    }

    if (mission.completed) {
      return res.status(400).json({ message: 'This mission reward has already been claimed!' });
    }

    if (mission.progress < mission.target) {
      return res.status(400).json({ message: `Mission task is not yet completed! Progress: ${mission.progress}/${mission.target}` });
    }

    // Mark mission as completed and claimed
    if (mission.save) {
      mission.completed = true;
      await mission.save();
    } else {
      await Mission.findByIdAndUpdate(mission._id, { completed: true });
    }

    let bp = await BattlePass.findOne({ user: req.user.id });
    if (!bp) {
      bp = await BattlePass.create({ user: req.user.id, level: 1, xp: 0, arenaCoins: 500 });
    }

    const rewardCoins = mission.rewardCoins || 50;
    const rewardXP = mission.rewardXP || 100;

    bp.arenaCoins += rewardCoins;
    bp.xp += rewardXP;
    if (bp.xp >= 1000) {
      bp.level += Math.floor(bp.xp / 1000);
      bp.xp = bp.xp % 1000;
    }

    await bp.save();

    const updatedMissions = await getOrCreateMissions(req.user.id);
    res.json({
      message: `✨ Mission Completed! Claimed +${rewardCoins} Arena Coins & +${rewardXP} XP!`,
      battlePass: bp,
      missions: updatedMissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 43 & 44. Missions & Challenges
const getMissions = async (req, res) => {
  try {
    const missions = await getOrCreateMissions(req.user.id);
    res.json(missions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 49 & 55. Clubs & Organizations
const getClubs = async (req, res) => {
  try {
    let clubs = await EsportsClub.find().populate('owner', 'username').lean();
    if (clubs.length === 0) {
      clubs = [
        {
          _id: 'club_1',
          name: 'Cloud9 Esports India',
          tag: 'C9',
          bio: 'Premier Asian Esports Organization competing in BGMI & Valorant.',
          squadsCount: 3,
          coachesCount: 2,
        },
        {
          _id: 'club_2',
          name: 'Team Vitality APAC',
          tag: 'VIT',
          bio: 'Global esports organization expanding into South Asian mobile arenas.',
          squadsCount: 2,
          coachesCount: 1,
        },
      ];
    }
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 50 & 51. Community Forums & Polls
const getForumPosts = async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;

    const posts = await ForumPost.find(query)
      .populate('author', 'username profile.avatar profile.equippedFrame profile.equippedTitle')
      .populate('comments.author', 'username profile.avatar profile.equippedFrame profile.equippedTitle')
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createForumPost = async (req, res) => {
  try {
    const { title, category, content } = req.body;
    let post = await ForumPost.create({
      author: req.user.id,
      title,
      category: category || 'General',
      content,
    });
    post = await ForumPost.findById(post._id)
      .populate('author', 'username profile.avatar profile.equippedFrame profile.equippedTitle')
      .lean();

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleLikeForumPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Discussion thread not found' });
    }

    const index = post.likes.findIndex((lId) => lId.toString() === req.user.id.toString());
    if (index > -1) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    const updated = await ForumPost.findById(id)
      .populate('author', 'username profile.avatar profile.equippedFrame profile.equippedTitle')
      .populate('comments.author', 'username profile.avatar profile.equippedFrame profile.equippedTitle')
      .lean();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addForumComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Discussion thread not found' });
    }

    post.comments.push({
      author: req.user.id,
      content: content.trim(),
      createdAt: new Date(),
    });

    await post.save();
    const updated = await ForumPost.findById(id)
      .populate('author', 'username profile.avatar profile.equippedFrame profile.equippedTitle')
      .populate('comments.author', 'username profile.avatar profile.equippedFrame profile.equippedTitle')
      .lean();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPolls = async (req, res) => {
  try {
    let polls = await CommunityPoll.find().sort({ createdAt: -1 });
    if (polls.length === 0) {
      const adminUser = (await User.findOne({ role: 'admin' })) || { _id: req.user?.id };
      const newPoll = await CommunityPoll.create({
        creator: adminUser._id,
        question: 'Which esports title should host the next ₹1,00,000 Major Tournament?',
        options: [
          { text: 'BGMI / PUBG Mobile', votes: [] },
          { text: 'VALORANT', votes: [] },
          { text: 'Counter-Strike 2', votes: [] },
          { text: 'Free Fire MAX', votes: [] },
        ],
        status: 'active',
      });
      polls = [newPoll];
    }
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const votePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;

    const poll = await CommunityPoll.findById(id);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'Invalid poll option' });
    }

    // Remove previous vote by this user across options
    poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((vId) => vId.toString() !== req.user.id.toString());
    });

    // Add vote to target option
    poll.options[optionIndex].votes.push(req.user.id);
    await poll.save();

    const allPolls = await CommunityPoll.find().sort({ createdAt: -1 });
    res.json({ message: 'Vote recorded successfully!', polls: allPolls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 53. Streams & Creators Hub
const getStreams = async (req, res) => {
  try {
    res.json([
      { id: 'str_1', creator: 'MortalLive', title: 'BGMI Pro League Grand Finals Day 3', game: 'BGMI', viewers: 18450, platform: 'youtube', url: 'https://www.youtube.com/embed/live_stream' },
      { id: 'str_2', creator: 'TenzStream', title: 'Valorant Radiant Ranked Grind', game: 'VALORANT', viewers: 12300, platform: 'twitch', url: 'https://www.youtube.com/embed/live_stream' },
    ]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 60. Platform Timeline Milestones
const getPlatformMilestones = async (req, res) => {
  try {
    res.json([
      { id: 'm_1', title: '₹10,00,000 Total Prize Pools Milestone Reached', date: '2026-07-28', description: 'ArenaVerse crossed 1 Million INR in cumulative tournament prize distribution.' },
      { id: 'm_2', title: '100 Verified Event Organizers Joined', date: '2026-07-20', description: 'Over 100 esports organizers certified with verified badges.' },
      { id: 'm_3', title: 'Platform Launch', date: '2026-06-01', description: 'ArenaVerse official platform launch.' },
    ]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSmurfAlerts,
  getAntiCheatReports,
  createAntiCheatReport,
  getReplays,
  getAIMatchPrediction,
  getBattlePass,
  getRewardStoreItems,
  buyStoreItem,
  equipCosmetic,
  claimMission,
  getMissions,
  getClubs,
  getForumPosts,
  createForumPost,
  toggleLikeForumPost,
  addForumComment,
  getPolls,
  votePoll,
  getStreams,
  getPlatformMilestones,
};
