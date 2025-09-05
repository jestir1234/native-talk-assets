// Usage: node scripts/check-missing-words.js <dictionary.json> <chapters.txt> [missing_words.txt] [language] [--structure]

const fs = require("fs");
const path = require("path");
const kuromoji = require("kuromoji");
const nodejieba = require("nodejieba");

// Parse command line arguments
const args = process.argv.slice(2);
const useStructure = args.includes('--structure');

// Remove --structure flag from args for normal processing
const filteredArgs = args.filter(arg => arg !== '--structure');

// Validate arguments
if (filteredArgs.length < 3) {
    console.error("Usage: node check-missing-words.js <dictionary.json> <input_file> [missing_words.txt] [language] [--structure]");
    console.error("Supported languages: en, ja, ko, zh, es, vi, de");
    console.error("Use --structure flag to process structure.json instead of story.txt");
    process.exit(1);
}

const dictionaryPath = path.resolve(filteredArgs[0]);
const inputPath = path.resolve(filteredArgs[1]);
const outputPath = path.resolve(filteredArgs[2] || "missing_words.txt");
const language = filteredArgs[3] || "en";

// Also save tokenized text to a temporary file
const tokenizedOutputPath = path.resolve(__dirname, './tokenized_text.txt');

// Function to extract tokenized content from structure.json
function extractTokenizedContentFromStructure(structurePath) {
    try {
        const structureData = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
        const allTokens = [];
        
        // Handle both 'pages' and 'chapters' structures
        const pagesOrChapters = structureData.pages || structureData.chapters || [];
        
        for (const page of pagesOrChapters) {
            if (page.content) {
                // Split by | and filter out empty tokens
                const tokens = page.content.split('|').filter(token => token.trim().length > 0);
                allTokens.push(...tokens);
            }
        }
        
        return allTokens;
    } catch (error) {
        console.error(`❌ Error reading structure.json: ${error.message}`);
        process.exit(1);
    }
}

// Language-specific tokenization functions
function tokenizeEnglish(text) {
    return text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s']/g, "") // Remove punctuation except apostrophes
        .split(/\s+/)
        .filter(Boolean);
}

function tokenizeJapanese(text) {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tokenizer) => {
            if (err) {
                console.warn("⚠️  Kuromoji failed, falling back to simple tokenization");
                // Fallback to simple tokenization
                const simpleTokens = text
                    .replace(/[、。！？「」『』【】（）]/g, " ")
                    .split(/\s+/)
                    .flatMap(phrase => {
                        const words = [];
                        let currentWord = "";
                        
                        for (let i = 0; i < phrase.length; i++) {
                            const char = phrase[i];
                            const nextChar = phrase[i + 1];
                            
                            const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char);
                            
                            if (isJapanese) {
                                if (currentWord && (
                                    (/[\u3040-\u309F]/.test(char) && /[\u4E00-\u9FAF]/.test(nextChar)) ||
                                    (/[\u4E00-\u9FAF]/.test(char) && /[\u3040-\u309F]/.test(nextChar))
                                )) {
                                    words.push(currentWord);
                                    currentWord = char;
                                } else {
                                    currentWord += char;
                                }
                            } else {
                                currentWord += char;
                            }
                        }
                        
                        if (currentWord) {
                            words.push(currentWord);
                        }
                        
                        return words.filter(word => word.length > 0 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word));
                    });
                resolve(simpleTokens);
                return;
            }
            
            // Use kuromoji for proper Japanese tokenization
            const tokens = tokenizer.tokenize(text);
            const words = tokens
                .map(token => token.surface_form) // Get the surface form (original text)
                .filter(word => word.length > 0 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word));
            
            resolve(words);
        });
    });
}

function tokenizeKorean(text) {
    // Korean uses spaces between words, but we need to preserve Korean characters
    return text
        .replace(/[。！？，]/g, " ") // Replace Korean punctuation with spaces
        .split(/\s+/)
        .filter(word => word.length > 0 && /[\uAC00-\uD7AF]/.test(word)); // Keep only Korean characters
}

function tokenizeChinese(text) {
    // Use nodejieba for Chinese word segmentation
    try {
        const tokens = nodejieba.cut(text);
        return tokens.filter(token => token.length > 0 && /[\u4E00-\u9FAF]/.test(token)); // Keep only Chinese characters
    } catch (err) {
        console.warn("⚠️  Nodejieba failed, falling back to simple tokenization");
        // Fallback to simple tokenization
        return text
            .replace(/[。！？，；：""''（）【】]/g, " ") // Replace Chinese punctuation with spaces
            .split(/\s+/)
            .filter(word => word.length > 0 && /[\u4E00-\u9FAF]/.test(word)); // Keep only Chinese characters
    }
}

function tokenizeSpanish(text) {
    return text
        .toLowerCase()
        .replace(/[^a-zA-ZÀ-ÿ0-9\s']/g, "") // Remove punctuation but keep accented characters
        .split(/\s+/)
        .filter(Boolean);
}

function tokenizeVietnamese(text) {
    return text
        .replace(/[^\p{L}\p{N}\s']/gu, "") // Remove punctuation but keep all letters and numbers using Unicode properties
        .split(/\s+/)
        .filter(Boolean);
}

function tokenizeGerman(text) {
    return text
        .toLowerCase()
        .replace(/[^a-zA-Zäöüß0-9\s']/g, "") // Remove punctuation but keep German umlauts and eszett
        .split(/\s+/)
        .filter(Boolean);
}

// Language detection and tokenization
async function tokenizeText(text, lang) {
    switch (lang.toLowerCase()) {
        case "en":
            return tokenizeEnglish(text);
        case "ja":
            return await tokenizeJapanese(text);
        case "ko":
            return tokenizeKorean(text);
        case "zh":
            return tokenizeChinese(text);
        case "es":
            return tokenizeSpanish(text);
        case "vi":
            return tokenizeVietnamese(text);
        case "de":
            return tokenizeGerman(text);
        default:
            console.warn(`⚠️  Unknown language '${lang}', using English tokenization`);
            return tokenizeEnglish(text);
    }
}

// Tokenize text while preserving punctuation for content field
async function tokenizeTextWithPunctuation(text, lang) {
    switch (lang.toLowerCase()) {
        case "en":
            return tokenizeEnglishWithPunctuation(text);
        case "ja":
            return await tokenizeJapaneseWithPunctuation(text);
        case "ko":
            return tokenizeKoreanWithPunctuation(text);
        case "zh":
            return await tokenizeChineseWithPunctuation(text);
        case "es":
            return tokenizeSpanishWithPunctuation(text);
        case "vi":
            return tokenizeVietnameseWithPunctuation(text);
        case "de":
            return tokenizeGermanWithPunctuation(text);
        default:
            console.warn(`⚠️  Unknown language '${lang}', using English tokenization`);
            return tokenizeEnglishWithPunctuation(text);
    }
}

// English tokenization with punctuation preserved
function tokenizeEnglishWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .toLowerCase()
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Japanese tokenization with punctuation preserved
function tokenizeJapaneseWithPunctuation(text) {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tokenizer) => {
            if (err) {
                console.warn("⚠️  Kuromoji failed, falling back to simple tokenization");
                // Fallback to simple tokenization that preserves punctuation
                const words = text
                    .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
                    .split(/([。！？、，；：""''（）【】\s]+)/)
                    .filter(word => word.length > 0)
                    .map(word => word.trim())
                    .filter(word => word.length > 0);
                resolve(words);
                return;
            }
            
            const tokens = tokenizer.tokenize(text.replace(/\r?\n/g, ' ')); // Replace line breaks before tokenizing
            const words = tokens
                .map(token => token.surface_form) // Get the surface form (original text)
                .filter(word => word.length > 0);
            
            resolve(words);
        });
    });
}

// Korean tokenization with punctuation preserved
function tokenizeKoreanWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .split(/([。！？、，；：""''（）【】\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Chinese tokenization with punctuation preserved
function tokenizeChineseWithPunctuation(text) {
    return new Promise((resolve, reject) => {
        try {
            // Use nodejieba for Chinese word segmentation
            const tokens = nodejieba.cut(text.replace(/\r?\n/g, ' '));
            
            // Filter out empty tokens and preserve punctuation
            const result = tokens
                .filter(token => token.length > 0)
                .map(token => token.trim())
                .filter(token => token.length > 0);
            
            resolve(result);
        } catch (err) {
            console.warn("⚠️  Nodejieba failed, falling back to simple tokenization");
            // Fallback to simple tokenization that preserves punctuation
            const words = text
                .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
                .split(/([。！？、，；：""''（）【】\s]+)/)
                .filter(word => word.length > 0)
                .map(word => word.trim())
                .filter(word => word.length > 0);
            resolve(words);
        }
    });
}

// Spanish tokenization with punctuation preserved
function tokenizeSpanishWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .toLowerCase()
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Vietnamese tokenization with punctuation preserved
function tokenizeVietnameseWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// German tokenization with punctuation preserved
function tokenizeGermanWithPunctuation(text) {
    return text
        .replace(/\r?\n/g, ' ') // Replace line breaks with spaces
        .toLowerCase()
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Main function
async function main() {
    // Load dictionary
    const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf-8"));
    
    let words, wordsWithPunctuation;
    
    if (useStructure) {
        // Extract tokenized content from structure.json
        console.log(`📖 Processing structure.json file: ${inputPath}`);
        const tokens = extractTokenizedContentFromStructure(inputPath);
        
        // For structure.json, the tokens are already tokenized, so we use them directly
        words = tokens;
        wordsWithPunctuation = tokens; // Same for both since they're already tokenized
        
        console.log(`📊 Extracted ${tokens.length} tokens from structure.json`);
    } else {
        // Load and tokenize text file as usual
        console.log(`📖 Processing text file: ${inputPath}`);
        const text = fs.readFileSync(inputPath, "utf-8");
        
        // Tokenize for missing words check (without punctuation)
        words = await tokenizeText(text, language);
        
        // Tokenize for content preservation (with punctuation)
        wordsWithPunctuation = await tokenizeTextWithPunctuation(text, language);
    }

    // Normalize dictionary keys based on language
    let dictKeys;
    if (language.toLowerCase() === "en") {
        dictKeys = Object.keys(dictionary).map((w) => w.toLowerCase());
    } else {
        // For non-English languages, keep original case as some languages are case-sensitive
        dictKeys = Object.keys(dictionary);
    }

    // Check for missing words
    const uniqueWords = [...new Set(words)];
    const missingWords = uniqueWords.filter((word) => !dictKeys.includes(word));

    // Write missing words to file
    fs.writeFileSync(outputPath, missingWords.join("\n"), "utf-8");
    console.log(`✅ Missing words written to: ${outputPath}`);
    console.log(`📊 Language: ${language}`);
    console.log(`📊 Total unique words: ${uniqueWords.length}`);
    console.log(`📊 Missing words: ${missingWords.length}`);

    // Save tokenized text to temporary file
    fs.writeFileSync(tokenizedOutputPath, wordsWithPunctuation.join("|"), "utf-8");
    console.log(`✅ Tokenized text saved to: ${tokenizedOutputPath}`);
}

// Run the main function
main().catch(console.error);
