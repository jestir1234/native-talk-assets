require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get arguments: story name, source language, target language, serialized flag, init flag, episodes flag
const STORY_NAME = process.argv[2] || 'still-dead-still-bored';
const SOURCE_LANG = process.argv[3] || 'en';
const TARGET_LANG = process.argv[4] || 'ja';
const IS_SERIALIZED = process.argv.includes('--serialized'); // add this flag for stories that maintain continuity across episodes
const IS_INIT = process.argv.includes('--init'); // add this flag to generate episode using init prompts
const IS_EPISODES = process.argv.includes('--episodes'); // add this flag to generate episodes from the /episodes/ directory

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
    console.error('Usage: node scripts/generate-episode.js <story-name> [source-language] [target-language] [--serialized] [--init] [--episodes]');
    console.error('Example: node scripts/generate-episode.js still-dead-still-bored en ja');
    console.error('Example: node scripts/generate-episode.js for-rent ja en --serialized');
    console.error('Example: node scripts/generate-episode.js for-rent en ja --init');
    console.error('Example: node scripts/generate-episode.js waves-and-hoops en ja --episodes');
    console.error('Supported languages: en, ja, ko, zh, es, vi');
    console.error('Use --serialized flag for stories that maintain continuity across episodes');
    console.error('Use --init flag to use initialization prompts for new stories');
    console.error('Use --episodes flag to use episode-specific prompts from /episodes/ directory');
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
const PROMPTS_DIR = path.resolve(__dirname, `./episode_prompts/${STORY_NAME}${IS_INIT ? '/init' : ''}${IS_EPISODES ? '/episodes' : ''}`);

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
    if (IS_INIT) {
        console.error('Please create init prompt files for this story first.');
        console.error('Expected location: scripts/episode_prompts/{story-name}/init/');
    } else {
        console.error('Please create prompt files for this story first.');
    }
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
    // For episodes mode, use {episodeNum}prompt.txt format, otherwise use .txt
    let promptPath;
    if (IS_EPISODES) {
        promptPath = path.join(PROMPTS_DIR, `${promptName}prompt.txt`);
    } else {
        promptPath = path.join(PROMPTS_DIR, `${promptName}.txt`);
    }
    
    if (!fs.existsSync(promptPath)) {
        throw new Error(`Prompt file not found: ${promptPath}`);
    }
    
    let prompt = fs.readFileSync(promptPath, 'utf-8');
    
    // For serialized stories or episodes mode, add continuity data from meta.json
    if (IS_SERIALIZED || IS_EPISODES) {
        const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
        
        // Build past summary from plot summaries
        let pastSummary = '';
        if (meta.plot_summary && meta.plot_summary.length > 0) {
            pastSummary += 'Previous episodes:\n';
            meta.plot_summary.forEach((summary, index) => {
                pastSummary += `Episode ${index + 1}: ${summary}\n`;
            });
            pastSummary += '\n';
        }
        
        // Add supporting characters
        if (meta.support_characters && Object.keys(meta.support_characters).length > 0) {
            pastSummary += 'Supporting characters:\n';
            Object.entries(meta.support_characters).forEach(([name, description]) => {
                pastSummary += `- ${name}: ${description}\n`;
            });
            pastSummary += '\n';
        }
        
        // Add open threads
        if (meta.open_threads && meta.open_threads.length > 0) {
            pastSummary += 'Ongoing plot threads:\n';
            meta.open_threads.forEach(thread => {
                pastSummary += `- ${thread}\n`;
            });
            pastSummary += '\n';
        }
        
        // Add protagonist state if available
        if (meta.protagonist && meta.protagonist.current_state) {
            pastSummary += `Kaito's current state: ${meta.protagonist.current_state}\n\n`;
        }
        
        // Replace the placeholder with the actual summary
        prompt = prompt.replace(/\${PAST_SUMMARY}/g, pastSummary);
    }
    
    // Interpolate other variables
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
    if (IS_INIT) {
        console.log(`🚀 Using initialization prompts from: ${PROMPTS_DIR}`);
    }
    if (IS_SERIALIZED) {
        console.log(`📚 Serialized story mode enabled`);
    }
    if (IS_EPISODES) {
        console.log(`📺 Using episode-specific prompts from: ${PROMPTS_DIR}`);
    }
    
    const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));

    let metadata, finalPrompt;

    if (IS_EPISODES) {
        // For episodes mode, we need to determine which episode to generate
        const episodeNum = meta.current_episode + 1;
        const episodePromptPath = path.join(PROMPTS_DIR, `${episodeNum}prompt.txt`);
        const episodesMetadataPath = path.join(PROMPTS_DIR, 'episodes_metadata.json');
        
        if (!fs.existsSync(episodePromptPath)) {
            console.error(`❌ Episode prompt not found: ${episodePromptPath}`);
            console.error(`Available episodes: ${fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('prompt.txt')).join(', ')}`);
            process.exit(1);
        }
        
        if (!fs.existsSync(episodesMetadataPath)) {
            console.error(`❌ Episodes metadata not found: ${episodesMetadataPath}`);
            process.exit(1);
        }
        
        console.log(`📺 Generating episode ${episodeNum} using specific prompt...`);
        finalPrompt = readPrompt(`${episodeNum}`, {});
        
        // Read metadata from episodes_metadata.json
        const episodesMetadata = JSON.parse(fs.readFileSync(episodesMetadataPath, 'utf-8'));
        metadata = episodesMetadata[episodeNum.toString()];
        
        if (!metadata) {
            console.error(`❌ Metadata not found for episode ${episodeNum}`);
            process.exit(1);
        }
    } else {
        console.log('🔮 Generating title and hook...');
        metadata = await generateEpisodeMetadata();

        if (!metadata) {
            console.log('⚠️ Episode metadata generation failed. Exiting.');
            return;
        }

        console.log('🔮 Title:', metadata.title);
        console.log('🔮 Hook:', metadata.hook);
        console.log('🔮 Description:', metadata.description);

        const basePrompt = readPrompt('basePrompt');
        finalPrompt = `${basePrompt}
Please write a new episode titled "${metadata.title}" where ${metadata.hook}
Do not include the episode title in the story.`;
    }

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
        if (IS_EPISODES) {
            execSync(`node scripts/generate-episode-image.js ${STORY_NAME} ${episodeNum}`, { stdio: 'inherit' });
        } else {
            execSync(`node scripts/generate-episode-image.js ${STORY_NAME}`, { stdio: 'inherit' });
        }

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

        // Process serialized story if flag is set
        if (IS_SERIALIZED || IS_EPISODES) {
            console.log('📚 Processing serialized story continuity...');
            execSync(`node scripts/summarize-episode.js ${STORY_NAME} ${episodeNum}`, { stdio: 'inherit' });
        }

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
