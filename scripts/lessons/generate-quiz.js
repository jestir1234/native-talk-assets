const fs = require('fs');
const path = require('path');

/**
 * Converts quiz.txt outline to quiz.json format
 * @param {string} quizTxtPath - Path to the quiz.txt file
 * @param {string} outputPath - Path where quiz.json should be saved
 */
function generateQuiz(quizTxtPath, outputPath) {
  try {
    // Read the quiz.txt file
    const content = fs.readFileSync(quizTxtPath, 'utf8');
    
    // Parse the content
    const questions = parseQuizContent(content);
    
    // Create the quiz object
    const quiz = {
      title: extractTitle(content),
      questions: questions,
      totalQuestions: questions.length,
      createdAt: new Date().toISOString()
    };
    
    // Write the JSON file
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(quiz, null, 2));
    console.log(`✅ Quiz generated successfully: ${outputPath}`);
    console.log(`📊 Total questions: ${questions.length}`);
    
  } catch (error) {
    console.error('❌ Error generating quiz:', error.message);
    process.exit(1);
  }
}

/**
 * Extracts the title from the quiz content
 * @param {string} content - The quiz.txt content
 * @returns {string} The quiz title
 */
function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  return 'Quiz';
}

/**
 * Parses the quiz.txt content into structured questions
 * @param {string} content - The quiz.txt content
 * @returns {Array} Array of question objects
 */
function parseQuizContent(content) {
  const questions = [];
  
  // Split by both English "Question" and Chinese "问题"
  const sections = content.split(/## (Question |问题 )/);
  
  // Skip the first section (title/header)
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    
    const question = parseQuestionSection(section, i);
    if (question) {
      questions.push(question);
    }
  }
  
  return questions;
}

/**
 * Parses a single question section
 * @param {string} section - The question section content
 * @param {number} questionNumber - The question number
 * @returns {Object} The parsed question object
 */
function parseQuestionSection(section, questionNumber) {
  const lines = section.split('\n');
  const question = {
    id: questionNumber,
    type: '',
    question: '',
    explanation: ''
  };
  
  let currentKey = '';
  let currentArray = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check for key-value pairs
    if (trimmedLine.includes(':')) {
      const [key, ...valueParts] = trimmedLine.split(':');
      const keyName = key.trim();
      const value = valueParts.join(':').trim();
      
      switch (keyName) {
        case 'type':
          question.type = value;
          break;
        case 'question':
          question.question = value;
          break;
        case 'correctAnswer':
          question.correctAnswer = value;
          break;
        case 'explanation':
          question.explanation = value;
          break;
        case 'options':
          currentKey = 'options';
          currentArray = [];
          break;
        case 'draggableItems':
          currentKey = 'draggableItems';
          currentArray = [];
          break;
        default:
          // Handle array items (options, draggableItems)
          if (currentKey && trimmedLine.startsWith('- ')) {
            const item = trimmedLine.substring(2).trim();
            currentArray.push(item);
          }
      }
    } else if (trimmedLine.startsWith('- ')) {
      // Handle array items
      const item = trimmedLine.substring(2).trim();
      if (currentKey && currentArray) {
        currentArray.push(item);
      }
    }
  }
  
  // Add arrays to question object
  if (currentArray.length > 0) {
    question[currentKey] = currentArray;
  }
  
  // Validate required fields
  if (!question.type || !question.question) {
    console.warn(`⚠️  Skipping question ${questionNumber}: missing required fields`);
    return null;
  }
  
  // Validate question type
  if (!['multipleChoice', 'dragAndDrop', 'fillInTheBlank'].includes(question.type)) {
    console.warn(`⚠️  Question ${questionNumber}: invalid type "${question.type}"`);
    return null;
  }
  
  // Validate question-specific requirements
  if (question.type === 'multipleChoice') {
    if (!question.options || question.options.length < 2) {
      console.warn(`⚠️  Question ${questionNumber}: multiple choice needs at least 2 options`);
      return null;
    }
    if (!question.correctAnswer) {
      console.warn(`⚠️  Question ${questionNumber}: multiple choice needs correct answer`);
      return null;
    }
  }
  
  if (question.type === 'dragAndDrop') {
    if (!question.draggableItems || question.draggableItems.length < 2) {
      console.warn(`⚠️  Question ${questionNumber}: drag and drop needs at least 2 items`);
      return null;
    }
    if (!question.correctAnswer) {
      console.warn(`⚠️  Question ${questionNumber}: drag and drop needs correct answer`);
      return null;
    }
  }
  
  if (question.type === 'fillInTheBlank') {
    if (!question.options || question.options.length < 2) {
      console.warn(`⚠️  Question ${questionNumber}: fill in the blank needs at least 2 options`);
      return null;
    }
    if (!question.correctAnswer) {
      console.warn(`⚠️  Question ${questionNumber}: fill in the blank needs correct answer`);
      return null;
    }
  }
  
  return question;
}

/**
 * Main function to process command line arguments
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node generate-quiz.js <quiz.txt> <output.json>');
    console.log('Example: node generate-quiz.js lessons/ja/chapter_1/en/quiz.txt lessons/ja/chapter_1/en/quiz.json');
    process.exit(1);
  }
  
  const quizTxtPath = args[0];
  const outputPath = args[1];
  
  // Check if input file exists
  if (!fs.existsSync(quizTxtPath)) {
    console.error(`❌ Input file not found: ${quizTxtPath}`);
    process.exit(1);
  }
  
  generateQuiz(quizTxtPath, outputPath);
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { generateQuiz, parseQuizContent }; 