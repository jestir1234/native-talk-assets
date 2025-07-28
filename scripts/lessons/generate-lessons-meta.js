require('dotenv').config();
const fs = require('fs');
const path = require('path');

const LESSONS_ROOT = path.resolve(__dirname, '../../lessons');
const META_OUTPUT_PATH = path.resolve(__dirname, '../../lessons/meta.json');

/**
 * Get chapter information from the outline file
 * @param {string} language - Language code
 * @returns {Array} Array of chapter objects
 */
function getChaptersFromOutline(language) {
    const outlinePath = path.resolve(__dirname, `./${language}/chapters_outline_basic.txt`);
    
    if (!fs.existsSync(outlinePath)) {
        return [];
    }
    
    const content = fs.readFileSync(outlinePath, 'utf-8');
    const chapters = [];
    
    // Split by chapter markers (## CHAPTER X:)
    const chapterBlocks = content.split(/## CHAPTER \d+:/);
    
    // Skip the first empty block if it exists
    const validBlocks = chapterBlocks.filter(block => block.trim());
    
    validBlocks.forEach((block, index) => {
        const lines = block.trim().split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        // Extract key points from content
        const keyPoints = content
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().replace(/^-\s*/, ''))
            .slice(0, 5); // Limit to first 5 key points
        
        chapters.push({
            number: index + 1,
            title: title,
            keyPoints: keyPoints
        });
    });
    
    return chapters;
}

/**
 * Check if a chapter has been generated in a specific target language
 * @param {string} languageLearn - Language being learned
 * @param {number} chapterNumber - Chapter number
 * @param {string} targetLanguage - Target language
 * @returns {boolean} Whether the chapter exists in the target language
 */
function isChapterGeneratedInLanguage(languageLearn, chapterNumber, targetLanguage) {
    const chapterPath = path.join(LESSONS_ROOT, languageLearn, `chapter_${chapterNumber}`, targetLanguage);
    const htmlPath = path.join(chapterPath, 'index.html');
    
    return fs.existsSync(htmlPath);
}

/**
 * Get all available target languages for a chapter
 * @param {string} languageLearn - Language being learned
 * @param {number} chapterNumber - Chapter number
 * @returns {Array} Array of available target languages
 */
function getAvailableTargetLanguages(languageLearn, chapterNumber) {
    const chapterPath = path.join(LESSONS_ROOT, languageLearn, `chapter_${chapterNumber}`);
    
    if (!fs.existsSync(chapterPath)) {
        return [];
    }
    
    const targetLanguages = fs.readdirSync(chapterPath)
        .filter(dir => {
            const dirPath = path.join(chapterPath, dir);
            return fs.statSync(dirPath).isDirectory() && 
                   fs.existsSync(path.join(dirPath, 'index.html'));
        });
    
    return targetLanguages;
}

/**
 * Get language information
 * @param {string} languageLearn - Language being learned
 * @returns {Object} Language information
 */
function getLanguageInfo(languageLearn) {
    const languageNames = {
        'ja': 'Japanese',
        'en': 'English',
        'ko': 'Korean',
        'zh': 'Chinese',
        'es': 'Spanish',
        'vi': 'Vietnamese'
    };
    
    const languageFlags = {
        'ja': '🇯🇵',
        'en': '🇺🇸',
        'ko': '🇰🇷',
        'zh': '🇨🇳',
        'es': '🇪🇸',
        'vi': '🇻🇳'
    };
    
    const chapters = getChaptersFromOutline(languageLearn);
    
    // Get available target languages for each chapter
    const chaptersWithLanguages = chapters.map(chapter => {
        const availableLanguages = getAvailableTargetLanguages(languageLearn, chapter.number);
        
        return {
            ...chapter,
            availableLanguages: availableLanguages,
            totalLanguages: availableLanguages.length
        };
    });
    
    // Calculate total available chapters (chapters that have at least one language)
    const availableChapters = chaptersWithLanguages.filter(chapter => 
        chapter.availableLanguages.length > 0
    ).length;
    
    return {
        code: languageLearn,
        name: languageNames[languageLearn] || languageLearn.toUpperCase(),
        flag: languageFlags[languageLearn] || '🌍',
        totalChapters: chapters.length,
        availableChapters: availableChapters,
        chapters: chaptersWithLanguages
    };
}

/**
 * Generate the meta.json file
 */
function generateMetaJson() {
    console.log('📋 Generating lessons meta.json...');
    
    if (!fs.existsSync(LESSONS_ROOT)) {
        console.error('❌ Lessons directory not found');
        return;
    }
    
    // Get all language directories (languages being learned)
    const languagesLearn = fs.readdirSync(LESSONS_ROOT)
        .filter(dir => {
            const dirPath = path.join(LESSONS_ROOT, dir);
            return fs.statSync(dirPath).isDirectory();
        })
        .sort();
    
    console.log(`🌍 Found ${languagesLearn.length} languages being learned: ${languagesLearn.join(', ')}`);
    
    // Generate language information
    const languageData = {};
    let totalChapters = 0;
    let totalAvailableChapters = 0;
    
    languagesLearn.forEach(languageLearn => {
        const langInfo = getLanguageInfo(languageLearn);
        languageData[languageLearn] = langInfo;
        totalChapters += langInfo.totalChapters;
        totalAvailableChapters += langInfo.availableChapters;
        
        console.log(`   ${langInfo.flag} ${langInfo.name}: ${langInfo.availableChapters}/${langInfo.totalChapters} chapters available`);
    });
    
    // Create meta object
    const meta = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        totalLanguages: languagesLearn.length,
        totalChapters: totalChapters,
        totalAvailableChapters: totalAvailableChapters,
        languages: languageData
    };
    
    // Write to file
    fs.writeFileSync(META_OUTPUT_PATH, JSON.stringify(meta, null, 2));
    
    console.log(`\n✅ Meta file generated: ${META_OUTPUT_PATH}`);
    console.log(`📊 Summary:`);
    console.log(`   Languages: ${languagesLearn.length}`);
    console.log(`   Total Chapters: ${totalChapters}`);
    console.log(`   Available Chapters: ${totalAvailableChapters}`);
    
    // Show detailed breakdown
    console.log(`\n📋 Detailed Breakdown:`);
    languagesLearn.forEach(languageLearn => {
        const langInfo = languageData[languageLearn];
        console.log(`\n${langInfo.flag} ${langInfo.name} (${langInfo.code}):`);
        console.log(`   Total Chapters: ${langInfo.totalChapters}`);
        console.log(`   Available: ${langInfo.availableChapters}`);
        
        if (langInfo.chapters.length > 0) {
            console.log(`   Chapters:`);
            langInfo.chapters.forEach(chapter => {
                const status = chapter.availableLanguages.length > 0 ? '✅' : '⏳';
                const languages = chapter.availableLanguages.length > 0 
                    ? ` [${chapter.availableLanguages.join(', ')}]` 
                    : '';
                console.log(`     ${status} Chapter ${chapter.number}: ${chapter.title}${languages}`);
            });
        }
    });
}

// Export the function for use in other scripts
module.exports = { generateMetaJson };

generateMetaJson(); 