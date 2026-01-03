/**
 * Price Conversion Utility
 * 
 * Based on analysis of 817 data points from inventory-data.json:
 * 
 * FINDINGS:
 * =========
 * 
 * 1. ROUNDING STRATEGY:
 *    - Math.round achieves 94.25% accuracy
 *    - The actual rounding depends on the decimal part:
 *      - Decimal 0.00 (whole numbers): 556 cases, all use floor
 *      - Decimal 0.86 (from prices ending in 99): 129 cases, 122 use ceil (95%)
 *      - Decimals 0.50-0.96: Generally use ceil
 *      - Decimals 0.00-0.49: Generally use floor
 * 
 * 2. FORMULA:
 *    lowestPrice = round(resellerPayoutPrice * (1 + commissionPercentage / 100))
 * 
 * 3. EXCEPTIONS (40 cases, 4.9%):
 *    - Some prices have significant differences due to manual adjustments
 *    - Off-by-one errors in a few cases (likely race conditions or updates)
 * 
 * 4. COMMISSION PERCENTAGES (for culturecircle marketplace):
 *    - 14% is the standard commission
 *    - Other marketplaces have different rates: 0%, 8.7%, 11.12%
 */

const fs = require('fs');
const path = require('path');

/**
 * Calculate the lowest price from reseller payout price and commission percentage.
 * Uses Math.round which achieves 94.25% accuracy based on data analysis.
 * 
 * @param {number} resellerPayoutPrice - The payout price for the reseller
 * @param {number} commissionPercentage - The commission percentage (e.g., 14 for 14%)
 * @returns {number} The calculated lowest price
 */
function calculateLowestPrice(resellerPayoutPrice, commissionPercentage = 14) {
    const calculatedExact = resellerPayoutPrice * (1 + commissionPercentage / 100);
    return Math.round(calculatedExact);
}

/**
 * Reverse calculation: Get the reseller payout price from the lowest price.
 * 
 * @param {number} lowestPrice - The lowest/display price
 * @param {number} commissionPercentage - The commission percentage (e.g., 14 for 14%)
 * @returns {number} The estimated reseller payout price
 */
function calculateResellerPrice(lowestPrice, commissionPercentage = 14) {
    return Math.round(lowestPrice / (1 + commissionPercentage / 100));
}

// Validate the conversion function against actual data
function validateConversionFunction() {
    const inventoryPath = path.join(__dirname, '..', 'output', 'inventory-data.json');
    const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

    const lowestItems = data.lowest || [];

    let totalTested = 0;
    let exactMatches = 0;
    let offByOne = 0;
    let offByTwo = 0;
    let significantMismatches = [];

    const results = [];

    for (const item of lowestItems) {
        const variantLowestPrice = item.variant?.lowestPrice;
        const platformListings = item.platformListings?.edges || [];

        const cultureCircleListing = platformListings.find(
            edge => edge.node?.marketplace?.title === 'culturecircle'
        );

        if (cultureCircleListing && variantLowestPrice) {
            const resellerPayoutPrice = cultureCircleListing.node.resellerPayoutPrice;
            const commissionPercentage = cultureCircleListing.node.marketplace.commissionPercentage;

            const calculated = calculateLowestPrice(resellerPayoutPrice, commissionPercentage);
            const diff = Math.abs(variantLowestPrice - calculated);

            totalTested++;

            if (diff === 0) {
                exactMatches++;
            } else if (diff === 1) {
                offByOne++;
            } else if (diff === 2) {
                offByTwo++;
            } else {
                significantMismatches.push({
                    product: item.variant?.product?.title,
                    variant: item.variant?.title,
                    actual: variantLowestPrice,
                    calculated,
                    resellerPayoutPrice,
                    commissionPercentage,
                    difference: variantLowestPrice - calculated,
                });
            }

            results.push({
                productTitle: item.variant?.product?.title,
                variantTitle: item.variant?.title,
                inventoryId: item.id,
                resellerPayoutPrice,
                commissionPercentage,
                actualLowestPrice: variantLowestPrice,
                calculatedLowestPrice: calculated,
                difference: variantLowestPrice - calculated,
                isExactMatch: diff === 0,
            });
        }
    }

    const accuracy = (exactMatches / totalTested * 100).toFixed(2);
    const closeMatch = ((exactMatches + offByOne + offByTwo) / totalTested * 100).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION RESULTS');
    console.log('='.repeat(80));
    console.log(`Total tested: ${totalTested}`);
    console.log(`Exact matches: ${exactMatches} (${accuracy}%)`);
    console.log(`Off by 1: ${offByOne}`);
    console.log(`Off by 2: ${offByTwo}`);
    console.log(`Close match (within 2): ${closeMatch}%`);
    console.log(`Significant mismatches: ${significantMismatches.length}`);

    if (significantMismatches.length > 0) {
        console.log('\n--- Significant Mismatches (likely manual adjustments) ---');
        significantMismatches.slice(0, 10).forEach((m, i) => {
            console.log(`${i + 1}. ${m.product} (${m.variant})`);
            console.log(`   Actual: ${m.actual}, Calculated: ${m.calculated}, Diff: ${m.difference}`);
        });
    }

    // Save results
    const output = {
        conversionFormula: 'Math.round(resellerPayoutPrice * (1 + commissionPercentage / 100))',
        marketplaceUsedForTesting: 'culturecircle',
        defaultCommissionPercentage: 14,
        validationResults: {
            totalTested,
            exactMatches,
            exactMatchPercentage: `${accuracy}%`,
            offByOne,
            offByTwo,
            closeMatchPercentage: `${closeMatch}%`,
            significantMismatchCount: significantMismatches.length,
        },
        roundingStrategyNotes: {
            primaryStrategy: 'Math.round',
            decimalPatterns: {
                '0.00 (whole)': 'Floor (automatic)',
                '0.01-0.49': 'Floor',
                '0.50-0.99': 'Ceil',
                '0.86 (from x99)': 'Ceil (122/129 cases)',
            },
        },
        significantMismatches,
        allResults: results,
    };

    const outputPath = path.join(__dirname, '..', 'output', 'price-conversion-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n📁 Results saved to: ${outputPath}`);

    return output;
}

// Run validation if executed directly
if (require.main === module) {
    console.log('🔍 Validating price conversion function...\n');

    console.log('Formula: lowestPrice = Math.round(resellerPayoutPrice * (1 + commissionPercentage / 100))');
    console.log('\nExamples:');
    console.log(`  resellerPayoutPrice: 13000, commission: 14% → ${calculateLowestPrice(13000, 14)}`);
    console.log(`  resellerPayoutPrice: 9999, commission: 14% → ${calculateLowestPrice(9999, 14)}`);
    console.log(`  resellerPayoutPrice: 64000, commission: 14% → ${calculateLowestPrice(64000, 14)}`);
    console.log(`  resellerPayoutPrice: 10990, commission: 14% → ${calculateLowestPrice(10990, 14)}`);

    validateConversionFunction();
}

module.exports = {
    calculateLowestPrice,
    calculateResellerPrice,
    validateConversionFunction,
};
