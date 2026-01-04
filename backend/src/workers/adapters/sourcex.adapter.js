/**
 * SourceX Adapter
 * Transforms raw SourceX API data into StandardListing
 */

const { db } = require('../../db');
const { platforms } = require('../../db/schema');
const { eq } = require('drizzle-orm');

class SourceXAdapter {
    constructor() {
        this.platformName = 'SourceX';
    }

    // Helper: Base64 Decode
    decodeId(base64) {
        try {
            const decoded = Buffer.from(base64, 'base64').toString('utf-8');
            const match = decoded.match(/:(\d+)$/);
            return match ? BigInt(match[1]) : BigInt(0);
        } catch {
            return BigInt(0);
        }
    }

    // Helper: Extract Culture Circle data
    getCultureCircleData(item) {
        const cc = item.platformListings?.edges?.find(
            e => e.node.marketplace.title === 'culturecircle'
        );
        return {
            payout: cc?.node.resellerPayoutPrice,
            commission: cc ? Math.round(cc.node.marketplace.commissionPercentage * 100) : undefined // 14% -> 1400
        };
    }

    async ensurePlatformExists() {
        let platform = await db.query.platforms.findFirst({
            where: eq(platforms.name, this.platformName)
        });

        if (!platform) {
            await db.insert(platforms).values({
                name: this.platformName,
                baseUrl: 'https://sourcex.in',
                syncStatus: 'idle'
            });
            platform = await db.query.platforms.findFirst({
                where: eq(platforms.name, this.platformName)
            });
        }
        return platform.id;
    }

    async getPlatformId() {
        // Cached or DB lookup
        return this.ensurePlatformExists();
    }

    // Core Transformation Logic
    transform(item) {
        const variant = item.variant;
        const product = variant?.product;
        const ccData = this.getCultureCircleData(item);

        return {
            externalId: this.decodeId(item.id),
            sku: product?.skuId || 'UNKNOWN',
            variantId: variant?.id ? String(this.decodeId(variant.id)) : null,
            title: product?.title || 'Unknown Product',
            image: product?.images?.edges?.[0]?.node?.image || null,
            size: variant?.title || null,
            price: item._isLowest ? String(variant?.lowestPrice) : null,
            stock: item.quantity,
            isLowest: item._isLowest === true,
            props: {
                brand: product?.brandName,
                payout: ccData.payout,
                commission: ccData.commission
            }
        };
    }
}

module.exports = { SourceXAdapter };
