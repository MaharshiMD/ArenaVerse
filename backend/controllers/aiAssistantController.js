const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Team = require('../models/Team');
const User = require('../models/User');

// @desc    AI Assistant Chat Handler (Real AI Intelligence, Live Data Grounding, Secure PII Protection)
// @route   POST /api/ai-assistant/chat
// @access  Public / Optional Auth
const chatWithAIAssistant = async (req, res) => {
  try {
    const { message = '', tournamentId } = req.body;
    if (!message.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const queryLower = message.toLowerCase().trim();

    // ---------------------------------------------------------
    // 1. STRICT PRIVACY & ANTI-LEAK SECURITY CHECK
    // ---------------------------------------------------------
    const sensitiveKeywords = [
      'password', 'email', 'upi', 'payment details', 'bank', 'credit card',
      'stripe', 'secret', 'token', 'jwt_secret', 'governmentid', 'adminnote',
      'suspensionreason', '2fa', 'twofactor', 'db_uri', 'mongo_uri'
    ];

    const isAskingForPrivateData = sensitiveKeywords.some(keyword => queryLower.includes(keyword)) &&
      (queryLower.includes('give') || queryLower.includes('show') || queryLower.includes('what is') || queryLower.includes('tell') || queryLower.includes('leak') || queryLower.includes('find') || queryLower.includes('get') || queryLower.includes('list all'));

    if (isAskingForPrivateData) {
      return res.json({
        response: '🔒 **Security & Privacy Safeguard**:\nArenaBot AI is strictly programmed to protect privacy. Personal user details (emails, passwords, financial info) and internal credentials are confidential and cannot be disclosed.',
        contextUsed: { securityTriggered: true }
      });
    }

    // ---------------------------------------------------------
    // 2. DYNAMIC MONGO DB DATA RETRIEVAL (LIVE PLATFORM DATA)
    // ---------------------------------------------------------
    
    // A. Query Live (ongoing), Published (upcoming), and Completed Tournaments
    const ongoingTournaments = await Tournament.find({ status: 'ongoing' })
      .select('name game startDate prizePool entryFee rules type region maxTeams winnerName runnerUpName')
      .lean();

    const publishedTournaments = await Tournament.find({ status: 'published' })
      .select('name game startDate prizePool entryFee rules type region maxTeams')
      .lean();

    const completedTournaments = await Tournament.find({ status: 'completed' })
      .select('name game startDate prizePool winnerName runnerUpName')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    const totalTournamentsCount = await Tournament.countDocuments({});
    const totalTeamsCount = await Team.countDocuments({});
    const totalUsersCount = await User.countDocuments({ status: 'active' });

    // B. Query currently viewed tournament (if viewing a tournament page)
    let currentTournament = null;
    let upcomingMatches = [];
    if (tournamentId) {
      currentTournament = await Tournament.findById(tournamentId)
        .populate('organizer', 'username isVerifiedOrganizer')
        .select('name game startDate prizePool entryFee rules maxTeams status type region registeredTeams registeredPlayers winnerName runnerUpName')
        .lean();
      
      if (currentTournament) {
        upcomingMatches = await Match.find({ tournament: tournamentId, status: { $ne: 'completed' } })
          .sort({ round: 1, position: 1 })
          .limit(6)
          .lean();
      }
    }

    // C. Search platform data for specific tournament or game if mentioned in prompt
    let matchedTournaments = [];
    const knownGames = ['valorant', 'cs2', 'counter-strike', 'apex', 'fortnite', 'league of legends', 'dota', 'rocket league', 'overwatch', 'bgmi', 'pubg'];
    const matchedGame = knownGames.find(g => queryLower.includes(g));

    if (matchedGame || queryLower.length > 3) {
      const searchTerm = matchedGame || queryLower;
      matchedTournaments = await Tournament.find({
        $or: [
          { game: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } }
        ]
      }).select('name game status prizePool entryFee rules startDate winnerName').limit(4).lean();
    }

    // D. Query User Personal Data if authenticated (my teams, my tournaments)
    let myTeams = [];
    let myTournaments = [];
    if (req.user) {
      myTeams = await Team.find({ members: req.user._id })
        .select('name tag game inviteCode')
        .lean();
      
      const myTeamIds = myTeams.map(t => t._id);
      myTournaments = await Tournament.find({
        $or: [
          { registeredPlayers: req.user._id },
          { registeredTeams: { $in: myTeamIds } }
        ]
      }).select('name game status startDate prizePool').lean();
    }

    // E. Query Leaderboard / Top Players (selecting ONLY safe public fields)
    let topPlayers = [];
    if (queryLower.includes('leaderboard') || queryLower.includes('top player') || queryLower.includes('best player') || queryLower.includes('rank')) {
      topPlayers = await User.find({ status: 'active' })
        .select('username profile.equippedTitle profile.equippedBadge role isVerifiedOrganizer')
        .limit(5)
        .lean();
    }

    // ---------------------------------------------------------
    // 3. CONSTRUCT LIVE ARENAVERSE DATA SUMMARY FOR LLM
    // ---------------------------------------------------------
    let contextSummary = `ArenaVerse Platform Real-time Information:\n`;
    contextSummary += `Platform Totals: Tournaments: ${totalTournamentsCount}, Teams: ${totalTeamsCount}, Active Players: ${totalUsersCount}\n\n`;

    contextSummary += `LIVE / ONGOING TOURNAMENTS (${ongoingTournaments.length}):\n`;
    if (ongoingTournaments.length === 0) {
      contextSummary += `- None currently ongoing.\n`;
    } else {
      ongoingTournaments.forEach(t => {
        contextSummary += `- ${t.name} (${t.game}): Fee ₹${t.entryFee}, Prize ₹${t.prizePool}, Format: ${t.type.toUpperCase()}, Region: ${t.region}, Rules: "${t.rules}"\n`;
      });
    }

    contextSummary += `\nUPCOMING / PUBLISHED TOURNAMENTS (${publishedTournaments.length}):\n`;
    if (publishedTournaments.length === 0) {
      contextSummary += `- None currently published.\n`;
    } else {
      publishedTournaments.forEach(t => {
        contextSummary += `- ${t.name} (${t.game}): Fee ₹${t.entryFee}, Prize ₹${t.prizePool}, Start: ${new Date(t.startDate).toLocaleDateString()}, Rules: "${t.rules}"\n`;
      });
    }

    contextSummary += `\nCOMPLETED TOURNAMENTS (${completedTournaments.length}):\n`;
    completedTournaments.forEach(t => {
      contextSummary += `- ${t.name} (${t.game}): Winner: ${t.winnerName || 'TBD'}, Runner-Up: ${t.runnerUpName || 'TBD'}, Prize ₹${t.prizePool}\n`;
    });

    if (currentTournament) {
      contextSummary += `\nCURRENTLY VIEWED TOURNAMENT:\nName: ${currentTournament.name}\nGame: ${currentTournament.game}\nStatus: ${currentTournament.status.toUpperCase()}\nEntry Fee: ₹${currentTournament.entryFee}\nPrize Pool: ₹${currentTournament.prizePool}\nRules: "${currentTournament.rules}"\nOrganizer: @${currentTournament.organizer?.username || 'Unknown'}\n`;
      if (upcomingMatches.length > 0) {
        contextSummary += `Upcoming Matches:\n`;
        upcomingMatches.forEach((m, idx) => {
          contextSummary += `Match ${idx + 1}: ${m.teamAName || 'TBD'} vs ${m.teamBName || 'TBD'} (Round ${m.round}, Status: ${m.status})\n`;
        });
      }
    }

    if (matchedTournaments.length > 0) {
      contextSummary += `\nSEARCH MATCHED TOURNAMENTS:\n`;
      matchedTournaments.forEach(t => {
        contextSummary += `- ${t.name} (${t.game}) [Status: ${t.status}]: Fee ₹${t.entryFee}, Prize ₹${t.prizePool}\n`;
      });
    }

    if (req.user) {
      contextSummary += `\nAUTHENTICATED USER: @${req.user.username}\nUser's Teams: ${myTeams.map(t => t.name).join(', ') || 'None'}\nUser's Registered Tournaments: ${myTournaments.map(t => t.name).join(', ') || 'None'}\n`;
    }

    // ---------------------------------------------------------
    // 4. EXTERNAL LLM INVOCATION (IF GEMINI_API_KEY CONFIGURED)
    // ---------------------------------------------------------
    let aiResponseText = '';
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `System Prompt: You are ArenaBot, an advanced AI Assistant (like ChatGPT or Gemini AI) built into the ArenaVerse eSports platform.
Capabilities & Behavior:
1. Answer ANY question asked by the user intelligently, clearly, and concisely, just like ChatGPT/Gemini AI (general knowledge, coding, eSports strategies, math, science, support, etc.).
2. When questions pertain to ArenaVerse (live tournaments, schedules, rules, player profiles, teams), strictly use the verified live platform context provided below.
3. NEVER mention technical terms like "database", "DB", "MongoDB", or "records". Speak naturally and seamlessly.
4. STRICT PRIVACY RULE: NEVER expose private emails, passwords, financial info, or internal security credentials.

Live ArenaVerse Platform Context:
${contextSummary}

User Question: ${message}`
              }]
            }]
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
          console.error('Gemini API response not OK:', geminiRes.status);
        }
      } catch (err) {
        console.error('Gemini API call error:', err.message);
      }
    }

    // ---------------------------------------------------------
    // 5. INTELLIGENT AI ENGINE (NATURAL & CONTEXTUAL RESPONSES)
    // ---------------------------------------------------------
    if (!aiResponseText) {
      // AI Intent 1: Greetings & Greetings/Intro
      if (/^(hi|hello|hey|greetings|hola|good morning|good evening|who are you|what can you do)/i.test(queryLower)) {
        aiResponseText = `👋 **Hello! I am ArenaBot**, your official ArenaVerse eSports AI Assistant.\n\nI can help you with:\n• Checking **live & upcoming tournaments**\n• Match schedules and tournament rules\n• Results and past champions\n• Squad team setup & registration help\n• Disputes, reports, and platform support\n\nHow can I assist your competitive gaming today?`;
      }
      // AI Intent 2: Live / Ongoing Tournaments
      else if (queryLower.includes('live') || queryLower.includes('ongoing') || queryLower.includes('currently running') || queryLower.includes('now playing')) {
        if (ongoingTournaments.length > 0) {
          const list = ongoingTournaments.map(t => `• **${t.name}** (${t.game}) | Prize: ₹${t.prizePool} | Entry Fee: ₹${t.entryFee} | Mode: ${t.type.toUpperCase()}`).join('\n');
          aiResponseText = `🔴 **Live Tournaments Currently Running (${ongoingTournaments.length})**:\n${list}`;
        } else {
          let upcomingList = '';
          if (publishedTournaments.length > 0) {
            upcomingList = `\n\n📅 **Upcoming Published Tournaments**:\n` + publishedTournaments.slice(0, 3).map(t => `• **${t.name}** (${t.game}) - Starts ${new Date(t.startDate).toLocaleDateString()}`).join('\n');
          }
          aiResponseText = `Currently, there are **0 live (ongoing) tournaments** right now.${upcomingList}`;
        }
      }
      // AI Intent 3: Upcoming / Published Tournaments
      else if (queryLower.includes('upcoming') || queryLower.includes('published') || queryLower.includes('next tournament') || queryLower.includes('future')) {
        if (publishedTournaments.length > 0) {
          const list = publishedTournaments.map(t => `• **${t.name}** (${t.game}) - Prize: ₹${t.prizePool} | Fee: ₹${t.entryFee} | Starts: ${new Date(t.startDate).toLocaleDateString()}`).join('\n');
          aiResponseText = `📅 **Upcoming Tournaments (${publishedTournaments.length})**:\n${list}`;
        } else {
          aiResponseText = `There are currently **0 published upcoming tournaments**. Check back soon!`;
        }
      }
      // AI Intent 4: Game-Specific Query (e.g. Valorant, BGMI, CS2, Fortnite)
      else if (matchedGame && matchedTournaments.length > 0) {
        const list = matchedTournaments.map(t => `• **${t.name}** [${t.status.toUpperCase()}] - Entry Fee: ₹${t.entryFee} | Prize: ₹${t.prizePool}`).join('\n');
        aiResponseText = `🎮 **${matchedGame.toUpperCase()} Tournaments on ArenaVerse**:\n${list}`;
      }
      // AI Intent 5: Platform Stats (How many players / teams / tournaments)
      else if (queryLower.includes('how many') || queryLower.includes('total players') || queryLower.includes('total teams') || queryLower.includes('stats')) {
        aiResponseText = `📊 **ArenaVerse Platform Statistics**:\n• **Active Players**: ${totalUsersCount}\n• **Registered Squad Teams**: ${totalTeamsCount}\n• **Total Tournaments**: ${totalTournamentsCount} (${ongoingTournaments.length} live, ${publishedTournaments.length} upcoming)`;
      }
      // AI Intent 6: Completed Tournaments & Winners
      else if (queryLower.includes('completed') || queryLower.includes('winner') || queryLower.includes('champion') || queryLower.includes('who won') || queryLower.includes('past tournament')) {
        if (completedTournaments.length > 0) {
          const list = completedTournaments.map(t => `• **${t.name}** (${t.game}): 🥇 Champion: **${t.winnerName || 'TBD'}** ${t.runnerUpName ? `| 🥈 Runner-Up: ${t.runnerUpName}` : ''}`).join('\n');
          aiResponseText = `🏆 **Completed Tournaments & Champions**:\n${list}`;
        } else {
          aiResponseText = `No completed tournaments found.`;
        }
      }
      // AI Intent 7: Rules / Guidelines
      else if (queryLower.includes('rule') || queryLower.includes('guideline') || queryLower.includes('fair play') || queryLower.includes('walkover')) {
        if (currentTournament) {
          aiResponseText = `📜 **Official Rules for ${currentTournament.name}**:\n"${currentTournament.rules}"`;
        } else if (matchedTournaments.length > 0 && matchedTournaments[0].rules) {
          aiResponseText = `📜 **Rules for ${matchedTournaments[0].name}**:\n"${matchedTournaments[0].rules}"`;
        } else {
          aiResponseText = `📜 **ArenaVerse Platform Rules**:\n1. Check-in opens 15 minutes before scheduled match start.\n2. Ringing or unregistered roster members result in automatic forfeit.\n3. Fake score submissions can be reported via '🚨 File Dispute'.`;
        }
      }
      // AI Intent 8: Support / Customer Help / Technical Issues
      else if (queryLower.includes('support') || queryLower.includes('help') || queryLower.includes('contact') || queryLower.includes('issue') || queryLower.includes('problem') || queryLower.includes('assist') || queryLower.includes('bug')) {
        aiResponseText = `💬 **ArenaVerse Support & Help**:\n• **Match & Rule Disputes**: Click **'🚨 File Dispute'** directly on any tournament page for referee review.\n• **Organizer & Technical Support**: Reach out to tournament organizers or contact the ArenaVerse admin team via your Profile settings.\n• **Quick Help**: Ask me about rules, schedules, registration, or squad team setup!`;
      }
      // AI Intent 9: Match Schedule & Timings
      else if (queryLower.includes('schedule') || queryLower.includes('next match') || queryLower.includes('when is') || queryLower.includes('fixture')) {
        if (currentTournament && upcomingMatches.length > 0) {
          const mList = upcomingMatches.map(m => `• Round ${m.round}: **${m.teamAName || 'TBD'} vs ${m.teamBName || 'TBD'}** (${m.status.toUpperCase()})`).join('\n');
          aiResponseText = `⏰ **Upcoming Matches for ${currentTournament.name}**:\n${mList}`;
        } else if (ongoingTournaments.length > 0 || publishedTournaments.length > 0) {
          const activeCount = ongoingTournaments.length + publishedTournaments.length;
          aiResponseText = `⏰ **Schedule Summary**:\nThere are **${activeCount} total active/upcoming tournaments** on ArenaVerse. Visit the 'Tournaments' page to view individual brackets and fixtures!`;
        } else {
          aiResponseText = `No scheduled matches found.`;
        }
      }
      // AI Intent 10: eSports Advice & Strategy Tips
      else if (queryLower.includes('tip') || queryLower.includes('strategy') || queryLower.includes('how to win') || queryLower.includes('improve') || queryLower.includes('advice')) {
        aiResponseText = `⚡ **Pro eSports Tips for ArenaVerse Competitors**:\n1. **Warm Up**: Play warm-up matches 20 minutes before official check-in.\n2. **Roster Synergy**: Ensure squad communications are clear and roles are assigned.\n3. **Map Veto Awareness**: Study opponent match history and map stats.\n4. **Timely Check-in**: Check in within the 15-minute window to avoid walkovers!`;
      }
      // AI Intent 11: Personal Teams / Registered Tournaments
      else if (queryLower.includes('my team') || queryLower.includes('my squad') || queryLower.includes('my tournament') || queryLower.includes('my registration')) {
        if (!req.user) {
          aiResponseText = `🔒 Please log in to view your personal squad teams and registered tournaments!`;
        } else {
          const teamStr = myTeams.length > 0 ? myTeams.map(t => `• **${t.name}** [${t.tag}] (${t.game})`).join('\n') : 'You are not in any squad teams yet.';
          const tourneyStr = myTournaments.length > 0 ? myTournaments.map(t => `• **${t.name}** (${t.game}) - Status: ${t.status.toUpperCase()}`).join('\n') : 'You have not registered for any tournaments yet.';
          aiResponseText = `👤 **Your Personal ArenaVerse Status (@${req.user.username})**:\n\n**My Teams**:\n${teamStr}\n\n**My Tournaments**:\n${tourneyStr}`;
        }
      }
      // AI Intent 12: Leaderboard & Top Players
      else if (queryLower.includes('leaderboard') || queryLower.includes('top player') || queryLower.includes('best player') || queryLower.includes('rank')) {
        if (topPlayers.length > 0) {
          const pList = topPlayers.map((p, i) => `#${i + 1} **@${p.username}** ${p.profile?.equippedTitle ? `(${p.profile.equippedTitle})` : ''} ${p.isVerifiedOrganizer ? 'Verified' : ''}`).join('\n');
          aiResponseText = `🌟 **Top ArenaVerse Players / Leaderboard**:\n${pList}`;
        } else {
          aiResponseText = `Leaderboard data is currently updating. Check back shortly!`;
        }
      }
      // AI Intent 13: Registration & Squad creation guidance
      else if (queryLower.includes('register') || queryLower.includes('join') || queryLower.includes('create team') || queryLower.includes('captain')) {
        aiResponseText = `📝 **Registration & Squad Help**:\n• **Solo Tournaments**: Click 'Register Solo' on any active tournament page.\n• **Squad Tournaments**: Team Captains can select their squad from the dropdown.\n• **Create Squad**: Go to Player Dashboard -> 'Create Team'.`;
      }
      // AI Intent 14: Disputes & Anti-cheat
      else if (queryLower.includes('dispute') || queryLower.includes('cheat') || queryLower.includes('report') || queryLower.includes('toxic')) {
        aiResponseText = `🚨 **Disputes & Incident Reports**:\nSubmit match disputes or report rule breaches directly via **'🚨 File Dispute'** on tournament pages. Organizers review screenshots and issue rulings.`;
      }
      // AI Intent 15: General Search Result
      else if (matchedTournaments.length > 0) {
        const t = matchedTournaments[0];
        aiResponseText = `🎮 **Tournament Found**: **${t.name}** (${t.game})\n• Status: ${t.status.toUpperCase()}\n• Entry Fee: ₹${t.entryFee}\n• Prize Pool: ₹${t.prizePool}\n• Rules: "${t.rules}"`;
      }
      // AI Intent 16: Universal Natural AI Response
      else {
        aiResponseText = `🤖 **ArenaBot AI**:\nI am your intelligent assistant on ArenaVerse! You can ask me about:\n• Live & upcoming tournaments\n• Match schedules & official rules\n• Tournament champions & top players\n• Support, disputes, and team management`;
      }
    }

    res.json({
      response: aiResponseText,
      contextUsed: {
        ongoingCount: ongoingTournaments.length,
        publishedCount: publishedTournaments.length,
        completedCount: completedTournaments.length,
        currentTournamentName: currentTournament?.name || null,
      },
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  chatWithAIAssistant,
};
