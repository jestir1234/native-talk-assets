require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get arguments: story name, source language, target language
const STORY_NAME = process.argv[2] || 'still-dead-still-bored';
const SOURCE_LANG = process.argv[3] || 'en';
const TARGET_LANG = process.argv[4] || 'ja';

// Validate arguments
if (process.argv.length < 3) {
    console.error('Usage: node scripts/translate-episode.js <story-name> [source-language] [target-language]');
    console.error('Example: node scripts/translate-episode.js still-dead-still-bored en ja');
    console.error('Example: node scripts/translate-episode.js the-barista ja en');
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

// Command: node scripts/translate-episode.js [story-name] [source-language] [target-language]

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Language configurations
const LANGUAGE_CONFIGS = {
    'en': { name: 'English', code: 'en' },
    'ja': { name: 'Japanese', code: 'ja' },
    'ko': { name: 'Korean', code: 'ko' },
    'zh': { name: 'Chinese', code: 'zh' },
    'es': { name: 'Spanish', code: 'es' },
    'vi': { name: 'Vietnamese', code: 'vi' }
};

const sourceConfig = LANGUAGE_CONFIGS[SOURCE_LANG];
const targetConfig = LANGUAGE_CONFIGS[TARGET_LANG];

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

function parseSentences(text) {
    // Split text into sentences using regex
    // This handles periods, exclamation marks, question marks, and ellipses
    const sentences = text
        .replace(/\r?\n/g, ' ')  // Replace newlines with spaces
        .replace(/([.!?…]+)\s+/g, '$1|')  // Add separator after sentence endings
        .split('|')
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0)
        .filter(sentence => !/^\s*$/.test(sentence));  // Remove empty sentences
    
    return sentences;
}

async function translateSentences(sentences, episodeNum, title, description) {
    const sentencesList = sentences.map(sentence => `"${sentence}"`).join(',\n');
    
    const prompt = `You are a professional translator. Translate the following ${sourceConfig.name} sentences into natural ${targetConfig.name}.

Please translate each sentence into natural, fluent ${targetConfig.name}. Return the result as a JSON object where the keys are the original ${sourceConfig.name} sentences and the values are the ${targetConfig.name} translations.

Sentences to translate:
${sentencesList}

Return only the JSON object, no additional text or explanations. Format like this:
{
  "${sourceConfig.name} sentence 1": "${targetConfig.name} translation 1",
  "${sourceConfig.name} sentence 2": "${targetConfig.name} translation 2"
}`;

    const raw = await callGemini(prompt);
    
    if (!raw) return null;

    // Clean up the response
    const cleaned = raw
        .replace(/```json\s*/i, '')
        .replace(/```/g, '')
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('❌ Failed to parse translation response:', e.message);
        console.error('Raw:', raw);
        return null;
    }
}

async function updateLanguageFile(episodeNum, title, description, translations) {
    const langPath = path.resolve(__dirname, `../stories/${STORY_NAME}/lang/${TARGET_LANG}.json`);
    
    // Check if language file exists, create if it doesn't
    let langData;
    if (fs.existsSync(langPath)) {
        langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
    } else {
        // Create new language file structure
        langData = {
            title: "Story Title", // This will be updated when we have the story title
            description: "Story description",
            chapters: []
        };
    }
    
    // Create new chapter object
    const newChapter = {
        id: `ch${episodeNum}`,
        title: title,
        description: description,
        sentences: translations
    };
    
    // Add to chapters array
    langData.chapters.push(newChapter);
    
    // Write back to file
    fs.writeFileSync(langPath, JSON.stringify(langData, null, 2), 'utf-8');
    console.log(`✅ Added chapter ch${episodeNum} to ${targetConfig.name} language file`);
}

async function main() {
    console.log(`🌐 Translating episode for story: ${STORY_NAME}`);
    console.log(`🌐 Language pair: ${sourceConfig.name} → ${targetConfig.name}`);
    
    // Get episode number from meta file
    const metaPath = path.resolve(__dirname, `../stories/${STORY_NAME}/meta.json`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const episodeNum = meta.current_episode;
    
    // Get episode file path
    const episodeFilePath = path.resolve(__dirname, `../stories/${STORY_NAME}/episodes/episode_${episodeNum}.txt`);
    
    // Get image metadata for title and description
    const imageMetaPath = path.resolve(__dirname, './episode_meta.json');
    const imageMeta = JSON.parse(fs.readFileSync(imageMetaPath, 'utf-8'));
    const { title, description } = imageMeta;
    
    console.log(`🔮 Translating episode ${episodeNum}: ${title}`);
    
    // Read episode content
    const episodeContent = fs.readFileSync(episodeFilePath, 'utf-8');
    
    // Parse into sentences
    console.log('📝 Parsing episode into sentences...');
    const sentences = parseSentences(episodeContent);
    console.log(`✅ Found ${sentences.length} sentences`);
    
    // Translate sentences
    console.log(`🌐 Translating sentences from ${sourceConfig.name} to ${targetConfig.name}...`);
    const translations = await translateSentences(sentences, episodeNum, title, description);
    
    if (!translations) {
        console.log('⚠️ Translation failed. Exiting.');
        return;
    }
    
    console.log(`✅ Translated ${Object.keys(translations).length} sentences`);
    
    // Update target language file
    console.log(`📝 Updating ${targetConfig.name} language file...`);
    await updateLanguageFile(episodeNum, title, description, translations);
    
    console.log('✅ Episode translation complete!');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { parseSentences, translateSentences, updateLanguageFile }; 