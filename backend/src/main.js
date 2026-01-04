/**
 * CLI Entry Point
 */

console.log('[CLI] Starting...');
require('dotenv').config();
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
                    startServer(3000);
                    break;

                case 'sync':
                    console.log('Starting SourceX Sync...');
                    const job = new SourceXSyncJob();
                    console.log('Job initialized');
                    const result = await job.run();
                    console.log('Sync Result:', result);
                    await closePool();
                    break;

                default:
                    console.log('Usage: npm start [server|sync]');
                    process.exit(1);
            }
        } catch (e) {
            console.error('[CLI] Runtime error:', e);
            process.exit(1);
        }
    })();
}
