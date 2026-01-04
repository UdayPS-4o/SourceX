export { };
const { query, execute, getPool } = require('../config/database') as typeof import('../config/database');

export interface PriceHistory {
    id: bigint;
    listingId: bigint;
    price: number;
    recordedAt: Date;
}

export interface InventoryHistory {
    id: bigint;
    listingId: bigint;
    stock: number;
    changeType: 'sold' | 'restock' | 'correction' | 'initial';
    recordedAt: Date;
}

export interface PriceHistoryRow {
    id: bigint;
    listing_id: bigint;
    price: string;
    recorded_at: Date;
}

export interface InventoryHistoryRow {
    id: bigint;
    listing_id: bigint;
    stock: number;
    change_type: 'sold' | 'restock' | 'correction' | 'initial';
    recorded_at: Date;
}

export class HistoryRepository {

    /**
     * Log a price change
     */
    async logPriceChange(listingId: bigint, price: number): Promise<bigint> {
        const result = await execute(
            'INSERT INTO price_history (listing_id, price) VALUES (?, ?)',
            [listingId.toString(), price]
        ) as any;
        return BigInt(result.insertId);
    }

    /**
     * Log multiple price changes in bulk
     */
    async bulkLogPriceChanges(changes: { listingId: bigint; price: number }[]): Promise<void> {
        if (changes.length === 0) return;

        const sql = 'INSERT INTO price_history (listing_id, price) VALUES ?';
        const values = changes.map(c => [c.listingId.toString(), c.price]);

        const pool = getPool();
        await (pool as any).query(sql, [values]);
    }

    /**
     * Log an inventory change
     */
    async logInventoryChange(
        listingId: bigint,
        stock: number,
        changeType: 'sold' | 'restock' | 'correction' | 'initial' = 'initial'
    ): Promise<bigint> {
        const result = await execute(
            'INSERT INTO inventory_history (listing_id, stock, change_type) VALUES (?, ?, ?)',
            [listingId.toString(), stock, changeType]
        ) as any;
        return BigInt(result.insertId);
    }

    /**
     * Log multiple inventory changes in bulk
     */
    async bulkLogInventoryChanges(
        changes: { listingId: bigint; stock: number; changeType: 'sold' | 'restock' | 'correction' | 'initial' }[]
    ): Promise<void> {
        if (changes.length === 0) return;

        const sql = 'INSERT INTO inventory_history (listing_id, stock, change_type) VALUES ?';
        const values = changes.map(c => [c.listingId.toString(), c.stock, c.changeType]);

        const pool = getPool();
        await (pool as any).query(sql, [values]);
    }

    /**
     * Get price history for a listing
     */
    async getPriceHistory(listingId: bigint, limit: number = 100): Promise<PriceHistory[]> {
        const rows = await query<PriceHistoryRow[]>(
            'SELECT * FROM price_history WHERE listing_id = ? ORDER BY recorded_at DESC LIMIT ?',
            [listingId.toString(), limit]
        );
        return rows.map(this.mapPriceRow);
    }

    /**
     * Get price history for a listing within date range
     */
    async getPriceHistoryByDateRange(
        listingId: bigint,
        startDate: Date,
        endDate: Date
    ): Promise<PriceHistory[]> {
        const rows = await query<PriceHistoryRow[]>(
            `SELECT * FROM price_history 
             WHERE listing_id = ? AND recorded_at BETWEEN ? AND ? 
             ORDER BY recorded_at ASC`,
            [listingId.toString(), startDate, endDate]
        );
        return rows.map(this.mapPriceRow);
    }

    /**
     * Get inventory history for a listing
     */
    async getInventoryHistory(listingId: bigint, limit: number = 100): Promise<InventoryHistory[]> {
        const rows = await query<InventoryHistoryRow[]>(
            'SELECT * FROM inventory_history WHERE listing_id = ? ORDER BY recorded_at DESC LIMIT ?',
            [listingId.toString(), limit]
        );
        return rows.map(this.mapInventoryRow);
    }

    /**
     * Get inventory history for a listing within date range
     */
    async getInventoryHistoryByDateRange(
        listingId: bigint,
        startDate: Date,
        endDate: Date
    ): Promise<InventoryHistory[]> {
        const rows = await query<InventoryHistoryRow[]>(
            `SELECT * FROM inventory_history 
             WHERE listing_id = ? AND recorded_at BETWEEN ? AND ? 
             ORDER BY recorded_at ASC`,
            [listingId.toString(), startDate, endDate]
        );
        return rows.map(this.mapInventoryRow);
    }

    private mapPriceRow(row: PriceHistoryRow): PriceHistory {
        return {
            id: row.id,
            listingId: row.listing_id,
            price: parseFloat(row.price),
            recordedAt: row.recorded_at,
        };
    }

    private mapInventoryRow(row: InventoryHistoryRow): InventoryHistory {
        return {
            id: row.id,
            listingId: row.listing_id,
            stock: row.stock,
            changeType: row.change_type,
            recordedAt: row.recorded_at,
        };
    }
}

export const historyRepository = new HistoryRepository();
