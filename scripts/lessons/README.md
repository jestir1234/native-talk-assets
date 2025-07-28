# Lessons Generation Scripts

This directory contains scripts for generating language learning lessons using Gemini AI.

## Overview

The lessons feature generates interactive, app-friendly language learning content from chapter outlines. Each lesson includes:

- HTML content with proper structure and formatting
- Generated header images using Gemini image generation
- Mobile-friendly design suitable for app rendering

## Files

### Scripts
- `generate-lessons.js` - Generate all lessons for a language
- `generate-single-lesson.js` - Generate a single lesson for testing
- `generate-lessons-meta.js` - Generate meta.json file for mobile app
- `update-lessons-meta.js` - Update meta.json file only
- `test-lessons.js` - Validate generated lesson content
- `lessons-status.js` - Show status of all lessons

*All scripts are now located in the `scripts/lessons/` directory*

### Chapter Outlines
- `ja/chapters_outline_basic.txt` - Japanese lesson chapters
- `en/chapters_outline_basic.txt` - English lesson chapters

### Generated Files
- `../lessons/meta.json` - Mobile app metadata (auto-generated)
- `../lessons/{lang}/chapter_{n}/index.html` - Lesson content
- `../lessons/{lang}/chapter_{n}/header.webp` - Lesson header image

## Usage

### Generate All Lessons

Generate all lessons for Japanese in English:
```bash
node scripts/lessons/generate-lessons.js ja en
```

Generate all lessons for English in Japanese:
```bash
node scripts/lessons/generate-lessons.js en ja
```

Generate a specific chapter:
```bash
# Generate Chapter 1 for Japanese in English
node scripts/lessons/generate-lessons.js ja en 1
```

### Generate Single Lesson

Generate a specific chapter (useful for testing):
```bash
# Generate Chapter 1 for Japanese in English
node scripts/lessons/generate-single-lesson.js ja en 1

# Generate Chapter 3 for English in Japanese
node scripts/lessons/generate-single-lesson.js en ja 3
```

### Update Meta File Only
```bash
# Update meta.json without generating new lessons
node scripts/lessons/update-lessons-meta.js
```

## Output Structure

Lessons are generated in the `../lessons/{language_learn}/` directory with target language subdirectories:

```
lessons/
├── meta.json                    # Mobile app metadata
├── ja/                          # Japanese lessons
│   ├── chapter_1/
│   │   ├── header.webp         # Shared header image
│   │   ├── en/                 # English version
│   │   │   └── index.html
│   │   ├── ja/                 # Japanese version
│   │   │   └── index.html
│   │   └── ko/                 # Korean version
│   │       └── index.html
│   └── chapter_2/
│       ├── header.webp
│       └── en/
│           └── index.html
└── en/                          # English lessons
    ├── chapter_1/
    │   ├── header.webp
    │   ├── ja/                 # Japanese version
    │   │   └── index.html
    │   └── en/                 # English version
    │       └── index.html
    └── ...
```

### Meta.json Structure

The `meta.json` file provides the mobile app with:
- Available languages being learned and their flags
- Chapter counts and availability status
- Chapter titles and key learning points
- Available target languages for each chapter
- File paths for loading lesson content
- Generation status for each chapter in each target language

See `../lessons/meta.json.schema.md` for detailed schema documentation.

## Chapter Outline Format

Chapter outlines use a simple markdown-like format:

```
## CHAPTER 1: Title
- Point 1
- Point 2
- Point 3

## CHAPTER 2: Another Title
- Point 1
- Point 2
```

## Requirements

- Node.js with required dependencies
- Gemini API key in `.env` file
- Sharp library for image processing

## Features

- **HTML Generation**: Creates semantic HTML content with proper structure
- **Image Generation**: Uses Gemini to create header images for each lesson
- **Mobile-Friendly**: Content designed for app rendering
- **Interactive Elements**: Includes practice sections and exercises
- **Cultural Notes**: Incorporates cultural context where relevant
- **Pronunciation Guides**: Includes pronunciation help for language learners
- **Auto Meta Generation**: Automatically updates meta.json for mobile app
- **Progress Tracking**: Tracks which chapters are generated vs. pending

## Customization

To add new languages or modify lesson content:

1. Create a new `chapters_outline_basic.txt` file in `scripts/lessons/{language}/`
2. Follow the chapter outline format
3. Run the generation script with the new language code

## Error Handling

The scripts include comprehensive error handling for:
- Missing chapter outline files
- API failures
- Image generation issues
- File system errors

Each chapter is processed independently, so failures in one chapter don't affect others. 