#!/usr/bin/env node

// Command: node scripts/copy/copy-chapter.js ./stories/yuta-skipping-day/lang/en.json ./stories/yuta-skipping-day/lang/zh.json zh chapter-1 [--force]

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DELAY_BETWEEN_CALLS = 1000; // 1 second delay between API calls
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between sentence batches

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function translateWithGemini(text, targetLanguage) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }

    const prompt = `You are a professional translator. Translate the following text into natural ${targetLanguage}.

Text to translate: "${text}"

Return ONLY the translated text, no other text or explanations.`;

    const raw = await callGemini(prompt);
    
    if (!raw) return null;

    // Clean up the response
    const cleaned = raw
        .replace(/```json\s*/i, '')
        .replace(/```/g, '')
        .trim();

    // Add delay to prevent rate limiting
    await sleep(DELAY_BETWEEN_CALLS);

    return cleaned;
}

async function translateSentencesBatch(sentences, targetLanguage) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }

    const prompt = `You are a professional translator. Translate the following texts into natural ${targetLanguage}.

Return ONLY a valid JSON object where the keys are the original texts and the values are the translations in ${targetLanguage}.

Ex: { "そして、少しだけ苦しそうな声を出してみた。": translation in ${targetLanguage} }

Texts to translate:
${JSON.stringify(sentences, null, 2)}

Important: Return ONLY the JSON object, no other text or explanations.`;

    const raw = await callGemini(prompt);
    
    if (!raw) return null;

    // Clean up the response
    const cleaned = raw
        .replace(/```json\s*/i, '')
        .replace(/```/g, '')
        .trim();

    try {
        const result = JSON.parse(cleaned);
        
        // Add delay to prevent rate limiting
        await sleep(DELAY_BETWEEN_CALLS);
        
        return result;
    } catch (parseError) {
        console.error('❌ Failed to parse Gemini response as JSON:', parseError.message);
        console.error('Raw response:', raw);
        return null;
    }
}

async function copyChapter(sourcePath, targetPath, targetLanguage, chapterId) {
    try {
        // Check if source file exists
        if (!fs.existsSync(sourcePath)) {
            console.error(`Error: Source file does not exist: ${sourcePath}`);
            process.exit(1);
        }

        // Read the source story
        const sourceData = fs.readFileSync(sourcePath, 'utf8');
        const story = JSON.parse(sourceData);

        // Find the specific chapter
        const chapter = story.chapters.find(c => c.id === chapterId);
        if (!chapter) {
            console.error(`Error: Chapter with id "${chapterId}" not found in the story`);
            console.log(`Available chapters: ${story.chapters.map(c => c.id).join(', ')}`);
            process.exit(1);
        }

        console.log(`📖 Found chapter: "${chapter.title}" (${chapter.id})`);

        // Check if target file exists and load existing translations
        let existingTranslations = null;
        
        if (fs.existsSync(targetPath)) {
            try {
                const targetData = fs.readFileSync(targetPath, 'utf8');
                existingTranslations = JSON.parse(targetData);
                console.log(`📁 Found existing translations at: ${targetPath}`);
            } catch (error) {
                console.log(`⚠️  Found target file but couldn't parse it, starting fresh: ${targetPath}`);
            }
        } else {
            console.log(`📁 No existing translations found, creating new file: ${targetPath}`);
        }

        // Check if this chapter already exists in translations
        const existingChapter = existingTranslations?.chapters?.find(c => c.id === chapterId);
        
        // Check if force flag is provided
        const forceRetranslate = process.argv.includes('--force');
        
        if (existingChapter && !forceRetranslate) {
            // Check if the chapter content has changed
            const sourceSentenceKeys = Object.keys(chapter.sentences);
            const existingSentenceKeys = Object.keys(existingChapter.sentences);
            
            // Check if all sentences exist and match
            const allSentencesExist = sourceSentenceKeys.every(key => 
                existingChapter.sentences[key] && 
                existingChapter.sentences[key] !== key // Make sure it's actually translated, not just the original
            );
            
            if (allSentencesExist && 
                existingChapter.title !== chapter.title && 
                existingChapter.description !== chapter.description) {
                console.log(`✅ Chapter already fully translated, no updates needed`);
                console.log(`💡 Use --force flag to re-translate anyway`);
                return;
            } else {
                console.log(`🔄 Chapter exists but needs updates, re-translating...`);
            }
        }
        
        if (forceRetranslate) {
            console.log(`🔄 Force flag detected, re-translating chapter...`);
        }

        // Extract chapter title and description
        const chapterTitle = chapter.title;
        const chapterDescription = chapter.description;
        
        console.log(`📝 Chapter details:`);
        console.log(`  Title: "${chapterTitle}"`);
        console.log(`  Description: "${chapterDescription}"`);
        
        // Check if title and description need translation
        let translatedChapterTitle = existingChapter?.title;
        let translatedChapterDescription = existingChapter?.description;
        
        if (!translatedChapterTitle || translatedChapterTitle === chapterTitle || forceRetranslate) {
            console.log(`🌐 Translating chapter title to ${targetLanguage}...`);
            const newTranslatedTitle = await translateWithGemini(chapterTitle, targetLanguage);
            if (newTranslatedTitle) {
                translatedChapterTitle = newTranslatedTitle;
                console.log(`✅ Chapter Title translated: "${chapterTitle}" → "${translatedChapterTitle}"`);
            }
        } else {
            console.log(`✅ Chapter Title already translated: "${translatedChapterTitle}"`);
        }
        
        if (!translatedChapterDescription || translatedChapterDescription === chapterDescription || forceRetranslate) {
            console.log(`🌐 Translating chapter description to ${targetLanguage}...`);
            const newTranslatedDescription = await translateWithGemini(chapterDescription, targetLanguage);
            if (newTranslatedDescription) {
                translatedChapterDescription = newTranslatedDescription;
                console.log(`✅ Chapter Description translated: "${chapterDescription}" → "${translatedChapterDescription}"`);
            }
        } else {
            console.log(`✅ Chapter Description already translated: "${translatedChapterDescription}"`);
        }
        
        // Create translated chapter structure
        const translatedChapter = {
            id: chapter.id,
            title: translatedChapterTitle || chapter.title,
            description: translatedChapterDescription || chapter.description,
            sentences: existingChapter?.sentences || {}
        };
        
        // Extract and translate sentence keys
        const sentenceKeys = Object.keys(chapter.sentences);
        console.log(`📝 Processing ${sentenceKeys.length} sentences in batches of 50...`);
        
        // Filter out sentences that are already translated (unless force flag is used)
        const untranslatedSentences = sentenceKeys.filter(key => {
            const existingTranslation = existingChapter?.sentences?.[key];
            return forceRetranslate || !existingTranslation || existingTranslation === key;
        });
        
        if (untranslatedSentences.length === 0 && !forceRetranslate) {
            console.log(`✅ All sentences already translated, skipping sentence translation`);
        } else {
            const message = forceRetranslate 
                ? `📝 Force flag active, re-translating all ${sentenceKeys.length} sentences`
                : `📝 Found ${untranslatedSentences.length} untranslated sentences out of ${sentenceKeys.length} total`;
            console.log(message);
            
            for (let j = 0; j < untranslatedSentences.length; j += 50) {
                const batch = untranslatedSentences.slice(j, j + 50);
                const batchNumber = Math.floor(j / 50) + 1;
                const totalBatches = Math.ceil(untranslatedSentences.length / 50);
                
                console.log(`  Processing batch ${batchNumber}/${totalBatches} (${batch.length} sentences)...`);
                
                // Create batch object for translation
                const batchObject = {};
                batch.forEach(key => {
                    batchObject[key] = key; // Use the key as the text to translate
                });
                
                const translations = await translateSentencesBatch(batchObject, targetLanguage);
                
                if (translations) {
                    console.log(`  ✅ Batch ${batchNumber} translated successfully`);
                    // Log a few examples
                    const examples = Object.entries(translations).slice(0, 3);
                    examples.forEach(([original, translated]) => {
                        console.log(`    "${original}" → "${translated}"`);
                    });
                    if (Object.keys(translations).length > 3) {
                        console.log(`    ... and ${Object.keys(translations).length - 3} more`);
                    }
                    
                    // Apply translations to the chapter sentences
                    for (const [original, translated] of Object.entries(translations)) {
                        translatedChapter.sentences[original] = translated;
                    }
                } else {
                    console.log(`  ❌ Failed to translate batch ${batchNumber}`);
                    // Keep original sentences if translation fails
                    batch.forEach(key => {
                        translatedChapter.sentences[key] = chapter.sentences[key];
                    });
                }
                
                // Add delay between batches
                if (j + 50 < untranslatedSentences.length) {
                    console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                    await sleep(DELAY_BETWEEN_BATCHES);
                }
            }
        }

        // Prepare the final story structure
        let finalStory = existingTranslations || {
            title: story.title,
            description: story.description,
            chapters: []
        };

        // Update or add the chapter
        const existingChapterIndex = finalStory.chapters.findIndex(c => c.id === chapterId);
        if (existingChapterIndex !== -1) {
            finalStory.chapters[existingChapterIndex] = translatedChapter;
            console.log(`📝 Updated existing chapter in story`);
        } else {
            finalStory.chapters.push(translatedChapter);
            console.log(`📝 Added new chapter to story`);
        }

        // Ensure target directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Write the translated story to target file
        fs.writeFileSync(targetPath, JSON.stringify(finalStory, null, 2), 'utf8');
        
        console.log(`\n✅ Successfully updated chapter translation:`);
        console.log(`Source: ${sourcePath}`);
        console.log(`Target: ${targetPath}`);
        console.log(`Target Language: ${targetLanguage}`);
        console.log(`Chapter: ${chapterId}`);
        console.log(`Translated Title: "${translatedChapter.title}"`);
        console.log(`Translated Description: "${translatedChapter.description}"`);
        console.log(`Sentences: ${Object.keys(translatedChapter.sentences).length}`);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Check command line arguments
if (process.argv.length < 6) {
    console.error('Usage: node copy-chapter.js <source-path> <target-path> <target-language> <chapter-id> [--force]');
    console.error('Example: node copy-chapter.js ./stories/yuta-skipping-day/lang/en.json ./stories/yuta-skipping-day/lang/zh.json zh chapter-1');
    console.error('Example with force: node copy-chapter.js ./stories/yuta-skipping-day/lang/en.json ./stories/yuta-skipping-day/lang/zh.json zh chapter-1 --force');
    console.error('Make sure to set GEMINI_API_KEY environment variable');
    process.exit(1);
}

const sourcePath = process.argv[2];
const targetPath = process.argv[3];
const targetLanguage = process.argv[4];
const chapterId = process.argv[5];

copyChapter(sourcePath, targetPath, targetLanguage, chapterId); 