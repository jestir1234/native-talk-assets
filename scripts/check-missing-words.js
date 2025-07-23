// Usage: node scripts/check-missing-words.js <dictionary.json> <chapters.txt> [missing_words.txt]

const fs = require("fs");
const path = require("path");

// Validate arguments
if (process.argv.length < 4) {
    console.error("Usage: node check-missing-words.js <dictionary.json> <chapters.txt> [missing_words.txt]");
    process.exit(1);
}

const dictionaryPath = path.resolve(process.argv[2]);
const chapterTextPath = path.resolve(process.argv[3]);
const outputPath = path.resolve(process.argv[4] || "missing_words.txt");

// Load files
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf-8"));
const text = fs.readFileSync(chapterTextPath, "utf-8");

// Tokenize and normalize
const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s']/g, "") // Remove punctuation except apostrophes
    .split(/\s+/)
    .filter(Boolean);

const dictKeys = Object.keys(dictionary).map((w) => w.toLowerCase());

// Check for missing
const uniqueWords = [...new Set(words)];
const missingWords = uniqueWords.filter((word) => !dictKeys.includes(word));

// Write to file
fs.writeFileSync(outputPath, missingWords.join("\n"), "utf-8");
console.log(`✅ Missing words written to: ${outputPath}`);
