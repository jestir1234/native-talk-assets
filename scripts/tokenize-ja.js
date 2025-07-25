const fs = require('fs');
const path = require('path');
const kuromoji = require('kuromoji');

const INPUT_PATH = path.resolve(__dirname, './episode_0_ja.txt');
const OUTPUT_PATH = path.resolve(__dirname, './tokenized_episode_0.json');

const tokenizerBuilder = kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' });

tokenizerBuilder.build((err, tokenizer) => {
    if (err) {
        console.error('❌ Failed to build tokenizer:', err);
        process.exit(1);
    }

    const rawText = fs.readFileSync(INPUT_PATH, 'utf-8').trim();
    const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);

    const tokenizedLines = lines.map(line => {
        // Capture dialogue
        const dialogueMatch = line.match(/^「(.+?)」$/);
        const isDialogue = Boolean(dialogueMatch);

        const tokens = tokenizer.tokenize(line).map(t => t.surface_form);
        const joined = tokens.join('|');

        if (isDialogue) {
            const innerTokens = tokenizer.tokenize(dialogueMatch[1]).map(t => t.surface_form);
            return `[|${innerTokens.join('|')}|]`;
        }

        return `|${joined}|`;
    });

    const finalOutput = {
        content: tokenizedLines.join('')
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2), 'utf-8');
    console.log(`✅ Tokenized story saved to ${OUTPUT_PATH}`);
});
