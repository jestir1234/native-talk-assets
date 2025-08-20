# Audio Generation Script

This script generates MP3 audio files for sentences in a specific chapter using the ElevenLabs API.

## Prerequisites

1. **ElevenLabs API Key**: You need an ElevenLabs API key. Get one from [ElevenLabs](https://elevenlabs.io/).
2. **Environment Setup**: Add your API key to a `.env` file in the project root:
   ```
   ELEVENLABS_API_KEY=your_api_key_here
   ```

## Story Structure

Each story should have the following structure:
```
stories/{storyId}/
├── lang/
│   ├── en.json
│   ├── ja.json
│   └── ... (other language files)
└── audio/
    ├── meta.json
    └── {chapterId}/
        ├── ch1.mp3
        ├── ch2.mp3
        └── ...
```

## Audio Meta Configuration

Create a `meta.json` file in `stories/{storyId}/audio/` with:
```json
{
    "lang": "ja",
    "voiceId": "your_voice_id_here",
    "modelId": "eleven_multilingual_v2"
}
```

### Voice ID
- Get your voice ID from the ElevenLabs dashboard
- Or use a voice from the ElevenLabs voice library

### Model ID
- `eleven_multilingual_v2`: Best for multiple languages
- `eleven_monolingual_v1`: For single language (faster)
- `eleven_turbo_v2`: Fastest option

## Usage

```bash
node scripts/generate-chapter-audio.js <storyId> <chapterId> [language] [--translated]
```

### Examples

Generate audio for original Japanese text (keys) from yuta-skipping-day chapter 1:
```bash
node scripts/generate-chapter-audio.js yuta-skipping-day ch1 en
```

Generate audio for original Vietnamese text (keys) from lotus-bloom chapter 1:
```bash
node scripts/generate-chapter-audio.js lotus-bloom ch1 en
```

Generate audio for original Korean text (keys) from not-that-kind-of-influencer chapter 1:
```bash
node scripts/generate-chapter-audio.js not-that-kind-of-influencer ch1 en
```

Generate audio for English translations (values) from lotus-bloom chapter 1:
```bash
node scripts/generate-chapter-audio.js lotus-bloom ch1 en --translated
```

## Output

The script will:
1. Create a directory `stories/{storyId}/audio/{chapterId}/`
2. Generate MP3 files named `1.mp3`, `2.mp3`, etc.
3. Each file contains the audio for one sentence from the chapter

## Features

- **Rate Limiting**: 1-second delay between API calls to avoid rate limits
- **Error Handling**: Continues processing even if some sentences fail
- **Progress Tracking**: Shows progress and summary at the end
- **Flexible Language Support**: Works with any language file in the story

## Troubleshooting

### API Key Issues
- Make sure your API key is valid and has sufficient credits
- Check that the `.env` file is in the project root

### Voice Issues
- Verify the voice ID exists in your ElevenLabs account
- Ensure the voice supports the target language

### Model Issues
- Use `eleven_multilingual_v2` for Japanese, Korean, Chinese, etc.
- Use `eleven_monolingual_v1` for English only

### File Structure Issues
- Ensure the story has the correct directory structure
- Check that the language file contains the specified chapter
