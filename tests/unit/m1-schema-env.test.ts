import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { envSchema } from '../../server/config/env.js';
import { formatTroubleshootingGuide } from '../../server/db/check-connection.js';
import { REQUIRED_TABLES } from '../../server/db/migrate.js';

describe('Milestone 1: Database Schema, Environment & Diagnostics', () => {
  describe('Environment Configuration Schema (server/config/env.ts)', () => {
    it('should validate and synthesize DATABASE_URL when DB credentials are provided', () => {
      const parsed = envSchema.parse({
        DB_HOST: '127.0.0.1',
        DB_PORT: '3306',
        DB_NAME: 'test_db',
        DB_USER: 'test_user',
        DB_PASSWORD: 'test_password',
        SESSION_SECRET: 'a-very-long-secure-session-secret-token-32chars',
      });

      expect(parsed.DB_HOST).toBe('127.0.0.1');
      expect(parsed.DB_PORT).toBe(3306);
      expect(parsed.DATABASE_URL).toBe('mysql://test_user:test_password@127.0.0.1:3306/test_db');
      expect(parsed.NODE_ENV).toBe('development');
    });

    it('should use explicit DATABASE_URL when provided', () => {
      const customUrl = 'mysql://custom_user:custom_pass@db.internal:3307/custom_db';
      const parsed = envSchema.parse({
        DB_HOST: 'localhost',
        DATABASE_URL: customUrl,
        SESSION_SECRET: 'minimum-sixteen-chars-secret!',
      });

      expect(parsed.DATABASE_URL).toBe(customUrl);
    });

    it('should reject SESSION_SECRET that is too short', () => {
      expect(() => {
        envSchema.parse({
          SESSION_SECRET: 'too-short',
        });
      }).toThrow();
    });

    it('should reject invalid NODE_ENV values', () => {
      expect(() => {
        envSchema.parse({
          NODE_ENV: 'staging',
          SESSION_SECRET: 'valid-session-secret-at-least-16-chars',
        });
      }).toThrow();
    });
  });

  describe('Database Connection Diagnostics (server/db/check-connection.ts)', () => {
    it('should format a clear, actionable troubleshooting guide with setup steps and integrity notice', () => {
      const fakeError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:3306',
      };

      const guide = formatTroubleshootingGuide(fakeError);

      expect(guide).toContain('🚨 DATABASE CONNECTION ERROR - MySQL IS UNREACHABLE');
      expect(guide).toContain('ECONNREFUSED');
      expect(guide).toContain('TROUBLESHOOTING GUIDE');
      expect(guide).toContain('Start-Service MySQL');
      expect(guide).toContain('npm run db:migrate');
      expect(guide).toContain('INTEGRITY POLICY NOTICE');
      expect(guide).toContain('will NOT silently fall back to fake in-memory data or localStorage');
    });
  });

  describe('Executable SQL Migration (server/db/migrations/001_initial_schema.sql)', () => {
    it('should define all 11 required tables with InnoDB engine and utf8mb4 collation', () => {
      const sqlPath = path.resolve(process.cwd(), 'server/db/migrations/001_initial_schema.sql');
      expect(fs.existsSync(sqlPath)).toBe(true);

      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      for (const table of REQUIRED_TABLES) {
        const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}`, 'i');
        expect(sqlContent).toMatch(tableRegex);
      }

      expect(sqlContent).toContain('ENGINE=InnoDB');
      expect(sqlContent).toContain('utf8mb4_unicode_ci');
      expect(sqlContent).toContain('idx_users_normalized_username');
      expect(sqlContent).toContain('idx_users_normalized_email');
      expect(sqlContent).toContain('fk_profiles_user_id');
      expect(sqlContent).toContain('fk_links_user_id');
      expect(sqlContent).toContain('fk_qr_settings_user_id');
    });
  });

  describe('Prisma Schema (prisma/schema.prisma)', () => {
    it('should define all 11 models with explicit snake_case table and column mappings', () => {
      const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
      expect(fs.existsSync(schemaPath)).toBe(true);

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');

      const expectedModels = [
        'User',
        'Profile',
        'Link',
        'QrSetting',
        'AnalyticsEvent',
        'PasswordResetToken',
        'EmailVerificationToken',
        'Session',
        'ModerationReport',
        'AdminAuditLog',
        'PlatformSetting',
      ];

      for (const model of expectedModels) {
        expect(schemaContent).toContain(`model ${model} {`);
      }

      expect(schemaContent).toContain('@@map("users")');
      expect(schemaContent).toContain('@@map("profiles")');
      expect(schemaContent).toContain('@@map("links")');
      expect(schemaContent).toContain('@@map("qr_settings")');
      expect(schemaContent).toContain('@@map("analytics_events")');
      expect(schemaContent).toContain('@@map("password_reset_tokens")');
      expect(schemaContent).toContain('@@map("email_verification_tokens")');
      expect(schemaContent).toContain('@@map("sessions")');
      expect(schemaContent).toContain('@@map("moderation_reports")');
      expect(schemaContent).toContain('@@map("admin_audit_logs")');
      expect(schemaContent).toContain('@@map("platform_settings")');
    });
  });
});
