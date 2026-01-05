/**
 * Configuration
 * Contains all app settings including credentials
 */

const path = require('path');

module.exports = {
    // API Configuration
    API_URL: 'https://api.culture-circle.com/graphql',

    // Credentials (from environment variables)
    CREDENTIALS: {
        EMAIL: process.env.SOURCEX_EMAIL,
        PASSWORD: process.env.SOURCEX_PASSWORD
    },

    // File paths
    PATHS: {
        CREDENTIALS_FILE: path.join(__dirname, '../../data/credentials.json'),
        DATA_DIR: path.join(__dirname, '../../data'),
        OUTPUT_DIR: path.join(__dirname, '../../output')
    },

    // API Settings
    PAGE_SIZE: 100,
    TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000, // 5 minutes before expiry

    // Request Headers
    BASE_HEADERS: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'content-type': 'application/json',
        'pragma': 'no-cache',
        'Referer': 'https://sourcex.app/'
    }
};
