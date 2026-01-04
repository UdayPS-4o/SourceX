/**
 * Listings Routes
 * GET /api/listings
 */

const { Router } = require('express');
const { db } = require('../../db');
const { listings, platforms } = require('../../db/schema');
const { count, eq, sql, desc } = require('drizzle-orm');

const router = Router();

// GET /api/listings
router.get('/', async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const data = await db.select({
            id: listings.id,
            platformId: listings.platformId,
            productSku: listings.productSku,
            productName: listings.productName,
            imgUrl: listings.imgUrl,
            currentPrice: listings.currentPrice,
            currentStock: listings.currentStock,
            cfb1: listings.cfb1,
            updatedAt: listings.updatedAt,
            platform: {
                name: platforms.name
            }
        })
            .from(listings)
            .leftJoin(platforms, eq(listings.platformId, platforms.id))
            .orderBy(desc(listings.updatedAt))
            .limit(limit)
            .offset(offset);

        // Get total count (fast approx)
        const [cnt] = await db.select({ count: count() }).from(listings);

        res.json({
            data,
            meta: {
                page,
                limit,
                total: cnt.count
            }
        });
    } catch (err) {
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
            imgUrl: listings.imgUrl,
            currentPrice: listings.currentPrice,
            currentStock: listings.currentStock,
            cfb1: listings.cfb1,
            updatedAt: listings.updatedAt,
            platform: {
                name: platforms.name
            }
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

module.exports = router;
