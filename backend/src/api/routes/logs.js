const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const LOG_DIR = path.join(__dirname, '../../../logs');

function streamFile(filename, req, res) {
    const filePath = path.join(LOG_DIR, filename);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!fs.existsSync(filePath)) {
        res.write(`data: Waiting for logs...\n\n`);
    }

    let currentSize = 0;

    // If file exists, start from end or send last few lines?
    // Let's send last 10KB to give context
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const start = Math.max(0, stats.size - 10000);
        currentSize = stats.size;

        if (start < stats.size) {
            const stream = fs.createReadStream(filePath, { start, end: stats.size });
            stream.on('data', (chunk) => {
                const text = chunk.toString();
                const lines = text.split('\n');
                lines.forEach(line => {
                    if (line.trim()) res.write(`data: ${line}\n\n`);
                });
            });
        }
    }

    const checkInterval = setInterval(() => {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > currentSize) {
                const stream = fs.createReadStream(filePath, {
                    start: currentSize,
                    end: stats.size
                });

                stream.on('data', (chunk) => {
                    const text = chunk.toString();
                    const lines = text.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) res.write(`data: ${line}\n\n`);
                    });
                });

                currentSize = stats.size;
            } else if (stats.size < currentSize) {
                // File truncated
                currentSize = stats.size;
                res.write(`data: [Log Rotated]\n\n`);
            }
        }
    }, 1000);

    req.on('close', () => {
        clearInterval(checkInterval);
        res.end();
    });
}

router.get('/sync', (req, res) => {
    streamFile('sync.log', req, res);
});

router.get('/monitor', (req, res) => {
    streamFile('monitor.log', req, res);
});

module.exports = router;
