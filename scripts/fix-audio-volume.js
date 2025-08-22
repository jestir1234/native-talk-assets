const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function fixAudioVolume(storyId, chapterId = null, volumeBoost = 3) {
    console.log(`🔊 Fixing audio volume for story: ${storyId}`);
    console.log(`📈 Volume boost: +${volumeBoost}dB`);
    
    const storyPath = path.join(__dirname, '..', 'stories', storyId);
    const audioPath = path.join(storyPath, 'audio');
    
    // Check if audio directory exists
    if (!fs.existsSync(audioPath)) {
        console.error(`❌ Audio directory not found: ${audioPath}`);
        return;
    }
    
    let chaptersToProcess = [];
    
    if (chapterId) {
        // Process specific chapter
        const chapterPath = path.join(audioPath, chapterId);
        if (fs.existsSync(chapterPath)) {
            chaptersToProcess.push(chapterId);
        } else {
            console.error(`❌ Chapter directory not found: ${chapterPath}`);
            return;
        }
    } else {
        // Process all chapters
        const chapters = fs.readdirSync(audioPath)
            .filter(item => fs.statSync(path.join(audioPath, item)).isDirectory())
            .filter(item => item.startsWith('ch'));
        
        chaptersToProcess = chapters.sort();
    }
    
    console.log(`📁 Found ${chaptersToProcess.length} chapters to process`);
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    
    for (const chapter of chaptersToProcess) {
        const chapterPath = path.join(audioPath, chapter);
        const mp3Files = fs.readdirSync(chapterPath)
            .filter(file => file.endsWith('.mp3'))
            .sort((a, b) => {
                const numA = parseInt(a.replace('.mp3', ''));
                const numB = parseInt(b.replace('.mp3', ''));
                return numA - numB;
            });
        
        console.log(`\n🎵 Processing chapter ${chapter}: ${mp3Files.length} files`);
        
        for (const mp3File of mp3Files) {
            const inputPath = path.join(chapterPath, mp3File);
            const outputPath = path.join(chapterPath, `temp_${mp3File}`);
            
            try {
                // Use ffmpeg to normalize and boost volume
                // -af "loudnorm=I=-16:TP=-1.5:LRA=11,volume=${volumeBoost}dB" normalizes to -16 LUFS and adds volume boost
                const ffmpegCommand = `ffmpeg -i "${inputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11,volume=${volumeBoost}dB" -y "${outputPath}"`;
                
                console.log(`   🔊 Processing: ${mp3File}`);
                execSync(ffmpegCommand, { stdio: 'pipe' });
                
                // Replace original with processed file
                fs.unlinkSync(inputPath);
                fs.renameSync(outputPath, inputPath);
                
                console.log(`   ✅ Fixed: ${mp3File}`);
                totalProcessed++;
                
            } catch (error) {
                console.error(`   ❌ Error processing ${mp3File}:`, error.message);
                // Clean up temp file if it exists
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            }
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully processed: ${totalProcessed} files`);
    console.log(`⏭️  Skipped: ${totalSkipped} files`);
    console.log(`🎉 Volume fix completed!`);
}

// Command line usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.error('Usage: node fix-audio-volume.js <storyId> [chapterId] [volumeBoost]');
        console.error('Example: node fix-audio-volume.js waves-and-hoops');
        console.error('Example: node fix-audio-volume.js waves-and-hoops ch1');
        console.error('Example: node fix-audio-volume.js waves-and-hoops ch1 5');
        console.error('');
        console.error('Note: volumeBoost is in dB (default: 3dB)');
        process.exit(1);
    }
    
    const storyId = args[0];
    const chapterId = args[1] || null;
    const volumeBoost = parseInt(args[2]) || 3;
    
    fixAudioVolume(storyId, chapterId, volumeBoost)
        .then(() => {
            console.log('\n🎉 Volume fix completed!');
        })
        .catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = { fixAudioVolume };
