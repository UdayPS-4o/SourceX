/**
 * Base Sync Worker
 * Reusable logic for all platform sync jobs
 */

const { db, pool } = require('../db');
const { listings, platforms } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { logSync } = require('../utils/logger');
const discord = require('../services/discord');

class BaseSyncWorker {
    constructor(adapter) {
        this.adapter = adapter;
    }

    // Abstract: How to fetch data (implemented by platform specific worker)
    async fetchData() {
        throw new Error('fetchData() must be implemented');
    }

    // Core Sync Logic
    async run() {
        const startTime = Date.now();
        const platformId = await this.adapter.ensurePlatformExists();

        // 1. Start Sync Status
        await this.updateStatus(platformId, 'running');

        try {
            // Get DB time (sync start barrier) to track changes strictly after this point
            const [timeRes] = await pool.query('SELECT NOW(6) as t');
            const syncStartTime = timeRes[0].t;

            // Get pre-sync count
            const [preRes] = await pool.query('SELECT COUNT(*) as c FROM listings WHERE platform_id = ?', [platformId]);
            const startCount = preRes[0].c;

            // 2. Fetch Data
            console.log(`[${this.adapter.platformName}] Fetching data...`);
            const rawItems = await this.fetchData();

            // 3. Transform Data
            console.log(`[${this.adapter.platformName}] Transforming ${rawItems.length} items...`);
            const dbListings = rawItems.map(item => {
                const std = this.adapter.transform(item);
                return this.toDbInsert(std, platformId);
            });

            // 4. Bulk Upsert
            console.log(`[${this.adapter.platformName}] Bulk upserting...`);
            await this.bulkUpsert(dbListings);

            // 5. Calculate Stats
            const [postRes] = await pool.query('SELECT COUNT(*) as c FROM listings WHERE platform_id = ?', [platformId]);
            const endCount = postRes[0].c;

            const inserted = endCount - startCount;

            // Count items where updated_at >= syncStartTime
            // Note: DB time sync is crucial here, relying on same connection/server time
            const [modRes] = await pool.query('SELECT COUNT(*) as c FROM listings WHERE platform_id = ? AND updated_at >= ?', [platformId, syncStartTime]);
            const totalModified = modRes[0].c;

            const updated = Math.max(0, totalModified - inserted);
            const unchanged = Math.max(0, rawItems.length - totalModified);

            const duration = Date.now() - startTime;

            // Partial fetch detection
            let warning = null;
            if (startCount > 0 && rawItems.length < startCount * 0.9) {
                warning = `Partial fetch? Count dropped from ${startCount} to ${rawItems.length} (-${Math.round((1 - rawItems.length / startCount) * 100)}%)`;
                console.warn(`[${this.adapter.platformName}] ⚠️ ${warning}`);
            }

            const stats = {
                platform: this.adapter.platformName,
                total: rawItems.length,
                inserted,
                updated,
                unchanged,
                duration,
                warning
            };

            await this.updateStatus(platformId, 'idle');

            console.log(`[${this.adapter.platformName}] Sync Complete:`, stats);
            logSync(stats);

            return stats;

        } catch (error) {
            console.error(`[${this.adapter.platformName}] Error:`, error);
            await this.updateStatus(platformId, 'failed');
            throw error;
        }
    }

    // Helper: Map Standard Listing -> Drizzle Schema
    toDbInsert(std, platformId) {
        return {
            id: BigInt(std.externalId),
            platformId,
            productSku: std.sku,
            variantId: std.variantId,
            productName: std.title,
            imgUrl: std.image,
            size: std.size,
            currentPrice: std.price,
            currentStock: std.stock,
            cfb1: std.isLowest,
            cft1: std.props.brand || null,
            cfi1: std.props.payout || null,
            cfi2: std.props.commission || null,
            platformListingIds: std.platformListingIds || null,
            updatedAt: new Date(),
            lastEventAt: new Date(),
        };
    }

    // Helper: Bulk Upsert (MySQL) with History Logging
    async bulkUpsert(items) {
        if (items.length === 0) return { affected: 0 };

        const chunkSize = 500;
        let totalAffected = 0;

        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            const ids = chunk.map(l => l.id);

            // Fetch existing listings for comparison (including cfb_1 and cfi_1)
            const [existing] = await pool.query(
                `SELECT id, current_price, current_stock, cfb_1, cfi_1 FROM listings WHERE id IN (${ids.join(',')})`
            );
            const existingMap = new Map(existing.map(e => [String(e.id), e]));

            // Track changes for history
            const priceChanges = [];
            const stockChanges = [];
            const customFieldChanges = []; // Track cfb_1 and cfi_1 changes

            for (const item of chunk) {
                const old = existingMap.get(String(item.id));
                if (old) {
                    // Compare price (handle decimals as strings)
                    const oldPrice = old.current_price ? parseFloat(old.current_price) : null;
                    const newPrice = item.currentPrice ? parseFloat(item.currentPrice) : null;
                    if (oldPrice !== newPrice && newPrice !== null) {
                        priceChanges.push({ listingId: item.id, price: newPrice });
                    }

                    // Compare stock
                    const oldStock = old.current_stock;
                    const newStock = item.currentStock;
                    if (oldStock !== newStock && newStock !== null) {
                        const changeType = newStock < oldStock ? 'sold' : (newStock > oldStock ? 'restock' : 'correction');
                        stockChanges.push({ listingId: item.id, stock: newStock, changeType });
                    }

                    // Compare cfb_1 (isLowest) - boolean field
                    const oldIsLowest = old.cfb_1 === 1 || old.cfb_1 === true;
                    const newIsLowest = item.cfb1 === true;
                    if (oldIsLowest !== newIsLowest) {
                        customFieldChanges.push({
                            listingId: item.id,
                            fieldName: 'cfb_1',
                            fieldType: 'boolean',
                            oldValue: oldIsLowest ? 'true' : 'false',
                            newValue: newIsLowest ? 'true' : 'false',
                            isBooleanToggle: true
                        });
                    }

                    // Compare cfi_1 (payout) - integer field
                    const oldPayout = old.cfi_1;
                    const newPayout = item.cfi1;

                    // Normalize for comparison (handle "100" vs 100)
                    const oldPayoutStr = (oldPayout === null || oldPayout === undefined) ? '' : String(oldPayout);
                    const newPayoutStr = (newPayout === null || newPayout === undefined) ? '' : String(newPayout);

                    if (oldPayoutStr !== newPayoutStr && newPayout !== null && newPayout !== undefined) {
                        customFieldChanges.push({
                            listingId: item.id,
                            fieldName: 'cfi_1',
                            fieldType: 'integer',
                            oldValue: oldPayout !== null ? String(oldPayout) : null,
                            newValue: String(newPayout),
                            isBooleanToggle: false
                        });
                    }
                } else {
                    // New listing - log initial values
                    if (item.currentPrice) {
                        priceChanges.push({ listingId: item.id, price: parseFloat(item.currentPrice) });
                    }
                    if (item.currentStock !== null && item.currentStock !== undefined) {
                        stockChanges.push({ listingId: item.id, stock: item.currentStock, changeType: 'initial' });
                    }
                    // Log initial custom field values
                    if (item.cfb1 !== null && item.cfb1 !== undefined) {
                        customFieldChanges.push({
                            listingId: item.id,
                            fieldName: 'cfb_1',
                            fieldType: 'boolean',
                            oldValue: null,
                            newValue: item.cfb1 ? 'true' : 'false',
                            isBooleanToggle: false
                        });
                    }
                    if (item.cfi1 !== null && item.cfi1 !== undefined) {
                        customFieldChanges.push({
                            listingId: item.id,
                            fieldName: 'cfi_1',
                            fieldType: 'integer',
                            oldValue: null,
                            newValue: String(item.cfi1),
                            isBooleanToggle: false
                        });
                    }
                }
            }

            // Perform upsert
            const values = chunk.map(l => `(
                ${l.id}, ${l.platformId}, ${this.esc(l.productSku)}, ${this.esc(l.variantId)}, 
                ${this.esc(l.productName)}, ${this.esc(l.imgUrl)}, ${this.esc(l.size)}, 
                ${l.currentPrice || 'NULL'}, ${l.currentStock ?? 'NULL'}, ${l.cfb1 ? 1 : 0}, 
                ${this.esc(l.cft1)}, ${l.cfi1 ?? 'NULL'}, ${l.cfi2 ?? 'NULL'}, 
                ${this.esc(l.platformListingIds)},
                NOW(), NOW()
            )`).join(',');

            const query = `
                INSERT INTO listings (
                    id, platform_id, product_sku, variant_id, product_name, img_url, size, 
                    current_price, current_stock, cfb_1, cft_1, cfi_1, cfi_2, 
                    platform_listing_ids,
                    last_event_at, updated_at
                ) VALUES ${values}
                ON DUPLICATE KEY UPDATE
                    current_price = VALUES(current_price),
                    current_stock = VALUES(current_stock),
                    cfb_1 = VALUES(cfb_1),
                    cfi_1 = VALUES(cfi_1),
                    img_url = VALUES(img_url),
                    platform_listing_ids = VALUES(platform_listing_ids),
                    last_event_at = NOW(),
                    updated_at = NOW()
            `;

            const [res] = await pool.query(query);
            totalAffected += res.affectedRows;

            // Log price history
            if (priceChanges.length > 0) {
                const priceValues = priceChanges.map(p => `(${p.listingId}, ${p.price}, NOW())`).join(',');
                await pool.query(`INSERT INTO price_history (listing_id, price, recorded_at) VALUES ${priceValues}`);
                console.log(`  [History] Logged ${priceChanges.length} price changes`);

                // Send Discord notifications for price changes (existing items only)
                try {
                    // Filter to only real changes (items that existed before)
                    const realChanges = [];
                    for (const pc of priceChanges) {
                        const old = existingMap.get(String(pc.listingId));
                        if (old && old.current_price) {
                            const oldPrice = parseFloat(old.current_price);
                            if (oldPrice !== pc.price) {
                                // Get product info from chunk
                                const item = chunk.find(c => c.id === pc.listingId);
                                if (item) {
                                    realChanges.push({
                                        listingId: pc.listingId,
                                        productName: item.productName,
                                        productSku: item.productSku,
                                        size: item.size,
                                        oldPrice: oldPrice,
                                        newPrice: pc.price
                                    });
                                }
                            }
                        }
                    }

                    // Send individual notifications for up to 5 changes
                    const toNotify = realChanges.slice(0, 5);
                    for (const change of toNotify) {
                        await discord.notifyPriceChange(change);
                    }

                    // If more than 5, send a summary
                    if (realChanges.length > 5) {
                        await discord.notifyPriceChangesSummary(realChanges);
                    }
                } catch (discordErr) {
                    console.error('  [Discord] Failed to send price notifications:', discordErr.message);
                }
            }

            // Log inventory history
            if (stockChanges.length > 0) {
                const stockValues = stockChanges.map(s => `(${s.listingId}, ${s.stock}, '${s.changeType}', NOW())`).join(',');
                await pool.query(`INSERT INTO inventory_history (listing_id, stock, change_type, recorded_at) VALUES ${stockValues}`);
                console.log(`  [History] Logged ${stockChanges.length} stock changes`);
            }

            // Log custom field history (cfb_1 and cfi_1 changes)
            if (customFieldChanges.length > 0) {
                const cfValues = customFieldChanges.map(cf => {
                    const oldVal = cf.oldValue === null ? 'NULL' : `'${cf.oldValue}'`;
                    return `(${cf.listingId}, '${cf.fieldName}', '${cf.fieldType}', ${oldVal}, '${cf.newValue}', ${cf.isBooleanToggle ? 1 : 0}, NOW())`;
                }).join(',');
                await pool.query(`INSERT INTO custom_field_history (listing_id, field_name, field_type, old_value, new_value, is_boolean_toggle, recorded_at) VALUES ${cfValues}`);

                // Count by field type for logging
                const cfb1Count = customFieldChanges.filter(c => c.fieldName === 'cfb_1' && c.oldValue !== null).length;
                const cfi1Count = customFieldChanges.filter(c => c.fieldName === 'cfi_1' && c.oldValue !== null).length;
                if (cfb1Count > 0) console.log(`  [History] Logged ${cfb1Count} isLowest (cfb_1) changes`);
                if (cfi1Count > 0) console.log(`  [History] Logged ${cfi1Count} payout (cfi_1) changes`);
            }
        }
        return { affected: totalAffected };
    }

    async updateStatus(id, status) {
        await db.update(platforms)
            .set({ syncStatus: status, lastSyncEnd: status !== 'running' ? new Date() : undefined })
            .where(eq(platforms.id, id));
    }

    esc(val) {
        if (val === null || val === undefined) return 'NULL';
        return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
    }
}

module.exports = { BaseSyncWorker };
