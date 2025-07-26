const fs = require('fs');
const path = require('path');

function checkAllStories() {
  const storiesDir = path.join(__dirname, '..', '..', 'stories');
  const stories = fs.readdirSync(storiesDir).filter(dir => 
    fs.statSync(path.join(storiesDir, dir)).isDirectory()
  );
  
  console.log(`\n=== Checking all stories for tokenized content matching ===\n`);
  
  const results = [];
  
  stories.forEach(storyId => {
    console.log(`\n--- Checking story: ${storyId} ---`);
    
    try {
      // Check if story has structure.json and lang/en.json
      const structurePath = path.join(storiesDir, storyId, 'structure.json');
      const langPath = path.join(storiesDir, storyId, 'lang', 'en.json');
      
      if (!fs.existsSync(structurePath) || !fs.existsSync(langPath)) {
        console.log(`❌ Missing required files for ${storyId}`);
        return;
      }
      
      const structure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
      const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
      
      let totalExpected = 0;
      let totalFound = 0;
      let issues = [];
      
      langData.chapters.forEach((chapter, chapterIndex) => {
        const tokenizedContent = structure.chapters[chapterIndex].content;
        const words = tokenizedContent.split('|');
        
        // Simulate the frontend logic
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
            currentSentenceText = '';
            currentSentenceStart = i + 1;
            sentenceIndex++;
          }
        }
        
        const expectedSentences = Object.keys(chapter.sentences);
        const notFound = expectedSentences.filter(expected => 
          !foundSentences.find(found => found.text === expected)
        );
        
        totalExpected += expectedSentences.length;
        totalFound += foundSentences.length;
        
        if (notFound.length > 0) {
          issues.push({
            chapter: chapterIndex + 1,
            title: chapter.title,
            notFound: notFound.length,
            total: expectedSentences.length
          });
        }
      });
      
      const successRate = totalExpected > 0 ? (totalFound / totalExpected * 100).toFixed(1) : 0;
      
      if (issues.length === 0) {
        console.log(`✅ All sentences found (${totalFound}/${totalExpected} = ${successRate}%)`);
      } else {
        console.log(`❌ Issues found (${totalFound}/${totalExpected} = ${successRate}%)`);
        issues.forEach(issue => {
          console.log(`  Chapter ${issue.chapter}: ${issue.notFound}/${issue.total} sentences not found`);
        });
      }
      
      results.push({
        storyId,
        totalExpected,
        totalFound,
        successRate: parseFloat(successRate),
        hasIssues: issues.length > 0
      });
      
    } catch (error) {
      console.log(`❌ Error processing ${storyId}: ${error.message}`);
      results.push({
        storyId,
        error: error.message
      });
    }
  });
  
  // Summary
  console.log(`\n=== Summary ===`);
  const workingStories = results.filter(r => !r.error && !r.hasIssues);
  const problematicStories = results.filter(r => !r.error && r.hasIssues);
  const errorStories = results.filter(r => r.error);
  
  console.log(`✅ Working stories: ${workingStories.length}`);
  console.log(`⚠️  Problematic stories: ${problematicStories.length}`);
  console.log(`❌ Error stories: ${errorStories.length}`);
  
  if (problematicStories.length > 0) {
    console.log(`\nProblematic stories:`);
    problematicStories.forEach(story => {
      console.log(`  ${story.storyId}: ${story.totalFound}/${story.totalExpected} (${story.successRate}%)`);
    });
  }
  
  if (errorStories.length > 0) {
    console.log(`\nStories with errors:`);
    errorStories.forEach(story => {
      console.log(`  ${story.storyId}: ${story.error}`);
    });
  }
}

// Check all stories
checkAllStories(); 