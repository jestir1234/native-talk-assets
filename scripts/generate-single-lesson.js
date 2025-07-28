require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get language and chapter number from command line arguments
const LANGUAGE = process.argv[2] || 'ja';
const CHAPTER_NUMBER = parseInt(process.argv[3]) || 1;

const CHAPTERS_OUTLINE_PATH = path.resolve(__dirname, `./lessons/${LANGUAGE}/chapters_outline_basic.txt`);
const LESSONS_DIR = path.resolve(__dirname, `../lessons/${LANGUAGE}`);

// Ensure lessons directory exists
if (!fs.existsSync(LESSONS_DIR)) {
    fs.mkdirSync(LESSONS_DIR, { recursive: true });
}

/**
 * Parse the chapters outline file and extract a specific chapter
 * @param {string} filePath - Path to the chapters outline file
 * @param {number} chapterNumber - The chapter number to extract
 * @returns {Object} Chapter object with title and content
 */
function parseSpecificChapter(filePath, chapterNumber) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Split by chapter markers (## CHAPTER X:)
    const chapterBlocks = fileContent.split(/## CHAPTER \d+:/);
    
    // Skip the first empty block if it exists
    const validBlocks = chapterBlocks.filter(block => block.trim());
    
    if (chapterNumber < 1 || chapterNumber > validBlocks.length) {
        throw new Error(`Chapter ${chapterNumber} not found. Available chapters: 1-${validBlocks.length}`);
    }
    
    const block = validBlocks[chapterNumber - 1];
    const lines = block.trim().split('\n');
    const title = lines[0].trim();
    const chapterContent = lines.slice(1).join('\n').trim();
    
    return {
        number: chapterNumber,
        title: title,
        content: chapterContent
    };
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
 * @param {string} language - Language code (ja/en)
 * @returns {string} Generated HTML content
 */
async function generateLessonContent(chapter, language) {
    const isJapanese = language === 'ja';
    const languageName = isJapanese ? 'Japanese' : 'English';
    
    const prompt = `You are an expert ${languageName} language teacher creating engaging, app-friendly lessons.

Create a lesson for Chapter ${chapter.number}: ${chapter.title}

Chapter outline:
${chapter.content}

Requirements:
1. Create engaging, digestible content suitable for mobile app users (not too heavy like a textbook)
2. Include practical examples and exercises
3. Use clear, friendly language
4. Structure the content with proper HTML tags
5. Include interactive elements like practice sections
6. Make it visually appealing with proper formatting
7. Keep it concise but comprehensive
8. Include cultural notes where relevant
9. Add pronunciation guides for ${isJapanese ? 'Japanese' : 'English'} words
10. Include a summary section at the end

Return the content in clean HTML format that can be directly rendered in a web browser. Use semantic HTML tags like <section>, <h2>, <h3>, <p>, <ul>, <li>, <div>, <span>, <strong>, <em>, etc. Include CSS classes for styling if needed.

The lesson should be engaging, practical, and help users actually learn and practice the language concepts.`;

    console.log(`📚 Generating lesson content for Chapter ${chapter.number}...`);
    const content = await callGemini(prompt);
    
    if (!content) {
        throw new Error(`Failed to generate content for Chapter ${chapter.number}`);
    }
    
    return content;
}

/**
 * Generate image prompt for a chapter
 * @param {Object} chapter - Chapter object with title and content
 * @param {string} language - Language code (ja/en)
 * @returns {string} Generated image prompt
 */
async function generateImagePrompt(chapter, language) {
    const isJapanese = language === 'ja';
    const languageName = isJapanese ? 'Japanese' : 'English';
    
    const prompt = `You are creating an image prompt for a ${languageName} language learning app.

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
 * Update HTML content to include the generated image
 * @param {string} htmlContent - Original HTML content
 * @param {string} imagePath - Path to the generated image
 * @param {string} chapterNumber - Chapter number
 * @returns {string} Updated HTML content with image
 */
function updateHtmlWithImage(htmlContent, imagePath, chapterNumber) {
    const imageUrl = `./chapter_${chapterNumber}/header.webp`;
    
    // Add image at the top of the content
    const imageHtml = `
<div class="lesson-header">
    <img src="${imageUrl}" alt="Chapter ${chapterNumber} Header" class="lesson-header-image">
</div>
`;
    
    // Insert the image HTML after the first <h1> or at the beginning if no h1
    const h1Match = htmlContent.match(/<h1[^>]*>.*?<\/h1>/i);
    if (h1Match) {
        return htmlContent.replace(h1Match[0], h1Match[0] + imageHtml);
    } else {
        return imageHtml + htmlContent;
    }
}

/**
 * Process a single chapter
 * @param {Object} chapter - Chapter object
 * @param {string} language - Language code
 */
async function processChapter(chapter, language) {
    const chapterDir = path.join(LESSONS_DIR, `chapter_${chapter.number}`);
    
    // Create chapter directory
    if (!fs.existsSync(chapterDir)) {
        fs.mkdirSync(chapterDir, { recursive: true });
    }
    
    try {
        // Generate lesson content
        const lessonContent = await generateLessonContent(chapter, language);
        
        // Generate image prompt
        const imagePrompt = await generateImagePrompt(chapter, language);
        
        // Generate image
        const imagePath = path.join(chapterDir, 'header.png');
        await generateImage(imagePrompt, imagePath);
        
        // Convert PNG to WebP using Sharp
        const sharp = require('sharp');
        const webpPath = path.join(chapterDir, 'header.webp');
        await sharp(imagePath)
            .webp({ quality: 85, effort: 6 })
            .toFile(webpPath);
        
        // Remove original PNG
        fs.unlinkSync(imagePath);
        
        // Update HTML content with image
        const updatedContent = updateHtmlWithImage(lessonContent, webpPath, chapter.number);
        
        // Save HTML content
        const htmlPath = path.join(chapterDir, 'index.html');
        fs.writeFileSync(htmlPath, updatedContent);
        
        console.log(`✅ Chapter ${chapter.number} completed successfully!`);
        console.log(`📁 Files saved to: ${chapterDir}`);
        
    } catch (error) {
        console.error(`❌ Error processing Chapter ${chapter.number}:`, error.message);
    }
}

/**
 * Main function to generate a single lesson
 */
async function generateSingleLesson() {
    try {
        console.log(`📚 Generating lesson for Chapter ${CHAPTER_NUMBER} in ${LANGUAGE.toUpperCase()}...`);
        
        // Check if chapters outline file exists
        if (!fs.existsSync(CHAPTERS_OUTLINE_PATH)) {
            console.error(`❌ Chapters outline file not found: ${CHAPTERS_OUTLINE_PATH}`);
            process.exit(1);
        }
        
        // Parse specific chapter
        const chapter = parseSpecificChapter(CHAPTERS_OUTLINE_PATH, CHAPTER_NUMBER);
        console.log(`📖 Processing Chapter ${chapter.number}: ${chapter.title}`);
        
        // Process the chapter
        await processChapter(chapter, LANGUAGE);
        
        console.log(`\n🎉 Lesson generated successfully for Chapter ${CHAPTER_NUMBER}!`);
        
    } catch (error) {
        console.error('❌ Error generating lesson:', error.message);
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

generateSingleLesson(); 