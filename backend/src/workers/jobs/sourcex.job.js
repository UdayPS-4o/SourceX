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
        const scraperPath = path.resolve(__dirname, '../../../../scrapers/sourcex');
        const scraper = require(scraperPath);
        const { logMonitor } = require('../../utils/logger');

        logMonitor('Fetching ALL inventory data...', 'info');

        // fetchAll() gets inventory + lowest/not-lowest status + platform IDs
        const { inventory, summary } = await scraper.fetchAll();

        logMonitor(`Inventory stats: Total=${summary.totalInventory}, Lowest=${summary.lowestCount}, NotLowest=${summary.notLowestCount}, Unknown=${summary.unknownCount}`, 'info');

        return inventory;
    }
}

module.exports = { SourceXSyncJob };
