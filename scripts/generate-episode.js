require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get arguments: story name, source language, target language
const STORY_NAME = process.argv[2] || 'still-dead-still-bored';
const SOURCE_LANG = process.argv[3] || 'en';
const TARGET_LANG = process.argv[4] || 'ja';

const sourceLangToDictMap = {
    'en': 'english',
    'ja': 'japanese',
    'ko': 'korean',
    'zh': 'chinese',
    'es': 'spanish',
    'vi': 'vietnamese'
}

// Validate arguments
if (process.argv.length < 3) {
    console.error('Usage: node scripts/generate-episode.js <story-name> [source-language] [target-language]');
    console.error('Example: node scripts/generate-episode.js still-dead-still-bored en ja');
    console.error('Example: node scripts/generate-episode.js the-barista ja en');
    console.error('Supported languages: en, ja, ko, zh, es, vi');
    process.exit(1);
}

// Validate languages
const SUPPORTED_LANGUAGES = ['en', 'ja', 'ko', 'zh', 'es', 'vi'];
if (!SUPPORTED_LANGUAGES.includes(SOURCE_LANG)) {
    console.error(`❌ Unsupported source language: ${SOURCE_LANG}`);
    console.error('Supported languages:', SUPPORTED_LANGUAGES.join(', '));
    process.exit(1);
}
if (!SUPPORTED_LANGUAGES.includes(TARGET_LANG)) {
    console.error(`❌ Unsupported target language: ${TARGET_LANG}`);
    console.error('Supported languages:', SUPPORTED_LANGUAGES.join(', '));
    process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_FILE_PATH = path.resolve(__dirname, `../stories/${STORY_NAME}/episodes/episode_`);
const META_PATH = path.resolve(__dirname, `../stories/${STORY_NAME}/meta.json`);

// Dynamic dictionary paths based on languages
const LANGUAGE_DIRS = {
    'en': 'english',
    'ja': 'japanese', 
    'ko': 'korean',
    'zh': 'chinese',
    'es': 'spanish',
    'vi': 'vietnamese'
};

const MASTER_DICT_PATH = path.resolve(__dirname, `../dictionaries/${LANGUAGE_DIRS[SOURCE_LANG]}/${TARGET_LANG}-v1.json`);
const MISSING_WORDS_PATH = path.resolve(__dirname, './missing_words.txt');
const NEW_DICT_PATH = path.resolve(__dirname, `./dictionary_entries_output_${TARGET_LANG}.json`);
const IMAGE_META_PATH = path.resolve(__dirname, './episode_meta.json');

// Configuration for the current story
const PROMPTS_DIR = path.resolve(__dirname, `./episode_prompts/${STORY_NAME}`);

// Validate that the story exists
if (!fs.existsSync(path.resolve(__dirname, `../stories/${STORY_NAME}`))) {
    console.error(`❌ Story directory not found: ${STORY_NAME}`);
    console.error('Available stories:');
    const storiesDir = path.resolve(__dirname, '../stories');
    const stories = fs.readdirSync(storiesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    stories.forEach(story => console.error(`  - ${story}`));
    process.exit(1);
}

// Validate that prompts exist for this story
if (!fs.existsSync(PROMPTS_DIR)) {
    console.error(`❌ Prompts directory not found: ${PROMPTS_DIR}`);
    console.error('Please create prompt files for this story first.');
    process.exit(1);
}

// Validate that source dictionary exists
if (!fs.existsSync(MASTER_DICT_PATH)) {
    console.error(`❌ Source dictionary not found: ${MASTER_DICT_PATH}`);
    console.error('Please ensure the source dictionary exists for the specified language pair.');
    process.exit(1);
}

/**
 * Reads a prompt file and interpolates variables
 * @param {string} promptName - Name of the prompt file (without extension)
 * @param {Object} variables - Variables to interpolate into the prompt
 * @returns {string} The interpolated prompt
 */
function readPrompt(promptName, variables = {}) {
    const promptPath = path.join(PROMPTS_DIR, `${promptName}.txt`);
    
    if (!fs.existsSync(promptPath)) {
        throw new Error(`Prompt file not found: ${promptPath}`);
    }
    
    let prompt = fs.readFileSync(promptPath, 'utf-8');
    
    // Interpolate variables
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `\${${key}}`;
        prompt = prompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    
    return prompt;
}

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
    const metadataPrompt = readPrompt('metadataPrompt');

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
    console.log(`📚 Generating episode for story: ${STORY_NAME}`);
    console.log(`🌐 Language pair: ${SOURCE_LANG} → ${TARGET_LANG}`);
    
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

    const basePrompt = readPrompt('basePrompt');
    const finalPrompt = `${basePrompt}
Please write a new episode titled "${metadata.title}" where ${metadata.hook}
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

        // Check for missing words using the updated check-missing-words.js
        console.log(`🔍 Checking for missing ${SOURCE_LANG} words...`);
        execSync(`node scripts/check-missing-words.js ${MASTER_DICT_PATH} ${episodeFilePath} ${MISSING_WORDS_PATH} ${SOURCE_LANG}`, { stdio: 'inherit' });

        // Run generate-dictionary.js with the correct language pair
        console.log(`📚 Generating new dictionary entries (${SOURCE_LANG} → ${TARGET_LANG})...`);
        execSync(`node scripts/generate-dictionary.js ${SOURCE_LANG} ${TARGET_LANG}`, { stdio: 'inherit' });

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
        execSync(`node scripts/generate-episode-image.js ${STORY_NAME}`, { stdio: 'inherit' });

        // Process and convert image to WebP
        console.log('🖼️ Processing episode image...');
        execSync(`node scripts/process-episode-image.js ${STORY_NAME}`, { stdio: 'inherit' });

        // Update structure.json with new chapter
        console.log('📝 Updating structure.json...');
        const structurePath = path.resolve(__dirname, `../stories/${STORY_NAME}/structure.json`);
        const structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
        
        // Read tokenized text from temporary file
        const tokenizedTextPath = path.resolve(__dirname, './tokenized_text.txt');
        let tokenizedContent = '';
        if (fs.existsSync(tokenizedTextPath)) {
            tokenizedContent = fs.readFileSync(tokenizedTextPath, 'utf-8');
            console.log(`✅ Read tokenized content (${tokenizedContent.split('|').length} tokens)`);
        } else {
            console.warn('⚠️  Tokenized text file not found, content will be empty');
        }
        
        // Add new chapter to chapters array (with content)
        const newChapter = {
            id: `ch${episodeNum}`,
            headerImage: `https://cdn.native-talk.com/stories/${STORY_NAME}/${episodeNum}.webp`,
            content: tokenizedContent
        };
        
        structure.chapters.push(newChapter);
        fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2), 'utf-8');
        console.log(`✅ Added chapter ch${episodeNum} to structure.json`);

        // Translate episode to target language
        console.log(`🌐 Translating episode to ${TARGET_LANG}...`);
        execSync(`node scripts/translate-episode.js ${STORY_NAME} ${SOURCE_LANG} ${TARGET_LANG}`, { stdio: 'inherit' });

        // ✅ Cleanup temp files
        try {
            fs.unlinkSync(MISSING_WORDS_PATH);
            fs.unlinkSync(NEW_DICT_PATH);
            fs.unlinkSync(IMAGE_META_PATH);
            fs.unlinkSync(tokenizedTextPath);
            console.log('🧹 Cleaned up temporary files.');
        } catch (err) {
            console.warn('⚠️ Failed to delete temporary files:', err.message);
            try {
                fs.unlinkSync(MISSING_WORDS_PATH);
                fs.unlinkSync(NEW_DICT_PATH);
                fs.unlinkSync(IMAGE_META_PATH);
                fs.unlinkSync(tokenizedTextPath);
            } catch (cleanupErr) {
                console.warn('⚠️ Cleanup failed:', cleanupErr.message);
            }
        }
    } else {
        console.log('⚠️ No episode content returned.');
    }
})();
