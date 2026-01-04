/**
 * Backend Main Entry Point
 * Exports all services and provides initialization/shutdown
 */

import 'dotenv/config';
import { db, testConnection, closePool, platforms, workerConfigs } from './db';
import { eq } from 'drizzle-orm';
import { app, startServer } from './api';
import { syncSourceX } from './workers/sourcex-worker';

// ============================================
// EXPORTS
// ============================================

// Database
export { db, testConnection, closePool } from './db';
export * from './db/schema';

// API
export { app, startServer } from './api';

// Workers
export { syncSourceX } from './workers/sourcex-worker';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Seed SourceX platform and worker config
 */
export async function seedSourceX(): Promise<void> {
    console.log('[Backend] Seeding SourceX platform...');

    // Check if SourceX platform exists
    let platform = await db.query.platforms.findFirst({
        where: eq(platforms.name, 'SourceX'),
    });

    if (!platform) {
        await db.insert(platforms).values({
            name: 'SourceX',
            baseUrl: 'https://sourcex.in',
            syncStatus: 'idle',
        });
        platform = await db.query.platforms.findFirst({
            where: eq(platforms.name, 'SourceX'),
        });
        console.log('[Backend] Created SourceX platform');
    }

    // Check if worker config exists
    const existingConfig = await db.query.workerConfigs.findFirst({
        where: eq(workerConfigs.platformId, platform!.id),
    });

    if (!existingConfig) {
        await db.insert(workerConfigs).values({
            platformId: platform!.id,
            method: 'fetch_all_lowest_and_not_lowest',
            scrapeDurationMs: 40000,      // ~40 seconds
            delayBetweenRunsMs: 60000,    // 1 minute total cycle
            isEnabled: true,
            configJson: {
                scraperPath: '../../scrapers/sourcex',
            },
        });
        console.log('[Backend] Created SourceX worker config');
    }

    console.log('[Backend] SourceX seeding complete');
}

/**
 * Initialize the backend
 */
export async function initialize(options: {
    seedPlatforms?: boolean;
    startApi?: boolean;
    port?: number;
} = {}): Promise<void> {
    console.log('[Backend] Initializing...');

    // Test database connection
    const dbOk = await testConnection();
    if (!dbOk) {
        throw new Error('Database connection failed');
    }

    // Seed platforms if requested
    if (options.seedPlatforms !== false) {
        await seedSourceX();
    }

    // Start API server if requested
    if (options.startApi) {
        startServer(options.port || 3000);
    }

    console.log('[Backend] Initialization complete');
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
    console.log('[Backend] Shutting down...');
    await closePool();
    console.log('[Backend] Shutdown complete');
}

// ============================================
// CLI ENTRY POINT
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'server';

    (async () => {
        try {
            switch (command) {
                case 'server':
                    await initialize({ startApi: true });
                    break;

                case 'seed':
                    await initialize({ startApi: false });
                    await shutdown();
                    break;

                case 'sync':
                    await initialize({ startApi: false });
                    const result = await syncSourceX();
                    console.log('Sync result:', result);
                    await shutdown();
                    break;

                default:
                    console.log('Usage: npx ts-node src/index.ts [server|seed|sync]');
                    process.exit(1);
            }
        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    })();
}
