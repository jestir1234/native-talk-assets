// Usage: node scripts/split-kana.js

const fs = require("fs");
const path = require("path");

const INPUT_PATH = path.resolve(__dirname, "../hiragana/kana.txt");
const OUTPUT_DIR = path.resolve(__dirname, "../hiragana/data");

const COMMAND_RE = /[MmZzLlHhVvCcSsQqTtAa]/;
const NUMBER_RE = /^[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/;

function tokenizePath(d) {
  const tokens = [];
  let i = 0;
  while (i < d.length) {
    const ch = d[i];
    if (COMMAND_RE.test(ch)) {
      tokens.push(ch);
      i += 1;
      continue;
    }
    if (ch === "," || ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }
    const m = d.slice(i).match(NUMBER_RE);
    if (m) {
      tokens.push(m[0]);
      i += m[0].length;
      continue;
    }
    throw new Error(`Unexpected path data at index ${i}: ${JSON.stringify(d.slice(i, i + 20))}`);
  }
  return tokens;
}

function normalizePath(d) {
  return tokenizePath(d).join(" ");
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const contents = fs.readFileSync(INPUT_PATH, "utf8");
  const lines = contents.split(/\r?\n/);

  const seen = new Set();
  let written = 0;

  for (let lineNo = 1; lineNo <= lines.length; lineNo += 1) {
    const raw = lines[lineNo - 1];
    const line = raw.trim();
    if (!line) continue;

    let obj;
    try {
      obj = JSON.parse(line);
    } catch (e) {
      throw new Error(`Invalid JSON at line ${lineNo}: ${e.message}`);
    }

    const character = obj.character;
    if (typeof character !== "string" || character.length === 0) {
      throw new Error(`Missing/invalid 'character' at line ${lineNo}`);
    }
    if (!Array.isArray(obj.strokes)) {
      throw new Error(`Missing/invalid 'strokes' at line ${lineNo} (character ${character})`);
    }
    if (!Array.isArray(obj.medians)) {
      throw new Error(`Missing/invalid 'medians' at line ${lineNo} (character ${character})`);
    }
    if (seen.has(character)) {
      throw new Error(`Duplicate character ${JSON.stringify(character)} at line ${lineNo}`);
    }
    seen.add(character);

    const normalized = {
      ...obj,
      strokes: obj.strokes.map((s, idx) => {
        if (typeof s !== "string") {
          throw new Error(`Non-string stroke at line ${lineNo}, stroke ${idx} (character ${character})`);
        }
        return normalizePath(s);
      }),
    };

    const outPath = path.join(OUTPUT_DIR, `${character}.json`);
    fs.writeFileSync(outPath, JSON.stringify(normalized, null, 0) + "\n", "utf8");
    written += 1;
  }

  console.log(`Wrote ${written} files to ${OUTPUT_DIR}`);
}

main();

