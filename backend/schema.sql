-- MySQL database name:u363665699_monitors
-- MySQL username:u363665699_monitors
-- Password: $Ik&9b>YbHw8

-- Our MySQL server hostname is: srv1403.hstgr.io or you can use this IP as your hostname: 193.203.184.85


-- 1. Create the Database
CREATE DATABASE IF NOT EXISTS ecommerce_monitor;
USE ecommerce_monitor;

-- 2. Platforms Table
-- Tracks global sync status so you don't have to update 10k products every minute.
CREATE TABLE platforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,      -- 'Amazon', 'Flipkart', 'Myntra'
    base_url VARCHAR(255),
    last_sync_start DATETIME,              -- The moment the 1-minute scrape began
    last_sync_end DATETIME,                -- The moment the 1-minute scrape finished
    sync_status ENUM('idle', 'running', 'failed') DEFAULT 'idle'
) ENGINE=InnoDB;

-- 3. Listings Table (The Latest Snapshot)
-- Stores the current state of every product/variant.
CREATE TABLE listings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    platform_id INT NOT NULL,
    
    -- Identification
    product_sku VARCHAR(100) NOT NULL,     -- ASIN / FSN / Product ID
    variant_id VARCHAR(100),               -- Specific ID for color/size combo
    product_name VARCHAR(255) NOT NULL,
    img_url TEXT,
    size VARCHAR(50),
    
    -- Current State
    current_price DECIMAL(10, 2),
    current_stock INT,
    
    -- Custom Fields (Requested cfb, cft, cfi)
    cfb_1 BOOLEAN DEFAULT FALSE,           -- cfb: Is Lowest Price Ever (True/False)
    cft_1 VARCHAR(255),                    -- cft1: Custom Text (e.g., Brand)
    cft_2 VARCHAR(255),                    -- cft2: Custom Text (e.g., Seller Name)
    cft_3 VARCHAR(255),                    -- cft3: Custom Text (e.g., Category)
    cfi_1 INT,                             -- cfi1: Custom Integer (e.g., Review Count)
    cfi_2 INT,                             -- cfi2: Custom Integer (e.g., Rating out of 100)
    cfi_3 INT,                             -- cfi3: Custom Integer (e.g., Discount %)
    
    -- Time Tracking
    last_event_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Updated only when price/stock changes
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (platform_id) REFERENCES platforms(id),
    -- Ensures no duplicate monitoring for the same variant on the same site
    UNIQUE KEY unique_listing_idx (platform_id, product_sku, variant_id),
    -- Index for fast filtering by price and custom flags
    INDEX idx_price (current_price),
    INDEX idx_is_lowest (cfb_1)
) ENGINE=InnoDB;

-- 4. Price History Table (The Events)
-- We only INSERT here when a price change is detected by the scraper.
CREATE TABLE price_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    -- Index for time-series graphing
    INDEX idx_listing_timeline (listing_id, recorded_at)
) ENGINE=InnoDB;

-- 5. Inventory History Table (The Events)
-- Tracks stock changes to detect "Items Sold".
CREATE TABLE inventory_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    stock INT NOT NULL,
    change_type ENUM('sold', 'restock', 'correction', 'initial') DEFAULT 'initial',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    INDEX idx_inventory_timeline (listing_id, recorded_at)
) ENGINE=InnoDB;
