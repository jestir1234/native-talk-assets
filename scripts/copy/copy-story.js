#!/usr/bin/env node

// Command: node scripts/copy-story.js ./stories/yuta-skipping-day/lang/en.json ./stories/yuta-skipping-day/lang/zh.json zh

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DELAY_BETWEEN_CALLS = 1000; // 1 second delay between API calls
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between sentence batches
const DELAY_BETWEEN_CHAPTERS = 5000; // 3 seconds delay between chapters

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

async function copyStory(sourcePath, targetPath, targetLanguage) {
    try {
        // Check if source file exists
        if (!fs.existsSync(sourcePath)) {
            console.error(`Error: Source file does not exist: ${sourcePath}`);
            process.exit(1);
        }

        // Read the source story
        const sourceData = fs.readFileSync(sourcePath, 'utf8');
        const story = JSON.parse(sourceData);

        // Check if target file exists and load existing translations
        let existingTranslations = null;
        let translatedStory = null;
        
        if (fs.existsSync(targetPath)) {
            try {
                const targetData = fs.readFileSync(targetPath, 'utf8');
                existingTranslations = JSON.parse(targetData);
                console.log(`📁 Found existing translations at: ${targetPath}`);
                console.log(`📊 Existing translations: ${existingTranslations.chapters?.length || 0} chapters`);
            } catch (error) {
                console.log(`⚠️  Found target file but couldn't parse it, starting fresh: ${targetPath}`);
            }
        } else {
            console.log(`📁 No existing translations found, creating new file: ${targetPath}`);
        }

        // Extract title and description
        const title = story.title;
        const description = story.description;
        
        console.log(`📖 Extracted story metadata:`);
        console.log(`Title: "${title}"`);
        console.log(`Description: "${description}"`);

        // Check if title and description need translation
        let translatedTitle = existingTranslations?.title;
        let translatedDescription = existingTranslations?.description;
        
        if (!translatedTitle || translatedTitle === title) {
            console.log(`\n🌐 Translating title to ${targetLanguage}...`);
            translatedTitle = await translateWithGemini(title, targetLanguage);
            if (translatedTitle) {
                console.log(`✅ Title translated: "${title}" → "${translatedTitle}"`);
            }
        } else {
            console.log(`✅ Title already translated: "${translatedTitle}"`);
        }
        
        if (!translatedDescription || translatedDescription === description) {
            console.log(`\n🌐 Translating description to ${targetLanguage}...`);
            translatedDescription = await translateWithGemini(description, targetLanguage);
            if (translatedDescription) {
                console.log(`✅ Description translated: "${description}" → "${translatedDescription}"`);
            }
        } else {
            console.log(`✅ Description already translated: "${translatedDescription}"`);
        }

        // Create the translated story structure
        translatedStory = {
            title: translatedTitle || story.title,
            description: translatedDescription || story.description,
            chapters: existingTranslations?.chapters || []
        };
        
        // Loop through chapters and translate their titles and descriptions
        console.log(`\n📖 Processing ${story.chapters.length} chapters...`);
        
        for (let i = 0; i < story.chapters.length; i++) {
            const chapter = story.chapters[i];
            console.log(`\n📝 Chapter ${i + 1}/${story.chapters.length}: "${chapter.title}"`);
            
            // Check if this chapter already exists in translations
            const existingChapter = existingTranslations?.chapters?.find(c => c.id === chapter.id);
            
            if (existingChapter) {
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
                    console.log(`  ✅ Chapter already fully translated, skipping...`);
                    translatedStory.chapters[i] = existingChapter;
                    continue;
                } else {
                    console.log(`  🔄 Chapter exists but needs updates, re-translating...`);
                }
            }
            
            // Extract chapter title and description
            const chapterTitle = chapter.title;
            const chapterDescription = chapter.description;
            
            console.log(`  Title: "${chapterTitle}"`);
            console.log(`  Description: "${chapterDescription}"`);
            
            // Check if title and description need translation
            let translatedChapterTitle = existingChapter?.title;
            let translatedChapterDescription = existingChapter?.description;
            
            if (!translatedChapterTitle || translatedChapterTitle === chapterTitle) {
                const newTranslatedTitle = await translateWithGemini(chapterTitle, targetLanguage);
                if (newTranslatedTitle) {
                    translatedChapterTitle = newTranslatedTitle;
                    console.log(`  ✅ Chapter Title translated: "${chapterTitle}" → "${translatedChapterTitle}"`);
                }
            } else {
                console.log(`  ✅ Chapter Title already translated: "${translatedChapterTitle}"`);
            }
            
            if (!translatedChapterDescription || translatedChapterDescription === chapterDescription) {
                const newTranslatedDescription = await translateWithGemini(chapterDescription, targetLanguage);
                if (newTranslatedDescription) {
                    translatedChapterDescription = newTranslatedDescription;
                    console.log(`  ✅ Chapter Description translated: "${chapterDescription}" → "${translatedChapterDescription}"`);
                }
            } else {
                console.log(`  ✅ Chapter Description already translated: "${translatedChapterDescription}"`);
            }
            
            // Create translated chapter structure
            const translatedChapter = {
                id: chapter.id,
                title: translatedChapterTitle || chapter.title,
                description: translatedChapterDescription || chapter.description,
                sentences: existingChapter?.sentences || {}
            };
            
            // Add delay between chapters
            if (i + 1 < story.chapters.length) {
                console.log(`  ⏳ Waiting ${DELAY_BETWEEN_CHAPTERS}ms before next chapter...`);
                await sleep(DELAY_BETWEEN_CHAPTERS);
            }
            
            // Extract and translate sentence keys
            const sentenceKeys = Object.keys(chapter.sentences);
            console.log(`  📝 Processing ${sentenceKeys.length} sentences in batches of 50...`);
            
            // Filter out sentences that are already translated
            const untranslatedSentences = sentenceKeys.filter(key => {
                const existingTranslation = existingChapter?.sentences?.[key];
                return !existingTranslation || existingTranslation === key;
            });
            
            if (untranslatedSentences.length === 0) {
                console.log(`  ✅ All sentences already translated, skipping sentence translation`);
            } else {
                console.log(`  📝 Found ${untranslatedSentences.length} untranslated sentences out of ${sentenceKeys.length} total`);
                
                for (let j = 0; j < untranslatedSentences.length; j += 50) {
                    const batch = untranslatedSentences.slice(j, j + 50);
                    const batchNumber = Math.floor(j / 50) + 1;
                    const totalBatches = Math.ceil(untranslatedSentences.length / 50);
                    
                    console.log(`    Processing batch ${batchNumber}/${totalBatches} (${batch.length} sentences)...`);
                    
                    // Create batch object for translation
                    const batchObject = {};
                    batch.forEach(key => {
                        batchObject[key] = key; // Use the key as the text to translate
                    });
                    
                    const translations = await translateSentencesBatch(batchObject, targetLanguage);
                    
                    if (translations) {
                        console.log(`    ✅ Batch ${batchNumber} translated successfully`);
                        // Log a few examples
                        const examples = Object.entries(translations).slice(0, 3);
                        examples.forEach(([original, translated]) => {
                            console.log(`      "${original}" → "${translated}"`);
                        });
                        if (Object.keys(translations).length > 3) {
                            console.log(`      ... and ${Object.keys(translations).length - 3} more`);
                        }
                        
                        // Apply translations to the chapter sentences
                        for (const [original, translated] of Object.entries(translations)) {
                            translatedChapter.sentences[original] = translated;
                        }
                    } else {
                        console.log(`    ❌ Failed to translate batch ${batchNumber}`);
                        // Keep original sentences if translation fails
                        batch.forEach(key => {
                            translatedChapter.sentences[key] = chapter.sentences[key];
                        });
                    }
                    
                    // Add delay between batches
                    if (j + 50 < untranslatedSentences.length) {
                        console.log(`    ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                        await sleep(DELAY_BETWEEN_BATCHES);
                    }
                }
            }
            
            // Add the translated chapter to the story
            translatedStory.chapters[i] = translatedChapter;
        }

        // Ensure target directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Write the translated story to target file
        fs.writeFileSync(targetPath, JSON.stringify(translatedStory, null, 2), 'utf8');
        
        console.log(`\n✅ Successfully created/updated translated story:`);
        console.log(`Source: ${sourcePath}`);
        console.log(`Target: ${targetPath}`);
        console.log(`Target Language: ${targetLanguage}`);
        console.log(`Chapters: ${translatedStory.chapters.length}`);
        console.log(`Translated Title: "${translatedStory.title}"`);
        console.log(`Translated Description: "${translatedStory.description}"`);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Check command line arguments
if (process.argv.length !== 5) {
    console.error('Usage: node copy-story.js <source-path> <target-path> <target-language>');
    console.error('Example: node copy-story.js ./stories/yuta-skipping-day/lang/en.json ./stories/yuta-skipping-day/lang/zh.json zh');
    console.error('Make sure to set GEMINI_API_KEY environment variable');
    process.exit(1);
}

const sourcePath = process.argv[2];
const targetPath = process.argv[3];
const targetLanguage = process.argv[4];

copyStory(sourcePath, targetPath, targetLanguage); 