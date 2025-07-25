// Usage: node scripts/check-missing-words.js <dictionary.json> <chapters.txt> [missing_words.txt] [language]

const fs = require("fs");
const path = require("path");
const kuromoji = require("kuromoji");
const nodejieba = require("nodejieba");

// Validate arguments
if (process.argv.length < 4) {
    console.error("Usage: node check-missing-words.js <dictionary.json> <chapters.txt> [missing_words.txt] [language]");
    console.error("Supported languages: en, ja, ko, zh, es, vi");
    process.exit(1);
}

const dictionaryPath = path.resolve(process.argv[2]);
const chapterTextPath = path.resolve(process.argv[3]);
const outputPath = path.resolve(process.argv[4] || "missing_words.txt");
const language = process.argv[5] || "en";

// Also save tokenized text to a temporary file
const tokenizedOutputPath = path.resolve(__dirname, './tokenized_text.txt');

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
        .toLowerCase()
        .replace(/[^a-zA-ZÀ-ÿ0-9\s']/g, "") // Remove punctuation but keep accented characters
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
        .toLowerCase()
        .split(/([.!?,;:""''()\s]+)/)
        .filter(word => word.length > 0)
        .map(word => word.trim())
        .filter(word => word.length > 0);
}

// Main function
async function main() {
    // Load files
    const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf-8"));
    const text = fs.readFileSync(chapterTextPath, "utf-8");

    // Tokenize for missing words check (without punctuation)
    const words = await tokenizeText(text, language);

    // Tokenize for content preservation (with punctuation)
    const wordsWithPunctuation = await tokenizeTextWithPunctuation(text, language);

    // Normalize dictionary keys based on language
    let dictKeys;
    if (language.toLowerCase() === "en") {
        dictKeys = Object.keys(dictionary).map((w) => w.toLowerCase());
    } else {
        // For non-English languages, keep original case as some languages are case-sensitive
        dictKeys = Object.keys(dictionary);
    }

    // Check for missing words (using words without punctuation)
    const uniqueWords = [...new Set(words)];
    const missingWords = uniqueWords.filter((word) => !dictKeys.includes(word));

    // Write missing words to file
    fs.writeFileSync(outputPath, missingWords.join("\n"), "utf-8");
    console.log(`✅ Missing words written to: ${outputPath}`);
    console.log(`📊 Language: ${language}`);
    console.log(`📊 Total unique words: ${uniqueWords.length}`);
    console.log(`📊 Missing words: ${missingWords.length}`);

    // Save tokenized text with punctuation to temporary file
    fs.writeFileSync(tokenizedOutputPath, wordsWithPunctuation.join("|"), "utf-8");
    console.log(`✅ Tokenized text saved to: ${tokenizedOutputPath}`);
}

// Run the main function
main().catch(console.error);
