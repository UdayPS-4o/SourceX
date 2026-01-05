/**
 * Express Application Setup
 */

const express = require('express');
const cors = require('cors');
const listingsRouter = require('./routes/listings');
const dashboardRouter = require('./routes/dashboard');

// Fix BigInt serialization for JSON
BigInt.prototype.toJSON = function () { return this.toString() };

const app = express();

app.use(cors());
app.use(express.json());

const logsRouter = require('./routes/logs');

// Routes
app.use('/api/listings', listingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/logs', logsRouter);

app.get('/health', (req, res) => res.send('OK'));

function startServer(port) {
    app.listen(port, () => {
        console.log(`[API] Server running on http://localhost:${port}`);
    });
}

module.exports = {
    app,
    startServer
};
