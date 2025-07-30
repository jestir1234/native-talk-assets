require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get language and target language from command line arguments
const LANGUAGE_LEARN = process.argv[2] || 'ja'; // Language being learned
const TARGET_LANGUAGE = process.argv[3] || 'en'; // Language to generate lesson in
const CHAPTER_NUMBER = process.argv[4] ? parseInt(process.argv[4]) : null; // Specific chapter (optional)

const CHAPTERS_OUTLINE_PATH = path.resolve(__dirname, `./${LANGUAGE_LEARN}/chapters_outline_basic.txt`);
const LESSONS_DIR = path.resolve(__dirname, `../../lessons/${LANGUAGE_LEARN}`);

// Ensure lessons directory exists
if (!fs.existsSync(LESSONS_DIR)) {
    fs.mkdirSync(LESSONS_DIR, { recursive: true });
}

/**
 * Parse the chapters outline file and extract chapter information
 * @param {string} filePath - Path to the chapters outline file
 * @returns {Array} Array of chapter objects with title and content
 */
function parseChaptersOutline(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const chapters = [];
    
    // Split by chapter markers (## CHAPTER X:)
    const chapterBlocks = content.split(/## CHAPTER \d+:/);
    
    // Skip the first empty block if it exists
    const validBlocks = chapterBlocks.filter(block => block.trim());
    
    validBlocks.forEach((block, index) => {
        const lines = block.trim().split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        chapters.push({
            number: index + 1,
            title: title,
            content: content
        });
    });
    
    return chapters;
}

/**
 * Call Gemini API to generate lesson content
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {string} The generated content
 */
async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    try {
        const response = await axios.post(url, {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || '[No content returned]';
    } catch (error) {
        console.error('❌ API Error:', error.message);
        return null;
    }
}

/**
 * Generate lesson content for a chapter
 * @param {Object} chapter - Chapter object with title and content
 * @param {string} languageLearn - Language being learned
 * @param {string} targetLanguage - Language to generate lesson in
 * @returns {string} Generated HTML content
 */
async function generateLessonContent(chapter, languageLearn, targetLanguage) {
    const languageNames = {
        'ja': 'Japanese',
        'en': 'English',
        'ko': 'Korean',
        'zh': 'Chinese',
        'es': 'Spanish',
        'vi': 'Vietnamese'
    };
    
    const languageLearnName = languageNames[languageLearn] || languageLearn.toUpperCase();
    const targetLanguageName = languageNames[targetLanguage] || targetLanguage.toUpperCase();
    
    const prompt = `You are an expert ${languageLearnName} language teacher creating engaging, mobile-first lessons in ${targetLanguageName}.

Create a lesson for Chapter ${chapter.number}: ${chapter.title}

Chapter outline:
${chapter.content}

Requirements:
1. Create engaging, digestible content suitable for mobile app users (not too heavy like a textbook)
2. Include practical examples and exercises
3. Use clear, friendly language in ${targetLanguageName}
4. Structure the content with responsive, mobile-first HTML and CSS
5. Include interactive elements like practice sections
6. Make it visually appealing with proper formatting optimized for mobile screens
7. Keep it concise but comprehensive
8. Include cultural notes where relevant
9. Add pronunciation guides for ${languageLearnName} words
10. Include a summary section at the end
11. All explanations should be in ${targetLanguageName}
12. Include ${languageLearnName} examples with ${targetLanguageName} translations

MOBILE-FIRST DESIGN REQUIREMENTS:
- Use responsive CSS with mobile-first approach
- Ensure all content is easily readable on small screens (320px+ width)
- Use appropriate font sizes (minimum 16px for body text)
- Include proper spacing and padding for touch interfaces
- Make buttons and interactive elements at least 44px tall for easy tapping
- Use semantic HTML5 tags for accessibility
- Include CSS that works well on both portrait and landscape orientations
- DO NOT use external image URLs or placeholder images
- Use emojis, Unicode symbols, or text-based visual elements instead of images
- Avoid any @https://via.placeholder.com or similar external image URLs
- Use a clean, modern design that feels native to mobile apps

IMPORTANT CSS REQUIREMENTS:
- Include CSS for .lesson-header and .lesson-header-image classes
- .lesson-header should have margin: 20px 0; text-align: center;
- .lesson-header-image should have width: 100%; max-width: 600px; height: auto; border-radius: 8px; box-shadow; display: block; margin: 0 auto;

HEADER STRUCTURE REQUIREMENT:
- Start the lesson content with this exact structure:
  <h1 class="chapter-title">Chapter X: [Chapter Title]</h1>
  <div class="lesson-header">
      <img src="../header.webp" alt="Chapter X Header" class="lesson-header-image">
  </div>
- Replace "X" with the actual chapter number and "[Chapter Title]" with the actual title

COLOR SCHEME (MUST USE THESE COLORS):
- Primary: #8B5FBF (Purple) - for buttons, links, and accents
- Secondary: #FDF9E5 (Cream background) - for section backgrounds
- Text: #2C3E50 (Dark blue) - for headings (h1, h2, h3)
- Body Text: #666666 (Medium gray) - for paragraph text
- Borders: #E0E0E0 (Light gray) - for borders and dividers

AUDIO INTERACTION REQUIREMENTS:
- Always use class "audio-icon" for any clickable elements that should play audio
- ALWAYS include data-audio-text attribute with the exact text to be spoken
- Use native ${LANGUAGE_LEARN} text in data-audio-text (e.g., for Japanese use "こんにちは", for English use "hello")
- Audio icons should be clearly visible and touch-friendly (min 44px)
- Use appropriate emoji or icon for audio elements (🔊, 🎵, etc.)
- Make audio elements interactive with hover effects
- DO NOT include any onclick handlers or JavaScript event listeners on audio-icon buttons
- We will inject the click handlers ourselves using react-native-tts on the mobile frontend

Return the content in clean HTML format with embedded CSS that can be directly rendered in a mobile web browser. Use semantic HTML tags like <section>, <h2>, <h3>, <p>, <ul>, <li>, <div>, <span>, <strong>, <em>, <button>, etc. Include responsive CSS classes and styles for mobile-first design.

The lesson should be engaging, practical, and help users actually learn and practice the ${languageLearnName} language concepts. All explanations and instructions should be in ${targetLanguageName}. The design should feel like a native mobile app experience.`;

    console.log(`📚 Generating lesson content for Chapter ${chapter.number} in ${targetLanguageName}...`);
    const content = await callGemini(prompt);
    
    if (!content) {
        throw new Error(`Failed to generate content for Chapter ${chapter.number}`);
    }
    
    return content;
}

/**
 * Generate image prompt for a chapter
 * @param {Object} chapter - Chapter object with title and content
 * @param {string} languageLearn - Language being learned
 * @returns {string} Generated image prompt
 */
async function generateImagePrompt(chapter, languageLearn) {
    const languageNames = {
        'ja': 'Japanese',
        'en': 'English',
        'ko': 'Korean',
        'zh': 'Chinese',
        'es': 'Spanish',
        'vi': 'Vietnamese'
    };
    
    const languageLearnName = languageNames[languageLearn] || languageLearn.toUpperCase();
    
    const prompt = `You are creating an image prompt for a ${languageLearnName} language learning app.

Chapter: ${chapter.title}
Content: ${chapter.content}

Create a detailed, descriptive image prompt that would generate an appealing header image for this language lesson. The image should:

1. Be educational and language-learning themed
2. Be visually appealing and modern
3. Represent the key concepts of the lesson
4. Be suitable for a mobile app header
5. Use warm, inviting colors
6. Include visual elements that represent the language concepts
7. Be culturally appropriate
8. Be engaging for language learners

Return only the image description/prompt, nothing else. Make it detailed and specific enough for an AI image generator to create a good image.`;

    console.log(`🎨 Generating image prompt for Chapter ${chapter.number}...`);
    const imagePrompt = await callGemini(prompt);
    
    if (!imagePrompt) {
        throw new Error(`Failed to generate image prompt for Chapter ${chapter.number}`);
    }
    
    return imagePrompt.trim();
}

/**
 * Generate image using Gemini image generation
 * @param {string} imagePrompt - The prompt for image generation
 * @param {string} outputPath - Path to save the generated image
 */
async function generateImage(imagePrompt, outputPath) {
    console.log(`🖼️ Generating image for: ${imagePrompt.substring(0, 100)}...`);
    
    const { GoogleGenAI, Modality } = await import('@google/genai');

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-preview-image-generation',
            contents: imagePrompt,
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const buffer = Buffer.from(imageData, 'base64');
                fs.writeFileSync(outputPath, buffer);
                console.log(`✅ Image saved to: ${outputPath}`);
                return;
            }
        }
        
        console.log('⚠️ No image data received from Gemini');
    } catch (error) {
        console.error('❌ Error generating image:', error.message);
        throw error;
    }
}

/**
 * Clean HTML content by removing any text before the actual HTML starts
 * @param {string} htmlContent - Original HTML content
 * @returns {string} Cleaned HTML content
 */
function cleanHtmlContent(htmlContent) {
    // Remove any text before the actual HTML starts
    // Look for the first occurrence of <!DOCTYPE html> or <html
    const doctypeIndex = htmlContent.indexOf('<!DOCTYPE html>');
    const htmlIndex = htmlContent.indexOf('<html');
    
    let startIndex = 0;
    if (doctypeIndex !== -1) {
        startIndex = doctypeIndex;
    } else if (htmlIndex !== -1) {
        startIndex = htmlIndex;
    }
    
    // If we found HTML content, get everything from that point
    let cleanedContent = htmlContent;
    if (startIndex > 0) {
        cleanedContent = htmlContent.substring(startIndex);
    }
    
    // Remove any text after the HTML ends
    // Look for the last occurrence of </html>
    const endHtmlIndex = cleanedContent.lastIndexOf('</html>');
    if (endHtmlIndex !== -1) {
        cleanedContent = cleanedContent.substring(0, endHtmlIndex + 7); // +7 for '</html>'
    }
    
    return cleanedContent;
}

/**
 * Update HTML content to include the generated image
 * @param {string} htmlContent - Original HTML content
 * @param {string} imagePath - Path to the generated image
 * @param {string} chapterNumber - Chapter number
 * @returns {string} Updated HTML content with image
 */
function updateHtmlWithImage(htmlContent, imagePath, chapterNumber) {
    // Clean the HTML content first
    const cleanedHtml = cleanHtmlContent(htmlContent);
    
    const imageUrl = `../header.webp`;
    
    // Add image at the top of the content
    const imageHtml = `
<div class="lesson-header">
    <img src="${imageUrl}" alt="Chapter ${chapterNumber} Header" class="lesson-header-image">
</div>
`;
    
    // Replace any existing image in the lesson-header with our generated image
    const updatedHtml = cleanedHtml.replace(
        /<img[^>]*class="[^"]*lesson-header-image[^"]*"[^>]*>/g,
        `<img src="${imageUrl}" alt="Chapter ${chapterNumber} Header" class="lesson-header-image">`
    );
    
    return updatedHtml;
}

/**
 * Process a single chapter
 * @param {Object} chapter - Chapter object
 * @param {string} languageLearn - Language being learned
 * @param {string} targetLanguage - Language to generate lesson in
 */
async function processChapter(chapter, languageLearn, targetLanguage) {
    const chapterDir = path.join(LESSONS_DIR, `chapter_${chapter.number}`);
    const targetLangDir = path.join(chapterDir, targetLanguage);
    
    // Create chapter directory and target language subdirectory
    if (!fs.existsSync(chapterDir)) {
        fs.mkdirSync(chapterDir, { recursive: true });
    }
    if (!fs.existsSync(targetLangDir)) {
        fs.mkdirSync(targetLangDir, { recursive: true });
    }
    
    try {
        // Check if header image already exists (only generate once per chapter)
        const headerImagePath = path.join(chapterDir, 'header.webp');
        if (!fs.existsSync(headerImagePath)) {
            // Generate image prompt
            const imagePrompt = await generateImagePrompt(chapter, languageLearn);
            
            // Generate image
            const imagePath = path.join(chapterDir, 'header.png');
            await generateImage(imagePrompt, imagePath);
            
            // Convert PNG to WebP using Sharp
            const sharp = require('sharp');
            await sharp(imagePath)
                .webp({ quality: 85, effort: 6 })
                .toFile(headerImagePath);
            
            // Remove original PNG
            fs.unlinkSync(imagePath);
            
            console.log(`✅ Header image generated for Chapter ${chapter.number}`);
        } else {
            console.log(`✅ Header image already exists for Chapter ${chapter.number}`);
        }
        
        // Generate lesson content
        const lessonContent = await generateLessonContent(chapter, languageLearn, targetLanguage);
        
        // Update HTML content with image
        const updatedContent = updateHtmlWithImage(lessonContent, headerImagePath, chapter.number);
        
        // Save HTML content
        const htmlPath = path.join(targetLangDir, 'index.html');
        fs.writeFileSync(htmlPath, updatedContent);
        
        console.log(`✅ Chapter ${chapter.number} completed successfully in ${targetLanguage}!`);
        console.log(`📁 Files saved to: ${targetLangDir}`);
        
    } catch (error) {
        console.error(`❌ Error processing Chapter ${chapter.number}:`, error.message);
    }
}

/**
 * Main function to generate lessons
 */
async function generateLessons() {
    try {
        console.log(`📚 Starting lesson generation for ${LANGUAGE_LEARN.toUpperCase()} in ${TARGET_LANGUAGE.toUpperCase()}...`);
        
        // Check if chapters outline file exists
        if (!fs.existsSync(CHAPTERS_OUTLINE_PATH)) {
            console.error(`❌ Chapters outline file not found: ${CHAPTERS_OUTLINE_PATH}`);
            process.exit(1);
        }
        
        // Parse chapters outline
        const chapters = parseChaptersOutline(CHAPTERS_OUTLINE_PATH);
        console.log(`📖 Found ${chapters.length} chapters to process`);
        
        // Filter chapters if specific chapter number is provided
        const chaptersToProcess = CHAPTER_NUMBER 
            ? chapters.filter(ch => ch.number === CHAPTER_NUMBER)
            : chapters;
        
        if (CHAPTER_NUMBER && chaptersToProcess.length === 0) {
            console.error(`❌ Chapter ${CHAPTER_NUMBER} not found. Available chapters: 1-${chapters.length}`);
            process.exit(1);
        }
        
        // Process each chapter
        for (const chapter of chaptersToProcess) {
            console.log(`\n🔄 Processing Chapter ${chapter.number}: ${chapter.title}`);
            await processChapter(chapter, LANGUAGE_LEARN, TARGET_LANGUAGE);
        }
        
        console.log(`\n🎉 All lessons generated successfully for ${LANGUAGE_LEARN.toUpperCase()} in ${TARGET_LANGUAGE.toUpperCase()}!`);
        
        // Update meta.json file
        console.log('📋 Updating meta.json...');
        const { generateMetaJson } = require('./generate-lessons-meta.js');
        generateMetaJson();
        
    } catch (error) {
        console.error('❌ Error generating lessons:', error.message);
        process.exit(1);
    }
}

// Check if Sharp is installed
try {
    require('sharp');
} catch (error) {
    console.error('❌ Sharp is not installed. Please install it with: npm install sharp');
    process.exit(1);
}

generateLessons(); 