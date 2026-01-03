/**
 * API Service
 * Base API request handler with authentication
 */

const config = require('../config');
const authService = require('./auth');

/**
 * Make authenticated API request
 * Automatically handles token refresh
 */
async function request(body) {
    // Ensure we have valid auth
    await authService.ensureValidToken();

    const response = await fetch(config.API_URL, {
        method: 'POST',
        headers: {
            ...config.BASE_HEADERS,
            'authorization': authService.getAuthHeader()
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
        throw new Error(data.errors[0]?.message || 'GraphQL Error');
    }

    return data;
}

module.exports = { request };
