/**
 * File Logger
 * Appends logs to logs/sync.log and logs/monitor.log
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const SYNC_LOG_FILE = path.join(LOG_DIR, 'sync.log');
const MONITOR_LOG_FILE = path.join(LOG_DIR, 'monitor.log');

// Ensure log dir exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logSync(stats) {
    const entry = {
        timestamp: new Date().toISOString(),
        ...stats
    };

    let line = `[${entry.timestamp}] [${entry.platform}] Raw:${entry.total} | Ins:${entry.inserted} | Upd:${entry.updated} | Unc:${entry.unchanged} | Time:${entry.duration}ms`;

    if (entry.warning) {
        line += ` | ⚠️ ${entry.warning}`;
    }
    line += '\n';

    // Also save JSON line for parsing? simpler is better for now.
    fs.appendFileSync(SYNC_LOG_FILE, line);
    console.log('[Logger] Stats saved to logs/sync.log');
}

/**
 * Log a monitor event to both console and monitor.log
 * @param {string} message - The message to log
 * @param {'info'|'success'|'warning'|'error'} type - The type of log message
 */
function logMonitor(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const timeLocal = new Date().toLocaleTimeString();

    // Type emoji mapping
    const typeEmoji = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        cycle: '➤',
        undercut: '🔄',
        price: '💰'
    };

    const emoji = typeEmoji[type] || '';
    const logLine = `[${timestamp}] ${emoji} ${message}\n`;

    // Write to file
    fs.appendFileSync(MONITOR_LOG_FILE, logLine);

    // Also console.log with local time
    console.log(`[${timeLocal}] ${emoji} ${message}`);
}

/**
 * Clear monitor log (useful on restart)
 */
function clearMonitorLog() {
    fs.writeFileSync(MONITOR_LOG_FILE, '');
}

module.exports = { logSync, logMonitor, clearMonitorLog };
