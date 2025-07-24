require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get story name from command line argument or use default
const STORY_NAME = process.argv[2] || 'still-dead-still-bored';

// Command: node scripts/translate-episode.js [story-name]

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    
    const prompt = `You are a professional translator. Translate the following English sentences into natural Japanese.

Please translate each sentence into natural, fluent Japanese. Return the result as a JSON object where the keys are the original English sentences and the values are the Japanese translations.

Sentences to translate:
${sentencesList}

Return only the JSON object, no additional text or explanations. Format like this:
{
  "English sentence 1": "Japanese translation 1",
  "English sentence 2": "Japanese translation 2"
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

async function updateJapaneseLanguageFile(episodeNum, title, description, translations) {
    const jaLangPath = path.resolve(__dirname, `../stories/${STORY_NAME}/lang/ja.json`);
    
    // Read current Japanese language file
    const jaLang = JSON.parse(fs.readFileSync(jaLangPath, 'utf-8'));
    
    // Create new chapter object
    const newChapter = {
        id: `ch${episodeNum}`,
        title: title,
        description: description,
        sentences: translations
    };
    
    // Add to chapters array
    jaLang.chapters.push(newChapter);
    
    // Write back to file
    fs.writeFileSync(jaLangPath, JSON.stringify(jaLang, null, 2), 'utf-8');
    console.log(`✅ Added chapter ch${episodeNum} to Japanese language file`);
}

async function main() {
    console.log(`🌐 Translating episode for story: ${STORY_NAME}`);
    
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
    console.log('🌐 Translating sentences...');
    const translations = await translateSentences(sentences, episodeNum, title, description);
    
    if (!translations) {
        console.log('⚠️ Translation failed. Exiting.');
        return;
    }
    
    console.log(`✅ Translated ${Object.keys(translations).length} sentences`);
    
    // Update Japanese language file
    console.log('📝 Updating Japanese language file...');
    await updateJapaneseLanguageFile(episodeNum, title, description, translations);
    
    console.log('✅ Episode translation complete!');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { parseSentences, translateSentences, updateJapaneseLanguageFile }; 