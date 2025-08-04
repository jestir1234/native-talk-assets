#!/usr/bin/env node

// Command: node scripts/copy/copy-dictionary.js ./dictionaries/english/en-v1.json ./dictionaries/english/zh-v1.json en zh

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BATCH_SIZE = 50; // Process 10 entries at a time
const DELAY_BETWEEN_BATCHES = 5000; // 2 seconds delay between batches

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

async function translateWithGemini(entries, sourceLanguage, targetLanguage) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }

    const prompt = `You are a language expert. For each ${sourceLanguage} word/phrase, provide the reading (if applicable), meaning in ${targetLanguage}, and grammatical type. 

The input contains ${sourceLanguage} words/phrases as keys. For each one, provide:
- reading: the phonetic reading (hiragana/katakana for Japanese, pinyin for Chinese, etc.) or leave empty if not applicable
- meaning: the meaning in ${targetLanguage}
- type: grammatical type (noun, verb, adjective, particle, etc.)
- form: grammatical form if applicable (leave empty if not applicable)

Return ONLY a valid JSON object with this exact structure for each entry:
{
    "reading": "phonetic reading or empty string",
    "meaning": "meaning in ${targetLanguage}",
    "type": "grammatical type",
    "form": "grammatical form if applicable"
}

${sourceLanguage} words to translate:
${JSON.stringify(entries, null, 2)}

Important: Return ONLY the JSON object, no other text or explanations.`;

    const raw = await callGemini(prompt);
    
    if (!raw) return null;

    // Clean up the response
    const cleaned = raw
        .replace(/```json\s*/i, '')
        .replace(/```/g, '')
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (parseError) {
        console.error('❌ Failed to parse Gemini response as JSON:', parseError.message);
        console.error('Raw response:', raw);
        return null;
    }
}

async function processDictionaryInBatches(dictionary, sourceLanguage, targetLanguage) {
    const entries = Object.entries(dictionary);
    const processedDictionary = { ...dictionary }; // Start with a copy of the original
    
    console.log(`Processing ${entries.length} entries in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const batchEntries = {};
        
        // Prepare batch for translation
        batch.forEach(([key, value]) => {
            batchEntries[key] = value;
        });
        
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)} (${batch.length} entries)...`);
        
        try {
            const translations = await translateWithGemini(batchEntries, sourceLanguage, targetLanguage);
            
            if (!translations) {
                console.error(`❌ Failed to get translations for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
                console.log('Continuing with next batch...');
                continue;
            }
            
            // Apply translations to the dictionary
            for (const [key, translation] of Object.entries(translations)) {
                if (processedDictionary[key]) {
                    // Update existing entry with translations
                    if (translation.reading) processedDictionary[key].reading = translation.reading;
                    if (translation.meaning) processedDictionary[key].meaning = translation.meaning;
                    if (translation.type) processedDictionary[key].type = translation.type;
                    if (translation.form) processedDictionary[key].form = translation.form;
                }
            }
            
            console.log(`✅ Successfully processed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
            
            // Add delay between batches to avoid rate limiting
            if (i + BATCH_SIZE < entries.length) {
                console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                await sleep(DELAY_BETWEEN_BATCHES);
            }
            
        } catch (error) {
            console.error(`❌ Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
            console.log('Continuing with next batch...');
        }
    }
    
    return processedDictionary;
}

async function copyAndTranslateDictionary(sourcePath, targetPath, sourceLanguage, targetLanguage) {
    try {
        // Check if source file exists
        if (!fs.existsSync(sourcePath)) {
            console.error(`Error: Source file does not exist: ${sourcePath}`);
            process.exit(1);
        }

        // Read the source dictionary
        const sourceData = fs.readFileSync(sourcePath, 'utf8');
        const sourceDictionary = JSON.parse(sourceData);

        // Check if target file exists and load existing entries
        let existingDictionary = {};
        if (fs.existsSync(targetPath)) {
            try {
                const targetData = fs.readFileSync(targetPath, 'utf8');
                existingDictionary = JSON.parse(targetData);
                console.log(`Found existing target file with ${Object.keys(existingDictionary).length} entries`);
            } catch (error) {
                console.error(`Error reading existing target file: ${error.message}`);
                console.log('Will create new target file');
            }
        }

        // Filter out entries that already have translations
        const entriesToProcess = {};
        const skippedEntries = [];
        
        for (const [key, value] of Object.entries(sourceDictionary)) {
            const existingEntry = existingDictionary[key];
            
            // Check if entry already exists and has translations
            if (existingEntry && 
                existingEntry.reading && 
                existingEntry.meaning && 
                existingEntry.type) {
                // Entry already has translations, skip it
                skippedEntries.push(key);
                entriesToProcess[key] = existingEntry; // Keep existing translation
            } else {
                // Entry needs translation or doesn't exist
                const clearedEntry = { ...value };
                
                // Clear reading, meaning, and type fields if they exist
                if ('reading' in clearedEntry) {
                    clearedEntry.reading = '';
                }
                if ('meaning' in clearedEntry) {
                    clearedEntry.meaning = '';
                }
                if ('type' in clearedEntry) {
                    clearedEntry.type = '';
                }
                if ('form' in clearedEntry) {
                    clearedEntry.form = '';
                }
                
                entriesToProcess[key] = clearedEntry;
            }
        }

        console.log(`Total source entries: ${Object.keys(sourceDictionary).length}`);
        console.log(`Entries to process: ${Object.keys(entriesToProcess).length - skippedEntries.length}`);
        console.log(`Entries skipped (already translated): ${skippedEntries.length}`);

        if (skippedEntries.length > 0) {
            console.log(`Skipped entries: ${skippedEntries.slice(0, 10).join(', ')}${skippedEntries.length > 10 ? '...' : ''}`);
        }

        // Ensure target directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // If no entries need processing, just save the existing dictionary
        if (Object.keys(entriesToProcess).length === skippedEntries.length) {
            console.log('All entries already have translations. No processing needed.');
            fs.writeFileSync(targetPath, JSON.stringify(entriesToProcess, null, 4), 'utf8');
            return;
        }

        // Write the current state to target file
        fs.writeFileSync(targetPath, JSON.stringify(entriesToProcess, null, 4), 'utf8');
        
        console.log(`Successfully prepared dictionary:`);
        console.log(`Source: ${sourcePath}`);
        console.log(`Target: ${targetPath}`);
        console.log(`Source Language: ${sourceLanguage}`);
        console.log(`Target Language: ${targetLanguage}`);

        // Now translate only the entries that need translation
        const entriesNeedingTranslation = {};
        for (const [key, value] of Object.entries(entriesToProcess)) {
            if (!skippedEntries.includes(key)) {
                entriesNeedingTranslation[key] = value;
            }
        }

        if (Object.keys(entriesNeedingTranslation).length === 0) {
            console.log('No entries need translation. Dictionary is complete.');
            return;
        }

        // Now translate the dictionary using Gemini
        console.log('\nStarting translation with Gemini API...');
        const translatedDictionary = await processDictionaryInBatches(entriesNeedingTranslation, sourceLanguage, targetLanguage);
        
        // Merge translated entries back with existing entries
        const finalDictionary = { ...entriesToProcess };
        for (const [key, translation] of Object.entries(translatedDictionary)) {
            if (finalDictionary[key]) {
                // Update existing entry with translations
                if (translation.reading) finalDictionary[key].reading = translation.reading;
                if (translation.meaning) finalDictionary[key].meaning = translation.meaning;
                if (translation.type) finalDictionary[key].type = translation.type;
                if (translation.form) finalDictionary[key].form = translation.form;
            }
        }
        
        // Write the final dictionary back to the target file
        fs.writeFileSync(targetPath, JSON.stringify(finalDictionary, null, 4), 'utf8');
        
        console.log('\n✅ Translation completed successfully!');
        console.log(`Final dictionary saved to: ${targetPath}`);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Check command line arguments
if (process.argv.length !== 6) {
    console.error('Usage: node copy-dictionary.js <source-path> <target-path> <source-language> <target-language>');
    console.error('Example: node copy-dictionary.js ./dictionaries/japanese/en-v1.json ./dictionaries/japanese/zh-v1.json en zh');
    console.error('Make sure to set GEMINI_API_KEY environment variable');
    process.exit(1);
}

const sourcePath = process.argv[2];
const targetPath = process.argv[3];
const sourceLanguage = process.argv[4];
const targetLanguage = process.argv[5];

copyAndTranslateDictionary(sourcePath, targetPath, sourceLanguage, targetLanguage); 