-- Migration 002: Add per-link background and text color customization fields
-- Safe and idempotent across MySQL 5.7, 8.0, and MariaDB

SET @dbname = DATABASE();
SET @tablename = 'links';

-- 1. Add background_color column if it does not already exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'background_color'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE links ADD COLUMN background_color VARCHAR(50) NULL AFTER custom_label'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add text_color column if it does not already exist
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'text_color'
  ) > 0,
  'SELECT 1',
  'ALTER TABLE links ADD COLUMN text_color VARCHAR(50) NULL AFTER background_color'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
