/**
 * Authentication Service
 * Handles login, token refresh, and session management
 */

const config = require('../config');
const { LOGIN_MUTATION, REFRESH_TOKEN_MUTATION } = require('../graphql/queries');
const { saveCredentials, loadCredentials, updateToken } = require('../utils/storage');
const { decodeTokenExpiry, isTokenExpired } = require('../utils/token');

class AuthService {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.user = null;
        this._initialized = false;
    }

    /**
     * Make unauthenticated request
     */
    async _request(body) {
        const response = await fetch(config.API_URL, {
            method: 'POST',
            headers: config.BASE_HEADERS,
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

    /**
     * Login with email and password
     */
    async login(email = config.CREDENTIALS.EMAIL, password = config.CREDENTIALS.PASSWORD) {
        console.log(`🔐 Logging in as ${email}...`);

        const response = await this._request({
            operationName: 'Login',
            variables: { email, password },
            query: LOGIN_MUTATION
        });

        if (!response.data?.obtainToken?.success) {
            throw new Error(response.data?.obtainToken?.message || 'Login failed');
        }

        const { token, refreshToken, user } = response.data.obtainToken;

        this.accessToken = token;
        this.refreshToken = refreshToken;
        this.tokenExpiry = decodeTokenExpiry(token);
        this.user = user;
        this._initialized = true;

        // Save credentials
        await saveCredentials({
            email,
            password,
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            tokenExpiry: this.tokenExpiry,
            user: this.user
        });

        console.log(`✅ Logged in as ${user.firstName} ${user.lastName}`);
        return user;
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        console.log('🔄 Refreshing token...');

        const response = await this._request({
            operationName: 'RefreshToken',
            variables: { refreshToken: this.refreshToken },
            query: REFRESH_TOKEN_MUTATION
        });

        if (!response.data?.refreshToken?.token) {
            throw new Error('Token refresh failed');
        }

        this.accessToken = response.data.refreshToken.token;
        this.tokenExpiry = decodeTokenExpiry(this.accessToken);

        await updateToken(this.accessToken, this.tokenExpiry);
        console.log('✅ Token refreshed');
    }

    /**
     * Ensure we have a valid token, refresh if needed
     */
    async ensureValidToken() {
        if (!this._initialized) {
            await this.ensureAuthenticated();
        }

        if (isTokenExpired(this.tokenExpiry, config.TOKEN_REFRESH_BUFFER_MS)) {
            try {
                await this.refreshAccessToken();
            } catch (error) {
                console.log('⚠️ Token refresh failed, re-logging in...');
                await this.login();
            }
        }

        return this.accessToken;
    }

    /**
     * Initialize - load saved credentials or login
     * This is the main entry point - call this and everything is handled
     */
    async ensureAuthenticated() {
        if (this._initialized && !isTokenExpired(this.tokenExpiry, config.TOKEN_REFRESH_BUFFER_MS)) {
            return true;
        }

        // Try to load saved credentials
        const saved = await loadCredentials();

        if (saved?.accessToken && !isTokenExpired(saved.tokenExpiry, config.TOKEN_REFRESH_BUFFER_MS)) {
            // Valid saved token
            this.accessToken = saved.accessToken;
            this.refreshToken = saved.refreshToken;
            this.tokenExpiry = saved.tokenExpiry;
            this.user = saved.user;
            this._initialized = true;
            console.log(`✅ Loaded session for ${this.user?.firstName || 'user'}`);
            return true;
        }

        if (saved?.refreshToken) {
            // Try to refresh
            this.refreshToken = saved.refreshToken;
            this.user = saved.user;
            try {
                await this.refreshAccessToken();
                this._initialized = true;
                return true;
            } catch (error) {
                console.log('⚠️ Saved token expired, re-logging in...');
            }
        }

        // Login with hardcoded credentials
        await this.login();
        return true;
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this._initialized && !!this.accessToken;
    }

    /**
     * Get authorization header
     */
    getAuthHeader() {
        return `Bearer ${this.accessToken}`;
    }
}

// Singleton instance
const authService = new AuthService();

module.exports = authService;
