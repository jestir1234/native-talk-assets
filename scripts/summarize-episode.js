require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Get arguments: story name, episode number
const STORY_NAME = process.argv[2];
const EPISODE_NUM = process.argv[3];

// Validate arguments
if (process.argv.length < 4) {
    console.error('Usage: node scripts/summarize-episode.js <story-name> <episode-number>');
    console.error('Example: node scripts/summarize-episode.js for-rent 1');
    process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    try {
        const response = await axios.post(url, {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        });
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || '[No content returned]';
    } catch (error) {
        console.error('❌ API Error:', error.message);
        return null;
    }
}

async function summarizeEpisode() {
    console.log(`📝 Summarizing episode ${EPISODE_NUM} for story: ${STORY_NAME}`);
    
    // Read the episode content
    const episodePath = path.resolve(__dirname, `../stories/${STORY_NAME}/episodes/episode_${EPISODE_NUM}.txt`);
    const episodeContent = fs.readFileSync(episodePath, 'utf-8');
    
    // Read current meta.json to get context
    const metaPath = path.resolve(__dirname, `../stories/${STORY_NAME}/meta.json`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    
    // Build context from previous episodes
    let context = '';
    if (meta.plot_summary && meta.plot_summary.length > 0) {
        context += 'Previous plot summaries:\n';
        meta.plot_summary.forEach((summary, index) => {
            context += `Episode ${index + 1}: ${summary}\n`;
        });
        context += '\n';
    }
    
    if (meta.support_characters && Object.keys(meta.support_characters).length > 0) {
        context += 'Current supporting characters:\n';
        Object.entries(meta.support_characters).forEach(([name, description]) => {
            context += `- ${name}: ${description}\n`;
        });
        context += '\n';
    }
    
    if (meta.open_threads && meta.open_threads.length > 0) {
        context += 'Open threads from previous episodes:\n';
        meta.open_threads.forEach(thread => {
            context += `- ${thread}\n`;
        });
        context += '\n';
    }
    
    const prompt = `You are analyzing a serialized story episode for continuity tracking. 

${context}

Current episode content:
${episodeContent}

Please analyze this episode and provide a JSON response with the following structure:

{
  "support_characters": {
    "CharacterName": "Brief update on their current state or development"
  },
  "plot_summary": "A concise 1-2 sentence summary of what happened in this episode",
  "open_threads": [
    "Ongoing theme or unresolved plot point 1",
    "Ongoing theme or unresolved plot point 2"
  ]
}

Guidelines:
- Only include characters that appeared or were mentioned in this episode
- Focus on character development and relationship changes
- Identify new or continuing plot threads that will carry forward
- Keep summaries concise but informative
- Return only the JSON object, no additional text

Return the JSON response:`;

    console.log('🧠 Analyzing episode with Gemini...');
    const response = await callGemini(prompt);
    
    if (!response) {
        console.log('⚠️ Episode analysis failed.');
        return null;
    }
    
    // Clean up the response
    const cleaned = response
        .replace(/```json\s*/i, '')
        .replace(/```/g, '')
        .trim();
    
    try {
        const analysis = JSON.parse(cleaned);
        console.log('✅ Episode analysis completed');
        return analysis;
    } catch (e) {
        console.error('❌ Failed to parse episode analysis:', e.message);
        console.error('Raw response:', response);
        return null;
    }
}

async function updateMetaFile(analysis) {
    const metaPath = path.resolve(__dirname, `../stories/${STORY_NAME}/meta.json`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    
    // Add new plot summary
    if (!meta.plot_summary) {
        meta.plot_summary = [];
    }
    meta.plot_summary.push(analysis.plot_summary);
    
    // Update supporting characters
    if (!meta.support_characters) {
        meta.support_characters = {};
    }
    Object.assign(meta.support_characters, analysis.support_characters);
    
    // Update open threads
    if (!meta.open_threads) {
        meta.open_threads = [];
    }
    // Add new threads, avoiding duplicates
    analysis.open_threads.forEach(thread => {
        if (!meta.open_threads.includes(thread)) {
            meta.open_threads.push(thread);
        }
    });
    
    // Write back to file
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    console.log(`✅ Updated meta.json with episode ${EPISODE_NUM} analysis`);
}

async function main() {
    console.log(`📚 Summarizing episode for serialized story: ${STORY_NAME}`);
    
    const analysis = await summarizeEpisode();
    
    if (!analysis) {
        console.log('⚠️ Episode analysis failed. Exiting.');
        return;
    }
    
    console.log('📊 Analysis results:');
    console.log(`📝 Plot summary: ${analysis.plot_summary}`);
    console.log(`👥 Supporting characters: ${Object.keys(analysis.support_characters).length} updated`);
    console.log(`🧵 Open threads: ${analysis.open_threads.length} identified`);
    
    await updateMetaFile(analysis);
    
    console.log('✅ Episode summarization complete!');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { summarizeEpisode, updateMetaFile }; 