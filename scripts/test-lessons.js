require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Get language from command line argument or use default
const LANGUAGE = process.argv[2] || 'ja';

const LESSONS_DIR = path.resolve(__dirname, `../lessons/${LANGUAGE}`);

/**
 * Test the generated lessons structure and content
 */
function testLessons() {
    console.log(`🧪 Testing lessons for ${LANGUAGE.toUpperCase()}...`);
    
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
    
    chapters.forEach(chapterDir => {
        const chapterPath = path.join(LESSONS_DIR, chapterDir);
        const chapterNum = chapterDir.replace('chapter_', '');
        
        console.log(`\n🔍 Testing ${chapterDir}...`);
        
        // Check for required files
        const htmlPath = path.join(chapterPath, 'index.html');
        const imagePath = path.join(chapterPath, 'header.webp');
        
        let issues = 0;
        
        // Check HTML file
        if (!fs.existsSync(htmlPath)) {
            console.error(`❌ Missing HTML file: ${htmlPath}`);
            issues++;
        } else {
            const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
            
            // Check for required elements
            if (!htmlContent.includes('<h1>')) {
                console.error(`❌ Missing H1 tag in ${chapterDir}`);
                issues++;
            }
            
            if (!htmlContent.includes('lesson-header')) {
                console.error(`❌ Missing lesson-header class in ${chapterDir}`);
                issues++;
            }
            
            if (!htmlContent.includes('header.webp')) {
                console.error(`❌ Missing header image reference in ${chapterDir}`);
                issues++;
            }
            
            // Check file size (should be reasonable)
            const stats = fs.statSync(htmlPath);
            if (stats.size < 1000) {
                console.warn(`⚠️ HTML file seems too small: ${stats.size} bytes`);
                issues++;
            }
            
            console.log(`✅ HTML file looks good (${stats.size} bytes)`);
        }
        
        // Check image file
        if (!fs.existsSync(imagePath)) {
            console.error(`❌ Missing image file: ${imagePath}`);
            issues++;
        } else {
            const stats = fs.statSync(imagePath);
            if (stats.size < 1000) {
                console.warn(`⚠️ Image file seems too small: ${stats.size} bytes`);
                issues++;
            } else {
                console.log(`✅ Image file looks good (${stats.size} bytes)`);
            }
        }
        
        if (issues === 0) {
            console.log(`✅ ${chapterDir} passed all tests`);
        } else {
            console.error(`❌ ${chapterDir} has ${issues} issues`);
            totalIssues += issues;
        }
    });
    
    console.log(`\n📊 Test Summary:`);
    console.log(`📁 Total chapters: ${chapters.length}`);
    console.log(`❌ Total issues: ${totalIssues}`);
    
    if (totalIssues === 0) {
        console.log(`🎉 All lessons passed validation!`);
    } else {
        console.log(`⚠️ Some issues found. Please review the generated content.`);
    }
}

testLessons(); 