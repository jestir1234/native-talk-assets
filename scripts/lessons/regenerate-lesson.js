require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

// Get command line arguments
const LANGUAGE_LEARN = process.argv[2]; // e.g., 'ja', 'en'
const CHAPTER_NUMBER = process.argv[3]; // e.g., '1', '2'
const TARGET_LANGUAGE = process.argv[4]; // e.g., 'en', 'ja'

// Validate arguments
if (!LANGUAGE_LEARN || !CHAPTER_NUMBER || !TARGET_LANGUAGE) {
    console.error('❌ Usage: node scripts/lessons/regenerate-lesson.js <LANGUAGE_LEARN> <CHAPTER_NUMBER> <TARGET_LANGUAGE>');
    console.error('Example: node scripts/lessons/regenerate-lesson.js ja 1 en');
    process.exit(1);
}

// Paths
const CHAPTERS_OUTLINE_PATH = path.resolve(__dirname, `./${LANGUAGE_LEARN}/chapters_outline_basic.txt`);
const LESSONS_DIR = path.resolve(__dirname, `../../lessons/${LANGUAGE_LEARN}`);
const CHAPTER_DIR = path.join(LESSONS_DIR, `chapter_${CHAPTER_NUMBER}`);
const TARGET_LANG_DIR = path.join(CHAPTER_DIR, TARGET_LANGUAGE);
const HTML_FILE = path.join(TARGET_LANG_DIR, 'index.html');
const HEADER_IMAGE = path.join(CHAPTER_DIR, 'header.webp');

// Import the generateMetaJson function
const { generateMetaJson } = require('./generate-lessons-meta.js');

async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || '[No content returned]';
    } catch (error) {
        console.error('❌ API Error:', error.message);
        return null;
    }
}

async function generateImage(prompt) {
    try {
        const { GoogleGenAI, Modality } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-preview-image-generation',
            contents: prompt,
            config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
        });

        const imageData = response.candidates[0].content.parts.find(part => part.inlineData?.mimeType?.startsWith('image/'));
        
        if (imageData && imageData.inlineData) {
            const buffer = Buffer.from(imageData.inlineData.data, 'base64');
            return buffer;
        }
        
        throw new Error('No image data received');
    } catch (error) {
        console.error('❌ Image generation error:', error.message);
        return null;
    }
}

function parseChaptersOutline() {
    try {
        const content = fs.readFileSync(CHAPTERS_OUTLINE_PATH, 'utf-8');
        const chapters = [];
        let currentChapter = null;
        let currentSection = null;
        
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine) continue;
            
            // Check for chapter header (e.g., "## CHAPTER 1: Basic Greetings")
            const chapterMatch = trimmedLine.match(/^##\s+CHAPTER\s+(\d+):\s*(.+)$/);
            if (chapterMatch) {
                if (currentChapter) {
                    chapters.push(currentChapter);
                }
                currentChapter = {
                    number: parseInt(chapterMatch[1]),
                    title: chapterMatch[2].trim(),
                    sections: []
                };
                currentSection = null;
                continue;
            }
            
            // Regular content line (bullet points)
            if (currentChapter && trimmedLine && trimmedLine.startsWith('-')) {
                // Add content directly to the chapter
                if (!currentChapter.content) {
                    currentChapter.content = [];
                }
                currentChapter.content.push(trimmedLine.substring(1).trim());
            }
        }
        
        // Add the last chapter
        if (currentChapter) {
            chapters.push(currentChapter);
        }
        
        return chapters;
    } catch (error) {
        console.error('❌ Error parsing chapters outline:', error.message);
        return [];
    }
}

function findSpecificChapter(chapters, chapterNumber) {
    return chapters.find(chapter => chapter.number === parseInt(chapterNumber));
}

async function generateLessonContent(chapter, languageLearn, targetLanguage) {
    const chapterContent = chapter.content.join('\n');

    const prompt = `You are a language learning expert. Create an engaging HTML lesson for ${targetLanguage} speakers learning ${languageLearn === 'ja' ? 'Japanese' : 'English'}.

CHAPTER INFORMATION:
Chapter ${chapter.number}: ${chapter.title}

CHAPTER CONTENT:
${chapterContent}

REQUIREMENTS:
1. Generate complete HTML content (including <!DOCTYPE html>, <head>, <body> tags)
2. Content should be in ${targetLanguage} language
3. Make it engaging and suitable for mobile app users (not too heavy like a textbook)
4. Include practical examples and exercises
5. Use clear, simple language
6. Add interactive elements where appropriate
7. Make it visually appealing with CSS styling
8. Include cultural notes where relevant
9. Add pronunciation guides
10. Use semantic HTML5 elements
11. Include responsive CSS for mobile-first design

MOBILE-FIRST DESIGN REQUIREMENTS:
- Use responsive CSS with media queries
- Minimum font size of 16px for body text
- Touch targets should be at least 44px
- Use semantic HTML5 elements (section, article, etc.)
- Ensure proper spacing and padding for mobile
- Use flexbox or grid for layouts
- Include proper viewport meta tag
- Optimize for vertical scrolling on mobile devices
- DO NOT use external image URLs or placeholder images
- Use emojis, Unicode symbols, or text-based visual elements instead of images
- Avoid any @https://via.placeholder.com or similar external image URLs

IMPORTANT CSS REQUIREMENTS:
- Include CSS for .lesson-header and .lesson-header-image classes
- .lesson-header should have margin: 20px 0; text-align: center;
- .lesson-header-image should have width: 100%; max-width: 600px; height: auto; border-radius: 8px; box-shadow; display: block; margin: 0 auto;

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

Generate the complete HTML content:`;

    console.log(`📝 Generating lesson content for Chapter ${chapter.number} in ${targetLanguage}...`);
    const content = await callGemini(prompt);
    
    if (!content) {
        throw new Error('Failed to generate lesson content');
    }
    
    return content;
}

async function generateImagePrompt(chapter, languageLearn) {
    const prompt = `Create a detailed image prompt for a header image for a language learning lesson.

LESSON DETAILS:
- Chapter: ${chapter.number} - ${chapter.title}
- Language: ${languageLearn === 'ja' ? 'Japanese' : 'English'} learning
- Target: Language learning app header image

REQUIREMENTS:
- Create a visually appealing header image
- Should be relevant to the chapter topic
- Suitable for a language learning app
- Clean, modern, and educational style
- High quality and professional looking
- Should work well as a header/banner image
- Avoid text or words in the image
- Focus on visual elements that represent the learning topic

Generate a detailed image prompt:`;

    console.log(`🎨 Generating image prompt for Chapter ${chapter.number}...`);
    const imagePrompt = await callGemini(prompt);
    
    if (!imagePrompt) {
        throw new Error('Failed to generate image prompt');
    }
    
    return imagePrompt;
}

async function generateImageFromPrompt(imagePrompt) {
    console.log(`🖼️ Generating header image...`);
    const imageBuffer = await generateImage(imagePrompt);
    
    if (!imageBuffer) {
        throw new Error('Failed to generate image');
    }
    
    return imageBuffer;
}

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

function updateHtmlWithImage(htmlContent, imagePath, chapterNumber) {
    // Clean the HTML content first
    const cleanedHtml = cleanHtmlContent(htmlContent);
    
    const imageUrl = '../header.webp'; // Relative path from target language subdirectory
    
    // Add image at the top of the content if it doesn't exist
    const imageHtml = `
<div class="lesson-header">
    <img src="${imageUrl}" alt="Chapter ${chapterNumber} Header" class="lesson-header-image">
</div>
`;
    
    // Check if there's already a lesson-header section
    if (cleanedHtml.includes('<div class="lesson-header">')) {
        // Replace any existing image in the lesson-header with our generated image
        const updatedHtml = cleanedHtml.replace(
            /<img[^>]*class="[^"]*lesson-header-image[^"]*"[^>]*>/g,
            `<img src="${imageUrl}" alt="Chapter ${chapterNumber} Header" class="lesson-header-image">`
        );
        return updatedHtml;
    } else {
        // Insert the image HTML after the opening body tag
        const updatedHtml = cleanedHtml.replace(
            /<body[^>]*>/,
            `$&${imageHtml}`
        );
        return updatedHtml;
    }
}

async function regenerateLesson() {
    try {
        console.log(`🔄 Regenerating lesson: ${LANGUAGE_LEARN} Chapter ${CHAPTER_NUMBER} in ${TARGET_LANGUAGE}`);
        
        // Check if chapters outline exists
        if (!fs.existsSync(CHAPTERS_OUTLINE_PATH)) {
            throw new Error(`Chapters outline not found: ${CHAPTERS_OUTLINE_PATH}`);
        }
        
        // Parse chapters and find the specific chapter
        const chapters = parseChaptersOutline();
        const chapter = findSpecificChapter(chapters, CHAPTER_NUMBER);
        
        if (!chapter) {
            throw new Error(`Chapter ${CHAPTER_NUMBER} not found in chapters outline`);
        }
        
        console.log(`📖 Found chapter: ${chapter.title}`);
        
        // Create directories if they don't exist
        if (!fs.existsSync(CHAPTER_DIR)) {
            fs.mkdirSync(CHAPTER_DIR, { recursive: true });
        }
        if (!fs.existsSync(TARGET_LANG_DIR)) {
            fs.mkdirSync(TARGET_LANG_DIR, { recursive: true });
        }
        
        // Generate lesson content
        const lessonContent = await generateLessonContent(chapter, LANGUAGE_LEARN, TARGET_LANGUAGE);
        
        // Generate header image (only if it doesn't exist or we're regenerating everything)
        let imageBuffer = null;
        if (!fs.existsSync(HEADER_IMAGE)) {
            const imagePrompt = await generateImagePrompt(chapter, LANGUAGE_LEARN);
            imageBuffer = await generateImageFromPrompt(imagePrompt);
            
            if (imageBuffer) {
                // Convert to WebP and save
                await sharp(imageBuffer)
                    .resize(800, 400, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 85,
                        effort: 6
                    })
                    .toFile(HEADER_IMAGE);
                
                console.log(`✅ Header image saved: ${HEADER_IMAGE}`);
            }
        } else {
            console.log(`ℹ️ Header image already exists, skipping generation`);
        }
        
        // Update HTML with image reference
        const finalHtml = updateHtmlWithImage(lessonContent, HEADER_IMAGE, CHAPTER_NUMBER);
        
        // Save the HTML file
        fs.writeFileSync(HTML_FILE, finalHtml);
        console.log(`✅ Lesson HTML saved: ${HTML_FILE}`);
        
        // Update meta.json
        console.log(`📝 Updating meta.json...`);
        await generateMetaJson();
        console.log(`✅ Meta.json updated successfully`);
        
        console.log(`🎉 Lesson regeneration completed successfully!`);
        console.log(`📁 Files created/updated:`);
        console.log(`   - ${HTML_FILE}`);
        if (imageBuffer) {
            console.log(`   - ${HEADER_IMAGE}`);
        }
        
    } catch (error) {
        console.error('❌ Error regenerating lesson:', error.message);
        process.exit(1);
    }
}

// Check dependencies
try {
    require('sharp');
    require('axios');
} catch (error) {
    console.error('❌ Missing dependencies. Please install: npm install sharp axios');
    process.exit(1);
}

regenerateLesson(); 