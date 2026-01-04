/**
 * Scraper Integration Types
 * Defines the format of data scrapers should provide
 */

// Input from scrapers
export interface ScrapedProduct {
    productSku: string;
    variantId?: string | null;
    productName: string;
    imgUrl?: string | null;
    size?: string | null;
    price: number;
    stock: number;
    customFields?: {
        cfb1?: boolean;     // Is Lowest Price Ever
        cft1?: string;      // Custom Text 1
        cft2?: string;      // Custom Text 2
        cft3?: string;      // Custom Text 3
        cfi1?: number;      // Custom Int 1
        cfi2?: number;      // Custom Int 2
        cfi3?: number;      // Custom Int 3
    };
}

// Result of processing scraped data
export interface SyncResult {
    platformId: number;
    platformName: string;
    startedAt: Date;
    completedAt: Date;
    stats: {
        totalScraped: number;
        newListings: number;
        updatedListings: number;
        priceChanges: number;
        stockChanges: number;
        unchanged: number;
        errors: number;
    };
    errors: SyncError[];
}

export interface SyncError {
    productSku: string;
    variantId?: string;
    error: string;
}

// Change detection result
export interface ChangeDetectionResult {
    isNew: boolean;
    priceChanged: boolean;
    stockChanged: boolean;
    oldPrice?: number | null;
    newPrice: number;
    oldStock?: number | null;
    newStock: number;
}
