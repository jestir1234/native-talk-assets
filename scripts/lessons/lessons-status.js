require('dotenv').config();
const fs = require('fs');
const path = require('path');

const LESSONS_ROOT = path.resolve(__dirname, '../../lessons');

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
    
    const languagesLearn = fs.readdirSync(LESSONS_ROOT)
        .filter(dir => {
            const dirPath = path.join(LESSONS_ROOT, dir);
            return fs.statSync(dirPath).isDirectory();
        })
        .sort();
    
    if (languagesLearn.length === 0) {
        console.log('❌ No language directories found');
        return;
    }
    
    languagesLearn.forEach(languageLearn => {
        const langPath = path.join(LESSONS_ROOT, languageLearn);
        const chapters = fs.readdirSync(langPath)
            .filter(dir => dir.startsWith('chapter_'))
            .sort((a, b) => {
                const numA = parseInt(a.replace('chapter_', ''));
                const numB = parseInt(b.replace('chapter_', ''));
                return numA - numB;
            });
        
        console.log(`🌍 ${languageLearn.toUpperCase()} (${chapters.length} chapters):`);
        
        if (chapters.length === 0) {
            console.log('   ⚠️  No chapters generated yet');
        } else {
            chapters.forEach(chapter => {
                const chapterPath = path.join(langPath, chapter);
                const headerImagePath = path.join(chapterPath, 'header.webp');
                
                // Get target languages for this chapter
                const targetLanguages = fs.readdirSync(chapterPath)
                    .filter(dir => {
                        const dirPath = path.join(chapterPath, dir);
                        return fs.statSync(dirPath).isDirectory() && 
                               fs.existsSync(path.join(dirPath, 'index.html'));
                    });
                
                const hasHeaderImage = fs.existsSync(headerImagePath);
                const hasContent = targetLanguages.length > 0;
                
                let status = '✅';
                if (!hasHeaderImage && !hasContent) {
                    status = '❌';
                } else if (!hasHeaderImage || !hasContent) {
                    status = '⚠️';
                }
                
                const chapterNum = chapter.replace('chapter_', '');
                console.log(`   ${status} Chapter ${chapterNum}`);
                
                if (hasHeaderImage) {
                    const stats = fs.statSync(headerImagePath);
                    console.log(`      🖼️  Header: ${(stats.size / 1024).toFixed(1)}KB`);
                }
                
                if (hasContent) {
                    console.log(`      📄 Content: ${targetLanguages.join(', ')}`);
                    targetLanguages.forEach(targetLang => {
                        const htmlPath = path.join(chapterPath, targetLang, 'index.html');
                        const stats = fs.statSync(htmlPath);
                        console.log(`         ${targetLang}: ${(stats.size / 1024).toFixed(1)}KB`);
                    });
                }
            });
        }
        console.log('');
    });
    
    // Summary
    let totalChapters = 0;
    let totalTargetLanguages = 0;
    
    languagesLearn.forEach(languageLearn => {
        const langPath = path.join(LESSONS_ROOT, languageLearn);
        const chapters = fs.readdirSync(langPath)
            .filter(dir => dir.startsWith('chapter_'));
        
        totalChapters += chapters.length;
        
        chapters.forEach(chapter => {
            const chapterPath = path.join(langPath, chapter);
            const targetLanguages = fs.readdirSync(chapterPath)
                .filter(dir => {
                    const dirPath = path.join(chapterPath, dir);
                    return fs.statSync(dirPath).isDirectory() && 
                           fs.existsSync(path.join(dirPath, 'index.html'));
                });
            totalTargetLanguages += targetLanguages.length;
        });
    });
    
    console.log('📊 Summary:');
    console.log(`   Languages being learned: ${languagesLearn.length}`);
    console.log(`   Total Chapters: ${totalChapters}`);
    console.log(`   Total Target Languages: ${totalTargetLanguages}`);
    console.log(`   Languages: ${languagesLearn.join(', ')}`);
    
    // Check for outline files
    console.log('\n📋 Chapter Outlines:');
    languagesLearn.forEach(languageLearn => {
        const outlinePath = path.resolve(__dirname, `./${languageLearn}/chapters_outline_basic.txt`);
        if (fs.existsSync(outlinePath)) {
            const content = fs.readFileSync(outlinePath, 'utf-8');
            const chapterCount = (content.match(/## CHAPTER \d+:/g) || []).length;
            console.log(`   ✅ ${languageLearn.toUpperCase()}: ${chapterCount} chapters defined`);
        } else {
            console.log(`   ❌ ${languageLearn.toUpperCase()}: No outline file found`);
        }
    });
}

getLessonsStatus(); 