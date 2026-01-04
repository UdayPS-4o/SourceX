/**
 * Express API Server
 * Routes for frontend consumption
 */

import express, { Request, Response, NextFunction } from 'express';
import { db, platforms, listings, workerConfigs, testConnection, closePool } from '../db';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { syncSourceX } from '../workers/sourcex-worker';

const app = express();
app.use(express.json());

// ============================================
// MIDDLEWARE
// ============================================

// Error handler
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', asyncHandler(async (req, res) => {
    const dbOk = await testConnection();
    res.json({
        status: dbOk ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
    });
}));

// ============================================
// PLATFORMS
// ============================================

app.get('/api/platforms', asyncHandler(async (req, res) => {
    const result = await db.query.platforms.findMany({
        with: {
            workerConfigs: true,
        },
    });
    res.json(result);
}));

app.get('/api/platforms/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const result = await db.query.platforms.findFirst({
        where: eq(platforms.id, id),
        with: {
            workerConfigs: true,
        },
    });
    if (!result) {
        res.status(404).json({ error: 'Platform not found' });
        return;
    }
    res.json(result);
}));

// ============================================
// LISTINGS
// ============================================

app.get('/api/listings', asyncHandler(async (req, res) => {
    const {
        platformId,
        isLowest,
        limit = '100',
        offset = '0',
        search,
    } = req.query;

    let whereConditions = [];

    if (platformId) {
        whereConditions.push(eq(listings.platformId, parseInt(platformId as string)));
    }

    if (isLowest !== undefined) {
        whereConditions.push(eq(listings.cfb1, isLowest === 'true'));
    }

    if (search) {
        whereConditions.push(like(listings.productName, `%${search}%`));
    }

    const result = await db.query.listings.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: desc(listings.updatedAt),
        with: {
            platform: true,
        },
    });

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json({
        data: result,
        total: countResult[0].count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
    });
}));

app.get('/api/listings/:id', asyncHandler(async (req, res) => {
    const id = BigInt(req.params.id);
    const result = await db.query.listings.findFirst({
        where: eq(listings.id, id),
        with: {
            platform: true,
            priceHistory: {
                limit: 50,
                orderBy: desc(sql`recorded_at`),
            },
            inventoryHistory: {
                limit: 50,
                orderBy: desc(sql`recorded_at`),
            },
        },
    });
    if (!result) {
        res.status(404).json({ error: 'Listing not found' });
        return;
    }
    res.json(result);
}));

// ============================================
// WORKERS
// ============================================

app.get('/api/workers', asyncHandler(async (req, res) => {
    const result = await db.query.workerConfigs.findMany({
        with: {
            platform: true,
        },
    });
    res.json(result);
}));

app.get('/api/workers/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const result = await db.query.workerConfigs.findFirst({
        where: eq(workerConfigs.id, id),
        with: {
            platform: true,
        },
    });
    if (!result) {
        res.status(404).json({ error: 'Worker config not found' });
        return;
    }
    res.json(result);
}));

app.post('/api/workers/:id/trigger', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const config = await db.query.workerConfigs.findFirst({
        where: eq(workerConfigs.id, id),
        with: {
            platform: true,
        },
    });

    if (!config) {
        res.status(404).json({ error: 'Worker config not found' });
        return;
    }

    // For now, only SourceX worker is implemented
    if (config.platform?.name === 'SourceX') {
        // Run sync in background
        syncSourceX()
            .then((result) => {
                console.log('[API] SourceX sync completed:', result);
            })
            .catch((err) => {
                console.error('[API] SourceX sync failed:', err);
            });

        res.json({
            message: 'Worker triggered',
            workerId: id,
            platform: config.platform.name,
        });
    } else {
        res.status(400).json({ error: 'Unknown worker type' });
    }
}));

// ============================================
// STATS
// ============================================

app.get('/api/stats', asyncHandler(async (req, res) => {
    const { platformId } = req.query;

    let whereCondition = undefined;
    if (platformId) {
        whereCondition = eq(listings.platformId, parseInt(platformId as string));
    }

    const totalListings = await db.select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(whereCondition);

    const lowestListings = await db.select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(platformId
            ? and(eq(listings.platformId, parseInt(platformId as string)), eq(listings.cfb1, true))
            : eq(listings.cfb1, true)
        );

    const platformStats = await db.query.platforms.findMany({
        columns: {
            id: true,
            name: true,
            syncStatus: true,
            lastSyncStart: true,
            lastSyncEnd: true,
        },
    });

    res.json({
        totalListings: totalListings[0].count,
        lowestListings: lowestListings[0].count,
        notLowestListings: totalListings[0].count - lowestListings[0].count,
        platforms: platformStats,
    });
}));

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[API Error]', err);
    res.status(500).json({
        error: err.message || 'Internal server error',
    });
});

// ============================================
// EXPORTS
// ============================================

export { app };

export function startServer(port: number = 3000): void {
    app.listen(port, () => {
        console.log(`[API] Server running on http://localhost:${port}`);
    });
}

// CLI entry point
if (require.main === module) {
    const port = parseInt(process.env.PORT || '3000');
    startServer(port);
}
