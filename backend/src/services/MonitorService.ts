export { };

const { listingRepository } = require('../repositories/ListingRepository') as typeof import('../repositories/ListingRepository');
const { historyRepository } = require('../repositories/HistoryRepository') as typeof import('../repositories/HistoryRepository');
const { platformRepository } = require('../repositories/PlatformRepository') as typeof import('../repositories/PlatformRepository');
const { listingCache } = require('../cache/ListingCache') as typeof import('../cache/ListingCache');
const { logger } = require('../utils/logger') as typeof import('../utils/logger');

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

export interface ScrapedProduct {
    productSku: string;
    variantId?: string | null;
    productName: string;
    imgUrl?: string | null;
    size?: string | null;
    price: number;
    stock: number;
    customFields?: {
        cfb1?: boolean;
        cft1?: string;
        cft2?: string;
        cft3?: string;
        cfi1?: number;
        cfi2?: number;
        cfi3?: number;
    };
}

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

interface ChangeDetectionResult {
    isNew: boolean;
    priceChanged: boolean;
    stockChanged: boolean;
    oldPrice?: number | null;
    newPrice: number;
    oldStock?: number | null;
    newStock: number;
}

export class MonitorService {

    /**
     * Process scraped data from a platform
     * Main entry point for scrapers
     */
    async processScrapedData(
        platformName: string,
        products: ScrapedProduct[],
        platformBaseUrl?: string
    ): Promise<SyncResult> {
        const startedAt = new Date();
        const errors: SyncError[] = [];

        let newListings = 0;
        let updatedListings = 0;
        let priceChanges = 0;
        let stockChanges = 0;
        let unchanged = 0;

        try {
            const platform = await platformRepository.getOrCreate(platformName, platformBaseUrl);
            await platformRepository.startSync(platform.id);

            logger.info('MonitorService', `Starting sync for ${platformName}`, {
                platformId: platform.id,
                productCount: products.length
            });

            // Get all cached listings for this platform (O(1) lookups)
            const cachedListings = await listingCache.getAllForPlatform(platform.id);
            logger.info('MonitorService', `Cache loaded`, { cachedCount: cachedListings.size });

            const newProducts: ListingUpsertDTO[] = [];
            const changedProducts: ListingUpsertDTO[] = [];
            const priceChangeRecords: { listingId: bigint; price: number }[] = [];
            const stockChangeRecords: { listingId: bigint; stock: number; changeType: 'sold' | 'restock' | 'correction' | 'initial' }[] = [];

            for (const product of products) {
                try {
                    const cacheKey = `${platform.id}:${product.productSku}:${product.variantId || ''}`;
                    const cached = cachedListings.get(cacheKey);

                    const changeResult = this.detectChanges(cached, product);

                    const listingDto: ListingUpsertDTO = {
                        platformId: platform.id,
                        productSku: product.productSku,
                        variantId: product.variantId,
                        productName: product.productName,
                        imgUrl: product.imgUrl,
                        size: product.size,
                        currentPrice: product.price,
                        currentStock: product.stock,
                        cfb1: product.customFields?.cfb1,
                        cft1: product.customFields?.cft1,
                        cft2: product.customFields?.cft2,
                        cft3: product.customFields?.cft3,
                        cfi1: product.customFields?.cfi1,
                        cfi2: product.customFields?.cfi2,
                        cfi3: product.customFields?.cfi3,
                    };

                    if (changeResult.isNew) {
                        newProducts.push(listingDto);
                        newListings++;
                    } else if (changeResult.priceChanged || changeResult.stockChanged) {
                        changedProducts.push(listingDto);
                        updatedListings++;

                        if (changeResult.priceChanged && cached) {
                            priceChangeRecords.push({ listingId: cached.id, price: product.price });
                            priceChanges++;
                        }

                        if (changeResult.stockChanged && cached) {
                            const changeType = this.determineStockChangeType(
                                changeResult.oldStock!,
                                changeResult.newStock
                            );
                            stockChangeRecords.push({
                                listingId: cached.id,
                                stock: product.stock,
                                changeType
                            });
                            stockChanges++;
                        }
                    } else {
                        unchanged++;
                    }
                } catch (err: any) {
                    errors.push({
                        productSku: product.productSku,
                        variantId: product.variantId ?? undefined,
                        error: err.message || String(err),
                    });
                }
            }

            // Bulk upsert new listings
            if (newProducts.length > 0) {
                logger.info('MonitorService', `Inserting new listings`, { count: newProducts.length });
                const newIds = await listingRepository.bulkUpsert(newProducts);

                const initialPriceRecords: { listingId: bigint; price: number }[] = [];
                const initialStockRecords: { listingId: bigint; stock: number; changeType: 'initial' }[] = [];

                for (const product of newProducts) {
                    const key = listingRepository.makeKey(product.platformId, product.productSku, product.variantId);
                    const listingId = newIds.get(key);
                    if (listingId && product.currentPrice !== null) {
                        initialPriceRecords.push({ listingId, price: product.currentPrice });
                    }
                    if (listingId && product.currentStock !== null) {
                        initialStockRecords.push({ listingId, stock: product.currentStock, changeType: 'initial' });
                    }
                }

                if (initialPriceRecords.length > 0) {
                    await historyRepository.bulkLogPriceChanges(initialPriceRecords);
                }
                if (initialStockRecords.length > 0) {
                    await historyRepository.bulkLogInventoryChanges(initialStockRecords);
                }
            }

            // Bulk upsert changed listings
            if (changedProducts.length > 0) {
                logger.info('MonitorService', `Updating changed listings`, { count: changedProducts.length });
                await listingRepository.bulkUpsert(changedProducts);
            }

            // Bulk log history changes
            if (priceChangeRecords.length > 0) {
                logger.info('MonitorService', `Logging price changes`, { count: priceChangeRecords.length });
                await historyRepository.bulkLogPriceChanges(priceChangeRecords);
            }

            if (stockChangeRecords.length > 0) {
                logger.info('MonitorService', `Logging stock changes`, { count: stockChangeRecords.length });
                await historyRepository.bulkLogInventoryChanges(stockChangeRecords);
            }

            // Update cache with new/changed listings
            if (newProducts.length > 0 || changedProducts.length > 0) {
                logger.info('MonitorService', `Refreshing cache`);
                await listingCache.warmUp(platform.id);
            }

            await platformRepository.endSync(platform.id, 'idle');

            const completedAt = new Date();
            const duration = completedAt.getTime() - startedAt.getTime();

            logger.info('MonitorService', `Sync completed for ${platformName}`, {
                duration: `${duration}ms`,
                new: newListings,
                updated: updatedListings,
                priceChanges,
                stockChanges,
                unchanged,
                errors: errors.length
            });

            return {
                platformId: platform.id,
                platformName,
                startedAt,
                completedAt,
                stats: {
                    totalScraped: products.length,
                    newListings,
                    updatedListings,
                    priceChanges,
                    stockChanges,
                    unchanged,
                    errors: errors.length,
                },
                errors,
            };

        } catch (error: any) {
            logger.error('MonitorService', `Sync failed for ${platformName}`, error);

            try {
                const platform = await platformRepository.getByName(platformName);
                if (platform) {
                    await platformRepository.endSync(platform.id, 'failed');
                }
            } catch { }

            throw error;
        }
    }

    /**
     * Detect what changed between cached and new data
     */
    private detectChanges(cached: Listing | undefined, scraped: ScrapedProduct): ChangeDetectionResult {
        if (!cached) {
            return {
                isNew: true,
                priceChanged: false,
                stockChanged: false,
                newPrice: scraped.price,
                newStock: scraped.stock,
            };
        }

        const priceChanged = cached.currentPrice !== scraped.price;
        const stockChanged = cached.currentStock !== scraped.stock;

        return {
            isNew: false,
            priceChanged,
            stockChanged,
            oldPrice: cached.currentPrice,
            newPrice: scraped.price,
            oldStock: cached.currentStock,
            newStock: scraped.stock,
        };
    }

    /**
     * Determine stock change type based on old and new values
     */
    private determineStockChangeType(oldStock: number, newStock: number): 'sold' | 'restock' | 'correction' {
        if (newStock < oldStock) {
            return 'sold';
        } else if (newStock > oldStock) {
            return 'restock';
        }
        return 'correction';
    }

    /**
     * Warm up cache for a platform or all platforms
     */
    async warmUpCache(platformId?: number): Promise<number> {
        return listingCache.warmUp(platformId);
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(platformId?: number) {
        return listingCache.getStats(platformId);
    }
}

export const monitorService = new MonitorService();
