import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

/**
 * Shared MySQL2 Connection Pool for raw queries, migrations, and direct operations.
 */
export const pool: mysql.Pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
  dateStrings: true,
});

export function getPool(): mysql.Pool {
  return pool;
}

export default pool;
