import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { pool } from './pool.js';
import { checkDatabaseConnection } from './check-connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REQUIRED_TABLES = [
  'users',
  'profiles',
  'links',
  'qr_settings',
  'analytics_events',
  'password_reset_tokens',
  'email_verification_tokens',
  'sessions',
  'moderation_reports',
  'admin_audit_logs',
  'platform_settings',
];

/**
 * Runs all pending SQL migrations from server/db/migrations/ in order.
 */
export async function runMigrations(): Promise<{ success: boolean; applied: string[] }> {
  console.log('🔄 Checking database connection before running migrations...');
  const connCheck = await checkDatabaseConnection();
  if (!connCheck.ok) {
    throw new Error(`Database connection failed: ${connCheck.error}`);
  }

  const connection = await pool.getConnection();
  const appliedMigrations: string[] = [];

  try {
    // 1. Ensure migrations tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Fetch list of already applied migrations
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT migration_name FROM schema_migrations ORDER BY id ASC'
    );
    const existing = new Set<string>(rows.map((r) => r.migration_name));

    // 3. Locate migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${files.length} migration file(s) in ${migrationsDir}`);

    for (const file of files) {
      if (existing.has(file)) {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`⚡ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // Execute SQL content with multiple statements
      await connection.query(sqlContent);

      // Record migration
      await connection.query(
        'INSERT INTO schema_migrations (migration_name) VALUES (?)',
        [file]
      );
      appliedMigrations.push(file);
      console.log(`✅ Applied migration: ${file}`);
    }

    // 4. Verify all 11 required tables exist
    const [tables] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ?`,
      [env.DB_NAME]
    );
    const foundTables = new Set(tables.map((t) => t.TABLE_NAME.toLowerCase()));
    const missingTables = REQUIRED_TABLES.filter((t) => !foundTables.has(t.toLowerCase()));

    if (missingTables.length > 0) {
      console.warn(`⚠️ Warning: Missing tables after migration: ${missingTables.join(', ')}`);
    } else {
      console.log(`🎉 All ${REQUIRED_TABLES.length} schema tables verified in database '${env.DB_NAME}'.`);
    }

    return {
      success: true,
      applied: appliedMigrations,
    };
  } finally {
    connection.release();
  }
}

// Auto-run when executed directly via tsx/node CLI
const isDirectExecution =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) ||
    import.meta.url === pathToFileURL(process.argv[1]).href);

if (isDirectExecution) {
  runMigrations()
    .then((result) => {
      console.log(`✨ Migration runner finished. Applied ${result.applied.length} new migration(s).`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration runner failed:', err);
      process.exit(1);
    });
}
