require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Get language from command line argument or use default
const LANGUAGE_LEARN = process.argv[2] || 'ja';

const LESSONS_DIR = path.resolve(__dirname, `../../lessons/${LANGUAGE_LEARN}`);

/**
 * Test the generated lessons structure and content
 */
function testLessons() {
    console.log(`🧪 Testing lessons for ${LANGUAGE_LEARN.toUpperCase()}...`);
    
    if (!fs.existsSync(LESSONS_DIR)) {
        console.error(`❌ Lessons directory not found: ${LESSONS_DIR}`);
        return;
    }
    
    const chapters = fs.readdirSync(LESSONS_DIR)
        .filter(dir => dir.startsWith('chapter_'))
        .sort((a, b) => {
            const numA = parseInt(a.replace('chapter_', ''));
            const numB = parseInt(b.replace('chapter_', ''));
            return numA - numB;
        });
    
    console.log(`📁 Found ${chapters.length} chapter directories`);
    
    let totalIssues = 0;
    let totalLanguages = 0;
    
    chapters.forEach(chapterDir => {
        const chapterPath = path.join(LESSONS_DIR, chapterDir);
        const chapterNum = chapterDir.replace('chapter_', '');
        
        console.log(`\n🔍 Testing ${chapterDir}...`);
        
        // Check for header image
        const headerImagePath = path.join(chapterPath, 'header.webp');
        let headerImageExists = false;
        
        if (fs.existsSync(headerImagePath)) {
            const stats = fs.statSync(headerImagePath);
            if (stats.size > 1000) {
                console.log(`✅ Header image looks good (${(stats.size / 1024).toFixed(1)}KB)`);
                headerImageExists = true;
            } else {
                console.warn(`⚠️ Header image seems too small: ${stats.size} bytes`);
                totalIssues++;
            }
        } else {
            console.warn(`⚠️ No header image found`);
        }
        
        // Check for target language directories
        const targetLanguages = fs.readdirSync(chapterPath)
            .filter(dir => {
                const dirPath = path.join(chapterPath, dir);
                return fs.statSync(dirPath).isDirectory() && 
                       fs.existsSync(path.join(dirPath, 'index.html'));
            });
        
        if (targetLanguages.length === 0) {
            console.warn(`⚠️ No target language directories found`);
            totalIssues++;
        } else {
            console.log(`✅ Found ${targetLanguages.length} target languages: ${targetLanguages.join(', ')}`);
            totalLanguages += targetLanguages.length;
        }
        
        // Test each target language
        targetLanguages.forEach(targetLang => {
            const targetLangPath = path.join(chapterPath, targetLang);
            const htmlPath = path.join(targetLangPath, 'index.html');
            
            console.log(`   Testing ${targetLang}...`);
            
            if (!fs.existsSync(htmlPath)) {
                console.error(`❌ Missing HTML file: ${htmlPath}`);
                totalIssues++;
            } else {
                const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
                
                // Check for required elements
                if (!htmlContent.includes('<h1>')) {
                    console.error(`❌ Missing H1 tag in ${chapterDir}/${targetLang}`);
                    totalIssues++;
                }
                
                if (!htmlContent.includes('lesson-header')) {
                    console.error(`❌ Missing lesson-header class in ${chapterDir}/${targetLang}`);
                    totalIssues++;
                }
                
                if (!htmlContent.includes('header.webp')) {
                    console.error(`❌ Missing header image reference in ${chapterDir}/${targetLang}`);
                    totalIssues++;
                }
                
                // Check file size (should be reasonable)
                const stats = fs.statSync(htmlPath);
                if (stats.size < 1000) {
                    console.warn(`⚠️ HTML file seems too small: ${stats.size} bytes`);
                    totalIssues++;
                } else {
                    console.log(`     ✅ HTML file looks good (${(stats.size / 1024).toFixed(1)}KB)`);
                }
            }
        });
        
        if (targetLanguages.length === 0) {
            console.log(`❌ ${chapterDir} has issues`);
            totalIssues++;
        } else {
            console.log(`✅ ${chapterDir} passed all tests`);
        }
    });
    
    console.log(`\n📊 Test Summary:`);
    console.log(`📁 Total chapters: ${chapters.length}`);
    console.log(`🌍 Total target languages: ${totalLanguages}`);
    console.log(`❌ Total issues: ${totalIssues}`);
    
    if (totalIssues === 0) {
        console.log(`🎉 All lessons passed validation!`);
    } else {
        console.log(`⚠️ Some issues found. Please review the generated content.`);
    }
}

testLessons(); 