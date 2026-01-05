/**
 * Run SQL migrations
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, closePool } = require('./src/db');

async function runMigration(filename) {
    let sql = fs.readFileSync(path.join(__dirname, 'migrations', filename), 'utf8');

    // Remove single-line comments
    sql = sql.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

    // Split by semicolons but filter empty statements
    const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Running migration: ${filename}`);
    console.log(`Found ${statements.length} statements`);

    for (const stmt of statements) {
        console.log(`Executing: ${stmt.substring(0, 80).replace(/\n/g, ' ')}...`);
        await pool.query(stmt);
    }

    console.log('Migration complete!');
}

(async () => {
    try {
        const migrationFile = process.argv[2] || '001_custom_field_history.sql';
        await runMigration(migrationFile);
        await closePool();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
