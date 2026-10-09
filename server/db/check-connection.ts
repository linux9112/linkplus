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
 * Tests database connectivity via the connection pool.
 * If unreachable, prints a full diagnostic guide and returns { ok: false, error }.
 */
export async function checkDatabaseConnection(): Promise<DatabaseConnectionResult> {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.ping();
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
