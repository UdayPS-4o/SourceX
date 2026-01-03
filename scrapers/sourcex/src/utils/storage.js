/**
 * Storage Utilities
 * Handles reading/writing credentials and data files
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

/**
 * Save credentials to JSON file
 */
async function saveCredentials(data) {
    await ensureDir(path.dirname(config.PATHS.CREDENTIALS_FILE));

    const payload = {
        ...data,
        savedAt: new Date().toISOString()
    };

    await fs.writeFile(
        config.PATHS.CREDENTIALS_FILE,
        JSON.stringify(payload, null, 2),
        'utf-8'
    );

    console.log('💾 Credentials saved');
}

/**
 * Load credentials from JSON file
 */
async function loadCredentials() {
    try {
        const data = await fs.readFile(config.PATHS.CREDENTIALS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

/**
 * Update only the token in saved credentials
 */
async function updateToken(accessToken, tokenExpiry) {
    const creds = await loadCredentials();
    if (creds) {
        creds.accessToken = accessToken;
        creds.tokenExpiry = tokenExpiry;
        creds.savedAt = new Date().toISOString();
        await fs.writeFile(
            config.PATHS.CREDENTIALS_FILE,
            JSON.stringify(creds, null, 2),
            'utf-8'
        );
    }
}

/**
 * Save data to output file
 */
async function saveOutput(filename, data) {
    await ensureDir(config.PATHS.OUTPUT_DIR);

    const filePath = path.join(config.PATHS.OUTPUT_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`💾 Data saved to ${filePath}`);
    return filePath;
}

/**
 * Delete credentials file
 */
async function deleteCredentials() {
    try {
        await fs.unlink(config.PATHS.CREDENTIALS_FILE);
        console.log('🗑️ Credentials deleted');
    } catch (error) {
        // File may not exist
    }
}

module.exports = {
    ensureDir,
    saveCredentials,
    loadCredentials,
    updateToken,
    saveOutput,
    deleteCredentials
};
