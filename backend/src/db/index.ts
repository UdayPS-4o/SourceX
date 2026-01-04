/**
 * Drizzle Database Client
 * MySQL connection using mysql2 and drizzle-orm
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Pool configuration from environment
const poolConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ecommerce_monitor',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.MYSQL_POOL_MAX || '20'),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
};

// Create connection pool
const pool = mysql.createPool(poolConfig);

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema, mode: 'default' });

// Export pool for manual operations if needed
export { pool };

// Export schema for convenience
export * from './schema';

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('[MySQL] Connection successful');
        return true;
    } catch (error) {
        console.error('[MySQL] Connection failed:', error);
        return false;
    }
}

/**
 * Close connection pool
 */
export async function closePool(): Promise<void> {
    await pool.end();
    console.log('[MySQL] Pool closed');
}
