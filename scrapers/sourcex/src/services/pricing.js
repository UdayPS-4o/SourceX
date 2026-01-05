/**
 * Pricing Service
 * Handles price update mutations for platform listings
 */

const { request } = require('./api');
const { UPDATE_PLATFORM_LISTINGS_MUTATION } = require('../graphql/queries');
const authService = require('./auth');

/**
 * Update reseller payout price for multiple platform listings
 * 
 * @param {string[]} platformListingIds - Array of base64 encoded platform listing IDs
 * @param {number} resellerPayoutPrice - New payout price to set
 * @returns {Promise<Object>} - Result of the mutation with updated listings
 * 
 * @example
 * const result = await updatePayoutPrice(
 *   ["UGxhdGZvcm1MaXN0aW5nVHlwZToyMTk2Mzky", "UGxhdGZvcm1MaXN0aW5nVHlwZToyMTk2Mzkw"],
 *   3687
 * );
 */
async function updatePayoutPrice(platformListingIds, resellerPayoutPrice) {
    if (!Array.isArray(platformListingIds) || platformListingIds.length === 0) {
        throw new Error('platformListingIds must be a non-empty array');
    }

    if (typeof resellerPayoutPrice !== 'number' || resellerPayoutPrice <= 0) {
        throw new Error('resellerPayoutPrice must be a positive number');
    }

    // Ensure we're authenticated
    await authService.ensureAuthenticated();

    // Build the updates array for the mutation
    // Each platform listing gets the same payout price
    const updates = platformListingIds.map(id => ({
        platformListingId: id,
        resellerPayoutPrice: resellerPayoutPrice,
        resellerPayoutPriceSx: resellerPayoutPrice // Usually same as payout price
    }));

    console.log(`[Pricing] Updating ${updates.length} platform listings to ₹${resellerPayoutPrice}...`);
    console.log(`[Pricing] Updates payload:`, JSON.stringify(updates, null, 2));

    const response = await request({
        operationName: 'MyMutation',
        variables: { updates },
        query: UPDATE_PLATFORM_LISTINGS_MUTATION
    });

    console.log(`[Pricing] Raw GraphQL Response:`, JSON.stringify(response, null, 2));

    // Check for GraphQL errors
    if (response.errors && response.errors.length > 0) {
        console.error(`[Pricing] ❌ GraphQL Errors:`, response.errors);
        return {
            success: false,
            updatedCount: 0,
            errors: response.errors,
            listings: []
        };
    }

    if (response.data?.updateMultiplePlatformListings) {
        const updated = response.data.updateMultiplePlatformListings;
        console.log(`[Pricing] ✅ Successfully updated ${updated.length} platform listings`);
        console.log(`[Pricing] Updated listings:`, updated.map(l => ({ id: l.id, payout: l.resellerPayoutPrice, status: l.status })));
        return {
            success: true,
            updatedCount: updated.length,
            listings: updated
        };
    }

    console.error(`[Pricing] ❌ No updateMultiplePlatformListings in response`);
    return {
        success: false,
        updatedCount: 0,
        rawResponse: response,
        listings: []
    };
}

/**
 * Update payout price for a single inventory item using its platform listing IDs
 * This is a convenience wrapper for updatePayoutPrice
 * 
 * @param {string} platformListingIdsJson - JSON string of platform listing IDs (from DB)
 * @param {number} newPayoutPrice - New payout price
 * @returns {Promise<Object>} - Result of the update
 */
async function updateInventoryPayoutPrice(platformListingIdsJson, newPayoutPrice) {
    let platformListingIds;

    try {
        platformListingIds = JSON.parse(platformListingIdsJson);
    } catch (e) {
        throw new Error('Invalid platformListingIdsJson: must be a valid JSON array');
    }

    if (!Array.isArray(platformListingIds) || platformListingIds.length === 0) {
        throw new Error('No platform listing IDs found for this inventory item');
    }

    return updatePayoutPrice(platformListingIds, newPayoutPrice);
}

module.exports = {
    updatePayoutPrice,
    updateInventoryPayoutPrice
};
