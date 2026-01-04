/**
 * Connection Test
 * Verifies database connection
 */

import 'dotenv/config';
import { testConnection, closePool } from '../db';

async function main() {
    console.log('=== Connection Test ===');

    // Test MySQL
    console.log('Testing MySQL connection...');
    const mysqlOk = await testConnection();

    if (mysqlOk) {
        console.log('✓ MySQL connection successful');
    } else {
        console.error('✗ MySQL connection failed');
    }

    // Cleanup
    await closePool();

    console.log('=== Test Complete ===');

    // Exit with appropriate code
    process.exit(mysqlOk ? 0 : 1);
}

main().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
