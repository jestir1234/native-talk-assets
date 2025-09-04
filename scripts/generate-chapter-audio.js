#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Audio speed configuration for language learners
// speaking_rate values:
// - 0.5 = Very slow (beginner level)
// - 0.6 = Slow (beginner-intermediate)
// - 0.75 = Normal (intermediate)
// - 1.0 = Fast (native speed)
// - 1.25 = Very fast (advanced)
const SPEAKING_RATE = 0.5; // Set to slow speed for beginners

async function callElevenLabsAPI(text, voiceId, modelId, speakingRate = 0.4) {
    const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`;
    
    const requestBody = {
        text: text,
        model_id: modelId,
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
        },
        speaking_rate: speakingRate
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
    
    // Check if chapter already has audio files
    if (fs.existsSync(audioOutputPath)) {
        const existingFiles = fs.readdirSync(audioOutputPath).filter(file => file.endsWith('.mp3'));
        if (existingFiles.length > 0) {
            console.log(`📁 Chapter ${chapterId} has ${existingFiles.length} existing audio files`);
            // Don't skip - we'll generate missing files
        }
    }
    
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
    
    // Find the chapter/page (support both structures)
    const chaptersOrPages = langData.chapters || langData.pages;
    const chapter = chaptersOrPages.find(ch => ch.id === chapterId);
    if (!chapter) {
        console.error(`❌ Chapter/Page ${chapterId} not found in language file`);
        return;
    }
    
    console.log(`📖 Found chapter: ${chapter.title}`);
    console.log(`🎤 Voice ID: ${audioMeta.voiceId}`);
    console.log(`🤖 Model ID: ${audioMeta.modelId}`);
    console.log(`🐌 Speaking rate: ${SPEAKING_RATE} (${SPEAKING_RATE < 0.7 ? 'Slow for beginners' : SPEAKING_RATE < 1.0 ? 'Normal speed' : 'Fast'})`);
    
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
    
    // Check for existing files and filter out already generated ones
    const existingFiles = fs.existsSync(audioOutputPath) 
        ? fs.readdirSync(audioOutputPath).filter(file => file.endsWith('.mp3'))
        : [];
    
    const existingNumbers = existingFiles.map(file => parseInt(file.replace('.mp3', '')));
    const missingNumbers = [];
    
    for (let i = 1; i <= sentences.length; i++) {
        if (!existingNumbers.includes(i)) {
            missingNumbers.push(i);
        }
    }
    
    if (missingNumbers.length === 0) {
        console.log(`⏭️  Skipping chapter ${chapterId} - all ${sentences.length} audio files already exist`);
        return { skipped: true, existingFiles: sentences.length };
    }
    
    console.log(`📝 Found ${sentences.length} sentences total, ${missingNumbers.length} missing files to generate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process only missing sentences
    for (const sentenceNumber of missingNumbers) {
        const sentence = sentences[sentenceNumber - 1]; // Convert to 0-based index
        
        console.log(`\n🎵 Processing sentence ${sentenceNumber}/${sentences.length}:`);
        console.log(`   Text: ${sentence.substring(0, 50)}${sentence.length > 50 ? '...' : ''}`);
        
        // Generate audio with slower speed for beginners
        const audioData = await callElevenLabsAPI(sentence, audioMeta.voiceId, audioMeta.modelId, SPEAKING_RATE);
        
        if (audioData) {
            // Create filename
            const filename = `${sentenceNumber}.mp3`;
            const filePath = path.join(audioOutputPath, filename);
            
            // Save audio file
            fs.writeFileSync(filePath, audioData);
            console.log(`   ✅ Saved: ${filename}`);
            successCount++;
            
            // Add delay to avoid rate limiting
            if (sentenceNumber !== missingNumbers[missingNumbers.length - 1]) {
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
        outputPath: audioOutputPath,
        skipped: false
    };
}

async function generateAllChapters(storyId, lang = 'en', useOriginalLanguage = true) {
    console.log(`🎵 Generating audio for ALL chapters in story: ${storyId}`);
    
    // Paths
    const storyPath = path.join(__dirname, '..', 'stories', storyId);
    const langFilePath = path.join(storyPath, 'lang', `${lang}.json`);
    
    // Check if language file exists
    if (!fs.existsSync(langFilePath)) {
        console.error(`❌ Language file not found: ${langFilePath}`);
        return;
    }
    
    // Load language file
    const langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    
    // Support both chapters and pages structures
    const chaptersOrPages = langData.chapters || langData.pages;
    const structureType = langData.chapters ? 'chapters' : 'pages';
    
    console.log(`📖 Found ${chaptersOrPages.length} ${structureType} in story`);
    
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    
    // Process each chapter/page
    for (const chapter of chaptersOrPages) {
        console.log(`\n📚 Processing ${structureType.slice(0, -1)}: ${chapter.id} - ${chapter.title}`);
        
        const result = await generateChapterAudio(storyId, chapter.id, lang, useOriginalLanguage);
        
        if (result.skipped) {
            totalSkipped++;
        } else {
            totalSuccess += result.successCount;
            totalErrors += result.errorCount;
        }
        
        // Add delay between chapters/pages
        if (chapter !== chaptersOrPages[chaptersOrPages.length - 1]) {
            console.log(`⏳ Waiting 2 seconds before next ${structureType.slice(0, -1)}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log(`\n🎉 All ${structureType} completed!`);
    console.log(`📊 Final Summary:`);
    console.log(`✅ Successfully generated: ${totalSuccess} files`);
    console.log(`❌ Failed: ${totalErrors} files`);
    console.log(`⏭️  Skipped ${structureType}: ${totalSkipped}`);
    
    return {
        totalSuccess,
        totalErrors,
        totalSkipped
    };
}

// Command line usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.error('Usage: node generate-chapter-audio.js <storyId> [chapterId] [language] [--translated] [--all-chapters]');
        console.error('');
        console.error('Single chapter/page:');
        console.error('  node generate-chapter-audio.js <storyId> <chapterId> [language] [--translated]');
        console.error('  Example: node generate-chapter-audio.js yuta-skipping-day ch1 en');
        console.error('  Example: node generate-chapter-audio.js sakana-to-tsuki 1 ja');
        console.error('  Example: node generate-chapter-audio.js lotus-bloom ch1 en --translated');
        console.error('');
        console.error('All chapters/pages:');
        console.error('  node generate-chapter-audio.js <storyId> --all-chapters [language] [--translated]');
        console.error('  Example: node generate-chapter-audio.js dam-rivals --all-chapters ja');
        console.error('  Example: node generate-chapter-audio.js sakana-to-tsuki --all-chapters ja');
        console.error('  Example: node generate-chapter-audio.js lotus-bloom --all-chapters en');
        console.error('');
        console.error('Note: By default, generates audio for original language text (keys)');
        console.error('      Use --translated flag to generate audio for translated text (values)');
        console.error('      Use --all-chapters to process all chapters/pages in the story');
        console.error('      Supports both "chapters" and "pages" structures in language files');
        process.exit(1);
    }
    
    const storyId = args[0];
    const useAllChapters = args.includes('--all-chapters');
    const useOriginalLanguage = !args.includes('--translated');
    
    if (useAllChapters) {
        // Extract language from args (skip --all-chapters and --translated)
        const lang = args.find(arg => !arg.startsWith('--') && arg !== storyId) || 'en';
        generateAllChapters(storyId, lang, useOriginalLanguage)
            .then(() => {
                console.log('\n🎉 All chapters audio generation completed!');
            })
            .catch(error => {
                console.error('❌ Error:', error.message);
                process.exit(1);
            });
    } else {
        // Single chapter mode
        if (args.length < 2) {
            console.error('❌ Chapter ID required when not using --all-chapters');
            process.exit(1);
        }
        
        const chapterId = args[1];
        const lang = args[2] || 'en';
        
        generateChapterAudio(storyId, chapterId, lang, useOriginalLanguage)
            .then(() => {
                console.log('\n🎉 Audio generation completed!');
            })
            .catch(error => {
                console.error('❌ Error:', error.message);
                process.exit(1);
            });
        }
}

module.exports = { generateChapterAudio, generateAllChapters };
