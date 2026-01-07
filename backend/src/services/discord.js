/**
 * Discord Webhook Service
 * Sends notifications to Discord for price changes and mutations
 */

const WEBHOOKS = {
    // Price changes incoming (detected from sync)
    PRICE_CHANGES: process.env.DISCORD_WEBHOOK_PRICE_CHANGES,

    // Mutations (payout writes by our system)
    MUTATIONS: process.env.DISCORD_WEBHOOK_MUTATIONS
};

/**
 * Send a message to Discord webhook
 */
async function sendWebhook(webhookUrl, payload) {
    if (!webhookUrl) {
        // Silently skip if no webhook URL is configured
        return true;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`[Discord] Webhook failed: ${response.status}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[Discord] Webhook error:`, error.message);
        return false;
    }
}

/**
 * Send price change notification
 * @param {Object} data - Price change data
 */
async function notifyPriceChange(data) {
    const { productName, productSku, listingId, oldPrice, newPrice, size } = data;

    const priceChange = newPrice - oldPrice;
    const changePercent = ((priceChange / oldPrice) * 100).toFixed(1);
    const isIncrease = priceChange > 0;

    const embed = {
        title: isIncrease ? '📈 Price Increased' : '📉 Price Decreased',
        color: isIncrease ? 0xFF5555 : 0x55FF55, // Red for increase, Green for decrease
        fields: [
            {
                name: '📦 Product',
                value: productName.substring(0, 100),
                inline: false
            },
            {
                name: '🏷️ SKU',
                value: `\`${productSku}\``,
                inline: true
            },
            {
                name: '📐 Size',
                value: size || 'N/A',
                inline: true
            },
            {
                name: '🔗 ID',
                value: `#${listingId}`,
                inline: true
            },
            {
                name: '💰 Old Price',
                value: `₹${oldPrice.toLocaleString()}`,
                inline: true
            },
            {
                name: '💵 New Price',
                value: `₹${newPrice.toLocaleString()}`,
                inline: true
            },
            {
                name: '📊 Change',
                value: `${isIncrease ? '+' : ''}₹${priceChange.toLocaleString()} (${isIncrease ? '+' : ''}${changePercent}%)`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'SourceX Price Monitor'
        }
    };

    return sendWebhook(WEBHOOKS.PRICE_CHANGES, { embeds: [embed] });
}

/**
 * Send price mutation notification (our payout writes)
 * @param {Object} data - Mutation data
 */
async function notifyMutation(data) {
    const {
        productName,
        productSku,
        listingId,
        oldPayoutPrice,
        newPayoutPrice,
        newCurrentPrice,
        triggerType,
        triggerReason,
        success,
        size
    } = data;

    const isAutoUndercut = triggerType === 'auto_undercut';

    const embed = {
        title: success
            ? (isAutoUndercut ? '⚡ Auto-Undercut Executed' : '✏️ Manual Price Update')
            : '❌ Mutation Failed',
        color: success ? (isAutoUndercut ? 0x9B59B6 : 0x3498DB) : 0xFF0000, // Purple for auto, Blue for manual
        fields: [
            {
                name: '📦 Product',
                value: productName?.substring(0, 100) || 'Unknown',
                inline: false
            },
            {
                name: '🏷️ SKU',
                value: `\`${productSku || 'N/A'}\``,
                inline: true
            },
            {
                name: '📐 Size',
                value: size || 'N/A',
                inline: true
            },
            {
                name: '🔗 ID',
                value: `#${listingId}`,
                inline: true
            },
            {
                name: '💸 Old Payout',
                value: oldPayoutPrice ? `₹${oldPayoutPrice.toLocaleString()}` : 'N/A',
                inline: true
            },
            {
                name: '💰 New Payout',
                value: `₹${newPayoutPrice.toLocaleString()}`,
                inline: true
            },
            {
                name: '🏪 New Price',
                value: `₹${newCurrentPrice.toLocaleString()}`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: isAutoUndercut ? 'Auto-Undercut System' : 'Manual Update'
        }
    };

    // Add trigger reason if available
    if (triggerReason) {
        embed.fields.push({
            name: '📝 Reason',
            value: triggerReason,
            inline: false
        });
    }

    return sendWebhook(WEBHOOKS.MUTATIONS, { embeds: [embed] });
}

/**
 * Send auto-undercut error notification
 * @param {Object} data - Error data
 */
async function notifyAutoUndercutError(data) {
    const {
        productName,
        productSku,
        listingId,
        errorType,
        errorMessage,
        size,
        currentPayout,
        attemptedPayout
    } = data;

    const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'https://sourcex.udayps.com';
    const productLink = `${FRONTEND_BASE_URL}/products/${listingId}`;

    const embed = {
        title: errorType === 'stop_loss' ? '🛑 Stop Loss Triggered' : '❌ Auto-Undercut Failed',
        color: errorType === 'stop_loss' ? 0xFFA500 : 0xFF0000, // Orange for stop loss, Red for error
        fields: [
            {
                name: '📦 Product',
                value: productName?.substring(0, 100) || 'Unknown',
                inline: false
            },
            {
                name: '🏷️ SKU',
                value: `\`${productSku || 'N/A'}\``,
                inline: true
            },
            {
                name: '📐 Size',
                value: size || 'N/A',
                inline: true
            },
            {
                name: '🔗 ID',
                value: `[#${listingId}](${productLink})`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Auto-Undercut System'
        }
    };

    // Add payout info if available
    if (currentPayout) {
        embed.fields.push({
            name: '💸 Current Payout',
            value: `₹${currentPayout.toLocaleString()}`,
            inline: true
        });
    }

    if (attemptedPayout) {
        embed.fields.push({
            name: '🎯 Attempted Payout',
            value: `₹${attemptedPayout.toLocaleString()}`,
            inline: true
        });
    }

    // Add error message
    embed.fields.push({
        name: '⚠️ Error',
        value: errorMessage?.substring(0, 500) || 'Unknown error',
        inline: false
    });

    // Add action link
    embed.fields.push({
        name: '🔗 View Product',
        value: `[Open in SourceX Bot](${productLink})`,
        inline: false
    });

    return sendWebhook(WEBHOOKS.MUTATIONS, { embeds: [embed] });
}

/**
 * Send batch price changes summary
 * @param {Array} changes - Array of price changes
 */
async function notifyPriceChangesSummary(changes) {
    if (!changes || changes.length === 0) return;

    // Group by increase/decrease
    const increases = changes.filter(c => c.newPrice > c.oldPrice);
    const decreases = changes.filter(c => c.newPrice < c.oldPrice);

    const embed = {
        title: `📊 Price Changes Summary (${changes.length} items)`,
        color: 0x5865F2, // Discord blurple
        fields: [
            {
                name: '📈 Price Increases',
                value: increases.length > 0
                    ? increases.slice(0, 5).map(c =>
                        `• ${c.productName.substring(0, 30)}... ₹${c.oldPrice} → ₹${c.newPrice}`
                    ).join('\n') + (increases.length > 5 ? `\n... and ${increases.length - 5} more` : '')
                    : 'None',
                inline: false
            },
            {
                name: '📉 Price Decreases',
                value: decreases.length > 0
                    ? decreases.slice(0, 5).map(c =>
                        `• ${c.productName.substring(0, 30)}... ₹${c.oldPrice} → ₹${c.newPrice}`
                    ).join('\n') + (decreases.length > 5 ? `\n... and ${decreases.length - 5} more` : '')
                    : 'None',
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'SourceX Price Monitor'
        }
    };

    return sendWebhook(WEBHOOKS.PRICE_CHANGES, { embeds: [embed] });
}

module.exports = {
    notifyPriceChange,
    notifyMutation,
    notifyAutoUndercutError,
    notifyPriceChangesSummary,
    sendWebhook,
    WEBHOOKS
};
