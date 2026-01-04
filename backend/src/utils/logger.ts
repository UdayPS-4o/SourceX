/**
 * Simple Logger Utility
 */

const COLORS = {
    DEBUG: '\x1b[36m',  // Cyan
    INFO: '\x1b[32m',   // Green
    WARN: '\x1b[33m',   // Yellow
    ERROR: '\x1b[31m',  // Red
    RESET: '\x1b[0m',
} as const;

function formatTimestamp() {
    return new Date().toISOString();
}

function log(level: keyof typeof COLORS, context: string, message: string, data?: any) {
    const timestamp = formatTimestamp();
    const color = COLORS[level];
    const reset = COLORS.RESET;

    let output = `${color}[${timestamp}] [${level}] [${context}]${reset} ${message}`;

    if (data !== undefined) {
        if (typeof data === 'object') {
            output += ` ${JSON.stringify(data, null, 2)}`;
        } else {
            output += ` ${data}`;
        }
    }

    console.log(output);
}

// ... existing code ...

export const logger = {
    debug: (context: string, message: string, data?: any) => log('DEBUG', context, message, data),
    info: (context: string, message: string, data?: any) => log('INFO', context, message, data),
    warn: (context: string, message: string, data?: any) => log('WARN', context, message, data),
    error: (context: string, message: string, data?: any) => log('ERROR', context, message, data),
};

