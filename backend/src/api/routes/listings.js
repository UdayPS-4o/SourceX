/**
 * Listings Routes
 * GET /api/listings
 */

const { Router } = require('express');
const { db } = require('../../db');
const { listings } = require('../../db/schema');
const { count, eq, sql } = require('drizzle-orm');

const router = Router();

// GET /api/listings
router.get('/', async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const data = await db.query.listings.findMany({
            limit,
            offset,
            orderBy: (listings, { desc }) => [desc(listings.updatedAt)],
        });

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

module.exports = router;
