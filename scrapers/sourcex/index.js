/**
 * SourceX Client - Main Entry Point
 * 
 * Simple API:
 *   const sourcex = require('./src');
 *   const data = await sourcex.fetchAll();
 * 
 * That's it! Auto-login and token refresh handled automatically.
 */

const authService = require('./src/services/auth');
const inventoryService = require('./src/services/inventory');
const pricingService = require('./src/services/pricing');
const { saveOutput } = require('./src/utils/storage');

// ============================================
// MAIN API - Just call these methods
// ============================================

/**
 * Initialize and ensure authenticated
 * Called automatically by other methods, but can be called explicitly
 */
async function init() {
    await authService.ensureAuthenticated();
    return authService.getUser();
}

/**
 * Fetch all inventory items
 * @param {Object} filters - Optional filters
 */
async function fetchInventory(filters) {
    await init();
    return inventoryService.fetchAllInventory(filters);
}

/**
 * Fetch lowest price items only
 */
async function fetchLowest() {
    await init();
    return inventoryService.fetchAllLowestOrNotLowest(true);
}

/**
 * Fetch not lowest price items only
 */
async function fetchNotLowest() {
    await init();
    return inventoryService.fetchAllLowestOrNotLowest(false);
}

/**
 * Fetch both lowest and not lowest in parallel (O(1))
 */
async function fetchLowestAndNotLowest() {
    await init();
    return inventoryService.fetchLowestAndNotLowest();
}

/**
 * Fetch EVERYTHING in parallel - inventory + lowest + not lowest
 */
async function fetchAll() {
    await init();
    return inventoryService.fetchAll();
}

/**
 * Fetch all and save to file
 */
async function fetchAndSave(filename = 'inventory-data.json') {
    const data = await fetchAll();
    await saveOutput(filename, data);
    return data;
}

/**
 * Get current user info
 */
async function getUser() {
    await init();
    return authService.getUser();
}

/**
 * Check if authenticated
 */
function isAuthenticated() {
    return authService.isAuthenticated();
}

/**
 * Update reseller payout price for platform listings
 * @param {string[]} platformListingIds - Array of base64 encoded platform listing IDs
 * @param {number} newPayoutPrice - New payout price to set
 */
async function updatePayoutPrice(platformListingIds, newPayoutPrice) {
    await init();
    return pricingService.updatePayoutPrice(platformListingIds, newPayoutPrice);
}

/**
 * Update payout price using JSON string of IDs (from DB)
 * @param {string} platformListingIdsJson - JSON string of platform listing IDs
 * @param {number} newPayoutPrice - New payout price
 */
async function updateInventoryPayoutPrice(platformListingIdsJson, newPayoutPrice) {
    await init();
    return pricingService.updateInventoryPayoutPrice(platformListingIdsJson, newPayoutPrice);
}

// Export clean API
module.exports = {
    // Main methods
    init,
    fetchAll,
    fetchAndSave,
    fetchInventory,
    fetchLowest,
    fetchNotLowest,
    fetchLowestAndNotLowest,
    getUser,
    isAuthenticated,

    // Pricing methods
    updatePayoutPrice,
    updateInventoryPayoutPrice,

    // Services for advanced use
    auth: authService,
    inventory: inventoryService,
    pricing: pricingService
};

