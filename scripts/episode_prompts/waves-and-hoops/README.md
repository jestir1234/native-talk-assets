# Waves and Hoops - Episode Prompts

This directory contains episode-specific prompts for the "Waves and Hoops" story series. Each episode has its own prompt file that guides the AI generation with specific plot points, character development, and narrative direction.

## Story Overview

"Waves and Hoops" is a coming-of-age story about Kaito Nakamura, a former competitive swimmer who discovers basketball after losing his Olympic dreams when his training pool is destroyed by a typhoon.

## Episode Structure

The story is planned for 20 episodes, each with a specific focus:

### Episodes 1-6: The Swimming Years
- **Episode 1**: "The Last Lap" - Kaito's final swim in the Olympic pool
- **Episode 2**: "Wishes from the Past" - Flashback to his mother's dying wish
- **Episode 3**: "Typhoon Warning" - The storm approaches
- **Episode 4**: "After the Storm" - The pool is destroyed
- **Episode 5**: "Shadows Beneath the Surface" - Failed ocean training attempt
- **Episode 6**: "Drowning Spirit" - Kaito's depression and isolation

### Episodes 7-12: The Discovery
- **Episode 7**: "The Court of Change" - First encounter with basketball
- **Episode 8**: "One-on-One" - First basketball game with Marcus and Jamal
- **Episode 9**: "From Lanes to Lanes" - Secret basketball training
- **Episode 10**: "Crossroads" - Confrontation with Coach Tanaka
- **Episode 11**: "Hana's Voice" - Childhood friend's encouragement
- **Episode 12**: "Tryouts" - School basketball team tryouts

### Episodes 13-20: The Basketball Journey
- **Episode 13**: "The New Discipline" - Intensive basketball training
- **Episode 14**: "First Game" - First competitive basketball game
- **Episode 15**: "Growing Pains" - Team dynamics and challenges
- **Episode 16**: "Flash of the Past" - Return to the destroyed pool
- **Episode 17**: "Regional Tournament Begins" - Tournament success
- **Episode 18**: "Semifinals" - Tournament tension and injury
- **Episode 19**: "Final Game: Loss" - Championship game and loss
- **Episode 20**: "New Dream" - NBA scout and new opportunities

## Usage

To generate episodes using these specific prompts:

```bash
node scripts/generate-episode.js waves-and-hoops en ja --episodes
```

**Note**: All episodes are written in Japanese as specified in each prompt.

## Metadata System

Each episode has predefined metadata in `episodes_metadata.json`:
- **Title**: Japanese episode title
- **Hook**: Brief description of the episode's main event
- **Description**: Detailed summary for image generation

This metadata is used for:
- Episode image generation
- Story structure tracking
- Episode identification

The `--episodes` flag tells the script to:
1. Use episode-specific prompts from `/episodes/` directory
2. Generate one episode at a time in sequence
3. Use the `summarize-episode.js` script to update `meta.json` with continuity data
4. Enrich each prompt with past episode summaries, supporting characters, and open threads

## Continuity Features

Each episode prompt includes:
- `${PAST_SUMMARY}` placeholder that gets populated with:
  - Previous episode summaries
  - Supporting character updates
  - Ongoing plot threads
  - Protagonist's current state

This ensures each episode builds on the previous ones and maintains narrative coherence.

## Character Development

The story follows Kaito's transformation from:
- Dedicated swimmer with Olympic dreams
- Depressed and directionless after losing his pool
- Curious observer of basketball
- Determined basketball player
- Confident athlete with new dreams

## Themes

- **Transformation**: From swimming to basketball
- **Resilience**: Overcoming loss and finding new purpose
- **Legacy**: Honoring his mother's dreams in a new way
- **Friendship**: Support from Marcus, Jamal, Hana, and teammates
- **Growth**: Learning to adapt and find new paths to success 