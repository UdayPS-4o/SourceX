-- Fix for cfi_1 (payout) spam logs
-- Deletes entries where integer field cfi_1 was logged with decimal precision differences
DELETE FROM custom_field_history 
WHERE field_name = 'cfi_1' 
AND new_value LIKE '%.%';
