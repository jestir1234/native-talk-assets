/**
 * Converts raster images in a directory to WebP and removes the originals.
 * Skips files that are already .webp.
 *
 * Usage:
 *   node scripts/convert-directions-images-to-webp.js
 *   node scripts/convert-directions-images-to-webp.js /path/to/images
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEFAULT_DIR = path.resolve(__dirname, '../directions/images');

/** Extensions we convert (lowercase, with dot). */
const CONVERTIBLE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.avif',
  '.tif',
  '.tiff',
  '.bmp',
]);

const WEBP_OPTIONS = {
  quality: 85,
  effort: 6,
};

async function convertFile(dir, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webp') {
    return { status: 'skip', reason: 'already webp' };
  }
  if (!CONVERTIBLE_EXT.has(ext)) {
    return { status: 'skip', reason: 'not a convertible type' };
  }

  const base = path.basename(filename, ext);
  const inputPath = path.join(dir, filename);
  const outputPath = path.join(dir, `${base}.webp`);

  await sharp(inputPath).webp(WEBP_OPTIONS).toFile(outputPath);
  fs.unlinkSync(inputPath);

  return { status: 'ok', output: outputPath };
}

async function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DIR;

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.error(`Not a directory: ${targetDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);

  let converted = 0;
  let skipped = 0;

  for (const name of files) {
    if (name.startsWith('.')) {
      skipped++;
      continue;
    }

    try {
      const result = await convertFile(targetDir, name);
      if (result.status === 'ok') {
        console.log(`OK: ${name} -> ${path.basename(result.output)}`);
        converted++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`FAIL: ${name}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log(`Done. Converted: ${converted}, skipped: ${skipped}, dir: ${targetDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
