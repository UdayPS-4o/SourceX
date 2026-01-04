const express = require('express');
const router = express.Router();
const { pool } = require('../../db');

// GET /api/dashboard/platforms
router.get('/platforms', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM platforms');
        res.json(rows);
    } catch (err) {
        console.error('[Dashboard] Error fetching platforms:', err);
        res.status(500).json({ error: 'Failed to fetch platforms' });
    }
});

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const [productCount] = await pool.execute('SELECT COUNT(*) as total FROM listings');
        const [platformCount] = await pool.execute('SELECT COUNT(*) as total FROM platforms');
        const [alertCount] = await pool.execute('SELECT COUNT(*) as total FROM listings WHERE cfb_1 = 1');

        // Simple aggregation for now
        const stats = {
            total_products: productCount[0].total,
            active_platforms: platformCount[0].total,
            low_price_alerts: alertCount[0].total,
            last_updated: new Date()
        };

        res.json(stats);
    } catch (err) {
        console.error('[Dashboard] Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/dashboard/logs
// Combines price and inventory history for a global activity feed
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const query = `
            WITH combined_logs AS (
                SELECT 
                    'price' as type,
                    p.price as value,
                    LAG(p.price) OVER (PARTITION BY p.listing_id ORDER BY p.recorded_at) as old_value,
                    l.product_name,
                    l.img_url,
                    l.product_sku,
                    pl.name as platform_name,
                    p.recorded_at
                FROM price_history p
                JOIN listings l ON p.listing_id = l.id
                JOIN platforms pl ON l.platform_id = pl.id
                
                UNION ALL
                
                SELECT 
                    'inventory' as type,
                    i.stock as value,
                    LAG(i.stock) OVER (PARTITION BY i.listing_id ORDER BY i.recorded_at) as old_value,
                    l.product_name,
                    l.img_url,
                    l.product_sku,
                    pl.name as platform_name,
                    i.recorded_at
                FROM inventory_history i
                JOIN listings l ON i.listing_id = l.id
                JOIN platforms pl ON l.platform_id = pl.id
            )
            SELECT * FROM combined_logs
            WHERE old_value IS NULL OR old_value != value
            ORDER BY recorded_at DESC
            LIMIT ?
        `;

        const [rows] = await pool.execute(query, [String(limit)]);
        res.json(rows);
    } catch (err) {
        console.error('[Dashboard] Error fetching logs:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;
