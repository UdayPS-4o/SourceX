# SourceX Inventory Bot

A robust Node.js client for the SourceX/Culture Circle API with automatic authentication, token refresh, and parallel data fetching.

## Features

- 🔐 **Auto Login** - Credentials hardcoded, just run and go
- 🔄 **Auto Token Refresh** - Handles expired tokens automatically
- 💾 **Credential Storage** - Saves session to avoid re-login
- 📦 **Parallel Fetching** - Uses `Promise.all` for O(1) time complexity
- 🎯 **Simple API** - Just call `fetchAll()` and you're done

## Quick Start

```bash
# Run the bot
node run.js

# Or use npm
npm start
```

That's it! The bot will:
1. Auto-login (or use saved credentials)
2. Fetch all inventory items
3. Fetch lowest & not lowest prices in parallel
4. Save everything to `output/inventory-data.json`

## Project Structure

```
sourcex_bot/
├── src/
│   ├── config/          # Configuration & credentials
│   ├── graphql/         # GraphQL queries
│   ├── services/        # Business logic
│   │   ├── auth.js      # Authentication handling
│   │   ├── api.js       # API request handler
│   │   └── inventory.js # Inventory operations
│   ├── utils/           # Utility functions
│   │   ├── storage.js   # File I/O
│   │   └── token.js     # JWT helpers
│   └── index.js         # Main entry point
├── data/                # Credentials storage (gitignored)
├── output/              # Output data (gitignored)
├── run.js               # Runner script
└── package.json
```

## API Usage

### Simple Usage

```javascript
const sourcex = require('./src');

// Fetch everything and save
const data = await sourcex.fetchAndSave();
```

### Individual Methods

```javascript
const sourcex = require('./src');

// Initialize (optional - called automatically)
await sourcex.init();

// Get user info
const user = await sourcex.getUser();

// Fetch all inventory
const inventory = await sourcex.fetchInventory();

// Fetch lowest price items
const lowest = await sourcex.fetchLowest();

// Fetch not lowest price items
const notLowest = await sourcex.fetchNotLowest();

// Fetch both in parallel (O(1) time!)
const { lowest, notLowest } = await sourcex.fetchLowestAndNotLowest();

// Fetch everything
const allData = await sourcex.fetchAll();
```

### With Custom Filters

```javascript
const inventory = await sourcex.fetchInventory({
    isSold: { exact: false },
    isListed: { exact: true },
    isConsigned: { exact: false }
});
```

## Configuration

Edit `src/config/index.js` to change:

- **Credentials** - Email and password
- **Page Size** - Items per page (default: 100)
- **Token Buffer** - Time before token refresh (default: 5 min)

## Output Format

```json
{
  "inventory": [...],
  "lowest": [...],
  "notLowest": [...],
  "summary": {
    "totalInventory": 1401,
    "totalLowest": 245,
    "totalNotLowest": 156,
    "fetchedAt": "2026-01-03T13:30:00.000Z",
    "fetchDurationMs": 3500
  }
}
```

## Requirements

- Node.js >= 18.0.0 (for native fetch)

## Security

- Credentials stored in `data/credentials.json` (gitignored)
- Never commit credentials to version control
- Consider using environment variables for production
