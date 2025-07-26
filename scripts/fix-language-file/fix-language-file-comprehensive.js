const fs = require('fs');
const path = require('path');

// Example how to use: 
// 1. node scripts/fix-language-file/fix-language-file-comprehensive.js taipei-blues
// 2. node scripts/fix-language-file/test-fixed-language-file.js taipei-blues
// 3. node scripts/fix-language-file/check-fixed-language-file.js

function fixLanguageFileComprehensive(storyId) {
  // Read the structure file to get tokenized content
  const structurePath = path.join(__dirname, '..', '..', 'stories', storyId, 'structure.json');
  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  
  // Read the language file to get sentence keys
  const langPath = path.join(__dirname, '..', '..', 'stories', storyId, 'lang', 'en.json');
  const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  
  console.log(`\n=== Comprehensive fix for story: ${storyId} ===\n`);
  
  langData.chapters.forEach((chapter, chapterIndex) => {
    console.log(`\n--- Chapter ${chapterIndex + 1}: ${chapter.title} ---`);
    
    // Get the tokenized content for this chapter
    const tokenizedContent = structure.chapters[chapterIndex].content;
    const words = tokenizedContent.split('|');
    
    // Build all possible sentences from the tokenized content
    const allPossibleSentences = [];
    
    for (let start = 0; start < words.length; start++) {
      let currentSentence = '';
      
      for (let end = start; end < words.length; end++) {
        const word = words[end];
        
        const currentWordIsPeriod = word === '。';
        if (currentWordIsPeriod) {
          continue;
        }
        
        const nextWord = words[end + 1];
        const nextWordIsPeriod = nextWord === '。';
        
        currentSentence = nextWordIsPeriod ? currentSentence + word + '。' : currentSentence + word;
        const trimmedSentence = currentSentence.trim();
        
        if (trimmedSentence.length > 0) {
          allPossibleSentences.push({
            text: trimmedSentence,
            startIndex: start,
            endIndex: end
          });
        }
      }
    }
    
    // Now fix the sentences
    const sentencesToFix = {};
    Object.keys(chapter.sentences).forEach((sentenceKey, sentenceIndex) => {
      const exactMatch = allPossibleSentences.find(s => s.text === sentenceKey);
      
      if (exactMatch) {
        console.log(`✅ Exact match for sentence ${sentenceIndex}: "${sentenceKey}"`);
      } else {
        // Try to find a version without extra spaces
        const withoutSpaces = sentenceKey.replace(/\s+/g, '');
        const foundWithoutSpaces = allPossibleSentences.find(s => s.text === withoutSpaces);
        
        if (foundWithoutSpaces) {
          console.log(`Fixing sentence ${sentenceIndex}: "${sentenceKey}" -> "${foundWithoutSpaces.text}"`);
          sentencesToFix[sentenceKey] = foundWithoutSpaces.text;
        } else {
          // Try to find a version with spaces removed from quotes
          const withoutQuoteSpaces = sentenceKey.replace(/」\s+/g, '」').replace(/\s+"/g, '"');
          const foundWithoutQuoteSpaces = allPossibleSentences.find(s => s.text === withoutQuoteSpaces);
          
          if (foundWithoutQuoteSpaces) {
            console.log(`Fixing sentence ${sentenceIndex}: "${sentenceKey}" -> "${foundWithoutQuoteSpaces.text}"`);
            sentencesToFix[sentenceKey] = foundWithoutQuoteSpaces.text;
          } else {
            // Try to find close matches
            const closeMatches = allPossibleSentences.filter(s => {
              const similarity = calculateSimilarity(s.text, sentenceKey);
              return similarity > 0.8;
            });
            
            if (closeMatches.length > 0) {
              const bestMatch = closeMatches[0];
              console.log(`Fixing sentence ${sentenceIndex}: "${sentenceKey}" -> "${bestMatch.text}"`);
              sentencesToFix[sentenceKey] = bestMatch.text;
            } else {
              console.log(`❌ Could not fix sentence ${sentenceIndex}: "${sentenceKey}"`);
            }
          }
        }
      }
    });
    
    // Apply the fixes
    Object.keys(sentencesToFix).forEach(oldKey => {
      const newKey = sentencesToFix[oldKey];
      const translation = chapter.sentences[oldKey];
      delete chapter.sentences[oldKey];
      chapter.sentences[newKey] = translation;
    });
  });
  
  // Write the fixed language file
  const outputPath = path.join(__dirname, '..', 'stories', storyId, 'lang', 'en-fixed.json');
  fs.writeFileSync(outputPath, JSON.stringify(langData, null, 2), 'utf8');
  console.log(`\nFixed language file written to: ${outputPath}`);
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Get story ID from command line arguments
const storyId = process.argv[2] || 'taipei-blues';
fixLanguageFileComprehensive(storyId); 