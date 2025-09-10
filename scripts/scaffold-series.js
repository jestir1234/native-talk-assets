#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const seriesId = args[0];
const isChildrenStory = args.includes('--children');

if (!seriesId) {
  console.error('Usage: node scaffold-series.js <series-id> [--children]');
  console.error('Example: node scaffold-series.js shanghai-blues');
  console.error('Example: node scaffold-series.js my-children-story --children');
  process.exit(1);
}

// Validate series ID format (lowercase, hyphens only)
if (!/^[a-z0-9-]+$/.test(seriesId)) {
  console.error('Series ID must contain only lowercase letters, numbers, and hyphens');
  process.exit(1);
}

console.log(`Scaffolding ${isChildrenStory ? 'children\'s story' : 'series'}: ${seriesId}`);

// Create directories based on story type
const directories = [
  `stories/${seriesId}`,
  `stories/${seriesId}/lang`
];

// Add story-type specific directories
if (isChildrenStory) {
  directories.push(`stories/${seriesId}/audio`);
} else {
  directories.push(
    `scripts/episode_prompts/${seriesId}`,
    `scripts/episode_prompts/${seriesId}/init`,
    `stories/${seriesId}/episodes`
  );
}

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

// Template for basePrompt.txt
const basePromptTemplate = `You are writing the next episode in a serialized Japanese-language short story.

The protagonist is:

- Name: [PROTAGONIST_NAME]
- Age: [PROTAGONIST_AGE]
- Location: [PROTAGONIST_LOCATION]
- Job: [PROTAGONIST_JOB]
- Personality: [PROTAGONIST_PERSONALITY]
- Background: [PROTAGONIST_BACKGROUND]

The story is continuous and should evolve naturally. Use the following summary of what has happened so far to inform what comes next:

\${PAST_SUMMARY}

The story should feel slice-of-life, light-hearted, humorous, with subtle emotional undercurrents.

Write the Episode entirely in **Japanese**. It should be 400–600 characters long.`;

// Template for imagePrompt.txt
const imagePromptTemplate = `Create a detailed illustration of [PROTAGONIST_NAME], a cute Japanese [PROTAGONIST_DESCRIPTION]. [PROTAGONIST_PERSONALITY_DESCRIPTION].

Illustrate [PROTAGONIST_NAME] in the following scene:  
\${description}

Use a bright slice-of-life style you would see in a manga. Show elements of modern [LOCATION] — [LOCATION_DETAILS] — depending on the scene. [PROTAGONIST_NAME] should look cute, independent, a bit tired, but quietly resilient and observant.`;

// Template for metadataPrompt.txt
const metadataPromptTemplate = `You are a creative assistant helping write a serialized Japanese-language story about [PROTAGONIST_NAME], a [PROTAGONIST_AGE]-year-old [PROTAGONIST_DESCRIPTION] in [PROTAGONIST_LOCATION] who [PROTAGONIST_JOB_DESCRIPTION].

The story is continuous and should evolve naturally. Use the following summary of what has happened so far to inform what comes next:

\${PAST_SUMMARY}

Now, come up with the next episode idea. It should feel like the natural next chapter in an ongoing story. It can deepen character relationships, introduce a new twist, or expand on unresolved threads — but should avoid wrapping up the entire story.

Return:
- A creative episode title
- A short plot hook (1–2 sentences) describing what happens in the episode
- A very short (10 words or fewer) description of the episode

The tone should feel organic and evolving — you can make it warm, dramatic, mysterious, funny, or bittersweet depending on what fits best.  
Format your response as JSON:
{
  "title": "Your Title",
  "hook": "Your Plot Hook",
  "description": "Your Description"
}`;

// Template for init/basePrompt.txt
const initBasePromptTemplate = `You are writing the first episode in a serialized Japanese-language short story.

The protagonist is:

- Name: [PROTAGONIST_NAME]
- Age: [PROTAGONIST_AGE]
- Location: [PROTAGONIST_LOCATION]
- Job: [PROTAGONIST_JOB]
- Personality: [PROTAGONIST_PERSONALITY]
- Background: [PROTAGONIST_BACKGROUND]

Tone: Quiet, introspective, sometimes dry or melancholic. The story should feel slice-of-life, light-hearted, humorous, with subtle emotional undercurrents.

Write Episode 1 entirely in **Japanese**. It should be 400–600 characters long, and describe a day in [PROTAGONIST_NAME]'s life involving [FIRST_EPISODE_HOOK]. Set the mood, introduce her voice, and hint at her emotional state. No need to explain everything—let her character come through naturally.

This is a serialized story, so the world and character will continue evolving from here.`;

// Template for init/metadataPrompt.txt
const initMetadataPromptTemplate = `You are a creative assistant helping write a serialized Japanese-language story about [PROTAGONIST_NAME], a [PROTAGONIST_AGE]-year-old [PROTAGONIST_DESCRIPTION] in [PROTAGONIST_LOCATION] who [PROTAGONIST_JOB_DESCRIPTION].

The story is continuous and should evolve naturally.

Now, come up with the first episode idea. It should introduce the audience to the character in an interesting way. 

Return:
- A creative episode title
- A short plot hook (1–2 sentences) describing what happens in the episode
- A very short (10 words or fewer) description of the episode

The tone should feel organic and evolving — you can make it warm, dramatic, mysterious, funny, or bittersweet depending on what fits best.  
Format your response as JSON:
{
  "title": "Your Title",
  "hook": "Your Plot Hook",
  "description": "Your Description"
}`;

// Template for meta.json
const metaJsonTemplate = {
  "current_episode": 1,
  "protagonist": {
    "traits": [
    ],
    "current_state": ""
  },
  "plot_summary": [
  ],
  "support_characters": [],
  "open_threads": [
  ]
};

// Template for structure.json
const structureJsonTemplate = {
  "id": seriesId,
  "coverImage": `https://cdn.native-talk.com/stories/${seriesId}/cover.webp`,
  [isChildrenStory ? "pages" : "chapters"]: []
};

// Template for en.json
const enJsonTemplate = {
  "title": seriesId,
  "description": "[FILL IN]",
  [isChildrenStory ? "pages" : "chapters"]: []
};

// Create files based on story type
const files = [
  {
    path: `stories/${seriesId}/meta.json`,
    content: JSON.stringify(metaJsonTemplate, null, 2)
  },
  {
    path: `stories/${seriesId}/structure.json`,
    content: JSON.stringify(structureJsonTemplate, null, 2)
  },
  {
    path: `stories/${seriesId}/lang/en.json`,
    content: JSON.stringify(enJsonTemplate, null, 2)
  }
];

// Add story-type specific files
if (isChildrenStory) {
  // Add audio meta.json for children stories
  files.push({
    path: `stories/${seriesId}/audio/meta.json`,
    content: JSON.stringify({}, null, 2)
  });
  
  // Add story.txt for children stories
  files.push({
    path: `stories/${seriesId}/story.txt`,
    content: "[FILL IN - Write your children's story here]"
  });
} else {
  // Add episode prompt files for regular series
  files.push(
    {
      path: `scripts/episode_prompts/${seriesId}/basePrompt.txt`,
      content: basePromptTemplate
    },
    {
      path: `scripts/episode_prompts/${seriesId}/imagePrompt.txt`,
      content: imagePromptTemplate
    },
    {
      path: `scripts/episode_prompts/${seriesId}/metadataPrompt.txt`,
      content: metadataPromptTemplate
    },
    {
      path: `scripts/episode_prompts/${seriesId}/init/basePrompt.txt`,
      content: initBasePromptTemplate
    },
    {
      path: `scripts/episode_prompts/${seriesId}/init/metadataPrompt.txt`,
      content: initMetadataPromptTemplate
    }
  );
}

files.forEach(file => {
  if (!fs.existsSync(file.path)) {
    fs.writeFileSync(file.path, file.content);
    console.log(`Created file: ${file.path}`);
  } else {
    console.log(`File already exists: ${file.path}`);
  }
});

console.log(`\n✅ ${isChildrenStory ? 'Children\'s story' : 'Series'} '${seriesId}' scaffolded successfully!`);
console.log(`\nNext steps:`);

if (isChildrenStory) {
  console.log(`1. Write your children's story in stories/${seriesId}/story.txt`);
  console.log(`2. Update the story details in stories/${seriesId}/lang/en.json`);
  console.log(`3. Create cover and page images in stories/${seriesId}/`);
  console.log(`4. Add audio files to stories/${seriesId}/audio/`);
} else {
  console.log(`1. Edit the prompt templates in scripts/episode_prompts/${seriesId}/`);
  console.log(`2. Update the protagonist details in stories/${seriesId}/meta.json`);
  console.log(`3. Add your first episode content to stories/${seriesId}/episodes/`);
  console.log(`4. Create cover and episode images in stories/${seriesId}/`);
} 