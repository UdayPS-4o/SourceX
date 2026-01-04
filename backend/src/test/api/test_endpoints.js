const http = require('http');

const BASE_URL = 'http://localhost:3000';

const endpoints = [
    { name: 'Health Check', path: '/health', expectText: true },
    { name: 'Dashboard Stats', path: '/api/dashboard/stats' },
    { name: 'Dashboard Platforms', path: '/api/dashboard/platforms' },
    { name: 'Dashboard Logs', path: '/api/dashboard/logs?limit=5' },
    { name: 'Listings (Page 1)', path: '/api/listings?page=1&limit=10' },
    // Removed specific history check for now as we need a valid ID, relying on logs to prove data access
];

async function runTests() {
    console.log('Starting API Tests...\n');
    let failures = 0;

    for (const ep of endpoints) {
        process.stdout.write(`Testing ${ep.name} (${ep.path})... `);
        try {
            const result = await fetchEndpoint(ep.path);
            if (result.status >= 200 && result.status < 300) {
                if (ep.expectText) {
                    // Health check returns plain text
                    console.log('✅ OK');
                } else {
                    // JSON check
                    try {
                        JSON.parse(result.body);
                        console.log('✅ OK');
                    } catch (e) {
                        console.log('❌ Invalid JSON');
                        failures++;
                    }
                }
            } else {
                console.log(`❌ Failed (Status: ${result.status})`);
                console.log('   Response:', result.body.substring(0, 200));
                failures++;
            }
        } catch (err) {
            console.log(`❌ Error: ${err.message}`);
            failures++;
        }
    }

    // Check Listings Structure specifically
    console.log('\nChecking Listings Data Structure...');
    try {
        const listings = JSON.parse((await fetchEndpoint('/api/listings?page=1&limit=1')).body);
        if (listings.data && Array.isArray(listings.data)) {
            console.log('✅ Data array present');
            if (listings.data.length > 0) {
                const item = listings.data[0];
                const platformName = item.platform ? item.platform.name : 'MISSING';
                console.log(`ℹ️ Sample Listing Platform: ${platformName}`);
                if (item.platform && item.platform.name) {
                    console.log('✅ Platform relation loaded');
                } else {
                    console.log('❌ Platform relation MISSING (Backend Fix Needed?)');
                    failures++;
                }
            } else {
                console.log('ℹ️ No listings to verify structure');
            }
        } else {
            console.log('❌ Invalid Listings Response Structure');
            failures++;
        }
    } catch (e) {
        console.log('❌ Listings Check Failed:', e.message);
        failures++;
    }

    console.log(`\nTests Completed. Failures: ${failures}`);
    if (failures > 0) process.exit(1);
}

function fetchEndpoint(path) {
    return new Promise((resolve, reject) => {
        http.get(BASE_URL + path, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
    });
}

runTests();
