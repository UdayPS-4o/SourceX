/**
 * Price Analysis Script
 * Analyzes the relationship between lowestPrice, resellerPayoutPrice, and commissionPercentage
 * to determine the rounding strategy used.
 */

const fs = require('fs');
const path = require('path');

// Read the inventory data
const inventoryPath = path.join(__dirname, '..', 'output', 'inventory-data.json');
const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

// Focus on the 'lowest' array since these have the matching prices
const lowestItems = data.lowest || [];
const inventoryItems = data.inventory || [];

console.log(`\n📊 Analyzing ${lowestItems.length} items from 'lowest' array...\n`);

// Collect all price data points
const priceDataPoints = [];

// Process lowest items (they should have matching prices)
for (const item of lowestItems) {
    const lowestPrice = item.variant?.lowestPrice;
    const platformListings = item.platformListings?.edges || [];

    // Find the culturecircle listing (14% commission) as the primary reference
    const cultureCircleListing = platformListings.find(
        edge => edge.node?.marketplace?.title === 'culturecircle'
    );

    if (cultureCircleListing && lowestPrice) {
        const resellerPayoutPrice = cultureCircleListing.node.resellerPayoutPrice;
        const commissionPercentage = cultureCircleListing.node.marketplace.commissionPercentage;

        // Calculate expected price
        const calculatedPrice = resellerPayoutPrice * (1 + commissionPercentage / 100);
        const difference = lowestPrice - calculatedPrice;

        priceDataPoints.push({
            productTitle: item.variant?.product?.title?.substring(0, 50),
            variantTitle: item.variant?.title,
            lowestPrice,
            resellerPayoutPrice,
            commissionPercentage,
            calculatedExact: calculatedPrice,
            difference: difference,
            roundedFloor: Math.floor(calculatedPrice),
            roundedCeil: Math.ceil(calculatedPrice),
            roundedMath: Math.round(calculatedPrice),
        });
    }
}

console.log(`Found ${priceDataPoints.length} data points with culturecircle listings\n`);

// Analyze rounding patterns
let floorMatches = 0;
let ceilMatches = 0;
let mathRoundMatches = 0;
let exactMatches = 0;
let noMatch = [];

for (const dp of priceDataPoints) {
    if (dp.lowestPrice === dp.calculatedExact) exactMatches++;
    else if (dp.lowestPrice === dp.roundedFloor) floorMatches++;
    else if (dp.lowestPrice === dp.roundedCeil) ceilMatches++;
    else if (dp.lowestPrice === dp.roundedMath) mathRoundMatches++;
    else {
        noMatch.push(dp);
    }
}

console.log('='.repeat(80));
console.log('ROUNDING ANALYSIS RESULTS');
console.log('='.repeat(80));
console.log(`\n✅ Exact matches (no rounding needed): ${exactMatches}`);
console.log(`📉 Floor matches (Math.floor): ${floorMatches}`);
console.log(`📈 Ceil matches (Math.ceil): ${ceilMatches}`);
console.log(`🔄 Math.round matches: ${mathRoundMatches}`);
console.log(`❌ No standard rounding match: ${noMatch.length}`);

// Show sample of no-match cases
if (noMatch.length > 0) {
    console.log('\n--- Sample of non-matching cases ---');
    noMatch.slice(0, 10).forEach((dp, idx) => {
        console.log(`\n[${idx + 1}] ${dp.productTitle} (${dp.variantTitle})`);
        console.log(`    lowestPrice: ${dp.lowestPrice}`);
        console.log(`    resellerPayoutPrice: ${dp.resellerPayoutPrice}`);
        console.log(`    commissionPercentage: ${dp.commissionPercentage}%`);
        console.log(`    calculated: ${dp.calculatedExact.toFixed(4)}`);
        console.log(`    difference: ${dp.difference.toFixed(4)}`);
        console.log(`    floor: ${dp.roundedFloor}, ceil: ${dp.roundedCeil}, round: ${dp.roundedMath}`);
    });
}

// Analyze price ranges to find rounding patterns
console.log('\n' + '='.repeat(80));
console.log('PRICE RANGE ANALYSIS');
console.log('='.repeat(80));

const priceRanges = {
    '0-5000': { items: [], floor: 0, ceil: 0, round: 0, other: 0 },
    '5000-10000': { items: [], floor: 0, ceil: 0, round: 0, other: 0 },
    '10000-15000': { items: [], floor: 0, ceil: 0, round: 0, other: 0 },
    '15000-20000': { items: [], floor: 0, ceil: 0, round: 0, other: 0 },
    '20000-30000': { items: [], floor: 0, ceil: 0, round: 0, other: 0 },
    '30000-50000': { items: [], floor: 0, ceil: 0, round: 0, other: 0 },
    '50000+': { items: [], floor: 0, ceil: 0, round: 0, other: 0 },
};

function getRangeKey(price) {
    if (price < 5000) return '0-5000';
    if (price < 10000) return '5000-10000';
    if (price < 15000) return '10000-15000';
    if (price < 20000) return '15000-20000';
    if (price < 30000) return '20000-30000';
    if (price < 50000) return '30000-50000';
    return '50000+';
}

for (const dp of priceDataPoints) {
    const rangeKey = getRangeKey(dp.lowestPrice);
    priceRanges[rangeKey].items.push(dp);

    if (dp.lowestPrice === dp.calculatedExact || dp.lowestPrice === dp.roundedFloor) {
        priceRanges[rangeKey].floor++;
    } else if (dp.lowestPrice === dp.roundedCeil) {
        priceRanges[rangeKey].ceil++;
    } else if (dp.lowestPrice === dp.roundedMath) {
        priceRanges[rangeKey].round++;
    } else {
        priceRanges[rangeKey].other++;
    }
}

console.log('\nPrice Range | Count | Floor | Ceil | Round | Other');
console.log('-'.repeat(60));
for (const [range, stats] of Object.entries(priceRanges)) {
    if (stats.items.length > 0) {
        console.log(`${range.padEnd(12)} | ${String(stats.items.length).padStart(5)} | ${String(stats.floor).padStart(5)} | ${String(stats.ceil).padStart(4)} | ${String(stats.round).padStart(5)} | ${String(stats.other).padStart(5)}`);
    }
}

// Check if there's a custom rounding to nearest X
console.log('\n' + '='.repeat(80));
console.log('CUSTOM ROUNDING DETECTION');
console.log('='.repeat(80));

// Check rounding to nearest 1, 5, 10, 50, 100
const roundings = [1, 5, 10, 50, 100];
for (const roundTo of roundings) {
    let matches = 0;
    for (const dp of priceDataPoints) {
        const customRounded = Math.round(dp.calculatedExact / roundTo) * roundTo;
        if (dp.lowestPrice === customRounded) matches++;
    }
    console.log(`Rounding to nearest ${roundTo}: ${matches}/${priceDataPoints.length} matches (${(matches / priceDataPoints.length * 100).toFixed(1)}%)`);
}

// Also check floor-based rounding
console.log('\n--- Floor-based rounding ---');
for (const roundTo of roundings) {
    let matches = 0;
    for (const dp of priceDataPoints) {
        const customRounded = Math.floor(dp.calculatedExact / roundTo) * roundTo;
        if (dp.lowestPrice === customRounded) matches++;
    }
    console.log(`Floor to nearest ${roundTo}: ${matches}/${priceDataPoints.length} matches (${(matches / priceDataPoints.length * 100).toFixed(1)}%)`);
}

// Also check ceil-based rounding
console.log('\n--- Ceil-based rounding ---');
for (const roundTo of roundings) {
    let matches = 0;
    for (const dp of priceDataPoints) {
        const customRounded = Math.ceil(dp.calculatedExact / roundTo) * roundTo;
        if (dp.lowestPrice === customRounded) matches++;
    }
    console.log(`Ceil to nearest ${roundTo}: ${matches}/${priceDataPoints.length} matches (${(matches / priceDataPoints.length * 100).toFixed(1)}%)`);
}

// Output the results as JSON
const output = {
    summary: {
        totalDataPoints: priceDataPoints.length,
        exactMatches,
        floorMatches,
        ceilMatches,
        mathRoundMatches,
        noMatchCount: noMatch.length,
    },
    priceRangeAnalysis: Object.fromEntries(
        Object.entries(priceRanges).map(([range, stats]) => [
            range,
            {
                count: stats.items.length,
                floorMatches: stats.floor,
                ceilMatches: stats.ceil,
                roundMatches: stats.round,
                otherMatches: stats.other,
            }
        ])
    ),
    sampleNoMatchCases: noMatch.slice(0, 20),
    allDataPoints: priceDataPoints.slice(0, 100), // First 100 for debugging
};

// Save output
const outputPath = path.join(__dirname, '..', 'output', 'price-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n\n📁 Full analysis saved to: ${outputPath}`);
