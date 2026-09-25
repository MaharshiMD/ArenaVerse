const https = require('https');

/**
 * Fetch a single TTS audio chunk from Google Translate TTS
 * @param {string} text 
 * @returns {Promise<Buffer>}
 */
function fetchTtsChunk(text) {
  return new Promise((resolve, reject) => {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=' + encodeURIComponent(text);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      },
      timeout: 8000
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS returned status code ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TTS request timed out'));
    });

    req.on('error', reject);
  });
}

/**
 * Split text into chunks under maxChars without breaking words
 */
function splitIntoChunks(text, maxChars = 140) {
  const words = text.replace(/[\r\n]+/g, ' ').trim().split(/\s+/);
  const chunks = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + ' ' + word).trim().length <= maxChars) {
      currentChunk = (currentChunk + ' ' + word).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  return chunks;
}

/**
 * Synthesize complete speech audio into a Base64 data URI
 */
async function synthesizeSpeechAudio(text) {
  try {
    const chunks = splitIntoChunks(text, 140);
    const audioBuffers = [];

    for (const chunk of chunks) {
      const buf = await fetchTtsChunk(chunk);
      audioBuffers.push(buf);
      // Tiny pause between chunk requests to be polite
      await new Promise(r => setTimeout(r, 60));
    }

    const combined = Buffer.concat(audioBuffers);
    return `data:audio/mpeg;base64,${combined.toString('base64')}`;
  } catch (err) {
    console.warn('[NewsVideoGenerator] External TTS error, generating fallback audio signal:', err.message);
    // Fallback: minimal valid silent MP3 frame so audio playback never breaks
    const silentMp3Header = Buffer.from([
      0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00, 
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    return `data:audio/mpeg;base64,${silentMp3Header.toString('base64')}`;
  }
}

/**
 * Determine VFX Theme and Palette based on Game
 */
function getVfxTheme(game = '') {
  const g = game.toLowerCase();
  if (g.includes('valorant')) {
    return {
      themeName: 'radiant-cyber',
      accentColor: '#fa4454',
      secondaryColor: '#00f5d4',
      bgGradient: 'linear-gradient(135deg, #09090b 0%, #1a0826 40%, #062a36 100%)',
      particlesStyle: 'cyber-sparks',
      particleCount: 28,
      glitchIntensity: 0.85,
      scanlineEffect: true,
      overlayTag: 'TACTICAL INTELLIGENCE'
    };
  } else if (g.includes('bgmi') || g.includes('pubg')) {
    return {
      themeName: 'battleground-storm',
      accentColor: '#f59e0b',
      secondaryColor: '#10b981',
      bgGradient: 'linear-gradient(135deg, #0a0e17 0%, #1f1d0b 45%, #06241a 100%)',
      particlesStyle: 'fire-embers',
      particleCount: 32,
      glitchIntensity: 0.75,
      scanlineEffect: true,
      overlayTag: 'BATTLE ROYALE DISPATCH'
    };
  } else if (g.includes('cs2') || g.includes('counter-strike')) {
    return {
      themeName: 'cs-tactical',
      accentColor: '#eab308',
      secondaryColor: '#3b82f6',
      bgGradient: 'linear-gradient(135deg, #0b0f19 0%, #1e1b18 50%, #172554 100%)',
      particlesStyle: 'neon-matrix',
      particleCount: 24,
      glitchIntensity: 0.9,
      scanlineEffect: true,
      overlayTag: 'PRO CIRCUIT REPORT'
    };
  } else if (g.includes('free fire')) {
    return {
      themeName: 'booyah-blaze',
      accentColor: '#ff4d00',
      secondaryColor: '#ffd700',
      bgGradient: 'linear-gradient(135deg, #140505 0%, #2b0c00 50%, #3d1c00 100%)',
      particlesStyle: 'fire-embers',
      particleCount: 30,
      glitchIntensity: 0.8,
      scanlineEffect: true,
      overlayTag: 'BOOYAH HIGHLIGHT'
    };
  }

  // Default ArenaVerse Theme
  return {
    themeName: 'arena-hyper',
    accentColor: '#8b5cf6',
    secondaryColor: '#ec4899',
    bgGradient: 'linear-gradient(135deg, #09090f 0%, #150d2a 50%, #2e0854 100%)',
    particlesStyle: 'cyber-sparks',
    particleCount: 26,
    glitchIntensity: 0.75,
    scanlineEffect: true,
    overlayTag: 'ARENAVERSE EXCLUSIVE'
  };
}

/**
 * Generate simulated audio waveform frequency bars
 */
function generateWaveform(barCount = 36) {
  const bars = [];
  for (let i = 0; i < barCount; i++) {
    // Generate harmonious frequency spikes
    const base = Math.sin((i / barCount) * Math.PI) * 55;
    const noise = Math.floor(Math.random() * 35);
    bars.push(Math.min(98, Math.max(15, Math.round(base + noise))));
  }
  return bars;
}

/**
 * Build multi-scene storyboard with VFX cues
 */
function buildScenes({ title, game, summary, fullContent, duration }) {
  const t1 = Math.round(duration * 0.28 * 10) / 10;
  const t2 = Math.round(duration * 0.68 * 10) / 10;
  const t3 = duration;

  // Extract punchy phrases or bullet points
  const sentences = (summary || '').split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const point1 = sentences[0] || summary;
  const point2 = sentences[1] || 'Tournament brackets and competitive standings are now active.';

  return [
    {
      id: 1,
      timeStart: 0,
      timeEnd: t1,
      badge: 'TOP HEADLINE',
      headline: title,
      contentSnippet: `Official ArenaVerse Esports Flash Report: ${game || 'Global Esports'}`,
      vfxType: 'cinematic-zoom',
      highlightKeywords: [game, 'Official', 'Update', 'Championship'].filter(Boolean)
    },
    {
      id: 2,
      timeStart: t1,
      timeEnd: t2,
      badge: 'KEY INTEL & BREAKDOWN',
      headline: point1,
      contentSnippet: point2,
      vfxType: 'glitch-wipe',
      highlightKeywords: ['Prize', 'Tournaments', 'Finals', 'Roster', 'Stage', 'Qualifiers'].filter(Boolean)
    },
    {
      id: 3,
      timeStart: t2,
      timeEnd: t3,
      badge: 'PRO CIRCUIT IMPACT',
      headline: `Track live brackets & standings for ${game} directly on ArenaVerse!`,
      contentSnippet: 'Instant community match registration and rewards are open.',
      vfxType: 'cyber-pulse',
      highlightKeywords: ['ArenaVerse', 'Live', 'Rewards', 'Registration']
    }
  ];
}

/**
 * Build timestamped subtitle sequence
 */
function buildSubtitles(scriptText, duration) {
  const words = scriptText.replace(/[\r\n]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const timePerWord = duration / words.length;
  return words.map((word, index) => ({
    word,
    startTime: Math.round(index * timePerWord * 100) / 100,
    endTime: Math.round((index + 1) * timePerWord * 100) / 100
  }));
}

/**
 * Main Generator function: builds full video preview asset packet
 */
async function generateNewsVideoPreview({ title, game, summary, fullContent }) {
  const scriptText = `ArenaVerse Esports Intel. ${title}. ${summary}`;
  
  // Calculate speech duration (avg speaking rate ~2.6 words/sec, minimum 8s, max 30s)
  const wordCount = scriptText.split(/\s+/).length;
  const duration = Math.min(30, Math.max(8, Math.round(wordCount / 2.6)));

  console.log(`[NewsVideoGenerator] Generating AI Video & Audio for: "${title.substring(0, 40)}..." (est. ${duration}s)`);

  // Generate audio MP3 data URI
  const audioUrl = await synthesizeSpeechAudio(scriptText);

  // Generate VFX Theme
  const vfxTheme = getVfxTheme(game);

  // Generate Waveform
  const audioWaveform = generateWaveform(40);

  // Generate Storyboard Scenes
  const scenes = buildScenes({ title, game, summary, fullContent, duration });

  // Generate Subtitle Timings
  const subtitles = buildSubtitles(scriptText, duration);

  return {
    hasVideo: true,
    generatedAt: new Date(),
    duration,
    audioUrl,
    audioWaveform,
    vfxTheme,
    scenes,
    subtitles,
    scriptText
  };
}

module.exports = {
  generateNewsVideoPreview,
  synthesizeSpeechAudio,
  getVfxTheme,
  generateWaveform
};
