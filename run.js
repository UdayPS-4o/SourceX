/**
 * SourceX Bot - Runner Script
 * 
 * Just run: node run.js
 * 
 * Everything is automatic:
 * - Auto login (credentials hardcoded in src/config)
 * - Auto token refresh
 * - Fetches all inventory, lowest, and not lowest in parallel
 * - Saves to output/inventory-data.json
 */

const sourcex = require('./src');

async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║         SOURCEX INVENTORY BOT             ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');

    try {
        // Just call fetchAndSave - it handles EVERYTHING
        const data = await sourcex.fetchAndSave();

        // Show some sample data
        console.log('\n📋 Sample Inventory Items:');
        data.inventory.slice(0, 3).forEach((item, i) => {
            const product = item.variant?.product;
            console.log(`   ${i + 1}. ${product?.title || 'Unknown'}`);
            console.log(`      Size: ${item.variant?.title} | Price: ₹${item.purchasePrice}`);
        });

        console.log('\n✅ Done! Check output/inventory-data.json for full data.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
