# Series Scaffolding Script

The `scaffold-series.js` script helps you quickly set up all the necessary folders and files for a new series.

## Usage

```bash
node scripts/scaffold-series.js <series-id>
```

### Example

```bash
node scripts/scaffold-series.js shanghai-blues
```

## What it creates

The script creates the following directory structure and files:

```
scripts/episode_prompts/<series-id>/
├── basePrompt.txt
├── imagePrompt.txt
├── metadataPrompt.txt
└── init/
    ├── basePrompt.txt
    └── metadataPrompt.txt

stories/<series-id>/
├── meta.json
├── structure.json
├── lang/
└── episodes/
```

## Files created

### Episode Prompts
- **basePrompt.txt**: Template for generating episode content
- **imagePrompt.txt**: Template for generating episode images
- **metadataPrompt.txt**: Template for generating episode metadata
- **init/basePrompt.txt**: Template for the first episode
- **init/metadataPrompt.txt**: Template for first episode metadata

### Stories
- **meta.json**: Series metadata with protagonist info and plot summaries
- **structure.json**: Story structure with chapters and images
- **lang/**: Directory for language-specific content
- **episodes/**: Directory for episode text files

## Next steps after scaffolding

1. **Edit prompt templates**: Update the placeholder text in `scripts/episode_prompts/<series-id>/` files with your protagonist details
2. **Update metadata**: Fill in the protagonist information in `stories/<series-id>/meta.json`
3. **Add content**: Create your first episode in `stories/<series-id>/episodes/`
4. **Create images**: Add cover and episode images to `stories/<series-id>/`

## Series ID requirements

- Must contain only lowercase letters, numbers, and hyphens
- Examples: `shanghai-blues`, `tokyo-nights`, `yuta-skipping-day`

## Template placeholders

The created files contain placeholder text that you'll need to replace:

- `[PROTAGONIST_NAME]`: Your main character's name
- `[PROTAGONIST_AGE]`: Character's age
- `[PROTAGONIST_LOCATION]`: Where the story takes place
- `[PROTAGONIST_JOB]`: Character's occupation
- `[PROTAGONIST_PERSONALITY]`: Character's personality traits
- `[PROTAGONIST_BACKGROUND]`: Character's backstory
- `[TRAIT_1]`, `[TRAIT_2]`, `[TRAIT_3]`: Character traits for meta.json
- `[CURRENT_STATE]`: Character's current emotional state
- `[FIRST_EPISODE_SUMMARY]`: Summary of the first episode
- `[FIRST_OPEN_THREAD]`: First unresolved plot thread 