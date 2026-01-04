/**
 * Database Models - TypeScript interfaces matching SQL schema
 */

// Platform Model
export interface Platform {
    id: number;
    name: string;
    baseUrl: string | null;
    lastSyncStart: Date | null;
    lastSyncEnd: Date | null;
    syncStatus: 'idle' | 'running' | 'failed';
}

// Listing Model (current state snapshot)
export interface Listing {
    id: bigint;
    platformId: number;

    // Identification
    productSku: string;
    variantId: string | null;
    productName: string;
    imgUrl: string | null;
    size: string | null;

    // Current State
    currentPrice: number | null;
    currentStock: number | null;

    // Custom Fields
    cfb1: boolean;          // Is Lowest Price Ever
    cft1: string | null;    // Custom Text 1 (e.g., Brand)
    cft2: string | null;    // Custom Text 2 (e.g., Seller)
    cft3: string | null;    // Custom Text 3 (e.g., Category)
    cfi1: number | null;    // Custom Int 1 (e.g., Review Count)
    cfi2: number | null;    // Custom Int 2 (e.g., Rating)
    cfi3: number | null;    // Custom Int 3 (e.g., Discount %)

    // Timestamps
    lastEventAt: Date;
    updatedAt: Date;
}

// Price History Model
export interface PriceHistory {
    id: bigint;
    listingId: bigint;
    price: number;
    recordedAt: Date;
}

// Inventory History Model
export interface InventoryHistory {
    id: bigint;
    listingId: bigint;
    stock: number;
    changeType: 'sold' | 'restock' | 'correction' | 'initial';
    recordedAt: Date;
}

// DTO for creating/updating listings (without auto-generated fields)
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

// Cache key helper type
export type ListingCacheKey = `listing:${number}:${string}:${string}`;
