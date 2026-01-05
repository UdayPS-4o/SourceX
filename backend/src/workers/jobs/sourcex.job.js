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

        console.log('[SourceX] Fetching ALL inventory data...');

        // fetchAll() gets inventory + lowest/not-lowest status + platform IDs
        const { inventory, summary } = await scraper.fetchAll();

        console.log('═══════════════════════════════════════════');
        console.log('📊 DATA STATS');
        console.log('═══════════════════════════════════════════');
        console.log(`   📦 Total Inventory: ${summary.totalInventory}`);
        console.log(`   ✅  _isLowest=true:  ${summary.lowestCount}`);
        console.log(`   ❌  _isLowest=false: ${summary.notLowestCount}`);
        console.log(`   ❓  _isLowest=undef: ${summary.unknownCount}`);
        console.log('═══════════════════════════════════════════');

        return inventory;
    }
}

module.exports = { SourceXSyncJob };
