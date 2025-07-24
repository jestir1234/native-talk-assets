require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Get story name from command line argument or use default
const STORY_NAME = process.argv[2] || 'still-dead-still-bored';

const IMAGE_META_PATH = path.resolve(__dirname, './episode_meta.json');
const OUTPUT_DIR = path.resolve(__dirname, `../stories/${STORY_NAME}`);

async function processEpisodeImage() {
    try {
        // Read episode metadata to get episode number
        const { current_episode } = JSON.parse(fs.readFileSync(IMAGE_META_PATH, 'utf-8'));
        
        // Define input and output paths
        const inputPath = path.join(OUTPUT_DIR, `${current_episode}.png`);
        const outputPath = path.join(OUTPUT_DIR, `${current_episode}.webp`);
        
        // Check if input file exists
        if (!fs.existsSync(inputPath)) {
            console.error(`❌ Input image not found: ${inputPath}`);
            return;
        }
        
        console.log(`🖼️ Processing episode image ${current_episode} for story: ${STORY_NAME}...`);
        console.log(`📁 Input: ${inputPath}`);
        console.log(`📁 Output: ${outputPath}`);
        
        // Process image with Sharp
        await sharp(inputPath)
            .resize(449, 449, {  // Resize to 800x600 (you can adjust these dimensions)
                fit: 'inside',    // Maintain aspect ratio
                withoutEnlargement: true  // Don't enlarge if image is smaller
            })
            .webp({ 
                quality: 85,      // WebP quality (0-100)
                effort: 6         // Compression effort (0-6)
            })
            .toFile(outputPath);
        
        console.log(`✅ Image processed successfully!`);
        console.log(`📊 Output: ${outputPath}`);
        
        // Optionally remove the original PNG file
        fs.unlinkSync(inputPath);
        console.log(`🧹 Removed original PNG file`);
        
    } catch (error) {
        console.error('❌ Error processing image:', error.message);
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

processEpisodeImage(); 