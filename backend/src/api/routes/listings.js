/**
 * Listings Routes
 * GET /api/listings
 */

const { Router } = require('express');
const { db, pool } = require('../../db');
const { listings, platforms } = require('../../db/schema');
const { count, eq, sql, desc, inArray } = require('drizzle-orm');
const discord = require('../../services/discord');

const router = Router();

// GET /api/listings
router.get('/', async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all'; // 'all', 'lowest', 'notLowest'

        // Build WHERE clause
        let whereClause = '';
        const params = [];

        if (search.trim()) {
            whereClause += ` AND (l.product_name LIKE ? OR l.product_sku LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status === 'lowest') {
            whereClause += ` AND l.cfb_1 = 1`;
        } else if (status === 'notLowest') {
            whereClause += ` AND l.cfb_1 = 0`;
        }

        // Main query with search
        const query = `
            SELECT 
                l.id, l.platform_id as platformId, l.product_sku as productSku,
                l.product_name as productName, l.img_url as imgUrl, l.size,
                l.current_price as currentPrice, l.current_stock as currentStock,
                l.cfb_1 as cfb1, l.updated_at as updatedAt,
                p.name as platformName
            FROM listings l
            LEFT JOIN platforms p ON l.platform_id = p.id
            WHERE 1=1 ${whereClause}
            ORDER BY l.updated_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);

        const [data] = await pool.query(query, params);

        // Get total count with same filters
        const countQuery = `SELECT COUNT(*) as total FROM listings l WHERE 1=1 ${whereClause}`;
        const countParams = params.slice(0, -2); // Remove limit/offset
        const [countResult] = await pool.query(countQuery, countParams);

        // Transform to match expected format
        const formatted = data.map(row => ({
            ...row,
            platform: { name: row.platformName },
            // Fix timezone discrepancy for raw SQL query (add 5.5 hours to match Drizzle/Detail API)
            updatedAt: row.updatedAt ? new Date(row.updatedAt.getTime() + 19800000) : row.updatedAt
        }));

        res.json({
            data: formatted,
            meta: {
                page,
                limit,
                total: countResult[0].total
            }
        });
    } catch (err) {
        console.error('[Listings] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/listings/:id
router.get('/:id', async (req, res) => {
    try {
        const listingId = req.params.id;

        const [data] = await db.select({
            id: listings.id,
            platformId: listings.platformId,
            productSku: listings.productSku,
            productName: listings.productName,
            size: listings.size,
            imgUrl: listings.imgUrl,
            currentPrice: listings.currentPrice,
            currentStock: listings.currentStock,
            cfb1: listings.cfb1,
            updatedAt: listings.updatedAt,
            platform: {
                name: platforms.name
            },
            cfi1: listings.cfi1,
            cfi2: listings.cfi2,
            cfi_1: listings.cfi1,
            cfi_2: listings.cfi2,
            autoUndercutEnabled: listings.autoUndercutEnabled,
            stopLossPrice: listings.stopLossPrice
        })
            .from(listings)
            .leftJoin(platforms, eq(listings.platformId, platforms.id))
            .where(eq(listings.id, BigInt(listingId)))
            .limit(1);

        if (!data) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        res.json(data);
    } catch (err) {
        console.error('[Listings] Error fetching listing:', err);
        res.status(500).json({ error: 'Failed to fetch listing' });
    }
});

// GET /api/listings/:id/history
router.get('/:id/history', async (req, res) => {
    try {
        const listingId = req.params.id;

        // Fetch price history
        const [priceHistory] = await db.execute(sql`
            SELECT price, recorded_at 
            FROM price_history 
            WHERE listing_id = ${listingId} 
            ORDER BY recorded_at ASC
        `);

        // Fetch inventory history
        const [inventoryHistory] = await db.execute(sql`
            SELECT stock, change_type, recorded_at 
            FROM inventory_history 
            WHERE listing_id = ${listingId} 
            ORDER BY recorded_at ASC
        `);

        res.json({
            price: priceHistory,
            inventory: inventoryHistory
        });
    } catch (err) {
        console.error('[Listings] Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});


// PATCH /api/listings/:id/payout
router.patch('/:id/payout', async (req, res) => {
    try {
        const listingId = req.params.id;
        const { payoutPrice } = req.body;

        if (payoutPrice === undefined || payoutPrice === null) {
            return res.status(400).json({ error: 'payoutPrice is required' });
        }

        // 1. Get current listing with stored platform listing IDs
        const [result] = await pool.query(
            `SELECT id, variant_id, product_sku, product_name, size, current_price, 
                    platform_listing_ids, cfi_1, cfi_2 as commission
             FROM listings WHERE id = ? LIMIT 1`,
            [listingId]
        );

        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const listing = result[0];

        // 2. Parse stored platform listing IDs
        let platformListingIds = [];
        if (listing.platform_listing_ids) {
            try {
                platformListingIds = JSON.parse(listing.platform_listing_ids);
            } catch (e) {
                console.warn('[Listings] Could not parse platform_listing_ids:', e.message);
            }
        }

        if (!Array.isArray(platformListingIds) || platformListingIds.length === 0) {
            return res.status(400).json({
                error: 'No platform listing IDs found. Please wait for the next daily sync or run a full sync manually.',
                hint: 'Platform listing IDs are synced daily at 3 AM IST'
            });
        }

        // 3. Call SourceX API using the pricing service
        const sourcex = require('../../../../scrapers/sourcex');

        console.log(`[Listings] Initializing SourceX authentication...`);
        const user = await sourcex.init();
        console.log(`[Listings] Authenticated as:`, user?.firstName || 'Unknown');
        console.log(`[Listings] Auth status:`, sourcex.isAuthenticated() ? '✅ Authenticated' : '❌ Not authenticated');

        console.log(`[Listings] Updating payout to ₹${payoutPrice} for ${platformListingIds.length} platform listings...`);
        console.log(`[Listings] Platform Listing IDs:`, platformListingIds);

        const updateResult = await sourcex.updatePayoutPrice(platformListingIds, Number(payoutPrice));

        console.log(`[Listings] SourceX Response:`, JSON.stringify(updateResult, null, 2));

        if (updateResult.success && updateResult.updatedCount > 0) {
            // 4. Calculate new price based on commission
            const commissionPercent = listing.commission ? listing.commission / 100 : 14;
            const commRate = commissionPercent / 100;
            const newCurrentPrice = Math.round(Number(payoutPrice) * (1 + commRate));
            const dbComm = Math.round(commissionPercent * 100);

            // 5. Update local DB (all siblings with same variant_id)
            let updateQuery = `UPDATE listings SET 
                cfi_1 = ?, 
                current_price = ?,
                cfi_2 = ?,
                updated_at = NOW()
                WHERE id = ?`;
            let updateParams = [Number(payoutPrice), newCurrentPrice, dbComm, listingId];

            // If variant_id exists, update all siblings too
            if (listing.variant_id) {
                updateQuery = `UPDATE listings SET 
                    cfi_1 = ?, 
                    current_price = ?,
                    cfi_2 = ?,
                    updated_at = NOW()
                    WHERE variant_id = ?`;
                updateParams = [Number(payoutPrice), newCurrentPrice, dbComm, listing.variant_id];
            }

            await pool.query(updateQuery, updateParams);

            // Log mutation for tracking
            try {
                await pool.query(
                    `INSERT INTO price_mutations 
                     (listing_id, old_payout_price, new_payout_price, old_current_price, new_current_price,
                      trigger_type, trigger_reason, success)
                     VALUES (?, ?, ?, ?, ?, 'manual', 'Manual price update', 1)`,
                    [listingId, listing.cfi_1, Number(payoutPrice), listing.current_price, newCurrentPrice]
                );
            } catch (mutErr) {
                console.error('[Listings] Failed to log mutation:', mutErr.message);
            }

            // Send Discord notification for manual update
            try {
                await discord.notifyMutation({
                    productName: listing.product_name,
                    productSku: listing.product_sku,
                    listingId,
                    oldPayoutPrice: listing.cfi_1,
                    newPayoutPrice: Number(payoutPrice),
                    newCurrentPrice,
                    triggerType: 'manual',
                    triggerReason: 'Manual price update',
                    success: true,
                    size: listing.size
                });
            } catch (discordErr) {
                console.error('[Listings] Discord notification failed:', discordErr.message);
            }

            res.json({
                success: true,
                updatedCount: updateResult.updatedCount,
                payoutPrice: Number(payoutPrice),
                currentPrice: newCurrentPrice,
                platformListingsUpdated: platformListingIds.length,
                // Include raw SourceX response for debugging
                sourcexResponse: updateResult.listings
            });
        } else {
            res.json({
                success: false,
                message: 'SourceX returned no updates',
                payoutPrice: Number(payoutPrice),
                sourcexResponse: updateResult
            });
        }

    } catch (err) {
        console.error('[Listings] Error updating payout:', err);
        res.status(500).json({ error: 'Failed to update payout price: ' + err.message });
    }
});

// PATCH /api/listings/:id/auto-undercut - Enable/disable auto-undercut
router.patch('/:id/auto-undercut', async (req, res) => {
    try {
        const listingId = req.params.id;
        const { enabled, stopLossPrice } = req.body;

        // Build update query
        const updates = [];
        const params = [];

        if (typeof enabled === 'boolean') {
            updates.push('auto_undercut_enabled = ?');
            params.push(enabled);
        }

        if (stopLossPrice !== undefined) {
            updates.push('stop_loss_price = ?');
            params.push(stopLossPrice === null ? null : Number(stopLossPrice));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        params.push(listingId);

        await pool.query(
            `UPDATE listings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            params
        );

        // Return updated listing
        const [result] = await pool.query(
            `SELECT id, auto_undercut_enabled, stop_loss_price FROM listings WHERE id = ?`,
            [listingId]
        );

        console.log(`[Listings] Auto-undercut updated for ${listingId}: enabled=${enabled}, stopLoss=${stopLossPrice}`);

        res.json({
            success: true,
            listing: result[0]
        });

    } catch (err) {
        console.error('[Listings] Error updating auto-undercut:', err);
        res.status(500).json({ error: 'Failed to update auto-undercut: ' + err.message });
    }
});

// GET /api/listings/:id/mutations - Get price mutation history
router.get('/:id/mutations', async (req, res) => {
    try {
        const listingId = req.params.id;
        const limit = parseInt(req.query.limit) || 20;

        const [mutations] = await pool.query(
            `SELECT * FROM price_mutations 
             WHERE listing_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [listingId, limit]
        );

        res.json({ mutations });

    } catch (err) {
        console.error('[Listings] Error fetching mutations:', err);
        res.status(500).json({ error: 'Failed to fetch mutations: ' + err.message });
    }
});

module.exports = router;
