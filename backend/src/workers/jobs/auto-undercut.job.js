/**
 * Auto-Undercut Job
 * Runs every 5 minutes to check for price undercuts and auto-adjust
 */

const { pool } = require('../../db');
const discord = require('../../services/discord');
const { logMonitor } = require('../../utils/logger');

class AutoUndercutJob {
    constructor() {
        this.lastRunAt = null;
    }

    /**
     * Calculate projected price from payout price and commission
     */
    calculateProjectedPrice(payoutPrice, commissionPercent = 14) {
        const commRate = commissionPercent / 100;
        return Math.round(payoutPrice * (1 + commRate));
    }

    /**
     * Calculate new payout price to be ₹1 below target
     */
    calculateUndercutPayout(targetPrice, commissionPercent = 14) {
        const commRate = commissionPercent / 100;
        return Math.floor((targetPrice - 1) / (1 + commRate));
    }

    /**
     * Check if we recently mutated this listing (within last 5 mins)
     * Returns the last mutation if exists
     */
    async getLastMutation(listingId, withinMinutes = 5) {
        const [rows] = await pool.query(
            `SELECT * FROM price_mutations 
             WHERE listing_id = ? 
             AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
             ORDER BY created_at DESC 
             LIMIT 1`,
            [listingId, withinMinutes]
        );
        return rows[0] || null;
    }

    /**
     * Log a price mutation
     */
    async logMutation(data) {
        const [result] = await pool.query(
            `INSERT INTO price_mutations 
             (listing_id, old_payout_price, new_payout_price, old_current_price, new_current_price,
              trigger_type, trigger_reason, lowest_price_at_trigger, success, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.listingId,
                data.oldPayoutPrice,
                data.newPayoutPrice,
                data.oldCurrentPrice,
                data.newCurrentPrice,
                data.triggerType,
                data.triggerReason,
                data.lowestPriceAtTrigger,
                data.success,
                data.errorMessage
            ]
        );
        return result.insertId;
    }

    /**
     * Check if we should notify Discord about an error (spam prevention)
     * Only notify if we haven't notified about this error type for this listing in the last 24 hours
     */
    async shouldNotifyError(listingId, errorType) {
        const [rows] = await pool.query(
            `SELECT last_notified_at FROM error_notifications 
             WHERE listing_id = ? AND error_type = ?
             AND last_notified_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
            [listingId, errorType]
        );
        return rows.length === 0; // Should notify if no recent notification found
    }

    /**
     * Record that we sent an error notification (for spam prevention)
     */
    async recordErrorNotification(listingId, errorType, errorMessage) {
        await pool.query(
            `INSERT INTO error_notifications (listing_id, error_type, error_message, last_notified_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE 
             error_message = VALUES(error_message),
             last_notified_at = NOW()`,
            [listingId, errorType, errorMessage]
        );
    }

    /**
     * Clear error notifications for a listing (reset spam prevention timer)
     * Called when manual actions are taken: price change, auto-undercut toggle, stop-loss change
     */
    static async clearErrorNotifications(listingId) {
        const { pool } = require('../../db');
        await pool.query(
            `DELETE FROM error_notifications WHERE listing_id = ?`,
            [listingId]
        );
    }

    /**
     * Update a listing's payout price via SourceX API
     */
    async updatePayoutPrice(listing, newPayoutPrice) {
        const sourcex = require('../../../../scrapers/sourcex');
        await sourcex.init();

        // Parse platform listing IDs
        let platformListingIds = [];
        if (listing.platform_listing_ids) {
            try {
                platformListingIds = JSON.parse(listing.platform_listing_ids);
            } catch (e) {
                throw new Error('Invalid platform listing IDs');
            }
        }

        if (platformListingIds.length === 0) {
            throw new Error('No platform listing IDs found');
        }

        const result = await sourcex.updatePayoutPrice(platformListingIds, newPayoutPrice);
        return result;
    }

    /**
     * Get our lowest CALCULATED selling price among all our listings for a given SKU+Size
     * This calculates projected price from cfi_1 (payout) + commission
     * This helps detect if the "competitor" is actually our own listing
     */
    async getOurLowestProjectedPriceForProduct(productSku, size, defaultCommission = 14) {
        const [rows] = await pool.query(
            `SELECT id, cfi_1 as payout, cfi_2 as commission_x100
             FROM listings 
             WHERE product_sku = ? 
             AND size = ?
             AND current_stock > 0
             AND cfi_1 IS NOT NULL
             AND auto_undercut_enabled = 1`,
            [productSku, size]
        );

        if (!rows || rows.length === 0) {
            return { ourLowestProjected: null, ourListingIds: [] };
        }

        // Calculate projected selling price for each of our listings
        let lowestProjected = Infinity;
        const listingIds = [];

        for (const row of rows) {
            const payout = Number(row.payout);
            const commission = row.commission_x100 ? row.commission_x100 / 100 : defaultCommission;
            const projectedPrice = this.calculateProjectedPrice(payout, commission);

            listingIds.push(String(row.id));
            if (projectedPrice < lowestProjected) {
                lowestProjected = projectedPrice;
            }
        }

        return {
            ourLowestProjected: lowestProjected === Infinity ? null : lowestProjected,
            ourListingIds: listingIds
        };
    }

    /**
     * Process a single listing for auto-undercut
     */
    async processListing(listing) {
        const listingId = listing.id;
        const currentLowest = Number(listing.current_price);
        const currentPayout = listing.cfi_1;
        const stopLoss = listing.stop_loss_price;
        const commission = listing.cfi_2 ? listing.cfi_2 / 100 : 14;
        const productSku = listing.product_sku;
        const size = listing.size;

        // Calculate our projected price
        const ourProjectedPrice = this.calculateProjectedPrice(currentPayout, commission);

        // Check if we're already lowest (our price <= current lowest)
        if (ourProjectedPrice <= currentLowest) {
            // We're already lowest, no action needed
            return { action: 'none', reason: 'Already lowest' };
        }

        // ===== SELF-UNDERCUT PREVENTION =====
        // Check if the "lowest price" is actually one of our own listings' projected prices
        const { ourLowestProjected, ourListingIds } = await this.getOurLowestProjectedPriceForProduct(productSku, size, commission);

        // If the market lowest equals our lowest projected selling price, the "competitor" is actually us!
        // Compare rounded values for exact match - any ₹1+ difference means someone undercut us
        if (ourLowestProjected && Math.round(currentLowest) === Math.round(ourLowestProjected)) {
            logMonitor(`🛡️ Listing ${listingId}: Skipping self-undercut (Market ₹${currentLowest} matches our projected)`, 'warning');
            return { action: 'skip', reason: 'Lowest price is our own listing - avoiding self-undercut' };
        }
        // ===== END SELF-UNDERCUT PREVENTION =====

        // Someone external undercut us - calculate new payout to be ₹1 below
        const newPayout = this.calculateUndercutPayout(currentLowest, commission);
        const newProjectedPrice = this.calculateProjectedPrice(newPayout, commission);

        // Check stop loss
        if (stopLoss && newPayout < stopLoss) {
            logMonitor(`❌ Listing ${listingId}: Stop loss reached (${newPayout} < ${stopLoss})`, 'warning');

            // Send Discord notification with spam prevention
            try {
                const shouldNotify = await this.shouldNotifyError(listingId, 'stop_loss');
                if (shouldNotify) {
                    await discord.notifyAutoUndercutError({
                        productName: listing.product_name,
                        productSku: listing.product_sku,
                        listingId,
                        errorType: 'stop_loss',
                        errorMessage: `New payout ₹${newPayout} is below stop loss ₹${stopLoss}. Competitor at ₹${currentLowest}.`,
                        size: listing.size,
                        currentPayout,
                        attemptedPayout: newPayout
                    });
                    await this.recordErrorNotification(listingId, 'stop_loss', `Payout ${newPayout} < stop loss ${stopLoss}`);
                }
            } catch (discordErr) {
                console.error('  [Discord] Failed to send stop loss notification:', discordErr.message);
            }

            return { action: 'stop_loss', reason: `New payout ${newPayout} below stop loss ${stopLoss}` };
        }

        // Check if last mutation was the same (avoid duplicate)
        const lastMutation = await this.getLastMutation(listingId, 5);
        if (lastMutation && lastMutation.new_payout_price === newPayout) {
            logMonitor(`⏭️ Listing ${listingId}: Same mutation already done recently`, 'info');
            return { action: 'skip', reason: 'Same mutation already done within 5 mins' };
        }

        // Perform the undercut
        logMonitor(`📉 Listing ${listingId}: Undercutting from ₹${currentPayout} to ₹${newPayout} (Competitor at ₹${currentLowest})`, 'price');

        try {
            const updateResult = await this.updatePayoutPrice(listing, newPayout);

            // Log successful mutation
            await this.logMutation({
                listingId,
                oldPayoutPrice: currentPayout,
                newPayoutPrice: newPayout,
                oldCurrentPrice: ourProjectedPrice,
                newCurrentPrice: newProjectedPrice,
                triggerType: 'auto_undercut',
                triggerReason: `Competitor undercut to ₹${currentLowest}`,
                lowestPriceAtTrigger: currentLowest,
                success: updateResult.success,
                errorMessage: null
            });

            // Update local DB
            if (updateResult.success) {
                await pool.query(
                    `UPDATE listings SET cfi_1 = ?, current_price = ?, updated_at = NOW() WHERE id = ?`,
                    [newPayout, newProjectedPrice, listingId]
                );

                // Send Discord notification for auto-undercut
                try {
                    await discord.notifyMutation({
                        productName: listing.product_name,
                        productSku: listing.product_sku,
                        listingId,
                        oldPayoutPrice: currentPayout,
                        newPayoutPrice: newPayout,
                        newCurrentPrice: newProjectedPrice,
                        triggerType: 'auto_undercut',
                        triggerReason: `Competitor undercut to ₹${currentLowest}`,
                        success: true,
                        size: listing.size
                    });
                } catch (discordErr) {
                    console.error('  [Discord] Failed to send mutation notification:', discordErr.message);
                }
            }

            return { action: 'undercut', newPayout, newPrice: newProjectedPrice, success: updateResult.success };
        } catch (error) {
            // Log failed mutation
            await this.logMutation({
                listingId,
                oldPayoutPrice: currentPayout,
                newPayoutPrice: newPayout,
                oldCurrentPrice: ourProjectedPrice,
                newCurrentPrice: newProjectedPrice,
                triggerType: 'auto_undercut',
                triggerReason: `Competitor undercut to ₹${currentLowest}`,
                lowestPriceAtTrigger: currentLowest,
                success: false,
                errorMessage: error.message
            });

            logMonitor(`❌ Listing ${listingId}: Failed - ${error.message}`, 'error');

            // Send Discord notification for API failure with spam prevention
            try {
                const shouldNotify = await this.shouldNotifyError(listingId, 'api_error');
                if (shouldNotify) {
                    await discord.notifyAutoUndercutError({
                        productName: listing.product_name,
                        productSku: listing.product_sku,
                        listingId,
                        errorType: 'api_error',
                        errorMessage: error.message,
                        size: listing.size,
                        currentPayout,
                        attemptedPayout: newPayout
                    });
                    await this.recordErrorNotification(listingId, 'api_error', error.message);
                }
            } catch (discordErr) {
                console.error('  [Discord] Failed to send error notification:', discordErr.message);
            }

            return { action: 'error', error: error.message };
        }
    }

    /**
     * Run the auto-undercut job
     */
    async run() {
        logMonitor('Starting auto-undercut check...', 'info');

        // Get all listings with auto-undercut enabled
        const [listings] = await pool.query(
            `SELECT id, product_name, product_sku, size, current_price, cfi_1, cfi_2, stop_loss_price, platform_listing_ids
             FROM listings 
             WHERE auto_undercut_enabled = 1 
             AND platform_listing_ids IS NOT NULL
             AND cfi_1 IS NOT NULL
             AND current_stock > 0`
        );

        logMonitor(`Found ${listings.length} listings with auto-undercut enabled`, 'info');

        let processed = 0;
        let undercut = 0;
        let skipped = 0;
        let errors = 0;

        for (const listing of listings) {
            const result = await this.processListing(listing);
            processed++;

            if (result.action === 'undercut') {
                undercut++;
            } else if (result.action === 'error') {
                errors++;
            } else {
                skipped++;
            }
        }

        this.lastRunAt = new Date();

        logMonitor(`Auto-undercut complete: ${processed} processed, ${undercut} updated, ${skipped} skipped, ${errors} errors`, 'success');

        return { processed, undercut, skipped, errors };
    }
}

module.exports = { AutoUndercutJob };
