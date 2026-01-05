/**
 * Inventory Service
 * Handles all inventory-related API calls with pagination and retry logic
 */

const config = require('../config');
const { request } = require('./api');
const { MY_INVENTORY_QUERY, LOWEST_NOT_LOWEST_QUERY, UPDATE_PLATFORM_LISTINGS_MUTATION, GET_INVENTORY_DETAILS_QUERY } = require('../graphql/queries');
const { encodeCursor } = require('../utils/token');

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 500) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                const delay = baseDelay * attempt;
                console.warn(`   ⚠️ Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }
    throw lastError;
}

/**
 * Default inventory filters
 */
const DEFAULT_FILTERS = {
    isSold: {},
    isListed: {},
    isConsigned: { exact: false }
};

/**
 * Fetch a single page of inventory
 */
async function fetchInventoryPage(after = '', filters = DEFAULT_FILTERS) {
    const response = await request({
        operationName: 'MyInventory',
        variables: {
            after,
            first: config.PAGE_SIZE,
            filters
        },
        query: MY_INVENTORY_QUERY
    });

    return response.data.myInventories;
}

/**
 * Fetch ALL inventory items using Promise.all for parallel page fetching
 */
async function fetchAllInventory(filters = DEFAULT_FILTERS) {
    console.log('📦 Fetching inventory...');
    const startTime = Date.now();

    // First fetch to get total count
    const firstPage = await fetchInventoryPage('', filters);
    const totalCount = firstPage.totalCount;
    const allItems = [...firstPage.edges.map(e => e.node)];

    console.log(`   Found ${totalCount} total items`);

    if (!firstPage.pageInfo.hasNextPage) {
        console.log(`✅ Fetched ${allItems.length} items in ${Date.now() - startTime}ms`);
        return allItems;
    }

    // Calculate pages and fetch in parallel
    const totalPages = Math.ceil(totalCount / config.PAGE_SIZE);
    const pagePromises = [];

    for (let i = 1; i < totalPages; i++) {
        const offset = i * config.PAGE_SIZE - 1;
        const cursor = encodeCursor(offset);

        pagePromises.push(
            withRetry(() => fetchInventoryPage(cursor, filters))
                .then(page => page.edges.map(e => e.node))
                .catch(err => {
                    console.error(`   ❌ Page ${i + 1} failed after retries:`, err.message);
                    return [];
                })
        );
    }

    const pageResults = await Promise.all(pagePromises);

    for (const items of pageResults) {
        allItems.push(...items);
    }

    // Remove duplicates
    const uniqueItems = [...new Map(allItems.map(item => [item.id, item])).values()];

    console.log(`✅ Fetched ${uniqueItems.length} items in ${Date.now() - startTime}ms`);
    return uniqueItems;
}

/**
 * Fetch a single page of lowest/not lowest items
 */
async function fetchLowestNotLowestPage(isLowest = true, after = '') {
    const response = await request({
        operationName: 'LowestAndNotLowest',
        variables: {
            isLowest,
            order: {},
            first: config.PAGE_SIZE,
            after
        },
        query: LOWEST_NOT_LOWEST_QUERY
    });

    return response.data.lowestNotLowest;
}

/**
 * Fetch all lowest OR not lowest items with pagination
 */
async function fetchAllLowestOrNotLowest(isLowest = true) {
    const label = isLowest ? 'lowest' : 'not lowest';
    console.log(`💰 Fetching ${label} items...`);
    const startTime = Date.now();

    const firstPage = await fetchLowestNotLowestPage(isLowest, '');
    const totalCount = firstPage.totalCount;
    const allItems = [...firstPage.edges.map(e => e.node)];

    console.log(`   Found ${totalCount} ${label} items`);

    if (!firstPage.pageInfo.hasNextPage) {
        console.log(`✅ Fetched ${allItems.length} ${label} items in ${Date.now() - startTime}ms`);
        return allItems;
    }

    const totalPages = Math.ceil(totalCount / config.PAGE_SIZE);
    const pagePromises = [];

    for (let i = 1; i < totalPages; i++) {
        const offset = i * config.PAGE_SIZE - 1;
        const cursor = encodeCursor(offset);

        pagePromises.push(
            withRetry(() => fetchLowestNotLowestPage(isLowest, cursor))
                .then(page => page.edges.map(e => e.node))
                .catch(err => {
                    console.error(`   ❌ Page ${i + 1} failed after retries:`, err.message);
                    return [];
                })
        );
    }

    const pageResults = await Promise.all(pagePromises);

    for (const items of pageResults) {
        allItems.push(...items);
    }

    const uniqueItems = [...new Map(allItems.map(item => [item.id, item])).values()];

    console.log(`✅ Fetched ${uniqueItems.length} ${label} items in ${Date.now() - startTime}ms`);
    return uniqueItems;
}

/**
 * Fetch BOTH lowest AND not lowest in O(1) time using Promise.all
 */
async function fetchLowestAndNotLowest() {
    console.log('🚀 Fetching lowest AND not lowest in parallel...');
    const startTime = Date.now();

    const [lowest, notLowest] = await Promise.all([
        fetchAllLowestOrNotLowest(true),
        fetchAllLowestOrNotLowest(false)
    ]);

    console.log(`✅ Parallel fetch completed in ${Date.now() - startTime}ms`);
    console.log(`   📊 Lowest: ${lowest.length} | Not Lowest: ${notLowest.length}`);

    return { lowest, notLowest };
}

/**
 * Fetch everything - inventory, lowest, and not lowest - all in parallel
 */
async function fetchAll() {
    console.log('🔥 Fetching ALL data in parallel...');
    const startTime = Date.now();

    const [inventory, { lowest, notLowest }] = await Promise.all([
        fetchAllInventory(),
        fetchLowestAndNotLowest()
    ]);

    // Create lookup sets for fast access
    // Note: Inventory IDs might differ between "MyInventory" and "LowestNotLowest" queries
    // So we match based on the Variant ID which is consistent across both
    const lowestVariantIds = new Set(lowest.map(item => item.variant?.id).filter(Boolean));
    const notLowestVariantIds = new Set(notLowest.map(item => item.variant?.id).filter(Boolean));

    // Update inventory items with _isLowest flag
    let lowestCount = 0;
    let notLowestCount = 0;
    let unknownCount = 0;

    inventory.forEach(item => {
        const variantId = item.variant?.id;

        if (variantId && lowestVariantIds.has(variantId)) {
            item._isLowest = true;
            lowestCount++;
        } else if (variantId && notLowestVariantIds.has(variantId)) {
            item._isLowest = false;
            notLowestCount++;
        } else {
            // undefined - likely not listed or data mismatch
            unknownCount++;
        }
    });

    const result = {
        inventory,
        // We no longer return separate arrays as requested
        summary: {
            totalInventory: inventory.length,
            lowestCount,
            notLowestCount,
            unknownCount,
            totalLowestFetched: lowest.length,
            totalNotLowestFetched: notLowest.length,
            fetchedAt: new Date().toISOString(),
            fetchDurationMs: Date.now() - startTime
        }
    };

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📊 FETCH SUMMARY (Merged)');
    console.log('═══════════════════════════════════════════');
    console.log(`   📦 Total Inventory: ${result.summary.totalInventory}`);
    console.log(`   ✅  _isLowest=true:  ${lowestCount}`);
    console.log(`   ❌  _isLowest=false: ${notLowestCount}`);
    console.log(`   ❓  _isLowest=undef: ${unknownCount}`);
    console.log(`   ⏱️  Time Taken:      ${result.summary.fetchDurationMs}ms`);
    console.log('═══════════════════════════════════════════');

    return result;
}

/**
 * Update payout price for multiple platform listings
 * @param {Array<string>} listingIds - List of PlatformListing IDs
 * @param {number} newPrice - New payout price
 */
async function updatePayoutPrice(listingIds, newPrice) {
    if (!listingIds || listingIds.length === 0) return [];

    console.log(`💰 Updating price to ${newPrice} for ${listingIds.length} listings...`);

    const response = await request({
        operationName: 'UpdateMultiplePlatformListings',
        variables: {
            platformListingIds: listingIds,
            resellerPayoutPrice: parseFloat(newPrice)
        },
        query: UPDATE_PLATFORM_LISTINGS_MUTATION
    });

    return response.data.updateMultiplePlatformListings;
}

/**
 * Fetch a single inventory item by ID to get its details (inc. platform listings)
 */
async function fetchInventoryItem(id) {
    const response = await request({
        operationName: 'GetInventoryDetails',
        variables: { id },
        query: GET_INVENTORY_DETAILS_QUERY
    });
    return response.data.node;
}

module.exports = {
    fetchInventoryPage,
    fetchAllInventory,
    fetchLowestNotLowestPage,
    fetchAllLowestOrNotLowest,
    fetchLowestAndNotLowest,
    fetchAll,
    updatePayoutPrice,
    fetchInventoryItem
};
