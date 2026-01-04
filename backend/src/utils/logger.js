/**
 * File Logger
 * Appends logs to logs/sync.log
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'sync.log');

// Ensure log dir exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logSync(stats) {
    const entry = {
        timestamp: new Date().toISOString(),
        ...stats
    };

    // Format: [ISO] [Platform] Raw:1000 | Ins:10 | Upd:5 | Unc:985 | Time:500ms
    const line = `[${entry.timestamp}] [${entry.platform}] Raw:${entry.total} | Ins:${entry.inserted} | Upd:${entry.updated} | Unc:${entry.unchanged} | Time:${entry.duration}ms\n`;

    // Also save JSON line for parsing? simpler is better for now.
    fs.appendFileSync(LOG_FILE, line);
    console.log('[Logger] Stats saved to logs/sync.log');
}

module.exports = { logSync };
