/**
 * Base Sync Worker
 * Reusable logic for all platform sync jobs
 */

const { db, pool } = require('../db');
const { listings, platforms } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { logSync } = require('../utils/logger');

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

            const stats = {
                platform: this.adapter.platformName,
                total: rawItems.length,
                inserted,
                updated,
                unchanged,
                duration
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
            updatedAt: new Date(),
            lastEventAt: new Date(),
        };
    }

    // Helper: Bulk Upsert (MySQL)
    async bulkUpsert(items) {
        if (items.length === 0) return { affected: 0 };

        const chunkSize = 500; // Safe chunk size
        let totalAffected = 0;

        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);

            // Generate SQL manully for speed & ON DUPLICATE KEY UPDATE support
            const values = chunk.map(l => `(
                ${l.id}, ${l.platformId}, ${this.esc(l.productSku)}, ${this.esc(l.variantId)}, 
                ${this.esc(l.productName)}, ${this.esc(l.imgUrl)}, ${this.esc(l.size)}, 
                ${l.currentPrice || 'NULL'}, ${l.currentStock ?? 'NULL'}, ${l.cfb1 ? 1 : 0}, 
                ${this.esc(l.cft1)}, ${l.cfi1 ?? 'NULL'}, ${l.cfi2 ?? 'NULL'}, 
                NOW(), NOW()
            )`).join(',');

            const query = `
                INSERT INTO listings (
                    id, platform_id, product_sku, variant_id, product_name, img_url, size, 
                    current_price, current_stock, cfb_1, cft_1, cfi_1, cfi_2, 
                    last_event_at, updated_at
                ) VALUES ${values}
                ON DUPLICATE KEY UPDATE
                    updated_at = CASE 
                        WHEN listings.current_price <=> VALUES(current_price) 
                         AND listings.current_stock <=> VALUES(current_stock) 
                         AND listings.cfb_1 <=> VALUES(cfb_1)
                        THEN listings.updated_at 
                        ELSE NOW() 
                    END,
                    current_price = VALUES(current_price),
                    current_stock = VALUES(current_stock),
                    cfb_1 = VALUES(cfb_1),
                    last_event_at = NOW()
            `;

            const [res] = await pool.query(query);
            totalAffected += res.affectedRows;
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
