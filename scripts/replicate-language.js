require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 3) {
    console.error('Usage: node replicate-language.js <source_language> <target_language> <file_type>');
    console.error('Examples:');
    console.error('  node replicate-language.js en ko dictionary');
    console.error('  node replicate-language.js ja en story');
    console.error('  node replicate-language.js en zh all');
    console.error('');
    console.error('file_type options:');
    console.error('  dictionary - replicate dictionary files');
    console.error('  story - replicate story language files');
    console.error('  all - replicate both dictionaries and stories');
    process.exit(1);
}

const sourceLang = args[0];
const targetLang = args[1];
const fileType = args[2];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Language configurations
const languageConfigs = {
    'en': { name: 'English', code: 'en' },
    'ja': { name: 'Japanese', code: 'ja' },
    'ko': { name: 'Korean', code: 'ko' },
    'zh': { name: 'Chinese', code: 'zh' },
    'es': { name: 'Spanish', code: 'es' }
};

const sourceConfig = languageConfigs[sourceLang];
const targetConfig = languageConfigs[targetLang];

if (!sourceConfig || !targetConfig) {
    console.error(`❌ Unsupported language pair: ${sourceLang} to ${targetLang}`);
    console.error('Supported languages:', Object.keys(languageConfigs).join(', '));
    process.exit(1);
}

console.log(`🔄 Replicating from ${sourceConfig.name} to ${targetConfig.name} (${fileType})`);

async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const response = await axios.post(url, {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || null;
    } catch (error) {
        console.error('❌ API Error:', error.message);
        return null;
    }
}

async function translateDictionary(sourceData, sourceLang, targetLang) {
    const words = Object.keys(sourceData);
    const batchSize = 20;
    const translatedData = {};

    for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        console.log(`📚 Processing dictionary batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(words.length / batchSize)}`);

        const prompt = `
You are a multilingual dictionary assistant. Translate the following ${languageConfigs[sourceLang].name} words to ${languageConfigs[targetLang].name}.

For each word, provide:
- reading: pronunciation in ${targetLang === 'ja' ? 'hiragana/katakana' : targetLang === 'ko' ? 'hangul' : targetLang === 'zh' ? 'pinyin' : 'pronunciation'}
- meaning: ${languageConfigs[targetLang].name} translation
- type: part of speech in ${targetLang === 'ja' ? 'Japanese (名詞, 動詞, etc.)' : targetLang === 'ko' ? 'Korean' : targetLang === 'zh' ? 'Chinese' : 'English'}

Return as JSON object with the same structure as the original:

${JSON.stringify(batch.reduce((acc, word) => {
    acc[word] = sourceData[word];
    return acc;
}, {}), null, 2)}

Translate this to ${languageConfigs[targetLang].name} while maintaining the exact same JSON structure.`;

        const response = await callGemini(prompt);
        if (!response) {
            console.error('⚠️ Skipping batch due to API error');
            continue;
        }

        try {
            const cleaned = response
                .replace(/```json\s*/i, '')
                .replace(/```/g, '')
                .trim();
            
            const parsed = JSON.parse(cleaned);
            Object.assign(translatedData, parsed);
        } catch (err) {
            console.error('❌ JSON parse error:', err.message);
            console.error('📝 Raw Response:', response);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return translatedData;
}

async function translateStory(sourceData, sourceLang, targetLang) {
    const translatedData = { ...sourceData };
    
    // Translate title and description
    if (sourceData.title) {
        const titlePrompt = `Translate this ${languageConfigs[sourceLang].name} title to ${languageConfigs[targetLang].name}: "${sourceData.title}"`;
        const titleResponse = await callGemini(titlePrompt);
        if (titleResponse) {
            translatedData.title = titleResponse.trim().replace(/"/g, '');
        }
    }

    if (sourceData.description) {
        const descPrompt = `Translate this ${languageConfigs[sourceLang].name} description to ${languageConfigs[targetLang].name}: "${sourceData.description}"`;
        const descResponse = await callGemini(descPrompt);
        if (descResponse) {
            translatedData.description = descResponse.trim().replace(/"/g, '');
        }
    }

    // Translate chapters
    if (sourceData.chapters) {
        for (let i = 0; i < sourceData.chapters.length; i++) {
            const chapter = sourceData.chapters[i];
            console.log(`📖 Translating chapter ${i + 1}/${sourceData.chapters.length}: ${chapter.id}`);
            
            translatedData.chapters[i] = { ...chapter };
            
            // Translate chapter title and description
            if (chapter.title) {
                const chapterTitlePrompt = `Translate this ${languageConfigs[sourceLang].name} chapter title to ${languageConfigs[targetLang].name}: "${chapter.title}"`;
                const chapterTitleResponse = await callGemini(chapterTitlePrompt);
                if (chapterTitleResponse) {
                    translatedData.chapters[i].title = chapterTitleResponse.trim().replace(/"/g, '');
                }
            }

            if (chapter.description) {
                const chapterDescPrompt = `Translate this ${languageConfigs[sourceLang].name} chapter description to ${languageConfigs[targetLang].name}: "${chapter.description}"`;
                const chapterDescResponse = await callGemini(chapterDescPrompt);
                if (chapterDescResponse) {
                    translatedData.chapters[i].description = chapterDescResponse.trim().replace(/"/g, '');
                }
            }

            // Translate sentences
            if (chapter.sentences) {
                translatedData.chapters[i].sentences = {};
                const sentences = Object.entries(chapter.sentences);
                
                for (let j = 0; j < sentences.length; j++) {
                    const [original, translation] = sentences[j];
                    console.log(`  📝 Translating sentence ${j + 1}/${sentences.length}`);
                    
                    const sentencePrompt = `Translate this ${languageConfigs[sourceLang].name} sentence to ${languageConfigs[targetLang].name}: "${original}"`;
                    const sentenceResponse = await callGemini(sentencePrompt);
                    if (sentenceResponse) {
                        translatedData.chapters[i].sentences[original] = sentenceResponse.trim().replace(/"/g, '');
                    } else {
                        translatedData.chapters[i].sentences[original] = translation; // Keep original if translation fails
                    }
                    
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    }

    return translatedData;
}

async function replicateDictionaries() {
    console.log('📚 Starting dictionary replication...');
    
    const dictionariesDir = path.resolve(__dirname, '../dictionaries');
    const sourceDir = path.join(dictionariesDir, sourceLang);
    const targetDir = path.join(dictionariesDir, targetLang);
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Find all dictionary files in source directory
    const sourceFiles = fs.readdirSync(sourceDir).filter(file => file.endsWith('.json'));
    
    for (const file of sourceFiles) {
        console.log(`\n📖 Processing dictionary file: ${file}`);
        
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file.replace(`${sourceLang}-`, `${targetLang}-`));
        
        // Read source dictionary
        const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
        
        // Translate dictionary
        const translatedData = await translateDictionary(sourceData, sourceLang, targetLang);
        
        // Write translated dictionary
        fs.writeFileSync(targetPath, JSON.stringify(translatedData, null, 2), 'utf-8');
        console.log(`✅ Dictionary saved to: ${targetPath}`);
    }
}

async function replicateStories() {
    console.log('📖 Starting story replication...');
    
    const storiesDir = path.resolve(__dirname, '../stories');
    const stories = fs.readdirSync(storiesDir).filter(item => 
        fs.statSync(path.join(storiesDir, item)).isDirectory() && 
        !item.startsWith('.')
    );
    
    for (const storyId of stories) {
        const langDir = path.join(storiesDir, storyId, 'lang');
        
        if (!fs.existsSync(langDir)) {
            console.log(`⚠️ No lang directory found for story: ${storyId}`);
            continue;
        }
        
        const sourceFile = path.join(langDir, `${sourceLang}.json`);
        const targetFile = path.join(langDir, `${targetLang}.json`);
        
        if (!fs.existsSync(sourceFile)) {
            console.log(`⚠️ No source language file found: ${sourceFile}`);
            continue;
        }
        
        console.log(`\n📖 Processing story: ${storyId}`);
        
        // Read source story language file
        const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
        
        // Translate story
        const translatedData = await translateStory(sourceData, sourceLang, targetLang);
        
        // Write translated story
        fs.writeFileSync(targetFile, JSON.stringify(translatedData, null, 2), 'utf-8');
        console.log(`✅ Story language file saved to: ${targetFile}`);
    }
}

async function main() {
    try {
        if (fileType === 'dictionary' || fileType === 'all') {
            await replicateDictionaries();
        }
        
        if (fileType === 'story' || fileType === 'all') {
            await replicateStories();
        }
        
        console.log('\n✅ Language replication completed successfully!');
    } catch (error) {
        console.error('❌ Error during replication:', error.message);
        process.exit(1);
    }
}

main(); 