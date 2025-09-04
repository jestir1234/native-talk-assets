#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function regenerateSpecificAudio(storyId, pageId, sentenceIndex, language = 'ja') {
    console.log(`🎵 Regenerating audio for story: ${storyId}`);
    console.log(`📄 Page: ${pageId}, Sentence: ${sentenceIndex}, Language: ${language}`);
    
    const storyPath = path.join(__dirname, '..', 'stories', storyId);
    const langPath = path.join(storyPath, 'lang', `${language}.json`);
    const audioPath = path.join(storyPath, 'audio', pageId);
    const audioMetaPath = path.join(storyPath, 'audio', 'meta.json');
    
    // Check if language file exists
    if (!fs.existsSync(langPath)) {
        console.error(`❌ Language file not found: ${langPath}`);
        return;
    }
    
    // Check if audio meta file exists
    if (!fs.existsSync(audioMetaPath)) {
        console.error(`❌ Audio meta file not found: ${audioMetaPath}`);
        return;
    }
    
    // Check if audio directory exists
    if (!fs.existsSync(audioPath)) {
        console.error(`❌ Audio directory not found: ${audioPath}`);
        return;
    }
    
    // Read language data
    const langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
    const audioMeta = JSON.parse(fs.readFileSync(audioMetaPath, 'utf-8'));
    
    // Find the page/chapter data
    const pagesOrChapters = langData.pages || langData.chapters;
    if (!pagesOrChapters) {
        console.error(`❌ No pages or chapters found in language file`);
        return;
    }
    
    // Find the specific page
    const page = pagesOrChapters.find(p => p.id === pageId || p.id === `page${pageId}`);
    if (!page) {
        console.error(`❌ Page ${pageId} not found in language file`);
        console.log(`Available pages: ${pagesOrChapters.map(p => p.id).join(', ')}`);
        return;
    }
    
    // Get sentences for the page
    const sentences = page.sentences || {};
    
    // Handle different sentence structures
    let sentenceArray = [];
    if (Array.isArray(sentences)) {
        sentenceArray = sentences;
    } else if (typeof sentences === 'object') {
        // Convert object to array of values (Japanese text)
        sentenceArray = Object.values(sentences);
    }
    
    if (sentenceIndex < 1 || sentenceIndex > sentenceArray.length) {
        console.error(`❌ Sentence index ${sentenceIndex} out of range. Page has ${sentenceArray.length} sentences.`);
        return;
    }
    
    // Get the Japanese text for the sentence
    const japaneseText = sentenceArray[sentenceIndex - 1]; // Convert to 0-based index
    
    if (!japaneseText) {
        console.error(`❌ No Japanese text found for sentence ${sentenceIndex}`);
        return;
    }
    
    console.log(`📝 Japanese text: "${japaneseText}"`);
    
    // Get audio settings
    const voiceId = audioMeta.voiceId;
    const modelId = audioMeta.modelId;
    
    if (!voiceId || !modelId) {
        console.error(`❌ Missing voiceId or modelId in audio meta file`);
        return;
    }
    
    // Generate the audio file
    const outputFileName = `${sentenceIndex}.mp3`;
    const outputPath = path.join(audioPath, outputFileName);
    
    console.log(`🎤 Generating audio with voice: ${voiceId}, model: ${modelId}`);
    
    try {
        // Use ElevenLabs API to generate audio
        const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        
        const requestBody = {
            text: japaneseText,
            model_id: modelId,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        };
        
        const curlCommand = `curl -X POST "${elevenLabsUrl}" \\
            -H "Accept: audio/mpeg" \\
            -H "Content-Type: application/json" \\
            -H "xi-api-key: ${process.env.ELEVENLABS_API_KEY}" \\
            -d '${JSON.stringify(requestBody)}' \\
            --output "${outputPath}"`;
        
        console.log(`🔄 Generating audio...`);
        execSync(curlCommand, { stdio: 'pipe' });
        
        // Check if file was created successfully
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            console.log(`✅ Successfully generated: ${outputPath}`);
            
            // Apply volume fix to the new file
            console.log(`🔊 Applying volume fix...`);
            const tempPath = path.join(audioPath, `temp_${outputFileName}`);
            const ffmpegCommand = `ffmpeg -i "${outputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11,volume=3dB" -y "${tempPath}"`;
            
            try {
                execSync(ffmpegCommand, { stdio: 'pipe' });
                fs.unlinkSync(outputPath);
                fs.renameSync(tempPath, outputPath);
                console.log(`✅ Volume fix applied`);
            } catch (volumeError) {
                console.warn(`⚠️  Volume fix failed, but audio was generated: ${volumeError.message}`);
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            }
            
        } else {
            console.error(`❌ Failed to generate audio file`);
        }
        
    } catch (error) {
        console.error(`❌ Error generating audio:`, error.message);
    }
}

// Command line usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.error('Usage: node regenerate-specific-audio.js <storyId> <pageId> <sentenceIndex> [language]');
        console.error('');
        console.error('Examples:');
        console.error('  node regenerate-specific-audio.js sakana-to-tsuki 1 2');
        console.error('  node regenerate-specific-audio.js sakana-to-tsuki 5 1 ja');
        console.error('  node regenerate-specific-audio.js waves-and-hoops ch1 3');
        console.error('');
        console.error('Arguments:');
        console.error('  storyId      - Story identifier (e.g., sakana-to-tsuki)');
        console.error('  pageId       - Page/chapter ID (e.g., 1, 2, ch1, ch2)');
        console.error('  sentenceIndex - Sentence number (1-based, e.g., 1, 2, 3)');
        console.error('  language     - Language code (default: ja)');
        console.error('');
        console.error('Note: Requires ELEVENLABS_API_KEY environment variable');
        process.exit(1);
    }
    
    const storyId = args[0];
    const pageId = args[1];
    const sentenceIndex = parseInt(args[2]);
    const language = args[3] || 'ja';
    
    if (isNaN(sentenceIndex) || sentenceIndex < 1) {
        console.error('❌ Sentence index must be a positive integer');
        process.exit(1);
    }
    
    if (!process.env.ELEVENLABS_API_KEY) {
        console.error('❌ ELEVENLABS_API_KEY environment variable is required');
        process.exit(1);
    }
    
    regenerateSpecificAudio(storyId, pageId, sentenceIndex, language)
        .then(() => {
            console.log('\n🎉 Audio regeneration completed!');
        })
        .catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = { regenerateSpecificAudio };
