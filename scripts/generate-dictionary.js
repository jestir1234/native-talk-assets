require('dotenv').config();
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node generate-dictionary.js <source_language> <target_language>');
    console.error('Example: node generate-dictionary.js en ja');
    console.error('Example: node generate-dictionary.js ja en');
    process.exit(1);
}

const sourceLang = args[0];
const targetLang = args[1];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const INPUT_FILE = path.resolve(__dirname, './missing_words.txt');
const OUTPUT_FILE = path.resolve(__dirname, `./dictionary_entries_output_${targetLang}.json`);
const BATCH_SIZE = 100;

console.log(`🔄 Generating dictionary from ${sourceLang} to ${targetLang}`);
console.log('GEMINI_API_KEY', GEMINI_API_KEY);

// Language-specific configurations
const languageConfigs = {
    'en': {
        name: 'English',
        readingField: 'reading',
        meaningField: 'meaning',
        typeField: 'type'
    },
    'ja': {
        name: 'Japanese',
        readingField: 'reading',
        meaningField: 'meaning', 
        typeField: 'type'
    },
    'ko': {
        name: 'Korean',
        readingField: 'reading',
        meaningField: 'meaning',
        typeField: 'type'
    },
    'zh': {
        name: 'Chinese',
        readingField: 'reading',
        meaningField: 'meaning',
        typeField: 'type'
    },
    'es': {
        name: 'Spanish',
        readingField: 'reading',
        meaningField: 'meaning',
        typeField: 'type'
    },
    'vi': {
        name: 'Vietnamese',
        readingField: 'reading',
        meaningField: 'meaning',
        typeField: 'type'
    }
};

const sourceConfig = languageConfigs[sourceLang];
const targetConfig = languageConfigs[targetLang];

if (!sourceConfig || !targetConfig) {
    console.error(`❌ Unsupported language pair: ${sourceLang} to ${targetLang}`);
    console.error('Supported languages:', Object.keys(languageConfigs).join(', '));
    process.exit(1);
}

const promptTemplate = (words) => `
You're a multilingual dictionary assistant. For each ${sourceConfig.name} word below, generate a ${targetConfig.name} dictionary entry in this format:

{
  "word": {
    "${targetConfig.readingField}": "${targetLang === 'ja' ? 'カタカナ' : 'pronunciation'}",
    "${targetConfig.meaningField}": "${targetConfig.name} translation or short explanation",
    "${targetConfig.typeField}": "${targetLang === 'ja' ? '品詞 (like 名詞, 動詞, etc.)' : 'part of speech'}"
  }
}

Only return a single JSON object containing all entries. Words: ${words.join(', ')}
`;

async function fetchGeminiResponse(prompt) {
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
        return text || null;
    } catch (err) {
        console.error('❌ API Error:', err.message);
        return null;
    }
}

async function run() {
    const words = fs.readFileSync(INPUT_FILE, 'utf-8')
        .split(/\r?\n/)
        .map(w => w.trim())
        .filter(Boolean);

    const allResults = {};

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
        const batch = words.slice(i, i + BATCH_SIZE);
        console.log(`🔎 Processing batch ${i / BATCH_SIZE + 1}: ${batch.length} words...`);

        const prompt = promptTemplate(batch);
        const response = await fetchGeminiResponse(prompt);

        if (!response) {
            console.error('⚠️ Skipping batch due to error.');
            continue;
        }

        try {
            const cleaned = response
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const parsed = JSON.parse(cleaned);
            
            // Validate and filter entries
            const validEntries = {};
            let validCount = 0;
            let invalidCount = 0;
            
            for (const [word, entry] of Object.entries(parsed)) {
                // Check if entry has the required structure (either flat or nested)
                let reading, meaning, type;
                
                if (entry && typeof entry === 'object') {
                    // Try nested structure first (word.reading, word.meaning, word.type)
                    if (entry.word && typeof entry.word === 'object') {
                        reading = entry.word[targetConfig.readingField];
                        meaning = entry.word[targetConfig.meaningField];
                        type = entry.word[targetConfig.typeField];
                    } else {
                        // Try flat structure (direct reading, meaning, type)
                        reading = entry[targetConfig.readingField];
                        meaning = entry[targetConfig.meaningField];
                        type = entry[targetConfig.typeField];
                    }
                    
                    if (reading && meaning && type) {
                        // Additional validation for Japanese
                        if (targetLang === 'ja') {
                            // Check if reading contains valid Japanese characters
                            const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(reading);
                            
                            // Check if meaning is not empty and not just placeholder text
                            const hasValidMeaning = meaning && 
                                meaning.length > 0 && 
                                !meaning.includes('pronunciation') &&
                                !meaning.includes('カタカナ') &&
                                !meaning.includes('品詞');
                            
                            // Check if type is not empty and not just placeholder text
                            const hasValidType = type && 
                                type.length > 0 && 
                                !type.includes('pronunciation') &&
                                !type.includes('カタカナ') &&
                                !type.includes('品詞');
                            
                            if (hasJapaneseChars && hasValidMeaning && hasValidType) {
                                // Use flat structure to match existing dictionary format
                                validEntries[word] = {
                                    [targetConfig.readingField]: reading,
                                    [targetConfig.meaningField]: meaning,
                                    [targetConfig.typeField]: type
                                };
                                validCount++;
                            } else {
                                invalidCount++;
                                console.log(`⚠️  Skipping invalid entry for "${word}": reading="${reading}", meaning="${meaning}", type="${type}"`);
                            }
                        } else {
                            // For non-Japanese languages, basic validation
                            if (reading.length > 0 && meaning.length > 0 && type.length > 0) {
                                // Use flat structure to match existing dictionary format
                                validEntries[word] = {
                                    [targetConfig.readingField]: reading,
                                    [targetConfig.meaningField]: meaning,
                                    [targetConfig.typeField]: type
                                };
                                validCount++;
                            } else {
                                invalidCount++;
                                console.log(`⚠️  Skipping invalid entry for "${word}": reading="${reading}", meaning="${meaning}", type="${type}"`);
                            }
                        }
                    } else {
                        invalidCount++;
                        console.log(`⚠️  Skipping malformed entry for "${word}": missing required fields`);
                    }
                } else {
                    invalidCount++;
                    console.log(`⚠️  Skipping malformed entry for "${word}":`, entry);
                }
            }
            
            console.log(`✅ Valid entries: ${validCount}, Invalid entries: ${invalidCount}`);
            Object.assign(allResults, validEntries);
            
        } catch (err) {
            console.error('❌ JSON parse error:', err.message);
            console.error('📝 Raw Response:', response);
            
            // Try to extract individual valid entries from malformed JSON
            try {
                const individualEntries = extractIndividualEntries(response, batch);
                if (Object.keys(individualEntries).length > 0) {
                    console.log(`🔄 Extracted ${Object.keys(individualEntries).length} individual entries from malformed response`);
                    Object.assign(allResults, individualEntries);
                }
            } catch (extractErr) {
                console.error('❌ Failed to extract individual entries:', extractErr.message);
            }
        }

        await new Promise((res) => setTimeout(res, 1000)); // delay to avoid rate limiting
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2), 'utf-8');
    console.log(`✅ Done. Dictionary entries saved to ${OUTPUT_FILE}`);
}

// Helper function to extract individual valid entries from malformed JSON
function extractIndividualEntries(response, batch) {
    const validEntries = {};
    
    // Try to find individual JSON objects in the response
    const jsonPattern = /\{[^{}]*"word"[^{}]*\{[^{}]*"[^"]*"[^{}]*"[^"]*"[^{}]*"[^"]*"[^{}]*\}/g;
    const matches = response.match(jsonPattern);
    
    if (matches) {
        for (const match of matches) {
            try {
                const entry = JSON.parse(match);
                // Validate the extracted entry
                for (const [word, data] of Object.entries(entry)) {
                    let reading, meaning, type;
                    
                    if (data && typeof data === 'object') {
                        // Try nested structure first
                        if (data.word && typeof data.word === 'object') {
                            reading = data.word[targetConfig.readingField];
                            meaning = data.word[targetConfig.meaningField];
                            type = data.word[targetConfig.typeField];
                        } else {
                            // Try flat structure
                            reading = data[targetConfig.readingField];
                            meaning = data[targetConfig.meaningField];
                            type = data[targetConfig.typeField];
                        }
                        
                        if (reading && meaning && type) {
                            // Additional validation for Japanese
                            if (targetLang === 'ja') {
                                const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(reading);
                                const hasValidMeaning = meaning && 
                                    meaning.length > 0 && 
                                    !meaning.includes('pronunciation') &&
                                    !meaning.includes('カタカナ') &&
                                    !meaning.includes('品詞');
                                const hasValidType = type && 
                                    type.length > 0 && 
                                    !type.includes('pronunciation') &&
                                    !type.includes('カタカナ') &&
                                    !type.includes('品詞');
                                
                                if (hasJapaneseChars && hasValidMeaning && hasValidType) {
                                    validEntries[word] = {
                                        [targetConfig.readingField]: reading,
                                        [targetConfig.meaningField]: meaning,
                                        [targetConfig.typeField]: type
                                    };
                                }
                            } else {
                                if (reading.length > 0 && meaning.length > 0 && type.length > 0) {
                                    validEntries[word] = {
                                        [targetConfig.readingField]: reading,
                                        [targetConfig.meaningField]: meaning,
                                        [targetConfig.typeField]: type
                                    };
                                }
                            }
                        }
                    }
                }
            } catch (parseErr) {
                // Skip this match if it can't be parsed
                continue;
            }
        }
    }
    
    return validEntries;
}

run();
