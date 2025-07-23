require('dotenv').config();
const fs = require('fs');
const path = require('path');

const IMAGE_META_PATH = path.resolve(__dirname, './episode_meta.json');
const OUTPUT_DIR = path.resolve(__dirname, '../stories/still-dead-still-bored');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const { title, hook, description, current_episode } = JSON.parse(fs.readFileSync(IMAGE_META_PATH, 'utf-8'));

const prompt = `
Create a detailed illustration of Zoey Yamashita, a cute Japanese woman in her 20s who is also a zombie. Illustrate her in the following scene: 

${description}.

Use a slightly stylized, anime-realism look. No gore. Background should reflect Tokyo environment unless otherwise implied.
`;

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
