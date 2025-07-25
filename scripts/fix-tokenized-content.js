require('dotenv').config();
const path = require('path');
const fs = require('fs');
const kuromoji = require('kuromoji');
const nodejieba = require('nodejieba');

// Language detection and tokenization with punctuation preserved
async function tokenizeTextWithPunctuation(text, lang) {
    switch (lang.toLowerCase()) {
        case "en":
            return tokenizeEnglishWithPunctuation(text);
        case "ja":
            return await tokenizeJapaneseWithPunctuation(text);
        case "ko":
            return tokenizeKoreanWithPunctuation(text);
        case "zh":
            return await tokenizeChineseWithPunctuation(text);
        case "es":
            return tokenizeSpanishWithPunctuation(text);
        case "vi":
            return tokenizeVietnameseWithPunctuation(text);
        default:
            console.warn(`⚠️  Unknown language '${lang}', using English tokenization`);
            return tokenizeEnglishWithPunctuation(text);
    }
}

// English tokenization with punctuation preserved
function tokenizeEnglishWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .toLowerCase()
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Japanese tokenization with punctuation preserved
function tokenizeJapaneseWithPunctuation(text) {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tokenizer) => {
            if (err) {
                console.warn("⚠️  Kuromoji failed, falling back to simple tokenization");
                // Fallback to simple tokenization that preserves punctuation
                const words = text
                    .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
                    .split(/([。！？、，；：""''（）【】\s]+)/)
                    .filter(word => word.length > 0)
                    .map(word => word.trim())
                    .filter(word => word.length > 0);
                resolve(words);
                return;
            }
            
            const tokens = tokenizer.tokenize(text.replace(/\r?\n/g, ' ')); // Replace line breaks before tokenizing
            const words = tokens
                .map(token => token.surface_form) // Get the surface form (original text)
                .filter(word => word.length > 0);
            
            resolve(words);
        });
    });
}

// Korean tokenization with punctuation preserved
function tokenizeKoreanWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .split(/([。！？、，；：""''（）【】\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Chinese tokenization with punctuation preserved
function tokenizeChineseWithPunctuation(text) {
    return new Promise((resolve, reject) => {
        try {
            // Use nodejieba for Chinese word segmentation
            const tokens = nodejieba.cut(text.replace(/\r?\n/g, ' '));
            
            // Filter out empty tokens and preserve punctuation
            const result = tokens
                .filter(token => token.length > 0)
                .map(token => token.trim())
                .filter(token => token.length > 0);
            
            resolve(result);
        } catch (err) {
            console.warn("⚠️  Nodejieba failed, falling back to simple tokenization");
            // Fallback to simple tokenization that preserves punctuation
            const words = text
                .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
                .split(/([。！？、，；：""''（）【】\s]+)/)
                .filter(word => word.length > 0)
                .map(word => word.trim())
                .filter(word => word.length > 0);
            resolve(words);
        }
    });
}

// Spanish tokenization with punctuation preserved
function tokenizeSpanishWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .toLowerCase()
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Vietnamese tokenization with punctuation preserved
function tokenizeVietnameseWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .toLowerCase()
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

async function fixStoryContent(storyName, language) {
    console.log(`🔧 Fixing tokenized content for story: ${storyName}`);
    
    const storyPath = path.resolve(__dirname, `../stories/${storyName}`);
    const structurePath = path.join(storyPath, 'structure.json');
    const episodesPath = path.join(storyPath, 'episodes');
    
    if (!fs.existsSync(structurePath)) {
        console.error(`❌ Structure file not found: ${structurePath}`);
        return;
    }
    
    if (!fs.existsSync(episodesPath)) {
        console.error(`❌ Episodes directory not found: ${episodesPath}`);
        return;
    }
    
    // Read structure.json
    const structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
    
    // Get all episode files
    const episodeFiles = fs.readdirSync(episodesPath)
        .filter(file => file.startsWith('episode_') && file.endsWith('.txt'))
        .sort();
    
    console.log(`📁 Found ${episodeFiles.length} episodes`);
    
    // Process each episode
    for (const episodeFile of episodeFiles) {
        const episodeNum = episodeFile.match(/episode_(\d+)\.txt/)[1];
        const episodePath = path.join(episodesPath, episodeFile);
        
        console.log(`📝 Processing episode ${episodeNum}...`);
        
        // Read episode content
        const episodeContent = fs.readFileSync(episodePath, 'utf-8');
        
        // Tokenize with punctuation preserved
        const tokenizedWords = await tokenizeTextWithPunctuation(episodeContent, language);
        
        // Find the corresponding chapter in structure.json
        const chapter = structure.chapters.find(ch => ch.id === `ch${episodeNum}`);
        if (chapter) {
            // Update the content with tokenized text including punctuation
            chapter.content = tokenizedWords.join('|');
            console.log(`✅ Updated chapter ch${episodeNum} with ${tokenizedWords.length} tokens`);
        } else {
            console.warn(`⚠️  Chapter ch${episodeNum} not found in structure.json`);
        }
    }
    
    // Write updated structure.json
    fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2), 'utf-8');
    console.log(`✅ Updated structure.json for ${storyName}`);
}

async function main() {
    const storyName = process.argv[2];
    const language = process.argv[3] || 'ja';
    
    if (!storyName) {
        console.error('Usage: node scripts/fix-tokenized-content.js <story-name> [language]');
        console.error('Example: node scripts/fix-tokenized-content.js for-rent ja');
        process.exit(1);
    }
    
    try {
        await fixStoryContent(storyName, language);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 