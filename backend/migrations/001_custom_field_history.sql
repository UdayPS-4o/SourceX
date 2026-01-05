-- Migration: Add custom_field_history table
-- Purpose: Track changes in cfb_1 (isLowest boolean) and cfi_1 (payout price)

-- 6. Custom Field History Table
-- Tracks changes to custom fields like isLowest (cfb_1) and payout (cfi_1)
CREATE TABLE IF NOT EXISTS custom_field_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    
    -- Field identification
    field_name VARCHAR(50) NOT NULL,        -- 'cfb_1' or 'cfi_1' etc.
    field_type ENUM('boolean', 'integer', 'text') NOT NULL,
    
    -- Change values (stored as text for flexibility)
    old_value VARCHAR(255),                 -- Previous value (NULL for initial)
    new_value VARCHAR(255) NOT NULL,        -- New value
    
    -- For boolean fields, easy querying
    is_boolean_toggle BOOLEAN DEFAULT FALSE, -- True if this is a true<->false change
    
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    
    -- Indexes for efficient queries
    INDEX idx_field_timeline (listing_id, field_name, recorded_at),
    INDEX idx_field_name (field_name),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB;

-- Summary of tracked fields:
-- cfb_1 (isLowest): Boolean - Track when listing becomes/stops being lowest
-- cfi_1 (payout):   Integer - Track payout price changes
