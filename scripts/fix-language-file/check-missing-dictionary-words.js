const fs = require('fs');
const path = require('path');

function checkMissingDictionaryWords(storyId, dictionaryPath) {
  console.log(`\n=== Checking missing dictionary words for story: ${storyId} ===\n`);
  
  // Read the structure file to get tokenized content
  const structurePath = path.join(__dirname, '..', '..', 'stories', storyId, 'structure.json');
  
  if (!fs.existsSync(structurePath)) {
    console.error(`❌ Structure file not found: ${structurePath}`);
    return;
  }
  
  // Read the dictionary file
  if (!fs.existsSync(dictionaryPath)) {
    console.error(`❌ Dictionary file not found: ${dictionaryPath}`);
    return;
  }
  
  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
  
  console.log(`📚 Dictionary loaded: ${Object.keys(dictionary).length} entries`);
  
  // Collect all unique words from tokenized content
  const allWords = new Set();
  let totalWords = 0;
  
  structure.chapters.forEach((chapter, chapterIndex) => {
    console.log(`\n--- Chapter ${chapterIndex + 1} ---`);
    
    const tokenizedContent = chapter.content;
    const words = tokenizedContent.split('|');
    
    console.log(`📝 Total tokens: ${words.length}`);
    
    // Filter out periods and empty strings
    const cleanWords = words.filter(word => word !== '。' && word.trim() !== '');
    
    console.log(`🧹 Clean words: ${cleanWords.length}`);
    
    // Add to set for unique words
    cleanWords.forEach(word => {
      allWords.add(word.trim());
    });
    
    totalWords += cleanWords.length;
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`Total words processed: ${totalWords}`);
  console.log(`Unique words found: ${allWords.size}`);
  
  // Check which words are missing from dictionary
  const missingWords = [];
  const foundWords = [];
  
  allWords.forEach(word => {
    if (dictionary[word]) {
      foundWords.push(word);
    } else {
      missingWords.push(word);
    }
  });
  
  console.log(`\n✅ Words found in dictionary: ${foundWords.length}`);
  console.log(`❌ Words missing from dictionary: ${missingWords.length}`);
  
  // Calculate coverage percentage
  const coveragePercentage = ((foundWords.length / allWords.size) * 100).toFixed(1);
  console.log(`📈 Dictionary coverage: ${coveragePercentage}%`);
  
  // Show missing words (limited to first 50 to avoid overwhelming output)
  if (missingWords.length > 0) {
    console.log(`\n🔍 Missing words (showing first 50):`);
    missingWords.slice(0, 50).forEach((word, index) => {
      console.log(`  ${index + 1}. ${word}`);
    });
    
    if (missingWords.length > 50) {
      console.log(`  ... and ${missingWords.length - 50} more words`);
    }
    
    // Save missing words to file
    const missingWordsPath = path.join(__dirname, `missing-words-${storyId}.json`);
    fs.writeFileSync(missingWordsPath, JSON.stringify(missingWords, null, 2), 'utf8');
    console.log(`\n💾 Missing words saved to: ${missingWordsPath}`);
  }
  
  // Show some found words as examples
  if (foundWords.length > 0) {
    console.log(`\n✅ Example words found in dictionary:`);
    foundWords.slice(0, 10).forEach((word, index) => {
      console.log(`  ${index + 1}. ${word}`);
    });
  }
  
  return {
    totalWords,
    uniqueWords: allWords.size,
    foundWords: foundWords.length,
    missingWords: missingWords.length,
    coveragePercentage: parseFloat(coveragePercentage)
  };
}

// Command line usage
if (require.main === module) {
  const storyId = process.argv[2];
  const dictionaryPath = process.argv[3];
  
  if (!storyId || !dictionaryPath) {
    console.error('Usage: node check-missing-dictionary-words.js <storyId> <dictionaryPath>');
    console.error('Example: node check-missing-dictionary-words.js waves-and-hoops ../dictionaries/japanese/en-v1.json');
    process.exit(1);
  }
  
  const results = checkMissingDictionaryWords(storyId, dictionaryPath);
  
  if (results) {
    console.log(`\n📋 Final Results:`);
    console.log(`Story: ${storyId}`);
    console.log(`Dictionary: ${dictionaryPath}`);
    console.log(`Coverage: ${results.coveragePercentage}%`);
    console.log(`Missing words: ${results.missingWords}`);
  }
}

module.exports = { checkMissingDictionaryWords }; 