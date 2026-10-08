const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const EsportsNews = require('../models/EsportsNews');
const { generateNewsVideoPreview, HUMAN_VOICES } = require('../utils/newsVideoGenerator');

const upgradeAllNewsVoices = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully!');

    const articles = await EsportsNews.find({});
    console.log(`Found ${articles.length} news articles to upgrade to studio human voice.`);

    // Choose different human caster voices to showcase variety across different games:
    // BGMI: Christopher (Studio Shoutcaster)
    // VALORANT: Jenny (Broadcast Host)
    // CS2: Guy (News Anchor)
    // Free Fire: Ava (Lively Gaming Host)
    const voiceRotation = [
      'en-US-ChristopherNeural',
      'en-US-JennyNeural',
      'en-US-GuyNeural',
      'en-US-AvaNeural'
    ];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const chosenVoice = voiceRotation[i % voiceRotation.length];

      console.log(`\n[${i + 1}/${articles.length}] Regenerating human voice for: "${article.title.substring(0, 50)}..."`);
      console.log(`Assigned Voice: ${chosenVoice}`);

      const newVideoPreview = await generateNewsVideoPreview({
        title: article.title,
        game: article.game,
        summary: article.summary,
        fullContent: article.fullContent,
        voice: chosenVoice
      });

      article.videoPreview = newVideoPreview;
      await article.save();

      console.log(`Successfully upgraded article ${article._id} with human voice (${newVideoPreview.voice?.name})!`);
    }

    console.log('\nAll esports news articles have been upgraded to 100% human-like voice!');
    process.exit(0);
  } catch (err) {
    console.error('Error upgrading news voices:', err);
    process.exit(1);
  }
};

upgradeAllNewsVoices();
