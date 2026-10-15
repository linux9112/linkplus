import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { pool } from './pool.js';

export interface DatabaseConnectionResult {
  ok: boolean;
  error?: string;
  code?: string;
}

function extractErrorInfo(err: unknown): { code: string; message: string } {
  const errorObj = err as { code?: string; message?: string; errors?: Error[] };
  const code = errorObj?.code || 'UNKNOWN';
  let message = errorObj?.message;
  if (errorObj?.errors && Array.isArray(errorObj.errors) && errorObj.errors.length > 0) {
    message = errorObj.errors.map((e) => e.message).join('; ');
  }
  if (!message || message.trim() === '') {
    message = String(err);
  }
  return { code, message };
}

/**
 * Formats a comprehensive troubleshooting guide when MySQL is unreachable.
 */
export function formatTroubleshootingGuide(err: unknown): string {
  const { code, message } = extractErrorInfo(err);

  const lines = [
    '='.repeat(72),
    '🚨 DATABASE CONNECTION ERROR - MySQL IS UNREACHABLE',
    '='.repeat(72),
    `Error Code   : ${code}`,
    `Error Message: ${message}`,
    `Target Host  : ${env.DB_HOST}:${env.DB_PORT}`,
    `Database     : ${env.DB_NAME}`,
    `User         : ${env.DB_USER}`,
    '',
    '📋 TROUBLESHOOTING GUIDE:',
    '1. Check that the MySQL server service is running:',
    '   - Windows: Run `Start-Service MySQL` in PowerShell or open services.msc',
    '   - Linux / macOS: Run `sudo systemctl status mysql` or `brew services list`',
    '   - Docker: Run `docker ps` to verify the MySQL container is active',
    '',
    '2. Ensure the database exists on the target server:',
    `   mysql -h ${env.DB_HOST} -P ${env.DB_PORT} -u ${env.DB_USER} -p -e "CREATE DATABASE IF NOT EXISTS \\\`${env.DB_NAME}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`,
    '',
    '3. Verify credentials in your .env file:',
    '   Check DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD.',
    '',
    '4. For Hostinger or remote hosting environments:',
    '   Ensure your client IP is whitelisted under "Remote MySQL" in cPanel / hPanel.',
    '',
    '5. Apply migrations once MySQL is accessible:',
    '   Run: npm run db:migrate',
    '',
    '⚠️ INTEGRITY POLICY NOTICE: LinkPulse strictly operates with real persistence.',
    '   The application will NOT silently fall back to fake in-memory data or localStorage.',
    '='.repeat(72),
  ];

  return lines.join('\n');
}

/**
 * Automatically applies non-destructive schema migrations (such as adding per-link appearance columns).
 * Idempotent and compatible across MariaDB 10/11 and MySQL 5.7/8.0.
 */
export async function autoMigrateDatabase(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    try {
      // 1. Add background_color column if not exists
      try {
        await connection.query(`
          ALTER TABLE links 
          ADD COLUMN IF NOT EXISTS background_color VARCHAR(50) NULL AFTER custom_label
        `);
      } catch {
        const [cols]: any = await connection.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'links' AND COLUMN_NAME = 'background_color'"
        );
        if (!cols || cols.length === 0) {
          await connection.query('ALTER TABLE links ADD COLUMN background_color VARCHAR(50) NULL');
        }
      }

      // 2. Add text_color column if not exists
      try {
        await connection.query(`
          ALTER TABLE links 
          ADD COLUMN IF NOT EXISTS text_color VARCHAR(50) NULL AFTER background_color
        `);
      } catch {
        const [cols]: any = await connection.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'links' AND COLUMN_NAME = 'text_color'"
        );
        if (!cols || cols.length === 0) {
          await connection.query('ALTER TABLE links ADD COLUMN text_color VARCHAR(50) NULL');
        }
      }

      // 3. Create badge_types table if not exists
      await connection.query(`
        CREATE TABLE IF NOT EXISTS badge_types (
          id VARCHAR(50) NOT NULL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          public_label VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          icon VARCHAR(50) NOT NULL,
          color VARCHAR(20) NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX idx_badge_types_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 4. Create user_badges table if not exists
      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_badges (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          badge_type_id VARCHAR(50) NOT NULL,
          awarded_by VARCHAR(36) NOT NULL,
          awarded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          expires_at DATETIME(3) NULL,
          internal_note TEXT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          revoked_by VARCHAR(36) NULL,
          revoked_at DATETIME(3) NULL,
          revocation_reason TEXT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX idx_user_badges_user_status (user_id, status),
          INDEX idx_user_badges_type (badge_type_id),
          INDEX idx_user_badges_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 5. Seed initial built-in badge types
      await connection.query(`
        INSERT INTO badge_types (id, name, public_label, description, icon, color, is_active)
        VALUES
          ('verified', 'Verified', 'Verified', 'Identity or account verification completed', 'CheckCircle2', '#2563EB', 1),
          ('trusted', 'Trusted', 'Trusted', 'Account reviewed and considered trustworthy under LinkPlus criteria', 'ShieldCheck', '#059669', 1),
          ('official_creator', 'Official Creator', 'Official Creator', 'Recognized creator on LinkPlus', 'Sparkles', '#7C3AED', 1),
          ('featured', 'Featured', 'Featured', 'Selected for special visibility or recognition', 'Flame', '#D97706', 1),
          ('early_supporter', 'Early Supporter', 'Early Supporter', 'Recognized early LinkPlus user', 'Heart', '#E11D48', 1),
          ('top_creator', 'Top Creator', 'Top Creator', 'Recognized for creator quality or contribution', 'Award', '#CA8A04', 1),
          ('partner', 'Partner', 'Partner', 'Official LinkPlus partner', 'Handshake', '#4F46E5', 1)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          public_label = VALUES(public_label),
          description = VALUES(description),
          icon = VALUES(icon),
          color = VALUES(color)
      `);

      return true;
    } finally {
      connection.release();
    }
  } catch (err: any) {
    console.warn('[AutoMigrate] Schema check notice:', err.message);
    return false;
  }
}

/**
 * Tests database connectivity via the connection pool.
 * If unreachable, prints a full diagnostic guide and returns { ok: false, error }.
 */
export async function checkDatabaseConnection(): Promise<DatabaseConnectionResult> {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.ping();
      // Auto-migrate schema on successful connection
      await autoMigrateDatabase().catch(() => {});
      return { ok: true };
    } finally {
      connection.release();
    }
  } catch (err: unknown) {
    const { code, message } = extractErrorInfo(err);
    const guide = formatTroubleshootingGuide(err);
    console.error(guide);

    return {
      ok: false,
      error: message,
      code,
    };
  }
}

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const isDirectExecution =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) ||
    import.meta.url === pathToFileURL(process.argv[1]).href);

if (isDirectExecution) {
  checkDatabaseConnection()
    .then((res) => {
      if (res.ok) {
        console.log(`✅ Connected to MySQL database '${env.DB_NAME}' at ${env.DB_HOST}:${env.DB_PORT} as '${env.DB_USER}'.`);
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('❌ Database check failed:', err);
      process.exit(1);
    });
}

export default checkDatabaseConnection;
