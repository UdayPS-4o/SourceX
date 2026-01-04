/**
 * Drizzle ORM Schema
 * All database table definitions
 */

import {
    mysqlTable,
    bigint,
    int,
    varchar,
    text,
    decimal,
    boolean,
    timestamp,
    datetime,
    mysqlEnum,
    json,
    uniqueIndex,
    index,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ============================================
// PLATFORMS TABLE
// ============================================
export const platforms = mysqlTable('platforms', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    baseUrl: varchar('base_url', { length: 255 }),
    lastSyncStart: datetime('last_sync_start'),
    lastSyncEnd: datetime('last_sync_end'),
    syncStatus: mysqlEnum('sync_status', ['idle', 'running', 'failed']).default('idle'),
});

// ============================================
// LISTINGS TABLE
// ============================================
export const listings = mysqlTable('listings', {
    // Using explicit BigInt ID (decoded from SourceX base64)
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    platformId: int('platform_id').notNull().references(() => platforms.id),

    // Identification
    productSku: varchar('product_sku', { length: 100 }).notNull(),
    variantId: varchar('variant_id', { length: 100 }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    imgUrl: text('img_url'),
    size: varchar('size', { length: 50 }),

    // Current State
    currentPrice: decimal('current_price', { precision: 10, scale: 2 }),
    currentStock: int('current_stock'),

    // Custom Fields
    cfb1: boolean('cfb_1').default(false),          // Is Lowest Price
    cft1: varchar('cft_1', { length: 255 }),         // Brand
    cft2: varchar('cft_2', { length: 255 }),         // Seller/Category
    cft3: varchar('cft_3', { length: 255 }),         // Extra text
    cfi1: int('cfi_1'),                              // Reseller Payout Price
    cfi2: int('cfi_2'),                              // Commission Percentage (x100)
    cfi3: int('cfi_3'),                              // Extra int

    // Time Tracking
    lastEventAt: timestamp('last_event_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
    listingIdx: index('idx_listing').on(table.platformId, table.productSku, table.variantId),
    priceIdx: index('idx_price').on(table.currentPrice),
    isLowestIdx: index('idx_is_lowest').on(table.cfb1),
}));

// ============================================
// PRICE HISTORY TABLE
// ============================================
export const priceHistory = mysqlTable('price_history', {
    id: bigint('id', { mode: 'bigint' }).primaryKey().autoincrement(),
    listingId: bigint('listing_id', { mode: 'bigint' }).notNull().references(() => listings.id),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    recordedAt: timestamp('recorded_at').defaultNow(),
}, (table) => ({
    listingTimelineIdx: index('idx_listing_timeline').on(table.listingId, table.recordedAt),
}));

// ============================================
// INVENTORY HISTORY TABLE
// ============================================
export const inventoryHistory = mysqlTable('inventory_history', {
    id: bigint('id', { mode: 'bigint' }).primaryKey().autoincrement(),
    listingId: bigint('listing_id', { mode: 'bigint' }).notNull().references(() => listings.id),
    stock: int('stock').notNull(),
    changeType: mysqlEnum('change_type', ['sold', 'restock', 'correction', 'initial']).default('initial'),
    recordedAt: timestamp('recorded_at').defaultNow(),
}, (table) => ({
    inventoryTimelineIdx: index('idx_inventory_timeline').on(table.listingId, table.recordedAt),
}));

// ============================================
// WORKER CONFIGS TABLE (NEW)
// ============================================
export const workerConfigs = mysqlTable('worker_configs', {
    id: int('id').primaryKey().autoincrement(),
    platformId: int('platform_id').notNull().references(() => platforms.id),
    method: varchar('method', { length: 100 }).notNull(),
    scrapeDurationMs: int('scrape_duration_ms').default(40000),
    delayBetweenRunsMs: int('delay_between_runs_ms').default(60000),
    isEnabled: boolean('is_enabled').default(true),
    lastRunAt: datetime('last_run_at'),
    nextRunAt: datetime('next_run_at'),
    configJson: json('config_json'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ============================================
// RELATIONS
// ============================================
export const platformsRelations = relations(platforms, ({ many }) => ({
    listings: many(listings),
    workerConfigs: many(workerConfigs),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
    platform: one(platforms, {
        fields: [listings.platformId],
        references: [platforms.id],
    }),
    priceHistory: many(priceHistory),
    inventoryHistory: many(inventoryHistory),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
    listing: one(listings, {
        fields: [priceHistory.listingId],
        references: [listings.id],
    }),
}));

export const inventoryHistoryRelations = relations(inventoryHistory, ({ one }) => ({
    listing: one(listings, {
        fields: [inventoryHistory.listingId],
        references: [listings.id],
    }),
}));

export const workerConfigsRelations = relations(workerConfigs, ({ one }) => ({
    platform: one(platforms, {
        fields: [workerConfigs.platformId],
        references: [platforms.id],
    }),
}));

// ============================================
// TYPES
// ============================================
export type Platform = typeof platforms.$inferSelect;
export type PlatformInsert = typeof platforms.$inferInsert;

export type Listing = typeof listings.$inferSelect;
export type ListingInsert = typeof listings.$inferInsert;

export type PriceHistory = typeof priceHistory.$inferSelect;
export type PriceHistoryInsert = typeof priceHistory.$inferInsert;

export type InventoryHistory = typeof inventoryHistory.$inferSelect;
export type InventoryHistoryInsert = typeof inventoryHistory.$inferInsert;

export type WorkerConfig = typeof workerConfigs.$inferSelect;
export type WorkerConfigInsert = typeof workerConfigs.$inferInsert;
