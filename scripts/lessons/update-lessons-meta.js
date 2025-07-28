require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import the meta generation function
const { generateMetaJson } = require('./generate-lessons-meta.js');

/**
 * Update the meta.json file
 */
function updateMeta() {
    console.log('🔄 Updating lessons meta.json...');
    
    try {
        // Call the meta generation function
        generateMetaJson();
        console.log('✅ Meta file updated successfully!');
    } catch (error) {
        console.error('❌ Error updating meta file:', error.message);
        process.exit(1);
    }
}

updateMeta(); 