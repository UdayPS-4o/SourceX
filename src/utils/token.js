/**
 * Token Utilities
 * JWT token parsing and validation helpers
 */

/**
 * Decode JWT token to extract expiry time
 * @param {string} token - JWT token
 * @returns {string} ISO date string of expiry
 */
function decodeTokenExpiry(token) {
    try {
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        return new Date(payload.exp * 1000).toISOString();
    } catch {
        // Default to 1 hour from now if decode fails
        return new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
}

/**
 * Check if token is expired or about to expire
 * @param {string} tokenExpiry - ISO date string
 * @param {number} bufferMs - Buffer time in milliseconds
 * @returns {boolean}
 */
function isTokenExpired(tokenExpiry, bufferMs = 5 * 60 * 1000) {
    if (!tokenExpiry) return true;

    const now = new Date();
    const expiry = new Date(tokenExpiry);

    return (expiry.getTime() - now.getTime()) < bufferMs;
}

/**
 * Encode cursor for pagination
 * @param {number} offset - Array offset
 * @returns {string} Base64 encoded cursor
 */
function encodeCursor(offset) {
    return Buffer.from(`arrayconnection:${offset}`).toString('base64');
}

module.exports = {
    decodeTokenExpiry,
    isTokenExpired,
    encodeCursor
};
