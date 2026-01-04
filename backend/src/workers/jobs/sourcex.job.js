/**
 * SourceX Sync Job
 * Uses BaseSyncWorker and SourceXAdapter
 */

const { BaseSyncWorker } = require('../base.worker');
const { SourceXAdapter } = require('../adapters/sourcex.adapter');
const path = require('path');

class SourceXSyncJob extends BaseSyncWorker {
    constructor() {
        super(new SourceXAdapter());
    }

    async fetchData() {
        // Dynamic import of the existing scraper logic
        // We reuse the existing logic to avoid rewriting auth/graphql handling
        const scraperPath = path.resolve(__dirname, '../../../../scrapers/sourcex');
        const scraper = require(scraperPath);

        const { lowest, notLowest } = await scraper.fetchLowestAndNotLowest();

        // Add flag (scraper returns raw arrays)
        lowest.forEach(i => i._isLowest = true);
        notLowest.forEach(i => i._isLowest = false);

        return [...lowest, ...notLowest];
    }
}

module.exports = { SourceXSyncJob };
