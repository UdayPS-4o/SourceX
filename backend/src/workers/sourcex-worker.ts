/**
 * SourceX Worker
 * Fetches inventory data from SourceX scraper and syncs to database
 * Uses bulk upserts for performance
 */

import 'dotenv/config';
import { eq, sql } from 'drizzle-orm';
import { db, listings, platforms, priceHistory, inventoryHistory, pool } from '../db';
import type { ListingInsert, Listing } from '../db/schema';

// ============================================
// TYPES
// ============================================

interface SourceXVariant {
    id: string;
    lowestPrice: number;
    title: string;
    product: {
        brandName: string;
        skuId: string;
        title: string;
        images: {
            edges: Array<{ node: { image: string } }>;
        };
    };
}

interface SourceXPlatformListing {
    node: {
        marketplace: {
            title: string;
            commissionPercentage: number;
        };
        resellerPayoutPrice: number;
    };
}

interface SourceXInventoryItem {
    id: string;
    quantity: number;
    variant: SourceXVariant;
    platformListings: {
        edges: SourceXPlatformListing[];
    };
    _isLowest?: boolean;
}

interface SyncResult {
    platformId: number;
    totalProcessed: number;
    inserted: number;
    updated: number;
    priceChanges: number;
    stockChanges: number;
    errors: number;
    durationMs: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Decode SourceX base64 ID to numeric ID
 * "TXlJbnZlbnRvcnlUeXBlOjMwNTIyNg==" → 305226n
 */
export function decodeSourceXId(base64Id: string): bigint {
    try {
        const decoded = Buffer.from(base64Id, 'base64').toString('utf-8');
        // Format: "MyInventoryType:305226" or "VariantType:188322"
        const match = decoded.match(/:(\d+)$/);
        if (match) {
            return BigInt(match[1]);
        }
        throw new Error(`Invalid ID format: ${decoded}`);
    } catch (error) {
        console.error(`Failed to decode ID: ${base64Id}`, error);
        throw error;
    }
}

/**
 * Extract culturecircle marketplace data from platformListings
 */
export function extractCultureCircleData(item: SourceXInventoryItem): { payoutPrice: number | null; commission: number | null } {
    const ccListing = item.platformListings?.edges?.find(
        (edge) => edge.node.marketplace.title === 'culturecircle'
    );

    if (ccListing) {
        return {
            payoutPrice: ccListing.node.resellerPayoutPrice,
            commission: Math.round(ccListing.node.marketplace.commissionPercentage * 100), // Store as int (14% → 1400)
        };
    }

    return { payoutPrice: null, commission: null };
}

/**
 * Transform SourceX inventory item to database listing
 */
export function transformToListing(item: SourceXInventoryItem, platformId: number): ListingInsert {
    const { payoutPrice, commission } = extractCultureCircleData(item);
    const variant = item.variant;
    const product = variant?.product;
    const firstImage = product?.images?.edges?.[0]?.node?.image || null;

    return {
        id: decodeSourceXId(item.id),
        platformId,
        productSku: product?.skuId || 'UNKNOWN',
        variantId: variant?.id ? String(decodeSourceXId(variant.id)) : null,
        productName: product?.title || 'Unknown Product',
        imgUrl: firstImage,
        size: variant?.title || null,
        currentPrice: item._isLowest ? String(variant?.lowestPrice) : null,
        currentStock: item.quantity,
        cfb1: item._isLowest === true,
        cft1: product?.brandName || null,
        cft2: null,
        cft3: null,
        cfi1: payoutPrice,
        cfi2: commission,
        cfi3: null,
    };
}

// ============================================
// BULK UPSERT LOGIC
// ============================================

/**
 * Bulk upsert listings using raw SQL for performance
 * Uses ON DUPLICATE KEY UPDATE
 */
async function bulkUpsertListings(listingsData: ListingInsert[]): Promise<{ inserted: number; updated: number }> {
    if (listingsData.length === 0) return { inserted: 0, updated: 0 };

    const chunkSize = 100;
    let totalInserted = 0;
    let totalUpdated = 0;

    for (let i = 0; i < listingsData.length; i += chunkSize) {
        const chunk = listingsData.slice(i, i + chunkSize);

        // Build values string
        const values = chunk.map(l => `(
            ${l.id.toString()},
            ${l.platformId},
            ${escape(l.productSku)},
            ${l.variantId ? escape(l.variantId) : 'NULL'},
            ${escape(l.productName)},
            ${l.imgUrl ? escape(l.imgUrl) : 'NULL'},
            ${l.size ? escape(l.size) : 'NULL'},
            ${l.currentPrice ? l.currentPrice : 'NULL'},
            ${l.currentStock !== null ? l.currentStock : 'NULL'},
            ${l.cfb1 ? 1 : 0},
            ${l.cft1 ? escape(l.cft1) : 'NULL'},
            ${l.cft2 ? escape(l.cft2) : 'NULL'},
            ${l.cft3 ? escape(l.cft3) : 'NULL'},
            ${l.cfi1 !== null ? l.cfi1 : 'NULL'},
            ${l.cfi2 !== null ? l.cfi2 : 'NULL'},
            ${l.cfi3 !== null ? l.cfi3 : 'NULL'},
            NOW(),
            NOW()
        )`).join(',\n');

        const sql = `
            INSERT INTO listings (
                id, platform_id, product_sku, variant_id, product_name, img_url, size,
                current_price, current_stock, cfb_1, cft_1, cft_2, cft_3, cfi_1, cfi_2, cfi_3,
                last_event_at, updated_at
            ) VALUES ${values}
            ON DUPLICATE KEY UPDATE
                product_name = VALUES(product_name),
                img_url = VALUES(img_url),
                size = VALUES(size),
                current_price = VALUES(current_price),
                current_stock = VALUES(current_stock),
                cfb_1 = VALUES(cfb_1),
                cft_1 = VALUES(cft_1),
                cft_2 = VALUES(cft_2),
                cft_3 = VALUES(cft_3),
                cfi_1 = VALUES(cfi_1),
                cfi_2 = VALUES(cfi_2),
                cfi_3 = VALUES(cfi_3),
                last_event_at = NOW(),
                updated_at = NOW()
        `;

        try {
            const [result] = await pool.query(sql) as any;
            // affectedRows: 1 = insert, 2 = update (MySQL behavior)
            const affected = result.affectedRows || 0;
            // Rough estimate: if affectedRows == chunk.length, all inserts; if more, some updates
            totalInserted += Math.min(affected, chunk.length);
            totalUpdated += Math.max(0, affected - chunk.length);
        } catch (err: any) {
            console.error(`[SourceX Worker] Bulk insert error:`, err.message);
            throw err;
        }
    }

    return { inserted: totalInserted, updated: totalUpdated };
}

/**
 * Escape string for SQL
 */
function escape(str: string): string {
    return `'${str.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

// ============================================
// SYNC LOGIC
// ============================================

/**
 * Main sync function - fetches from SourceX and updates database using bulk upserts
 */
export async function syncSourceX(): Promise<SyncResult> {
    const startTime = Date.now();
    console.log('[SourceX Worker] Starting sync...');

    // Get or create platform
    let platform = await db.query.platforms.findFirst({
        where: eq(platforms.name, 'SourceX'),
    });

    if (!platform) {
        console.log('[SourceX Worker] Creating platform...');
        await db.insert(platforms).values({
            name: 'SourceX',
            baseUrl: 'https://sourcex.in',
            syncStatus: 'idle',
        });
        platform = await db.query.platforms.findFirst({
            where: eq(platforms.name, 'SourceX'),
        });
    }

    const platformId = platform!.id;

    // Update sync status
    await db.update(platforms)
        .set({ syncStatus: 'running', lastSyncStart: new Date() })
        .where(eq(platforms.id, platformId));

    let result: SyncResult = {
        platformId,
        totalProcessed: 0,
        inserted: 0,
        updated: 0,
        priceChanges: 0,
        stockChanges: 0,
        errors: 0,
        durationMs: 0,
    };

    try {
        // Import SourceX scraper using absolute path
        const path = require('path');
        const sourcexPath = path.resolve(__dirname, '../../../scrapers/sourcex');
        const sourcex = require(sourcexPath);

        console.log('[SourceX Worker] Fetching lowest and not lowest...');
        const { lowest, notLowest } = await sourcex.fetchLowestAndNotLowest();

        // Mark items with _isLowest flag
        lowest.forEach((item: SourceXInventoryItem) => { item._isLowest = true; });
        notLowest.forEach((item: SourceXInventoryItem) => { item._isLowest = false; });

        // Combine all items
        const allItems = [...lowest, ...notLowest];
        console.log(`[SourceX Worker] Processing ${allItems.length} items...`);

        // Transform all items to listings
        const listingsToUpsert: ListingInsert[] = [];
        for (const item of allItems) {
            try {
                const listing = transformToListing(item, platformId);
                listingsToUpsert.push(listing);
            } catch (err: any) {
                console.error(`[SourceX Worker] Error transforming item:`, err.message);
                result.errors++;
            }
        }

        console.log(`[SourceX Worker] Bulk upserting ${listingsToUpsert.length} listings...`);

        // Bulk upsert all listings
        const upsertResult = await bulkUpsertListings(listingsToUpsert);
        result.inserted = upsertResult.inserted;
        result.updated = upsertResult.updated;
        result.totalProcessed = listingsToUpsert.length;

        console.log(`[SourceX Worker] Bulk upsert complete: ${result.inserted} affected rows`);

        // Update sync status to idle
        await db.update(platforms)
            .set({ syncStatus: 'idle', lastSyncEnd: new Date() })
            .where(eq(platforms.id, platformId));

    } catch (error: any) {
        console.error('[SourceX Worker] Sync failed:', error.message);
        await db.update(platforms)
            .set({ syncStatus: 'failed', lastSyncEnd: new Date() })
            .where(eq(platforms.id, platformId));
        throw error;
    }

    result.durationMs = Date.now() - startTime;

    console.log('[SourceX Worker] Sync completed:', {
        totalProcessed: result.totalProcessed,
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors,
        durationMs: result.durationMs,
    });

    return result;
}

// ============================================
// CLI ENTRY POINT
// ============================================

if (require.main === module) {
    syncSourceX()
        .then((result) => {
            console.log('Sync result:', result);
            process.exit(0);
        })
        .catch((err) => {
            console.error('Sync failed:', err);
            process.exit(1);
        });
}
