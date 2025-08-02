require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Get story name from command line argument or use default
const STORY_NAME = process.argv[2] || 'still-dead-still-bored';
// Get episode number if provided (for episode-specific prompts)
const EPISODE_NUM = process.argv[3];

const IMAGE_META_PATH = path.resolve(__dirname, './episode_meta.json');
const OUTPUT_DIR = path.resolve(__dirname, `../stories/${STORY_NAME}`);

// Configuration for the current story
const PROMPTS_DIR = path.resolve(__dirname, `./episode_prompts/${STORY_NAME}`);
const EPISODES_PROMPTS_DIR = path.resolve(__dirname, `./episode_prompts/${STORY_NAME}/episodes`);

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Reads a prompt file and interpolates variables
 * @param {string} promptName - Name of the prompt file (without extension)
 * @param {Object} variables - Variables to interpolate into the prompt
 * @returns {string} The interpolated prompt
 */
function readPrompt(promptName, variables = {}) {
    const promptPath = path.join(PROMPTS_DIR, `${promptName}.txt`);
    
    if (!fs.existsSync(promptPath)) {
        throw new Error(`Prompt file not found: ${promptPath}`);
    }
    
    let prompt = fs.readFileSync(promptPath, 'utf-8');
    
    // Interpolate variables
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `\${${key}}`;
        prompt = prompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    
    return prompt;
}

const { title, hook, description, current_episode } = JSON.parse(fs.readFileSync(IMAGE_META_PATH, 'utf-8'));

let prompt;
if (EPISODE_NUM && fs.existsSync(path.join(EPISODES_PROMPTS_DIR, `${EPISODE_NUM}imagePrompt.txt`))) {
    // Use episode-specific image prompt
    console.log(`📺 Using episode-specific image prompt for episode ${EPISODE_NUM}`);
    prompt = fs.readFileSync(path.join(EPISODES_PROMPTS_DIR, `${EPISODE_NUM}imagePrompt.txt`), 'utf-8');
} else {
    // Use default image prompt with description interpolation
    prompt = readPrompt('imagePrompt', { description });
}

async function generateImage() {
    console.log("🎨 Sending image prompt to Gemini...");

    const { GoogleGenAI, Modality } = await import('@google/genai');

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents: prompt,
        config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.text) {
            console.log("📝 Gemini text output:", part.text);
        } else if (part.inlineData) {
            const imageData = part.inlineData.data;
            const buffer = Buffer.from(imageData, 'base64');
            const filename = path.join(OUTPUT_DIR, `${current_episode}.png`);
            fs.writeFileSync(filename, buffer);
            console.log(`✅ Image saved to: ${filename}`);
        }
    }
}

generateImage();
