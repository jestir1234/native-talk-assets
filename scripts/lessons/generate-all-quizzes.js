const fs = require('fs');
const path = require('path');
const { generateQuiz } = require('./generate-quiz.js');

/**
 * Generates quiz.json files for all quiz.txt files found in the lessons directory
 */
function generateAllQuizzes() {
  const lessonsDir = path.join(__dirname, '../../lessons');
  
  if (!fs.existsSync(lessonsDir)) {
    console.error('❌ Lessons directory not found');
    process.exit(1);
  }
  
  let totalGenerated = 0;
  let totalSkipped = 0;
  
  // Walk through all language directories
  const languageDirs = fs.readdirSync(lessonsDir).filter(dir => {
    return fs.statSync(path.join(lessonsDir, dir)).isDirectory();
  });
  
  for (const language of languageDirs) {
    const languagePath = path.join(lessonsDir, language);
    
    // Walk through all chapter directories
    const chapterDirs = fs.readdirSync(languagePath).filter(dir => {
      return dir.startsWith('chapter_') && fs.statSync(path.join(languagePath, dir)).isDirectory();
    });
    
    for (const chapter of chapterDirs) {
      const chapterPath = path.join(languagePath, chapter);
      
      // Walk through all target language directories
      const targetLanguageDirs = fs.readdirSync(chapterPath).filter(dir => {
        return fs.statSync(path.join(chapterPath, dir)).isDirectory();
      });
      
      for (const targetLanguage of targetLanguageDirs) {
        const targetLanguagePath = path.join(chapterPath, targetLanguage);
        const quizTxtPath = path.join(targetLanguagePath, 'quiz.txt');
        const quizJsonPath = path.join(targetLanguagePath, 'quiz.json');
        
        if (fs.existsSync(quizTxtPath)) {
          try {
            generateQuiz(quizTxtPath, quizJsonPath);
            totalGenerated++;
          } catch (error) {
            console.error(`❌ Error generating quiz for ${language}/${chapter}/${targetLanguage}:`, error.message);
            totalSkipped++;
          }
        }
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Generated: ${totalGenerated} quiz files`);
  if (totalSkipped > 0) {
    console.log(`⚠️  Skipped: ${totalSkipped} files due to errors`);
  }
}

/**
 * Generates quiz.json files for a specific language and chapter range
 * @param {string} language - The learning language (e.g., 'ja', 'en', 'es')
 * @param {number} startChapter - Starting chapter number
 * @param {number} endChapter - Ending chapter number
 * @param {string} targetLanguage - Target language for translations (e.g., 'en', 'ja', 'es')
 */
function generateQuizzesForLanguage(language, startChapter = 1, endChapter = 10, targetLanguage = 'en') {
  const lessonsDir = path.join(__dirname, '../../lessons');
  const languagePath = path.join(lessonsDir, language);
  
  if (!fs.existsSync(languagePath)) {
    console.error(`❌ Language directory not found: ${language}`);
    process.exit(1);
  }
  
  let totalGenerated = 0;
  let totalSkipped = 0;
  
  for (let chapter = startChapter; chapter <= endChapter; chapter++) {
    const chapterDir = `chapter_${chapter}`;
    const chapterPath = path.join(languagePath, chapterDir);
    
    if (!fs.existsSync(chapterPath)) {
      console.warn(`⚠️  Chapter directory not found: ${language}/${chapterDir}`);
      continue;
    }
    
    const targetLanguagePath = path.join(chapterPath, targetLanguage);
    const quizTxtPath = path.join(targetLanguagePath, 'quiz.txt');
    const quizJsonPath = path.join(targetLanguagePath, 'quiz.json');
    
    if (fs.existsSync(quizTxtPath)) {
      try {
        generateQuiz(quizTxtPath, quizJsonPath);
        totalGenerated++;
      } catch (error) {
        console.error(`❌ Error generating quiz for ${language}/${chapterDir}/${targetLanguage}:`, error.message);
        totalSkipped++;
      }
    } else {
      console.warn(`⚠️  Quiz.txt not found: ${quizTxtPath}`);
    }
  }
  
  console.log(`\n📊 Summary for ${language} (chapters ${startChapter}-${endChapter}):`);
  console.log(`✅ Generated: ${totalGenerated} quiz files`);
  if (totalSkipped > 0) {
    console.log(`⚠️  Skipped: ${totalSkipped} files due to errors`);
  }
}

/**
 * Main function to process command line arguments
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node generate-all-quizzes.js');
    console.log('  node generate-all-quizzes.js <language> [startChapter] [endChapter] [targetLanguage]');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-all-quizzes.js');
    console.log('  node generate-all-quizzes.js ja');
    console.log('  node generate-all-quizzes.js ja 1 5');
    console.log('  node generate-all-quizzes.js ja 1 10 en');
    process.exit(1);
  }
  
  if (args.length === 0) {
    // Generate all quizzes
    generateAllQuizzes();
  } else {
    // Generate quizzes for specific language
    const language = args[0];
    const startChapter = args[1] ? parseInt(args[1]) : 1;
    const endChapter = args[2] ? parseInt(args[2]) : 10;
    const targetLanguage = args[3] || 'en';
    
    generateQuizzesForLanguage(language, startChapter, endChapter, targetLanguage);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { generateAllQuizzes, generateQuizzesForLanguage }; 