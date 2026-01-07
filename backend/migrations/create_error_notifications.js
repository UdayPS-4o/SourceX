/**
 * Migration: Create error_notifications table
 * Run with: node migrations/create_error_notifications.js
 */

require('dotenv').config();
const { pool } = require('../src/db');

async function migrate() {
    console.log('Creating error_notifications table...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS error_notifications (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            listing_id BIGINT NOT NULL,
            error_type VARCHAR(50) NOT NULL,
            error_message TEXT,
            last_notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_error (listing_id, error_type),
            INDEX idx_last_notified (last_notified_at)
        ) ENGINE=InnoDB;
    `);

    console.log('✅ error_notifications table created successfully');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
