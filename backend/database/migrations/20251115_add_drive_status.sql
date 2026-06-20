-- Migration: Add drive status workflow columns
-- Date: 2025-11-15
-- Safe migration that checks for existing columns before adding

SET @db = DATABASE();

-- 1) Add 'status' column if missing
SELECT COUNT(*) INTO @c
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'drives' AND COLUMN_NAME = 'status';

SELECT @c AS status_exists;
SET @sql = IF(@c = 0,
  "ALTER TABLE drives ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER rounds;",
  "SELECT 'status_already_exists' AS msg;"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Add 'rejection_reason' column if missing
SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'drives' AND COLUMN_NAME = 'rejection_reason';

SET @sql = IF(@c = 0,
  "ALTER TABLE drives ADD COLUMN rejection_reason TEXT NULL AFTER status;",
  "SELECT 'rejection_reason_already_exists' AS msg;"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Add 'approved_by_admin_id' column if missing
SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'drives' AND COLUMN_NAME = 'approved_by_admin_id';

SET @sql = IF(@c = 0,
  "ALTER TABLE drives ADD COLUMN approved_by_admin_id INT NULL AFTER rejection_reason;",
  "SELECT 'approved_by_admin_id_already_exists' AS msg;"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Add 'approved_at' column if missing
SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'drives' AND COLUMN_NAME = 'approved_at';

SET @sql = IF(@c = 0,
  "ALTER TABLE drives ADD COLUMN approved_at DATETIME NULL AFTER approved_by_admin_id;",
  "SELECT 'approved_at_already_exists' AS msg;"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) Add FK to admins.id only if admins table exists and FK not already present
SELECT COUNT(*) INTO @tbl FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'admins';

SELECT COUNT(*) INTO @fk FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'drives' AND CONSTRAINT_NAME = 'fk_drives_approved_admin';

SET @sql = IF(@tbl > 0 AND @fk = 0,
  "ALTER TABLE drives ADD CONSTRAINT fk_drives_approved_admin FOREIGN KEY (approved_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL ON UPDATE CASCADE;",
  "SELECT 'fk_exists_or_no_admins' AS msg;"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) Backfill status from legacy is_approved flag if it exists
SELECT COUNT(*) INTO @legacy_col FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'drives' AND COLUMN_NAME = 'is_approved';

SET @backfill_sql = IF(@legacy_col > 0,
  'UPDATE drives SET status = CASE WHEN is_approved = TRUE THEN "approved" WHEN is_approved = FALSE THEN "pending" ELSE "pending" END WHERE status IS NULL OR status = "";',
  'SELECT 1;'
);
PREPARE backfill_stmt FROM @backfill_sql;
EXECUTE backfill_stmt;
DEALLOCATE PREPARE backfill_stmt;

-- 7) Show final columns as confirmation
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'drives'
AND COLUMN_NAME IN ('status','rejection_reason','approved_by_admin_id','approved_at');

-- Down Migration (rollback script - uncomment to run manually)
-- ALTER TABLE drives
--   DROP FOREIGN KEY IF EXISTS fk_drives_approved_admin,
--   DROP COLUMN IF EXISTS approved_at,
--   DROP COLUMN IF EXISTS approved_by_admin_id,
--   DROP COLUMN IF EXISTS rejection_reason,
--   DROP COLUMN IF EXISTS status;
