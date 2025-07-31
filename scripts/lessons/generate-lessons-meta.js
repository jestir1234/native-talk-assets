require('dotenv').config();
const fs = require('fs');
const path = require('path');

const LESSONS_ROOT = path.resolve(__dirname, '../../lessons');
const META_OUTPUT_PATH = path.resolve(__dirname, '../../lessons/meta.json');

/**
 * Get chapter information from the outline file for a specific target language
 * @param {string} languageLearn - Language being learned
 * @param {string} targetLanguage - Target language for translations
 * @returns {Array} Array of chapter objects with multilingual structure
 */
function getChaptersFromOutlineForTarget(languageLearn, targetLanguage) {
    // Try to read from the language-specific outline file first
    let outlinePath = path.resolve(__dirname, `./${languageLearn}/${targetLanguage}/chapters_outline_basic.txt`);
    
    // If that doesn't exist, fall back to the base language outline
    if (!fs.existsSync(outlinePath)) {
        outlinePath = path.resolve(__dirname, `./${languageLearn}/chapters_outline_basic.txt`);
    }
    
    if (!fs.existsSync(outlinePath)) {
        return [];
    }
    
    const content = fs.readFileSync(outlinePath, 'utf-8');
    const chapters = [];
    
    // Split by chapter markers (## CHAPTER X: or ## 第X章：)
    const chapterBlocks = content.split(/## (?:CHAPTER \d+:|第\d+章：)/);
    
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
 * Get all chapter information with multilingual structure
 * @param {string} languageLearn - Language being learned
 * @returns {Array} Array of chapter objects with multilingual titles and keyPoints
 */
function getChaptersFromOutline(languageLearn) {
    // Get all available target languages for this language being learned
    const allTargetLanguages = getAllAvailableTargetLanguages(languageLearn);
    
    // If no target languages found, try to get at least the base language
    const targetLanguages = allTargetLanguages.length > 0 ? allTargetLanguages : [languageLearn];
    
    // Get chapters for each target language
    const chaptersByTarget = {};
    targetLanguages.forEach(targetLang => {
        chaptersByTarget[targetLang] = getChaptersFromOutlineForTarget(languageLearn, targetLang);
    });
    
    // Create multilingual structure
    const chapters = [];
    const maxChapters = Math.max(...Object.values(chaptersByTarget).map(chapters => chapters.length));
    
    for (let i = 0; i < maxChapters; i++) {
        const chapterNumber = i + 1;
        const title = {};
        const keyPoints = {};
        
        // Add translations for each target language
        targetLanguages.forEach(targetLang => {
            const targetChapters = chaptersByTarget[targetLang];
            if (targetChapters[i]) {
                title[targetLang] = targetChapters[i].title;
                keyPoints[targetLang] = targetChapters[i].keyPoints;
            }
        });
        
        chapters.push({
            number: chapterNumber,
            title: title,
            keyPoints: keyPoints
        });
    }
    
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
 * Get all available target languages for a language being learned
 * @param {string} languageLearn - Language being learned
 * @returns {Array} Array of available target languages
 */
function getAllAvailableTargetLanguages(languageLearn) {
    const langPath = path.join(LESSONS_ROOT, languageLearn);
    
    if (!fs.existsSync(langPath)) {
        return [];
    }
    
    const chapters = fs.readdirSync(langPath)
        .filter(dir => dir.startsWith('chapter_'));
    
    const allTargetLanguages = new Set();
    
    chapters.forEach(chapter => {
        const targetLanguages = getAvailableTargetLanguages(languageLearn, parseInt(chapter.replace('chapter_', '')));
        targetLanguages.forEach(lang => allTargetLanguages.add(lang));
    });
    
    return Array.from(allTargetLanguages).sort();
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
    
    // Get chapters with multilingual structure
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
    
    // Get all available target languages for this language being learned
    const allAvailableTargetLanguages = getAllAvailableTargetLanguages(languageLearn);
    
    return {
        code: languageLearn,
        name: languageNames[languageLearn] || languageLearn.toUpperCase(),
        flag: languageFlags[languageLearn] || '🌍',
        totalChapters: chapters.length,
        availableChapters: availableChapters,
        availableTargetLanguages: allAvailableTargetLanguages,
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
    
    // Create summary of available target languages for each user language
    const userLanguageSupport = {};
    const allTargetLanguages = new Set();
    
    languagesLearn.forEach(languageLearn => {
        const langInfo = languageData[languageLearn];
        langInfo.availableTargetLanguages.forEach(targetLang => {
            allTargetLanguages.add(targetLang);
            
            if (!userLanguageSupport[targetLang]) {
                userLanguageSupport[targetLang] = {
                    code: targetLang,
                    name: languageData[targetLang]?.name || targetLang.toUpperCase(),
                    flag: languageData[targetLang]?.flag || '🌍',
                    availableLessons: []
                };
            }
            
            // Add this language's lessons to the target language support
            const availableChapters = langInfo.chapters
                .filter(chapter => chapter.availableLanguages.includes(targetLang))
                .map(chapter => ({
                    languageLearn: languageLearn,
                    languageLearnName: langInfo.name,
                    chapterNumber: chapter.number,
                    chapterTitle: chapter.title
                }));
            
            userLanguageSupport[targetLang].availableLessons.push(...availableChapters);
        });
    });
    
    // Sort available lessons for each user language
    Object.values(userLanguageSupport).forEach(support => {
        support.availableLessons.sort((a, b) => {
            if (a.languageLearn !== b.languageLearn) {
                return a.languageLearn.localeCompare(b.languageLearn);
            }
            return a.chapterNumber - b.chapterNumber;
        });
    });
    
    // Create meta object
    const meta = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        totalLanguages: languagesLearn.length,
        totalChapters: totalChapters,
        totalAvailableChapters: totalAvailableChapters,
        totalTargetLanguages: allTargetLanguages.size,
        languages: languageData,
        userLanguageSupport: userLanguageSupport
    };
    
    // Write to file
    fs.writeFileSync(META_OUTPUT_PATH, JSON.stringify(meta, null, 2));
    
    console.log(`\n✅ Meta file generated: ${META_OUTPUT_PATH}`);
    console.log(`📊 Summary:`);
    console.log(`   Languages being learned: ${languagesLearn.length}`);
    console.log(`   Total Chapters: ${totalChapters}`);
    console.log(`   Available Chapters: ${totalAvailableChapters}`);
    console.log(`   Target Languages: ${Array.from(allTargetLanguages).join(', ')}`);
    
    // Show user language support
    console.log(`\n👥 User Language Support:`);
    Object.values(userLanguageSupport).forEach(support => {
        console.log(`\n${support.flag} ${support.name} (${support.code}):`);
        console.log(`   Available Lessons: ${support.availableLessons.length}`);
        
        // Group by language being learned
        const groupedLessons = {};
        support.availableLessons.forEach(lesson => {
            if (!groupedLessons[lesson.languageLearn]) {
                groupedLessons[lesson.languageLearn] = [];
            }
            groupedLessons[lesson.languageLearn].push(lesson);
        });
        
        Object.entries(groupedLessons).forEach(([langCode, lessons]) => {
            const langName = languageData[langCode]?.name || langCode.toUpperCase();
            console.log(`   ${langName}: ${lessons.length} chapters`);
            lessons.forEach(lesson => {
                console.log(`     Chapter ${lesson.chapterNumber}: ${lesson.chapterTitle}`);
            });
        });
    });
    
    // Show detailed breakdown
    console.log(`\n📋 Detailed Breakdown:`);
    languagesLearn.forEach(languageLearn => {
        const langInfo = languageData[languageLearn];
        console.log(`\n${langInfo.flag} ${langInfo.name} (${langInfo.code}):`);
        console.log(`   Total Chapters: ${langInfo.totalChapters}`);
        console.log(`   Available: ${langInfo.availableChapters}`);
        console.log(`   Target Languages: ${langInfo.availableTargetLanguages.join(', ')}`);
        
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