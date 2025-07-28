require('dotenv').config();
const fs = require('fs');
const path = require('path');

const LESSONS_ROOT = path.resolve(__dirname, '../lessons');

/**
 * Get status of lessons for all languages
 */
function getLessonsStatus() {
    console.log('📚 Lessons Status Report');
    console.log('========================\n');
    
    if (!fs.existsSync(LESSONS_ROOT)) {
        console.log('❌ No lessons directory found');
        return;
    }
    
    const languages = fs.readdirSync(LESSONS_ROOT)
        .filter(dir => fs.statSync(path.join(LESSONS_ROOT, dir)).isDirectory());
    
    if (languages.length === 0) {
        console.log('❌ No language directories found');
        return;
    }
    
    languages.forEach(language => {
        const langPath = path.join(LESSONS_ROOT, language);
        const chapters = fs.readdirSync(langPath)
            .filter(dir => dir.startsWith('chapter_'))
            .sort((a, b) => {
                const numA = parseInt(a.replace('chapter_', ''));
                const numB = parseInt(b.replace('chapter_', ''));
                return numA - numB;
            });
        
        console.log(`🌍 ${language.toUpperCase()} (${chapters.length} chapters):`);
        
        if (chapters.length === 0) {
            console.log('   ⚠️  No chapters generated yet');
        } else {
            chapters.forEach(chapter => {
                const chapterPath = path.join(langPath, chapter);
                const htmlPath = path.join(chapterPath, 'index.html');
                const imagePath = path.join(chapterPath, 'header.webp');
                
                const hasHtml = fs.existsSync(htmlPath);
                const hasImage = fs.existsSync(imagePath);
                
                let status = '✅';
                if (!hasHtml && !hasImage) {
                    status = '❌';
                } else if (!hasHtml || !hasImage) {
                    status = '⚠️';
                }
                
                const chapterNum = chapter.replace('chapter_', '');
                console.log(`   ${status} Chapter ${chapterNum}`);
                
                if (hasHtml) {
                    const stats = fs.statSync(htmlPath);
                    console.log(`      📄 HTML: ${(stats.size / 1024).toFixed(1)}KB`);
                }
                
                if (hasImage) {
                    const stats = fs.statSync(imagePath);
                    console.log(`      🖼️  Image: ${(stats.size / 1024).toFixed(1)}KB`);
                }
            });
        }
        console.log('');
    });
    
    // Summary
    const totalChapters = languages.reduce((total, lang) => {
        const langPath = path.join(LESSONS_ROOT, lang);
        const chapters = fs.readdirSync(langPath)
            .filter(dir => dir.startsWith('chapter_'));
        return total + chapters.length;
    }, 0);
    
    console.log('📊 Summary:');
    console.log(`   Languages: ${languages.length}`);
    console.log(`   Total Chapters: ${totalChapters}`);
    console.log(`   Languages: ${languages.join(', ')}`);
    
    // Check for outline files
    console.log('\n📋 Chapter Outlines:');
    languages.forEach(language => {
        const outlinePath = path.resolve(__dirname, `./lessons/${language}/chapters_outline_basic.txt`);
        if (fs.existsSync(outlinePath)) {
            const content = fs.readFileSync(outlinePath, 'utf-8');
            const chapterCount = (content.match(/## CHAPTER \d+:/g) || []).length;
            console.log(`   ✅ ${language.toUpperCase()}: ${chapterCount} chapters defined`);
        } else {
            console.log(`   ❌ ${language.toUpperCase()}: No outline file found`);
        }
    });
}

getLessonsStatus(); 