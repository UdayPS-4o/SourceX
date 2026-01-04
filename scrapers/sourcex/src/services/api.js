/**
 * API Service
 * Base API request handler with authentication and retry logic
 */

const config = require('../config');
const authService = require('./auth');

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make authenticated API request with retry logic
 * Automatically handles token refresh and retries on failure
 * 
 * @param {Object} body - Request body
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} retryDelay - Base delay between retries in ms (default: 1000)
 */
async function request(body, maxRetries = 3, retryDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
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
                // Rate limiting - wait longer before retry
                if (response.status === 429) {
                    const waitTime = retryDelay * attempt * 2;
                    console.warn(`   ⚠️ Rate limited (429), waiting ${waitTime}ms...`);
                    await sleep(waitTime);
                    continue;
                }

                // Server errors - retry
                if (response.status >= 500) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Client errors (400, 401, 403, 404) - don't retry
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.errors) {
                const errorMessage = data.errors[0]?.message || 'GraphQL Error';
                // Some GraphQL errors are transient
                if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
                    throw new Error(errorMessage);
                }
                throw new Error(errorMessage);
            }

            return data;

        } catch (err) {
            lastError = err;

            // Network errors - always retry
            const isNetworkError = err.message.includes('fetch') ||
                err.message.includes('ECONNRESET') ||
                err.message.includes('ETIMEDOUT') ||
                err.message.includes('ENOTFOUND') ||
                err.message.includes('network');

            // Server errors - always retry
            const isServerError = err.message.includes('HTTP 5');

            if ((isNetworkError || isServerError) && attempt < maxRetries) {
                const waitTime = retryDelay * attempt;
                console.warn(`   ⚠️ Request failed (attempt ${attempt}/${maxRetries}): ${err.message}`);
                console.warn(`   ⏳ Retrying in ${waitTime}ms...`);
                await sleep(waitTime);
                continue;
            }

            // If not retryable or out of retries, throw
            if (attempt === maxRetries) {
                console.error(`   ❌ Request failed after ${maxRetries} attempts: ${err.message}`);
            }
            throw err;
        }
    }

    throw lastError;
}

/**
 * Make request with custom retry config
 */
async function requestWithRetry(body, options = {}) {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    return request(body, maxRetries, retryDelay);
}

module.exports = { request, requestWithRetry };
