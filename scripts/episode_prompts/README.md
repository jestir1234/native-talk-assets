# Episode Prompt System

This directory contains prompt files for different stories. Each story has its own subdirectory with the following prompt files:

## Required Prompt Files

For each story, create a subdirectory with these files:

- `basePrompt.txt` - The main story prompt that defines the characters, setting, and tone
- `metadataPrompt.txt` - Prompt for generating episode titles and hooks
- `imagePrompt.txt` - Prompt for generating episode images

## Variable Interpolation

Prompts support variable interpolation using `${variableName}` syntax. For example:

```
Create an illustration of ${characterName} in the following scene: ${description}.
```

Available variables depend on the context:
- `description` - Available in image prompts
- `title` - Episode title
- `hook` - Episode plot hook

## Usage

### Generate an episode for the default story (still-dead-still-bored):
```bash
node scripts/generate-episode.js
```

### Generate an episode for a specific story:
```bash
node scripts/generate-episode.js the-barista
```

### Generate an image for a specific story:
```bash
node scripts/generate-episode-image.js the-barista
```

## Adding a New Story

1. Create a new subdirectory in `scripts/episode_prompts/` with your story name
2. Add the three required prompt files (`basePrompt.txt`, `metadataPrompt.txt`, `imagePrompt.txt`)
3. Create the corresponding story directory in `stories/` with the required structure
4. Run the script with your story name as an argument

## Example Structure

```
scripts/episode_prompts/
├── still-dead-still-bored/
│   ├── basePrompt.txt
│   ├── metadataPrompt.txt
│   └── imagePrompt.txt
└── the-barista/
    ├── basePrompt.txt
    ├── metadataPrompt.txt
    └── imagePrompt.txt
``` 