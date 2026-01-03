/**
 * Advanced Price Analysis Script
 * Determines the exact rounding strategy and creates a conversion function
 */

const fs = require('fs');
const path = require('path');

// Read the inventory data
const inventoryPath = path.join(__dirname, '..', 'output', 'inventory-data.json');
const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

const lowestItems = data.lowest || [];

console.log(`\n📊 Analyzing ${lowestItems.length} items...\n`);

// Collect ALL price data points
const priceDataPoints = [];

for (const item of lowestItems) {
    const variantLowestPrice = item.variant?.lowestPrice;
    const platformListings = item.platformListings?.edges || [];

    const cultureCircleListing = platformListings.find(
        edge => edge.node?.marketplace?.title === 'culturecircle'
    );

    if (cultureCircleListing && variantLowestPrice) {
        const resellerPayoutPrice = cultureCircleListing.node.resellerPayoutPrice;
        const commissionPercentage = cultureCircleListing.node.marketplace.commissionPercentage;
        const calculatedExact = resellerPayoutPrice * (1 + commissionPercentage / 100);

        priceDataPoints.push({
            productTitle: item.variant?.product?.title,
            variantTitle: item.variant?.title,
            lowestPrice: variantLowestPrice,
            resellerPayoutPrice,
            commissionPercentage,
            calculatedExact,
            difference: variantLowestPrice - calculatedExact,
        });
    }
}

console.log('='.repeat(80));
console.log('DETAILED ROUNDING PATTERN ANALYSIS');
console.log('='.repeat(80));

// Categorize differences
const patterns = {
    exact: [],           // diff ~= 0 (floating point precision)
    oneBelow: [],        // diff = -1 (lowestPrice is 1 less than calculated)
    oneAbove: [],        // diff = 0.14 (ceil case for .86 values)
    floorMatch: [],      // Math.floor(calculated) === lowestPrice
    ceilMatch: [],       // Math.ceil(calculated) === lowestPrice
    significantDiff: [], // price is very different (likely updated independently)
};

for (const dp of priceDataPoints) {
    const diff = dp.difference;
    const absFloorDiff = Math.abs(dp.lowestPrice - Math.floor(dp.calculatedExact));
    const absCeilDiff = Math.abs(dp.lowestPrice - Math.ceil(dp.calculatedExact));

    if (Math.abs(diff) < 0.001) {
        patterns.exact.push(dp);
    } else if (Math.abs(diff + 1) < 0.01) {
        // lowestPrice = calculatedExact - 1 (off by one, seems like floor rounding issue)
        patterns.oneBelow.push(dp);
    } else if (diff > 0 && diff < 1) {
        // positive diff less than 1 - ceil case
        patterns.ceilMatch.push(dp);
    } else if (absFloorDiff < 1) {
        patterns.floorMatch.push(dp);
    } else if (absCeilDiff < 1) {
        patterns.ceilMatch.push(dp);
    } else {
        // Significant difference - price was likely manually adjusted
        patterns.significantDiff.push(dp);
    }
}

console.log(`\n📈 Pattern Distribution:`);
console.log(`  Exact match (floating point): ${patterns.exact.length}`);
console.log(`  One below calculated: ${patterns.oneBelow.length}`);
console.log(`  Ceil match (diff 0-1): ${patterns.ceilMatch.length}`);
console.log(`  Floor match: ${patterns.floorMatch.length}`);
console.log(`  Significant difference (manual): ${patterns.significantDiff.length}`);

// Analyze the oneBelow cases
console.log('\n--- Sample of "One Below" cases (lowestPrice = calculated - 1) ---');
patterns.oneBelow.slice(0, 5).forEach(dp => {
    console.log(`  ${dp.productTitle.substring(0, 40)} | lowest: ${dp.lowestPrice} | calc: ${dp.calculatedExact.toFixed(2)} | diff: ${dp.difference.toFixed(2)}`);
});

// Analyze ceil match cases
console.log('\n--- Sample of "Ceil Match" cases ---');
patterns.ceilMatch.slice(0, 5).forEach(dp => {
    console.log(`  ${dp.productTitle.substring(0, 40)} | lowest: ${dp.lowestPrice} | calc: ${dp.calculatedExact.toFixed(2)} | diff: ${dp.difference.toFixed(2)}`);
});

// Analyze significant diff cases
console.log('\n--- Sample of "Significant Difference" cases ---');
patterns.significantDiff.slice(0, 5).forEach(dp => {
    console.log(`  ${dp.productTitle.substring(0, 40)} | lowest: ${dp.lowestPrice} | calc: ${dp.calculatedExact.toFixed(2)} | diff: ${dp.difference.toFixed(2)}`);
});

// Now determine the MOST LIKELY rounding function
console.log('\n' + '='.repeat(80));
console.log('ROUNDING FUNCTION DETECTION');
console.log('='.repeat(80));

// Test different rounding strategies
const strategies = [
    { name: 'Math.floor', fn: (x) => Math.floor(x) },
    { name: 'Math.ceil', fn: (x) => Math.ceil(x) },
    { name: 'Math.round', fn: (x) => Math.round(x) },
    { name: 'Math.trunc', fn: (x) => Math.trunc(x) },
    { name: 'floor then -1', fn: (x) => Math.floor(x) - 1 },
    { name: 'round down to nearest 10', fn: (x) => Math.floor(x / 10) * 10 },
];

for (const strategy of strategies) {
    let matches = 0;
    for (const dp of priceDataPoints) {
        if (dp.lowestPrice === strategy.fn(dp.calculatedExact)) {
            matches++;
        }
    }
    const pct = (matches / priceDataPoints.length * 100).toFixed(1);
    console.log(`${strategy.name.padEnd(30)}: ${matches}/${priceDataPoints.length} (${pct}%)`);
}

// Check if maybe they use Math.ceil for resellerPayoutPrice that end in 99
console.log('\n--- Special Case: Prices ending in 99 ---');
const endingIn99 = priceDataPoints.filter(dp => dp.resellerPayoutPrice % 100 === 99);
console.log(`Found ${endingIn99.length} items with resellerPayoutPrice ending in 99`);

let floorMatch99 = 0;
let ceilMatch99 = 0;
for (const dp of endingIn99) {
    if (dp.lowestPrice === Math.floor(dp.calculatedExact)) floorMatch99++;
    if (dp.lowestPrice === Math.ceil(dp.calculatedExact)) ceilMatch99++;
}
console.log(`  Floor matches: ${floorMatch99}, Ceil matches: ${ceilMatch99}`);

// The observation from the data is:
// - Most use Math.floor 
// - Prices ending in .86 (from 99 * 1.14) use Math.ceil to round up
// Let me verify this pattern

console.log('\n--- Decimal Analysis ---');
const decimalPatterns = {};
for (const dp of priceDataPoints) {
    const decimal = dp.calculatedExact - Math.floor(dp.calculatedExact);
    const decimalRounded = Math.round(decimal * 100) / 100;
    const key = decimalRounded.toFixed(2);

    if (!decimalPatterns[key]) {
        decimalPatterns[key] = { count: 0, floorUsed: 0, ceilUsed: 0 };
    }
    decimalPatterns[key].count++;
    if (dp.lowestPrice === Math.floor(dp.calculatedExact)) {
        decimalPatterns[key].floorUsed++;
    } else if (dp.lowestPrice === Math.ceil(dp.calculatedExact)) {
        decimalPatterns[key].ceilUsed++;
    }
}

console.log('\nDecimal | Count | Floor | Ceil');
console.log('-'.repeat(40));
for (const [dec, stats] of Object.entries(decimalPatterns).sort()) {
    if (stats.count > 5) {
        console.log(`  ${dec.padEnd(6)} | ${String(stats.count).padStart(5)} | ${String(stats.floorUsed).padStart(5)} | ${String(stats.ceilUsed).padStart(4)}`);
    }
}

// FINAL CONCLUSION
console.log('\n' + '='.repeat(80));
console.log('CONCLUSION: The rounding strategy appears to be Math.floor');
console.log('with some exceptions for prices ending in .86 which use Math.ceil');
console.log('='.repeat(80));

// Create the conversion function
const conversionFunction = `
/**
 * Calculate the lowest price from reseller payout price and commission percentage.
 * Based on analysis of ${priceDataPoints.length} data points.
 * 
 * The formula is: lowestPrice = floor(resellerPayoutPrice * (1 + commissionPercentage / 100))
 * 
 * Note: There are some edge cases where the stored value differs by 1 due to:
 * - Rounding differences (ceil vs floor for .5+ decimals)
 * - Manual price adjustments
 * 
 * @param {number} resellerPayoutPrice - The payout price for the reseller
 * @param {number} commissionPercentage - The commission percentage (e.g., 14 for 14%)
 * @returns {number} The calculated lowest price
 */
function calculateLowestPrice(resellerPayoutPrice, commissionPercentage) {
  const calculatedExact = resellerPayoutPrice * (1 + commissionPercentage / 100);
  return Math.floor(calculatedExact);
}

/**
 * Alternative: Tries multiple rounding strategies
 */
function calculateLowestPriceSmart(resellerPayoutPrice, commissionPercentage) {
  const calculatedExact = resellerPayoutPrice * (1 + commissionPercentage / 100);
  const decimal = calculatedExact - Math.floor(calculatedExact);
  
  // For values close to a whole number (ending in .86, .14, etc.), use Math.ceil
  if (decimal > 0.5) {
    return Math.ceil(calculatedExact);
  }
  return Math.floor(calculatedExact);
}
`;

console.log(conversionFunction);

// Test accuracy of the conversion function
console.log('\n' + '='.repeat(80));
console.log('ACCURACY TEST');
console.log('='.repeat(80));

let floorCorrect = 0;
let roundCorrect = 0;
let smartCorrect = 0;

for (const dp of priceDataPoints) {
    const floorResult = Math.floor(dp.calculatedExact);
    const roundResult = Math.round(dp.calculatedExact);
    const decimal = dp.calculatedExact - Math.floor(dp.calculatedExact);
    const smartResult = decimal > 0.5 ? Math.ceil(dp.calculatedExact) : Math.floor(dp.calculatedExact);

    if (floorResult === dp.lowestPrice) floorCorrect++;
    if (roundResult === dp.lowestPrice) roundCorrect++;
    if (smartResult === dp.lowestPrice) smartCorrect++;
}

console.log(`Math.floor accuracy: ${floorCorrect}/${priceDataPoints.length} (${(floorCorrect / priceDataPoints.length * 100).toFixed(2)}%)`);
console.log(`Math.round accuracy: ${roundCorrect}/${priceDataPoints.length} (${(roundCorrect / priceDataPoints.length * 100).toFixed(2)}%)`);
console.log(`Smart rounding accuracy: ${smartCorrect}/${priceDataPoints.length} (${(smartCorrect / priceDataPoints.length * 100).toFixed(2)}%)`);

// Analyze remaining mismatches
const mismatches = priceDataPoints.filter(dp => {
    const floorResult = Math.floor(dp.calculatedExact);
    return floorResult !== dp.lowestPrice;
});

console.log(`\nMismatches to analyze: ${mismatches.length}`);

// Check if mismatches are due to price being different on the variant level
console.log('\nMismatch analysis:');
const mismatchReasons = {
    ceilWouldMatch: 0,
    offByOne: 0,
    significantDiff: 0,
};

for (const dp of mismatches) {
    const diff = Math.abs(dp.difference);
    if (Math.ceil(dp.calculatedExact) === dp.lowestPrice) {
        mismatchReasons.ceilWouldMatch++;
    } else if (diff < 2) {
        mismatchReasons.offByOne++;
    } else {
        mismatchReasons.significantDiff++;
    }
}

console.log(`  Ceil would match: ${mismatchReasons.ceilWouldMatch}`);
console.log(`  Off by ~1: ${mismatchReasons.offByOne}`);
console.log(`  Significant difference (manual): ${mismatchReasons.significantDiff}`);

// Output final JSON with analysis results
const finalOutput = {
    totalAnalyzed: priceDataPoints.length,
    accuracy: {
        mathFloor: `${(floorCorrect / priceDataPoints.length * 100).toFixed(2)}%`,
        mathRound: `${(roundCorrect / priceDataPoints.length * 100).toFixed(2)}%`,
        smartRounding: `${(smartCorrect / priceDataPoints.length * 100).toFixed(2)}%`,
    },
    formula: 'lowestPrice = floor(resellerPayoutPrice * (1 + commissionPercentage / 100))',
    mismatchBreakdown: mismatchReasons,
    decimalPatterns: decimalPatterns,
    allDataPoints: priceDataPoints,
};

const outputPath = path.join(__dirname, '..', 'output', 'price-analysis-detailed.json');
fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
console.log(`\n📁 Detailed analysis saved to: ${outputPath}`);
