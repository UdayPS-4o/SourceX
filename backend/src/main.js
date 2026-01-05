/**
 * CLI Entry Point
 */

console.log('[CLI] Starting...');
require('dotenv').config();

// Fix BigInt serialization for JSON
BigInt.prototype.toJSON = function () { return this.toString() };

console.log('[CLI] Loading modules...');

try {
    var { startServer } = require('./api');
    console.log('[CLI] API module loaded');
    var { SourceXSyncJob } = require('./workers/jobs/sourcex.job');
    console.log('[CLI] Job module loaded');
    var { db, closePool, testConnection } = require('./db');
    console.log('[CLI] DB module loaded');
} catch (e) {
    console.error('[CLI] Module load failed:', e);
    process.exit(1);
}

// Main function
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'server';

    (async () => {
        try {
            // Check DB first
            console.log('[Backend] Checking database connection...');
            const dbOk = await testConnection();
            if (!dbOk) throw new Error('Database connection failed');

            switch (command) {
                case 'server':
                    startServer(process.env.PORT || 3000);
                    break;

                case 'sync':
                    console.log('Starting SourceX Sync...');
                    const job = new SourceXSyncJob();
                    console.log('Job initialized');
                    const result = await job.run();
                    console.log('Sync Result:', result);
                    await closePool();
                    break;

                case 'monitor':
                    console.log('[Monitor] Starting continuous sync (Target: Every 60s)...');
                    console.log('[Monitor] Auto-undercut will run every 5 minutes');
                    const TARGET_INTERVAL = 60000; // 1 minute
                    const AUTO_UNDERCUT_INTERVAL = 5; // Every 5 sync cycles = 5 minutes
                    let cycleCount = 0;

                    // Import AutoUndercutJob
                    const { AutoUndercutJob } = require('./workers/jobs/auto-undercut.job');
                    const autoUndercutJob = new AutoUndercutJob();

                    while (true) {
                        const start = Date.now();
                        cycleCount++;
                        console.log(`\n[Monitor] ➤ Cycle ${cycleCount} starting at ${new Date().toLocaleTimeString()}`);

                        try {
                            // 1. Run regular sync
                            const loopJob = new SourceXSyncJob();
                            await loopJob.run();

                            // 2. Run auto-undercut every 5 cycles (5 minutes)
                            if (cycleCount % AUTO_UNDERCUT_INTERVAL === 0) {
                                console.log('\n[Monitor] 🔄 Running auto-undercut check...');
                                try {
                                    const undercutResult = await autoUndercutJob.run();
                                    console.log(`[Monitor] Auto-undercut: ${undercutResult.undercut} prices updated`);
                                } catch (undercutErr) {
                                    console.error('[Monitor] ❌ Auto-undercut failed:', undercutErr.message);
                                }
                            }
                        } catch (err) {
                            console.error('[Monitor] ❌ Cycle failed:', err.message);
                        }

                        const duration = Date.now() - start;
                        const waitTime = Math.max(5000, TARGET_INTERVAL - duration);

                        console.log(`[Monitor] Cycle took ${(duration / 1000).toFixed(1)}s. Waiting ${(waitTime / 1000).toFixed(1)}s...`);

                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                    // unreachable
                    break;

                default:
                    console.log('Usage: npm start [server|sync|monitor]');
                    process.exit(1);
            }
        } catch (e) {
            console.error('[CLI] Runtime error:', e);
            process.exit(1);
        }
    })();
}
