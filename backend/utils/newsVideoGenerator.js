const https = require('https');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

/**
 * Curated list of ultra-realistic neural human voices.
 * Powered by Microsoft Azure Neural Speech models (natural breathing, studio broadcast cadence, human intonation).
 */
const HUMAN_VOICES = {
  'christopher': {
    id: 'en-US-ChristopherNeural',
    name: 'Christopher',
    label: 'Christopher (Studio Shoutcaster)',
    gender: 'Male',
    style: 'Deep, energetic pro esports caster'
  },
  'jenny': {
    id: 'en-US-JennyNeural',
    name: 'Jenny',
    label: 'Jenny (Broadcast Host)',
    gender: 'Female',
    style: 'Expressive, warm studio anchor'
  },
  'guy': {
    id: 'en-US-GuyNeural',
    name: 'Guy',
    label: 'Guy (News Anchor)',
    gender: 'Male',
    style: 'Authoritative, polished news anchor'
  },
  'ava': {
    id: 'en-US-AvaNeural',
    name: 'Ava',
    label: 'Ava (Lively Host)',
    gender: 'Female',
    style: 'Dynamic, modern gaming streamer'
  },
  'andrew': {
    id: 'en-US-AndrewNeural',
    name: 'Andrew',
    label: 'Andrew (Tournament Narrator)',
    gender: 'Male',
    style: 'Resonant, cinematic storyteller'
  }
};

const DEFAULT_VOICE_KEY = 'christopher';

/**
 * Resolve voice ID or key to voice metadata object
 */
function resolveVoice(voiceKeyOrId) {
  if (!voiceKeyOrId) return HUMAN_VOICES[DEFAULT_VOICE_KEY];

  const lower = voiceKeyOrId.toLowerCase();
  for (const [key, voice] of Object.entries(HUMAN_VOICES)) {
    if (key === lower || voice.id.toLowerCase() === lower || voice.name.toLowerCase() === lower) {
      return voice;
    }
  }

  // If a raw voice ID was provided (e.g. en-US-...)
  if (voiceKeyOrId.includes('-')) {
    return {
      id: voiceKeyOrId,
      name: voiceKeyOrId.split('-').pop()?.replace('Neural', '') || 'Anchor',
      label: `${voiceKeyOrId} (Neural Voice)`,
      gender: 'Neutral',
      style: 'Broadcast Studio'
    };
  }

  return HUMAN_VOICES[DEFAULT_VOICE_KEY];
}

/**
 * Accurately calculate the duration of an MP3 Buffer by parsing MPEG frame headers
 * @param {Buffer} buf 
 * @returns {number} duration in seconds
 */
function getMp3Duration(buf) {
  let offset = 0;
  let totalSamples = 0;
  let sampleRate = 48000;
  const sampleRates = [44100, 48000, 32000];
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];

  while (offset < buf.length - 4) {
    if (buf[offset] === 0xFF && (buf[offset + 1] & 0xE0) === 0xE0) {
      const sIdx = (buf[offset + 2] >> 2) & 0x03;
      const bIdx = (buf[offset + 2] >> 4) & 0x0F;
      const padding = (buf[offset + 2] >> 1) & 0x01;
      sampleRate = sampleRates[sIdx] || 48000;
      const bitrate = (bitrates[bIdx] || 112) * 1000;
      const frameLen = Math.floor((144 * bitrate) / sampleRate) + padding;
      if (frameLen > 0) {
        totalSamples += 1152;
        offset += frameLen;
        continue;
      }
    }
    offset++;
  }

  return sampleRate > 0 && totalSamples > 0 ? (totalSamples / sampleRate) : 0;
}

/**
 * Clean text for natural human pronunciation and clear subtitles
 */
function cleanSpeechText(text = '') {
  return text
    .replace(/[•*#_~`[\]]/g, ' ')
    .replace(/\(BMPS\)/gi, 'B M P S')
    .replace(/BMPS/g, 'B M P S')
    .replace(/\(VCT\)/gi, 'V C T')
    .replace(/VCT/g, 'V C T')
    .replace(/\(FFIC\)/gi, 'F F I C')
    .replace(/FFIC/g, 'F F I C')
    .replace(/CS2/gi, 'C S 2')
    .replace(/BGMI/gi, 'B G M I')
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/₹\s*1[,.]?00[,.]?00[,.]?000/g, 'one crore rupees')
    .replace(/₹\s*50[,.]?00[,.]?000/g, 'fifty lakh rupees')
    .replace(/₹\s*([0-9,]+)/g, '$1 rupees')
    .replace(/\$([0-9,]+)/g, '$1 dollars')
    .replace(/vs\./gi, 'versus')
    .replace(/&/g, ' and ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split text into natural, bite-sized spoken sentences
 */
function splitIntoSentences(text) {
  const cleaned = cleanSpeechText(text);
  const parts = cleaned.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  
  const sentences = [];
  for (const part of parts) {
    if (part.length <= 130) {
      sentences.push(part);
    } else {
      const subParts = part.split(/(?<=[,;])\s+/).map(s => s.trim()).filter(Boolean);
      sentences.push(...subParts);
    }
  }
  return sentences.filter(s => s.length > 2);
}

/**
 * Synthesize ultra-realistic human speech using Microsoft Azure Neural Voice
 * Returns MP3 audio buffer, duration, and exact synchronized word-level timestamps.
 */
async function synthesizeNeuralSpeech(scriptText, voiceConfig) {
  const tts = new MsEdgeTTS();
  const voiceId = voiceConfig.id;

  await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true
  });

  const { audioStream, metadataStream } = tts.toStream(scriptText);
  const audioChunks = [];
  const rawWordBoundaries = [];

  audioStream.on('data', chunk => audioChunks.push(chunk));

  if (metadataStream) {
    metadataStream.on('data', data => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.Metadata) {
          for (const item of parsed.Metadata) {
            if (item.Type === 'WordBoundary' && item.Data && item.Data.text) {
              const word = item.Data.text.Text;
              // Azure 100-nanosecond ticks -> seconds (rounded to 2 decimal places)
              const startTime = Math.round(item.Data.Offset / 100000) / 100;
              const endTime = Math.round((item.Data.Offset + item.Data.Duration) / 100000) / 100;
              rawWordBoundaries.push({
                word,
                startTime,
                endTime
              });
            }
          }
        }
      } catch (e) {
        // Ignore partial metadata frames
      }
    });
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { tts.close(); } catch (e) {}
        reject(new Error('Neural speech synthesis timed out'));
      }
    }, 20000);

    audioStream.on('end', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        try { tts.close(); } catch (e) {}
        const audioBuffer = Buffer.concat(audioChunks);
        const measuredDuration = getMp3Duration(audioBuffer);
        resolve({
          audioBuffer,
          duration: Math.round(measuredDuration * 100) / 100,
          subtitles: rawWordBoundaries
        });
      }
    });

    audioStream.on('error', err => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        try { tts.close(); } catch (e) {}
        reject(err);
      }
    });
  });
}

/**
 * Robust Neural Speech Synthesizer with retry
 */
async function synthesizeWithRetry(scriptText, voiceConfig, maxRetries = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[NewsVideoGenerator] Retry attempt ${attempt} for neural speech synthesis...`);
        await new Promise(r => setTimeout(r, 400));
      }
      return await synthesizeNeuralSpeech(scriptText, voiceConfig);
    } catch (err) {
      lastError = err;
      console.warn(`[NewsVideoGenerator] Neural attempt ${attempt} failed: ${err.message}`);
    }
  }
  throw lastError;
}

/**
 * Fallback synthesizer if neural stream encounters unexpected network issues
 */
function synthesizeFallbackChunk(text) {
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
        return reject(new Error(`Fallback TTS returned status code ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Fallback TTS request timed out'));
    });

    req.on('error', reject);
  });
}

/**
 * Main synthesis coordinator with intelligent fallback
 */
async function synthesizeAudioAndSubtitles(sentenceChunks, voiceKeyOrId) {
  const selectedVoice = resolveVoice(voiceKeyOrId);
  const fullScript = sentenceChunks.join(' ');

  try {
    console.log(`[NewsVideoGenerator] Synthesizing human voice via Microsoft Neural Speech (${selectedVoice.label})...`);
    const result = await synthesizeWithRetry(fullScript, selectedVoice);

    // If word boundaries were captured, ensure indexed consistency
    let subtitles = result.subtitles;
    if (!subtitles || subtitles.length === 0) {
      // Fallback word timings if metadata was empty
      const words = fullScript.split(/\s+/).filter(Boolean);
      const durPerWord = result.duration / (words.length || 1);
      subtitles = words.map((w, idx) => ({
        word: w,
        startTime: Math.round(idx * durPerWord * 100) / 100,
        endTime: Math.round((idx + 1) * durPerWord * 100) / 100
      }));
    }

    return {
      audioUrl: `data:audio/mpeg;base64,${result.audioBuffer.toString('base64')}`,
      duration: result.duration || 12,
      subtitles,
      voice: selectedVoice
    };
  } catch (err) {
    console.warn('[NewsVideoGenerator] Neural TTS encounter notice, switching to secondary voice mode:', err.message);

    // Secondary fallback chunk synthesis
    const audioBuffers = [];
    const allSubtitles = [];
    let currentAudioTime = 0;

    for (let sIdx = 0; sIdx < sentenceChunks.length; sIdx++) {
      const chunkText = sentenceChunks[sIdx];
      try {
        const buf = await synthesizeFallbackChunk(chunkText);
        const chunkDur = getMp3Duration(buf) || (chunkText.split(/\s+/).length * 0.33);
        const words = chunkText.split(/\s+/).filter(Boolean);
        const durPerWord = chunkDur / (words.length || 1);

        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          allSubtitles.push({
            word: words[wIdx],
            sentenceIndex: sIdx,
            startTime: Math.round((currentAudioTime + wIdx * durPerWord) * 100) / 100,
            endTime: Math.round((currentAudioTime + (wIdx + 1) * durPerWord) * 100) / 100
          });
        }

        audioBuffers.push(buf);
        currentAudioTime += chunkDur;
        await new Promise(r => setTimeout(r, 50));
      } catch (chunkErr) {
        console.error('[NewsVideoGenerator] Chunk fallback failed:', chunkErr.message);
      }
    }

    const combinedAudio = audioBuffers.length > 0 
      ? Buffer.concat(audioBuffers) 
      : Buffer.from([0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00]);

    return {
      audioUrl: `data:audio/mpeg;base64,${combinedAudio.toString('base64')}`,
      duration: Math.round(currentAudioTime * 100) / 100 || 12,
      subtitles: allSubtitles,
      voice: selectedVoice
    };
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
    const base = Math.sin((i / barCount) * Math.PI) * 55;
    const noise = Math.floor(Math.random() * 35);
    bars.push(Math.min(98, Math.max(15, Math.round(base + noise))));
  }
  return bars;
}

/**
 * Build multi-scene storyboard synchronized with actual audio timeline
 */
function buildScenes({ title, game, summary, duration }) {
  const totalDur = duration || 12;
  const t1 = Math.round(totalDur * 0.32 * 10) / 10;
  const t2 = Math.round(totalDur * 0.70 * 10) / 10;
  const t3 = totalDur;

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
 * Main Generator function: builds full video preview asset packet
 * with studio-grade human neural voice narration.
 */
async function generateNewsVideoPreview({ title, game, summary, fullContent, voice }) {
  const cleanedTitle = cleanSpeechText(title);
  const summarySentences = splitIntoSentences(summary);

  const sentenceChunks = [
    `ArenaVerse Flash Report: ${cleanedTitle}.`,
    ...summarySentences
  ];

  const selectedVoice = resolveVoice(voice);
  console.log(`[NewsVideoGenerator] Generating broadcast preview for "${title.substring(0, 40)}..." using voice "${selectedVoice.label}"`);

  const { audioUrl, duration, subtitles, voice: activeVoice } = await synthesizeAudioAndSubtitles(sentenceChunks, selectedVoice.id);

  console.log(`[NewsVideoGenerator] Generated studio human voice audio: ${duration}s, total words: ${subtitles.length}`);

  const vfxTheme = getVfxTheme(game);
  const audioWaveform = generateWaveform(40);
  const scenes = buildScenes({ title, game, summary, duration, subtitles });

  return {
    hasVideo: true,
    generatedAt: new Date(),
    duration,
    audioUrl,
    audioWaveform,
    vfxTheme,
    scenes,
    subtitles,
    voice: activeVoice,
    scriptText: sentenceChunks.join(' ')
  };
}

module.exports = {
  HUMAN_VOICES,
  resolveVoice,
  generateNewsVideoPreview,
  synthesizeAudioAndSubtitles,
  synthesizeNeuralSpeech,
  getMp3Duration,
  cleanSpeechText,
  splitIntoSentences,
  getVfxTheme,
  generateWaveform
};
