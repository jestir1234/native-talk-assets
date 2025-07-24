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
const BATCH_SIZE = 50;

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

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
            Object.assign(allResults, parsed);
        } catch (err) {
            console.error('❌ JSON parse error:', err.message);
            console.error('📝 Raw Response:', response);
        }

        await new Promise((res) => setTimeout(res, 1000)); // delay to avoid rate limiting
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2), 'utf-8');
    console.log(`✅ Done. Dictionary entries saved to ${OUTPUT_FILE}`);
}

run();
