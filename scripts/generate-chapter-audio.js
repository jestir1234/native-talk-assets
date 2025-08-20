#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function callElevenLabsAPI(text, voiceId, modelId) {
    const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`;
    
    const requestBody = {
        text: text,
        model_id: modelId,
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
        }
    };

    try {
        const response = await axios.post(url, requestBody, {
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            responseType: 'arraybuffer'
        });

        return response.data;
    } catch (error) {
        console.error('❌ ElevenLabs API Error:', error.response?.data || error.message);
        return null;
    }
}

function sanitizeFilename(text) {
    // Remove or replace characters that are problematic for filenames
    return text
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[。、！？]/g, '') // Remove Japanese punctuation
        .substring(0, 50); // Limit length
}

async function generateChapterAudio(storyId, chapterId, lang = 'en', useOriginalLanguage = true) {
    console.log(`🎵 Generating audio for story: ${storyId}, chapter: ${chapterId}, language file: ${lang}.json`);
    if (useOriginalLanguage) {
        console.log(`🎤 Using original language text (keys) from translation file`);
    } else {
        console.log(`🎤 Using translated text (values) from language file`);
    }
    
    // Paths
    const storyPath = path.join(__dirname, '..', 'stories', storyId);
    const langFilePath = path.join(storyPath, 'lang', `${lang}.json`);
    const audioMetaPath = path.join(storyPath, 'audio', 'meta.json');
    const audioOutputPath = path.join(storyPath, 'audio', chapterId);
    
    // Check if files exist
    if (!fs.existsSync(langFilePath)) {
        console.error(`❌ Language file not found: ${langFilePath}`);
        return;
    }
    
    if (!fs.existsSync(audioMetaPath)) {
        console.error(`❌ Audio meta file not found: ${audioMetaPath}`);
        return;
    }
    
    // Check API key
    if (!ELEVENLABS_API_KEY) {
        console.error('❌ ELEVENLABS_API_KEY environment variable is required');
        console.error('Please add ELEVENLABS_API_KEY=your_api_key to your .env file');
        return;
    }
    
    // Load language file
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    
    // Load audio meta
    const audioMeta = JSON.parse(fs.readFileSync(audioMetaPath, 'utf8'));
    
    // Find the chapter
    const chapter = langData.chapters.find(ch => ch.id === chapterId);
    if (!chapter) {
        console.error(`❌ Chapter ${chapterId} not found in language file`);
        return;
    }
    
    console.log(`📖 Found chapter: ${chapter.title}`);
    console.log(`🎤 Voice ID: ${audioMeta.voiceId}`);
    console.log(`🤖 Model ID: ${audioMeta.modelId}`);
    
    // Create output directory
    if (!fs.existsSync(audioOutputPath)) {
        fs.mkdirSync(audioOutputPath, { recursive: true });
        console.log(`📁 Created output directory: ${audioOutputPath}`);
    }
    
    // Get sentences based on useOriginalLanguage parameter
    let sentences;
    if (useOriginalLanguage) {
        // Use the keys (original language text)
        sentences = Object.keys(chapter.sentences);
        console.log(`📝 Found ${sentences.length} original language sentences to process`);
    } else {
        // Use the values (translated text)
        sentences = Object.values(chapter.sentences);
        console.log(`📝 Found ${sentences.length} translated sentences to process`);
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each sentence
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceNumber = i + 1;
        
        console.log(`\n🎵 Processing sentence ${sentenceNumber}/${sentences.length}:`);
        console.log(`   Text: ${sentence.substring(0, 50)}${sentence.length > 50 ? '...' : ''}`);
        
        // Generate audio
        const audioData = await callElevenLabsAPI(sentence, audioMeta.voiceId, audioMeta.modelId);
        
        if (audioData) {
            // Create filename
            const filename = `${sentenceNumber}.mp3`;
            const filePath = path.join(audioOutputPath, filename);
            
            // Save audio file
            fs.writeFileSync(filePath, audioData);
            console.log(`   ✅ Saved: ${filename}`);
            successCount++;
            
            // Add delay to avoid rate limiting
            if (i < sentences.length - 1) {
                console.log(`   ⏳ Waiting 1 second...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            console.log(`   ❌ Failed to generate audio`);
            errorCount++;
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully generated: ${successCount} files`);
    console.log(`❌ Failed: ${errorCount} files`);
    console.log(`📁 Output directory: ${audioOutputPath}`);
    console.log(`📝 Files named: 1.mp3 to ${successCount}.mp3`);
    
    return {
        successCount,
        errorCount,
        outputPath: audioOutputPath
    };
}

// Command line usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.error('Usage: node generate-chapter-audio.js <storyId> <chapterId> [language] [--translated]');
        console.error('Example: node generate-chapter-audio.js yuta-skipping-day ch1 en');
        console.error('Example: node generate-chapter-audio.js lotus-bloom ch1 en');
        console.error('Example: node generate-chapter-audio.js not-that-kind-of-influencer ch1 en');
        console.error('');
        console.error('Note: By default, generates audio for original language text (keys)');
        console.error('      Use --translated flag to generate audio for translated text (values)');
        process.exit(1);
    }
    
    const storyId = args[0];
    const chapterId = args[1];
    const lang = args[2] || 'en';
    const useOriginalLanguage = !args.includes('--translated');
    
    generateChapterAudio(storyId, chapterId, lang, useOriginalLanguage)
        .then(() => {
            console.log('\n🎉 Audio generation completed!');
        })
        .catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = { generateChapterAudio };
