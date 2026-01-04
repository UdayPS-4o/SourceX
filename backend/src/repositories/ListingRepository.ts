export { };
const { query, execute, getPool } = require('../config/database') as typeof import('../config/database');

export interface Listing {
    id: bigint;
    platformId: number;
    productSku: string;
    variantId: string | null;
    productName: string;
    imgUrl: string | null;
    size: string | null;
    currentPrice: number | null;
    currentStock: number | null;
    cfb1: boolean;
    cft1: string | null;
    cft2: string | null;
    cft3: string | null;
    cfi1: number | null;
    cfi2: number | null;
    cfi3: number | null;
    lastEventAt: Date;
    updatedAt: Date;
}

export interface ListingUpsertDTO {
    platformId: number;
    productSku: string;
    variantId?: string | null;
    productName: string;
    imgUrl?: string | null;
    size?: string | null;
    currentPrice: number | null;
    currentStock: number | null;
    cfb1?: boolean;
    cft1?: string | null;
    cft2?: string | null;
    cft3?: string | null;
    cfi1?: number | null;
    cfi2?: number | null;
    cfi3?: number | null;
}

interface ListingRow {
    id: bigint;
    platform_id: number;
    product_sku: string;
    variant_id: string | null;
    product_name: string;
    img_url: string | null;
    size: string | null;
    current_price: string | null;
    current_stock: number | null;
    cfb_1: number;
    cft_1: string | null;
    cft_2: string | null;
    cft_3: string | null;
    cfi_1: number | null;
    cfi_2: number | null;
    cfi_3: number | null;
    last_event_at: Date;
    updated_at: Date;
}

export class ListingRepository {

    /**
     * Get all listings for a platform
     */
    async getByPlatform(platformId: number): Promise<Listing[]> {
        const rows = await query<ListingRow[]>(
            'SELECT * FROM listings WHERE platform_id = ?',
            [platformId]
        );
        return rows.map(this.mapRow);
    }

    /**
     * Get all listings (use with caution - for cache warmup)
     */
    async getAll(): Promise<Listing[]> {
        const rows = await query<ListingRow[]>('SELECT * FROM listings');
        return rows.map(this.mapRow);
    }

    /**
     * Get listing by platform, SKU and variant
     */
    async getBySku(platformId: number, productSku: string, variantId?: string | null): Promise<Listing | null> {
        const rows = await query<ListingRow[]>(
            `SELECT * FROM listings 
             WHERE platform_id = ? AND product_sku = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))`,
            [platformId, productSku, variantId || null, variantId || null]
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    /**
     * Bulk upsert listings - INSERT or UPDATE on conflict
     * Returns array of listing IDs (new or existing)
     */
    async bulkUpsert(listings: ListingUpsertDTO[]): Promise<Map<string, bigint>> {
        if (listings.length === 0) return new Map();

        const results = new Map<string, bigint>();

        // Process in chunks to avoid query size limits
        const chunkSize = 500;
        for (let i = 0; i < listings.length; i += chunkSize) {
            const chunk = listings.slice(i, i + chunkSize);
            await this.upsertChunk(chunk, results);
        }

        return results;
    }

    /**
     * Upsert a single chunk of listings
     */
    private async upsertChunk(listings: ListingUpsertDTO[], results: Map<string, bigint>): Promise<void> {
        const sql = `
            INSERT INTO listings (
                platform_id, product_sku, variant_id, product_name, img_url, size,
                current_price, current_stock, cfb_1, cft_1, cft_2, cft_3, cfi_1, cfi_2, cfi_3,
                last_event_at
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
                product_name = VALUES(product_name),
                img_url = VALUES(img_url),
                size = VALUES(size),
                current_price = VALUES(current_price),
                current_stock = VALUES(current_stock),
                cfb_1 = VALUES(cfb_1),
                cft_1 = VALUES(cft_1),
                cft_2 = VALUES(cft_2),
                cft_3 = VALUES(cft_3),
                cfi_1 = VALUES(cfi_1),
                cfi_2 = VALUES(cfi_2),
                cfi_3 = VALUES(cfi_3),
                last_event_at = VALUES(last_event_at)
        `;

        const values = listings.map(l => [
            l.platformId,
            l.productSku,
            l.variantId || null,
            l.productName,
            l.imgUrl || null,
            l.size || null,
            l.currentPrice,
            l.currentStock,
            l.cfb1 ? 1 : 0,
            l.cft1 || null,
            l.cft2 || null,
            l.cft3 || null,
            l.cfi1 || null,
            l.cfi2 || null,
            l.cfi3 || null,
            new Date(),
        ]);

        const pool = getPool();
        await (pool as any).query(sql, [values]);

        // Fetch IDs for all upserted listings
        for (const listing of listings) {
            const found = await this.getBySku(listing.platformId, listing.productSku, listing.variantId);
            if (found) {
                const key = this.makeKey(listing.platformId, listing.productSku, listing.variantId);
                results.set(key, found.id);
            }
        }
    }

    /**
     * Update only price and stock for a listing (faster than full upsert)
     */
    async updatePriceAndStock(listingId: bigint, price: number | null, stock: number | null): Promise<void> {
        await execute(
            'UPDATE listings SET current_price = ?, current_stock = ?, last_event_at = NOW() WHERE id = ?',
            [price, stock, listingId.toString()]
        );
    }

    /**
     * Create cache key from listing identifiers
     */
    makeKey(platformId: number, productSku: string, variantId?: string | null): string {
        return `${platformId}:${productSku}:${variantId || ''}`;
    }

    /**
     * Map database row to Listing interface
     */
    private mapRow(row: ListingRow): Listing {
        return {
            id: row.id,
            platformId: row.platform_id,
            productSku: row.product_sku,
            variantId: row.variant_id,
            productName: row.product_name,
            imgUrl: row.img_url,
            size: row.size,
            currentPrice: row.current_price ? parseFloat(row.current_price) : null,
            currentStock: row.current_stock,
            cfb1: row.cfb_1 === 1,
            cft1: row.cft_1,
            cft2: row.cft_2,
            cft3: row.cft_3,
            cfi1: row.cfi_1,
            cfi2: row.cfi_2,
            cfi3: row.cfi_3,
            lastEventAt: row.last_event_at,
            updatedAt: row.updated_at,
        };
    }
}

export const listingRepository = new ListingRepository();
