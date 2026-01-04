export { };

require('dotenv').config({ path: '../.env' });

const { initialize, shutdown, monitorService, logger } = require('../index');

interface ScrapedProduct {
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

/**
 * Example function showing how scrapers should format and send data
 */
async function exampleScraperRun() {
    // Initialize backend (test connections + warm cache)
    await initialize();

    // Example: Scraped products from your scraper
    const scrapedProducts: ScrapedProduct[] = [
        {
            productSku: 'SHOE-001',
            variantId: 'SIZE-42',
            productName: 'Nike Air Max 90',
            imgUrl: 'https://example.com/shoe.jpg',
            size: '42',
            price: 12999,
            stock: 15,
            customFields: {
                cfb1: true,   // Is lowest price ever
                cft1: 'Nike', // Brand
                cft2: 'Official Store', // Seller
                cfi1: 1250,   // Review count
                cfi2: 45,     // Rating (out of 100)
                cfi3: 20,     // Discount percentage
            }
        },
        {
            productSku: 'SHOE-001',
            variantId: 'SIZE-43',
            productName: 'Nike Air Max 90',
            imgUrl: 'https://example.com/shoe.jpg',
            size: '43',
            price: 12999,
            stock: 8,
            customFields: {
                cfb1: true,
                cft1: 'Nike',
                cft2: 'Official Store',
            }
        },
        {
            productSku: 'SHOE-002',
            productName: 'Adidas Ultraboost 22',
            price: 15499,
            stock: 0,
            customFields: {
                cft1: 'Adidas',
            }
        },
    ];

    // Process the scraped data
    const result = await monitorService.processScrapedData(
        'SourceX',           // Platform name
        scrapedProducts,     // Array of scraped products
        'https://sourcex.in' // Optional: platform base URL
    );

    // Log results
    logger.info('Example', 'Sync completed', {
        duration: `${result.completedAt.getTime() - result.startedAt.getTime()}ms`,
        stats: result.stats,
    });

    if (result.errors.length > 0) {
        logger.warn('Example', 'Some products had errors', result.errors);
    }

    // Shutdown gracefully
    await shutdown();
}

// Run if called directly
if (require.main === module) {
    exampleScraperRun()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Example failed:', err);
            process.exit(1);
        });
}

module.exports = { exampleScraperRun };
