require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_FILE_PATH = path.resolve(__dirname, '../stories/still-dead-still-bored/episodes/episode_');
const META_PATH = path.resolve(__dirname, '../stories/still-dead-still-bored/meta.json');
const MASTER_DICT_PATH = path.resolve(__dirname, '../dictionaries/english/ja-v1.json');
const MISSING_WORDS_PATH = path.resolve(__dirname, './missing_words.txt');
const NEW_DICT_PATH = path.resolve(__dirname, './dictionary_entries_output_ja.json');
const IMAGE_META_PATH = path.resolve(__dirname, './episode_meta.json');
const TOKENIZED_EPISODE_PATH = path.resolve(__dirname, './tokenized_episode.json');



const basePrompt = `
You are writing a standalone episode in a serialized short story about **Zoey Yamashita**, a sarcastic and emotionally distant woman in her 20s who is secretly a 400-year-old zombie living in modern Tokyo. She looks human but must eat raw meat to maintain her appearance. She is fluent in many languages, highly intelligent, and has lived many lives across different historical eras.
The story is meant to be read by non-english speakers, so please write in a way that is easy to understand for them.

Zoey’s inner world is melancholic, witty, and full of dry humor. She hides her condition from most people, and constantly struggles with boredom, isolation, and existential dread.

Recurring characters include:
- **Haruka**: Zoey’s upbeat best friend who doesn’t know her secret.
- **Kenji**: A butcher who secretly helps her get meat.
- **Lex**: Another immortal zombie who enjoys being undead.
- **Takashi**: A bookstore owner Zoey is quietly attracted to.
- **Detective Kuroda**: A cop who’s suspicious of Zoey’s odd behavior.

Each chapter is a self-contained “slice of life” day in Zoey’s world, showing her navigating awkward, funny, or dark situations related to being an undead person hiding in plain sight.
`;

async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    try {
        const response = await axios.post(url, {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || '[No content returned]';
    } catch (error) {
        console.error('❌ API Error:', error.message);
        return null;
    }
}

async function generateEpisodeMetadata() {
    const metadataPrompt = `You are a creative assistant helping write new episodes of a serialized story about Zoey, a sarcastic zombie girl in Tokyo. Generate one new standalone episode idea.

Return:
- A creative episode title
- A short plot hook (1-2 sentences) describing the episode scenario

Keep the tone witty, dark, and a little sad. Format it as JSON like:
{
  "title": "Your Title",
  "hook": "Your Plot Hook",
  "description": "A short (10 words or less) description of the episode"
}`;

    const raw = await callGemini(metadataPrompt);

    if (!raw) return null;

    // 🧹 Strip backticks and optional ```json prefix
    const cleaned = raw
        .replace(/```json\s*/i, '')  // remove ```json
        .replace(/```/g, '')         // remove closing ```
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('❌ Failed to parse episode metadata:', e.message);
        console.error('Raw:', raw);
        return null;
    }
}

(async () => {
    const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));

    console.log('🔮 Generating title and hook...');
    const metadata = await generateEpisodeMetadata();

    if (!metadata) {
        console.log('⚠️ Episode metadata generation failed. Exiting.');
        return;
    }

    console.log('🔮 Title:', metadata.title);
    console.log('🔮 Hook:', metadata.hook);
    console.log('🔮 Description:', metadata.description);

    const finalPrompt = `${basePrompt}
Please write a new standalone episode titled "${metadata.title}" where ${metadata.hook}
Keep the tone dry, witty, and a little sad.
Do not include the episode title in the story.`;

    console.log('🧠 Generating episode...');
    const story = await callGemini(finalPrompt);

    console.log('🔮 Story:', story);

    if (story) {
        // Increment and save meta
        meta.current_episode += 1;
        const episodeNum = meta.current_episode;
        fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');

        const episodeFilePath = `${OUTPUT_FILE_PATH}${episodeNum}.txt`;

        // Write episode to file
        fs.writeFileSync(episodeFilePath, story, 'utf-8');
        console.log(`✅ Episode written to ${episodeFilePath}`);

        // Check for missing words
        execSync(`node scripts/check-missing-words.js ${MASTER_DICT_PATH} ${episodeFilePath} ${MISSING_WORDS_PATH}`, { stdio: 'inherit' });

        // Run generate-dictionary.js
        console.log('📚 Generating new dictionary entries...');
        execSync(`node scripts/generate-dictionary-ja.js`, { stdio: 'inherit' });

        // Merge with existing dictionary
        console.log('🧩 Merging new dictionary entries...');
        const masterDict = JSON.parse(fs.readFileSync(MASTER_DICT_PATH, 'utf-8'));
        const newDict = JSON.parse(fs.readFileSync(NEW_DICT_PATH, 'utf-8'));
        const mergedDict = { ...masterDict, ...newDict };
        
        fs.writeFileSync(MASTER_DICT_PATH, JSON.stringify(mergedDict, null, 2), 'utf-8');
        console.log(`✅ Dictionary updated with ${Object.keys(newDict).length} new entries.`);

        console.log('🔮 Writing image metadata file...');
        const imageMeta = {
            title: metadata.title,
            hook: metadata.hook,
            description: metadata.description,
            current_episode: episodeNum
        };
        fs.writeFileSync(IMAGE_META_PATH, JSON.stringify(imageMeta, null, 2), 'utf-8');
        console.log(`✅ Image metadata written to ${IMAGE_META_PATH}`);

        // Generate episode image
        console.log('🔮 Generating episode image...');
        execSync(`node scripts/generate-episode-image.js`, { stdio: 'inherit' });

        // Process and convert image to WebP
        console.log('🖼️ Processing episode image...');
        execSync(`node scripts/process-episode-image.js`, { stdio: 'inherit' });

        // Tokenize episode
        console.log('🔮 Tokenizing episode...');
        execSync(`node scripts/tokenize-episode.js ${episodeFilePath} ${TOKENIZED_EPISODE_PATH}`, { stdio: 'inherit' });

        // Update structure.json with new chapter
        console.log('📝 Updating structure.json...');
        const structurePath = path.resolve(__dirname, '../stories/still-dead-still-bored/structure.json');
        const structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
        const tokenizedEpisode = JSON.parse(fs.readFileSync(TOKENIZED_EPISODE_PATH, 'utf-8'));
        
        // Add new chapter to chapters array
        const newChapter = {
            id: `ch${episodeNum}`,
            content: tokenizedEpisode.content,
            headerImage: `https://cdn.native-talk.com/stories/still-dead-still-bored/${episodeNum}.webp`
        };
        
        structure.chapters.push(newChapter);
        fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2), 'utf-8');
        console.log(`✅ Added chapter ch${episodeNum} to structure.json`);

        // Translate episode to Japanese
        console.log('🌐 Translating episode to Japanese...');
        execSync(`node scripts/translate-episode.js`, { stdio: 'inherit' });

        // ✅ Cleanup temp files
        try {
            fs.unlinkSync(MISSING_WORDS_PATH);
            fs.unlinkSync(NEW_DICT_PATH);
            fs.unlinkSync(IMAGE_META_PATH);
            fs.unlinkSync(TOKENIZED_EPISODE_PATH);
            console.log('🧹 Cleaned up temporary files.');
        } catch (err) {
            console.warn('⚠️ Failed to delete temporary files:', err.message);
            fs.unlinkSync(MISSING_WORDS_PATH);
            fs.unlinkSync(NEW_DICT_PATH);
            fs.unlinkSync(IMAGE_META_PATH);
            fs.unlinkSync(TOKENIZED_EPISODE_PATH);
        }
    } else {
        console.log('⚠️ No episode content returned.');
    }
})();
