-- Migration: Add target_graduation_year to drives table
-- Run this on existing databases. For fresh installs, schema.sql already includes this column.

ALTER TABLE drives
ADD COLUMN target_graduation_year INT NULL DEFAULT NULL
COMMENT 'Batch year this drive targets, e.g. 2026. NULL means open to all batches.';

-- Add index for efficient filtering by batch year
ALTER TABLE drives
ADD INDEX idx_target_grad_year (target_graduation_year);
