// Usage: node scripts/tokenize-content.js <input.txt> <output.json>

const fs = require("fs");
const path = require("path");

// Utility: splits sentence into words and punctuation
function tokenize(text) {
    return text
        .replace(/\r?\n/g, " ")                     // Convert newlines to spaces
        .replace(/([.,!?;:“”"()’'])/g, " $1 ")       // Surround punctuation with spaces
        .replace(/\s+/g, " ")                        // Normalize whitespace
        .trim()
        .split(" ")
        .filter(Boolean)
        .join("|");
}

// Entry point
if (process.argv.length < 4) {
    console.error("Usage: node tokenize-content.js <input.txt> <output.json>");
    process.exit(1);
}

const inputPath = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);

const content = fs.readFileSync(inputPath, "utf-8");
const tokenized = tokenize(content);

const output = { content: tokenized };
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

console.log(`✅ Tokenized content written to ${outputPath}`);
