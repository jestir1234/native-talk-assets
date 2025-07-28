# Lessons Meta.json Schema

This document describes the structure of the `meta.json` file that provides information about available languages and chapters for the mobile app.

## File Location
```
lessons/meta.json
```

## Schema

```json
{
  "version": "string",
  "lastUpdated": "string (ISO 8601)",
  "totalLanguages": "number",
  "totalChapters": "number", 
  "totalAvailableChapters": "number",
  "languages": {
    "languageCode": {
      "code": "string",
      "name": "string", 
      "flag": "string (emoji)",
      "totalChapters": "number",
      "availableChapters": "number",
      "chapters": [
        {
          "number": "number",
          "title": "string",
          "keyPoints": ["string"],
          "path": "string",
          "generated": "boolean"
        }
      ]
    }
  }
}
```

## Field Descriptions

### Root Level
- `version`: Version of the meta schema (e.g., "1.0.0")
- `lastUpdated`: ISO 8601 timestamp of when the meta file was last updated
- `totalLanguages`: Total number of languages available
- `totalChapters`: Total number of chapters across all languages
- `totalAvailableChapters`: Number of chapters that have been generated and are ready to use
- `languages`: Object containing information for each language

### Language Object
- `code`: Language code (e.g., "ja", "en", "ko")
- `name`: Full language name (e.g., "Japanese", "English")
- `flag`: Emoji flag representing the language (e.g., "🇯🇵", "🇺🇸")
- `totalChapters`: Total number of chapters defined for this language
- `availableChapters`: Number of chapters that have been generated
- `chapters`: Array of chapter objects

### Chapter Object
- `number`: Chapter number (1-based)
- `title`: Chapter title
- `keyPoints`: Array of key learning points from the chapter outline
- `path`: Relative path to the chapter's HTML file
- `generated`: Boolean indicating if the chapter has been generated

## Example

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-07-28T22:13:54.766Z",
  "totalLanguages": 2,
  "totalChapters": 20,
  "totalAvailableChapters": 2,
  "languages": {
    "ja": {
      "code": "ja",
      "name": "Japanese",
      "flag": "🇯🇵",
      "totalChapters": 10,
      "availableChapters": 1,
      "chapters": [
        {
          "number": 1,
          "title": "The Japanese Writing System",
          "keyPoints": [
            "The three scripts: Hiragana, Katakana, Kanji",
            "Why Japanese uses all three",
            "Reading flow (left-to-right, top-to-bottom)"
          ],
          "path": "./ja/chapter_1/index.html",
          "generated": true
        },
        {
          "number": 2,
          "title": "Hiragana – The Vowel Sounds",
          "keyPoints": [
            "あ, い, う, え, お",
            "Pronunciation guide and stroke order"
          ],
          "path": "./ja/chapter_2/index.html",
          "generated": false
        }
      ]
    }
  }
}
```

## Mobile App Usage

The mobile app can use this meta.json file to:

1. **Show Available Languages**: Display a list of languages with flags and names
2. **Show Progress**: Display how many chapters are available vs. total
3. **Navigate to Chapters**: Use the `path` field to load chapter content
4. **Show Chapter Previews**: Display chapter titles and key points
5. **Track Generation Status**: Show which chapters are ready vs. pending

## API Endpoints

The mobile app can fetch this data via:

```
GET /lessons/meta.json
```

## Auto-Generation

The meta.json file is automatically generated and updated by:

- `scripts/generate-lessons-meta.js` - Generate/update meta file
- `scripts/update-lessons-meta.js` - Update meta file only
- `scripts/generate-lessons.js` - Updates meta after generating all lessons
- `scripts/generate-single-lesson.js` - Updates meta after generating single lesson

## Supported Languages

Currently supported language codes:
- `ja` - Japanese 🇯🇵
- `en` - English 🇺🇸
- `ko` - Korean 🇰🇷
- `zh` - Chinese 🇨🇳
- `es` - Spanish 🇪🇸
- `vi` - Vietnamese 🇻🇳

## File Updates

The meta.json file is automatically updated whenever:
- New lessons are generated
- The `update-lessons-meta.js` script is run
- The `generate-lessons-meta.js` script is run

This ensures the mobile app always has the latest information about available content. 