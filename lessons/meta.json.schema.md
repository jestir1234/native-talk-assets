# Lessons Meta.json Schema

This document describes the structure and purpose of the `meta.json` file located in the `./lessons/` directory. This file provides comprehensive metadata about available language lessons for the mobile app.

## Overview

The `meta.json` file serves as a central source of truth for the mobile app to understand:
- What languages are available for learning
- What chapters are available for each language
- What target languages (user interface languages) are supported for each lesson
- The current generation status of all lessons
- What lessons are available for users speaking different languages

## Schema Structure

```json
{
  "version": "string",
  "lastUpdated": "string (ISO 8601)",
  "totalLanguages": "number",
  "totalChapters": "number", 
  "totalAvailableChapters": "number",
  "totalTargetLanguages": "number",
  "languages": {
    "[languageCode]": {
      "code": "string",
      "name": "string", 
      "flag": "string (emoji)",
      "totalChapters": "number",
      "availableChapters": "number",
      "availableTargetLanguages": ["string"],
      "chapters": [
        {
          "number": "number",
          "title": "string",
          "keyPoints": ["string"],
          "availableLanguages": ["string"],
          "totalLanguages": "number"
        }
      ]
    }
  },
  "userLanguageSupport": {
    "[userLanguageCode]": {
      "code": "string",
      "name": "string",
      "flag": "string (emoji)", 
      "availableLessons": [
        {
          "languageLearn": "string",
          "languageLearnName": "string",
          "chapterNumber": "number",
          "chapterTitle": "string"
        }
      ]
    }
  }
}
```

## Field Descriptions

### Root Level Fields

- **version**: Version string of the meta schema (e.g., "1.0.0")
- **lastUpdated**: ISO 8601 timestamp of when the meta file was last generated
- **totalLanguages**: Total number of languages being learned
- **totalChapters**: Total number of chapters across all languages
- **totalAvailableChapters**: Total number of chapters that have been generated
- **totalTargetLanguages**: Total number of unique target languages available

### Languages Section

The `languages` object contains information about each language being learned:

- **code**: Language code (e.g., "ja", "en", "ko")
- **name**: Full language name (e.g., "Japanese", "English", "Korean")
- **flag**: Emoji flag representing the language
- **totalChapters**: Total number of chapters defined for this language
- **availableChapters**: Number of chapters that have been generated
- **availableTargetLanguages**: Array of target language codes available for this language
- **chapters**: Array of chapter objects with detailed information

### Chapter Objects

Each chapter contains:

- **number**: Chapter number (1-based)
- **title**: Chapter title
- **keyPoints**: Array of key learning points for the chapter
- **availableLanguages**: Array of target language codes where this chapter is available
- **totalLanguages**: Number of target languages available for this chapter

### User Language Support Section

The `userLanguageSupport` object provides information about what lessons are available for users speaking different languages:

- **code**: User language code (e.g., "ja", "en")
- **name**: Full language name for the user interface
- **flag**: Emoji flag for the user language
- **availableLessons**: Array of lessons available for users speaking this language

### Available Lesson Objects

Each available lesson contains:

- **languageLearn**: Code of the language being learned
- **languageLearnName**: Full name of the language being learned
- **chapterNumber**: Chapter number
- **chapterTitle**: Title of the chapter

## Example

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-07-28T22:39:46.226Z",
  "totalLanguages": 2,
  "totalChapters": 20,
  "totalAvailableChapters": 2,
  "totalTargetLanguages": 2,
  "languages": {
    "en": {
      "code": "en",
      "name": "English",
      "flag": "🇺🇸",
      "totalChapters": 10,
      "availableChapters": 1,
      "availableTargetLanguages": ["ja"],
      "chapters": [
        {
          "number": 1,
          "title": "The English Alphabet and Sounds",
          "keyPoints": [
            "The 26 letters of the English alphabet",
            "Vowel sounds: A, E, I, O, U",
            "Consonant sounds and pronunciation",
            "Basic phonics and sound combinations",
            "Introduction to reading simple words"
          ],
          "availableLanguages": ["ja"],
          "totalLanguages": 1
        }
      ]
    }
  },
  "userLanguageSupport": {
    "ja": {
      "code": "ja",
      "name": "Japanese",
      "flag": "🇯🇵",
      "availableLessons": [
        {
          "languageLearn": "en",
          "languageLearnName": "English",
          "chapterNumber": 1,
          "chapterTitle": "The English Alphabet and Sounds"
        }
      ]
    },
    "en": {
      "code": "en",
      "name": "English",
      "flag": "🇺🇸",
      "availableLessons": [
        {
          "languageLearn": "ja",
          "languageLearnName": "Japanese",
          "chapterNumber": 1,
          "chapterTitle": "The Japanese Writing System"
        }
      ]
    }
  }
}
```

## Mobile App Usage

The mobile app can use this meta.json file to:

1. **Show available languages**: Display what languages users can learn
2. **Show progress**: Display how many chapters are available vs. total
3. **Filter by user language**: Show only lessons available in the user's preferred language
4. **Navigate to lessons**: Use the chapter information to load specific lessons
5. **Show lesson previews**: Display chapter titles and key points before loading
6. **Track completion**: Monitor which chapters have been completed

## File Paths

The mobile app can construct lesson file paths using:
- `./lessons/{languageLearn}/chapter_{chapterNumber}/{targetLanguage}/index.html`
- `./lessons/{languageLearn}/chapter_{chapterNumber}/header.webp`

For example:
- `./lessons/ja/chapter_1/en/index.html` (Japanese lesson in English)
- `./lessons/en/chapter_1/ja/index.html` (English lesson in Japanese)
- `./lessons/ja/chapter_1/header.webp` (Shared header image) 