/**
 * Auto-Undercut Job
 * Runs every 5 minutes to check for price undercuts and auto-adjust
 */

const { pool } = require('../../db');
const discord = require('../../services/discord');

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
     * Process a single listing for auto-undercut
     */
    async processListing(listing) {
        const listingId = listing.id;
        const currentLowest = Number(listing.current_price);
        const currentPayout = listing.cfi_1;
        const stopLoss = listing.stop_loss_price;
        const commission = listing.cfi_2 ? listing.cfi_2 / 100 : 14;

        // Calculate our projected price
        const ourProjectedPrice = this.calculateProjectedPrice(currentPayout, commission);

        // Check if we're already lowest (our price <= current lowest)
        if (ourProjectedPrice <= currentLowest) {
            // We're already lowest, no action needed
            return { action: 'none', reason: 'Already lowest' };
        }

        // Someone undercut us - calculate new payout to be ₹1 below
        const newPayout = this.calculateUndercutPayout(currentLowest, commission);
        const newProjectedPrice = this.calculateProjectedPrice(newPayout, commission);

        // Check stop loss
        if (stopLoss && newPayout < stopLoss) {
            console.log(`  [AutoUndercut] ❌ Listing ${listingId}: Stop loss reached (${newPayout} < ${stopLoss})`);
            return { action: 'stop_loss', reason: `New payout ${newPayout} below stop loss ${stopLoss}` };
        }

        // Check if last mutation was the same (avoid duplicate)
        const lastMutation = await this.getLastMutation(listingId, 5);
        if (lastMutation && lastMutation.new_payout_price === newPayout) {
            console.log(`  [AutoUndercut] ⏭️ Listing ${listingId}: Same mutation already done recently`);
            return { action: 'skip', reason: 'Same mutation already done within 5 mins' };
        }

        // Perform the undercut
        console.log(`  [AutoUndercut] 📉 Listing ${listingId}: Undercutting from ₹${currentPayout} to ₹${newPayout}`);

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

            console.error(`  [AutoUndercut] ❌ Listing ${listingId}: Failed - ${error.message}`);
            return { action: 'error', error: error.message };
        }
    }

    /**
     * Run the auto-undercut job
     */
    async run() {
        console.log('[AutoUndercut] Starting auto-undercut check...');

        // Get all listings with auto-undercut enabled
        const [listings] = await pool.query(
            `SELECT id, product_name, product_sku, size, current_price, cfi_1, cfi_2, stop_loss_price, platform_listing_ids
             FROM listings 
             WHERE auto_undercut_enabled = 1 
             AND platform_listing_ids IS NOT NULL
             AND cfi_1 IS NOT NULL
             AND current_stock > 0`
        );

        console.log(`[AutoUndercut] Found ${listings.length} listings with auto-undercut enabled`);

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

        console.log(`[AutoUndercut] Complete: ${processed} processed, ${undercut} undercut, ${skipped} skipped, ${errors} errors`);

        return { processed, undercut, skipped, errors };
    }
}

module.exports = { AutoUndercutJob };
