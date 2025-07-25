const fs = require('fs');
const path = require('path');

function testFixedLanguageFile(storyId) {
  // Read the structure file to get tokenized content
  const structurePath = path.join(__dirname, '..', 'stories', storyId, 'structure.json');
  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  
  // Read the language file to get sentence keys
  const langPath = path.join(__dirname, '..', 'stories', storyId, 'lang', 'en.json');
  const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  
  console.log(`\n=== Testing fixed language file for story: ${storyId} ===\n`);
  
  langData.chapters.forEach((chapter, chapterIndex) => {
    console.log(`\n--- Chapter ${chapterIndex + 1}: ${chapter.title} ---`);
    
    // Get the tokenized content for this chapter
    const tokenizedContent = structure.chapters[chapterIndex].content;
    const words = tokenizedContent.split('|');
    
    // Simulate the frontend logic exactly
    let currentSentenceText = '';
    let currentSentenceStart = 0;
    let sentenceIndex = 0;
    const foundSentences = [];
    
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      
      const currentWordIsPeriod = word === '。';
      if (currentWordIsPeriod) {
        continue;
      }
      
      const nextWord = words[i + 1];
      const nextWordIsPeriod = nextWord === '。';
      
      currentSentenceText = nextWordIsPeriod ? currentSentenceText + word + '。' : currentSentenceText + word;
      const trimmedSentence = currentSentenceText.trim();
      
      if (chapter.sentences[trimmedSentence]) {
        foundSentences.push({
          index: sentenceIndex,
          text: trimmedSentence,
          wordIndex: i
        });
        console.log(`✅ Found sentence ${sentenceIndex}: "${trimmedSentence}" at word index ${i}`);
        currentSentenceText = '';
        currentSentenceStart = i + 1;
        sentenceIndex++;
      }
    }
    
    console.log(`\nTotal sentences found: ${foundSentences.length}`);
    console.log(`Total sentences expected: ${Object.keys(chapter.sentences).length}`);
    
    // Check which sentences were not found
    const expectedSentences = Object.keys(chapter.sentences);
    const notFound = expectedSentences.filter(expected => 
      !foundSentences.find(found => found.text === expected)
    );
    
    if (notFound.length > 0) {
      console.log(`\nSentences not found:`);
      notFound.forEach((sentence, i) => {
        console.log(`${i}: "${sentence}"`);
      });
    } else {
      console.log(`\n🎉 All sentences found successfully!`);
    }
  });
}

// Get story ID from command line arguments
const storyId = process.argv[2] || 'taipei-blues';
testFixedLanguageFile(storyId); 