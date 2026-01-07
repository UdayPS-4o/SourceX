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
// Combines price, inventory, and custom field history for a global activity feed
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const typesParam = req.query.types; // e.g. "price,inventory"

        let typeFilter = "";
        const params = [];

        if (typesParam) {
            const types = typesParam.split(',').map(t => t.trim());
            if (types.length > 0) {
                const placeholders = types.map(() => '?').join(',');
                typeFilter = `AND type IN (${placeholders})`;
                params.push(...types);
            }
        }

        params.push(String(limit));

        const query = `
            WITH combined_logs AS (
                SELECT 
                    CAST('price' AS CHAR(20)) as type,
                    p.listing_id,
                    p.price as value,
                    LAG(p.price) OVER (PARTITION BY p.listing_id ORDER BY p.recorded_at) as old_value,
                    l.product_name,
                    l.img_url,
                    l.product_sku,
                    l.size,
                    pl.name as platform_name,
                    p.recorded_at,
                    NULL as field_name
                FROM price_history p
                JOIN listings l ON p.listing_id = l.id
                JOIN platforms pl ON l.platform_id = pl.id
                
                UNION ALL
                
                SELECT 
                    CAST('inventory' AS CHAR(20)) as type,
                    i.listing_id,
                    i.stock as value,
                    LAG(i.stock) OVER (PARTITION BY i.listing_id ORDER BY i.recorded_at) as old_value,
                    l.product_name,
                    l.img_url,
                    l.product_sku,
                    l.size,
                    pl.name as platform_name,
                    i.recorded_at,
                    NULL as field_name
                FROM inventory_history i
                JOIN listings l ON i.listing_id = l.id
                JOIN platforms pl ON l.platform_id = pl.id
                
                UNION ALL
                
                SELECT 
                    CAST(CASE 
                        WHEN cf.field_name = 'cfb_1' THEN 'isLowest'
                        WHEN cf.field_name = 'cfi_1' THEN 'payout'
                        ELSE 'custom'
                    END AS CHAR(20)) as type,
                    cf.listing_id,
                    cf.new_value as value,
                    cf.old_value,
                    l.product_name,
                    l.img_url,
                    l.product_sku,
                    l.size,
                    pl.name as platform_name,
                    cf.recorded_at,
                    cf.field_name
                FROM custom_field_history cf
                JOIN listings l ON cf.listing_id = l.id
                JOIN platforms pl ON l.platform_id = pl.id
                WHERE cf.old_value IS NOT NULL
            )
            SELECT * FROM combined_logs
            WHERE (old_value IS NULL OR (
                CASE 
                    WHEN type IN ('price', 'inventory', 'payout') THEN CAST(old_value AS DECIMAL(20, 2)) != CAST(value AS DECIMAL(20, 2))
                    ELSE old_value != value
                END
            ))
            ${typeFilter}
            ORDER BY recorded_at DESC
            LIMIT ?
        `;

        const [rows] = await pool.query(query, params);

        // Fix timezone discrepancy for raw SQL query (add 5.5 hours)
        const formatted = rows.map(row => ({
            ...row,
            recorded_at: row.recorded_at ? new Date(row.recorded_at.getTime() + 19800000) : row.recorded_at
        }));

        res.json(formatted);
    } catch (err) {
        console.error('[Dashboard] Error fetching logs:', err);
        const fs = require('fs');
        try {
            fs.appendFileSync('logs/dashboard_error.txt', `[${new Date().toISOString()}] ${err.message}\n${err.stack}\n\n`);
        } catch (e) { /* ignore */ }
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;
