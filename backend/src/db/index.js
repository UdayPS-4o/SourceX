/**
 * Drizzle Database Client
 * MySQL connection using mysql2 and drizzle-orm
 */

const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const schema = require('./schema');

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
const db = drizzle(pool, { schema, mode: 'default' });

/**
 * Test database connection
 */
async function testConnection() {
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
async function closePool() {
    await pool.end();
    console.log('[MySQL] Pool closed');
}

module.exports = {
    pool,
    db,
    testConnection,
    closePool,
    ...schema
};
