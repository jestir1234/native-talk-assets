#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// PURPOSE: This script is for generating dictionary entries straight from the txt files 

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.error('Usage: node generate-story-translations.js <source-language> <target-language> <story-file-path>');
    console.error('Example: node generate-story-translations.js ja en stories/sakana-to-tsuki/story.txt');
    console.error('Supported source languages: en, ja, ko, zh, es, vi, de');
    console.error('Supported target languages: en, ja, ko, zh, es, vi, de');
    process.exit(1);
}

// Configuration from command line arguments
const SOURCE_LANG = args[0];
const TARGET_LANG = args[1];
const STORY_FILE_PATH = args[2];

// Validate language codes
const supportedLanguages = ['en', 'ja', 'ko', 'zh', 'es', 'vi', 'de'];
if (!supportedLanguages.includes(SOURCE_LANG) || !supportedLanguages.includes(TARGET_LANG)) {
    console.error('❌ Unsupported language pair. Supported languages:', supportedLanguages.join(', '));
    process.exit(1);
}

// Derived paths
// Map language codes to directory names
const langDirMap = {
    'ja': 'japanese',
    'en': 'english', 
    'ko': 'korean',
    'zh': 'chinese',
    'es': 'spanish',
    'vi': 'vietnamese',
    'de': 'german'
};

const MASTER_DICT_PATH = `dictionaries/${langDirMap[SOURCE_LANG] || SOURCE_LANG}/${TARGET_LANG}-v1.json`;
const NEW_DICT_PATH = `scripts/dictionary_entries_output_${TARGET_LANG}.json`;
const MISSING_WORDS_PATH = 'scripts/missing_words.txt';

console.log(`🌍 Generating translations for language pair: ${SOURCE_LANG} → ${TARGET_LANG}`);
console.log(`📖 Source file: ${STORY_FILE_PATH}`);
console.log(`📚 Target dictionary: ${MASTER_DICT_PATH}`);

// Check if story file exists
if (!fs.existsSync(STORY_FILE_PATH)) {
    console.error(`❌ Story file not found: ${STORY_FILE_PATH}`);
    process.exit(1);
}

// Check if master dictionary exists, create if not
if (!fs.existsSync(MASTER_DICT_PATH)) {
    console.log(`📚 Creating new master dictionary: ${MASTER_DICT_PATH}`);
    const dir = path.dirname(MASTER_DICT_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MASTER_DICT_PATH, JSON.stringify({}, null, 2), 'utf-8');
}

try {
    // Step 1: Check for missing words using check-missing-words.js
    console.log(`🔍 Checking for missing ${SOURCE_LANG} words...`);
    
    // Check if the input file is a structure.json file
    const isStructureFile = STORY_FILE_PATH.endsWith('structure.json');
    const structureFlag = isStructureFile ? ' --structure' : '';
    
    if (isStructureFile) {
        console.log(`📖 Detected structure.json file, using --structure flag`);
    }
    
    execSync(`node scripts/check-missing-words.js ${MASTER_DICT_PATH} ${STORY_FILE_PATH} ${MISSING_WORDS_PATH} ${SOURCE_LANG}${structureFlag}`, { stdio: 'inherit' });

    // Step 2: Run generate-dictionary.js with the correct language pair
    console.log(`📚 Generating new dictionary entries (${SOURCE_LANG} → ${TARGET_LANG})...`);
    execSync(`node scripts/generate-dictionary.js ${SOURCE_LANG} ${TARGET_LANG}`, { stdio: 'inherit' });

    // Step 3: Merge with existing dictionary
    console.log('🧩 Merging new dictionary entries...');
    const masterDict = JSON.parse(fs.readFileSync(MASTER_DICT_PATH, 'utf-8'));
    const newDict = JSON.parse(fs.readFileSync(NEW_DICT_PATH, 'utf-8'));
    const mergedDict = { ...masterDict, ...newDict };
    
    fs.writeFileSync(MASTER_DICT_PATH, JSON.stringify(mergedDict, null, 2), 'utf-8');
    console.log(`✅ Dictionary updated with ${Object.keys(newDict).length} new entries.`);

    console.log(`\n🎉 Translation generation complete!`);
    console.log(`📁 Files created/updated:`);
    console.log(`   - Master dictionary: ${MASTER_DICT_PATH}`);

} catch (error) {
    console.error(`❌ Error during translation generation:`, error.message);
    process.exit(1);
}
