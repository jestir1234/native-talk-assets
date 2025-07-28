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

### Chapter Outlines
- `ja/chapters_outline_basic.txt` - Japanese lesson chapters
- `en/chapters_outline_basic.txt` - English lesson chapters

## Usage

### Generate All Lessons

Generate all lessons for Japanese:
```bash
node scripts/generate-lessons.js ja
```

Generate all lessons for English:
```bash
node scripts/generate-lessons.js en
```

### Generate Single Lesson

Generate a specific chapter (useful for testing):
```bash
# Generate Chapter 1 for Japanese
node scripts/generate-single-lesson.js ja 1

# Generate Chapter 3 for English
node scripts/generate-single-lesson.js en 3
```

## Output Structure

Lessons are generated in the `../lessons/{language}/` directory:

```
lessons/
├── ja/
│   ├── chapter_1/
│   │   ├── index.html
│   │   └── header.webp
│   ├── chapter_2/
│   │   ├── index.html
│   │   └── header.webp
│   └── ...
└── en/
    ├── chapter_1/
    │   ├── index.html
    │   └── header.webp
    └── ...
```

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