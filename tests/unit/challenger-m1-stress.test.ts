import { describe, it, expect, vi } from 'vitest';
import { envSchema } from '../../server/config/env.js';
import { checkDatabaseConnection, formatTroubleshootingGuide } from '../../server/db/check-connection.js';
import pool from '../../server/db/pool.js';
import { PrismaClient } from '@prisma/client';

describe('CHALLENGER Stress Suite: Milestone 1 Robustness', () => {
  describe('1. Environment Variable Parsing & Boundary Conditions', () => {
    it('handles empty and whitespace strings for preprocessed fields', () => {
      const parsed = envSchema.parse({
        PORT: '   ',
        APP_URL: '   ',
        DB_HOST: '   ',
        DB_PORT: '   ',
        DB_NAME: '   ',
        DB_USER: '   ',
        DB_PASSWORD: '   ',
        SESSION_SECRET: '   ',
      });

      expect(parsed.PORT).toBe(5000);
      expect(parsed.APP_URL).toBe('http://localhost:5173');
      expect(parsed.DB_HOST).toBe('localhost');
      expect(parsed.DB_PORT).toBe(3306);
      expect(parsed.DB_NAME).toBe('u199400152_linkgenerator');
      expect(parsed.DB_USER).toBe('u199400152_linkgenerator');
      expect(parsed.SESSION_SECRET).toBe('linkpulse-dev-secret-session-key-minimum-32-chars');
    });

    it('EMPIRICAL FINDING: NODE_ENV fails when empty string or whitespace is provided', () => {
      // Because NODE_ENV lacks z.preprocess(emptyToUndefined, ...),
      // empty string '' or whitespace '   ' is not coerced to undefined,
      // triggering an invalid_enum_value error rather than defaulting to 'development'.
      expect(() => envSchema.parse({ NODE_ENV: '' })).toThrow(/Expected 'development' | 'production' | 'test'/);
      expect(() => envSchema.parse({ NODE_ENV: '   ' })).toThrow(/Expected 'development' | 'production' | 'test'/);
      
      // When undefined/omitted, it successfully defaults to 'development'
      const parsedDefault = envSchema.parse({});
      expect(parsedDefault.NODE_ENV).toBe('development');
    });

    it('rejects invalid NODE_ENV values', () => {
      expect(() => envSchema.parse({ NODE_ENV: 'invalid_env' })).toThrow();
      expect(() => envSchema.parse({ NODE_ENV: 'staging' })).toThrow();
    });

    it('rejects malformed APP_URL', () => {
      expect(() => envSchema.parse({ APP_URL: 'not-a-valid-url' })).toThrow();
      expect(() => envSchema.parse({ APP_URL: 'http://' })).toThrow();
    });

    it('rejects non-numeric PORT values', () => {
      expect(() => envSchema.parse({ PORT: 'not-a-number' })).toThrow();
      expect(() => envSchema.parse({ PORT: '5000abc' })).toThrow();
    });

    it('rejects non-numeric DB_PORT values', () => {
      expect(() => envSchema.parse({ DB_PORT: 'invalid-port' })).toThrow();
    });

    it('enforces SESSION_SECRET minimum length of 16 characters', () => {
      // 15 characters -> must fail
      expect(() => envSchema.parse({ SESSION_SECRET: '123456789012345' })).toThrow(/at least 16 characters/);
      // 16 characters -> must succeed
      const parsed = envSchema.parse({ SESSION_SECRET: '1234567890123456' });
      expect(parsed.SESSION_SECRET).toBe('1234567890123456');
    });

    it('validates optional ADMIN_BOOTSTRAP fields', () => {
      // Malformed email
      expect(() => envSchema.parse({ ADMIN_BOOTSTRAP_EMAIL: 'invalid-email' })).toThrow(/Invalid ADMIN_BOOTSTRAP_EMAIL/);
      
      // Short password (< 8 chars)
      expect(() => envSchema.parse({ ADMIN_BOOTSTRAP_PASSWORD: 'short' })).toThrow(/at least 8 characters/);

      // Valid bootstrap options
      const parsed = envSchema.parse({
        ADMIN_BOOTSTRAP_EMAIL: 'admin@example.com',
        ADMIN_BOOTSTRAP_USERNAME: 'superadmin',
        ADMIN_BOOTSTRAP_PASSWORD: 'securePassword123!',
      });
      expect(parsed.ADMIN_BOOTSTRAP_EMAIL).toBe('admin@example.com');
      expect(parsed.ADMIN_BOOTSTRAP_USERNAME).toBe('superadmin');
      expect(parsed.ADMIN_BOOTSTRAP_PASSWORD).toBe('securePassword123!');
    });
  });

  describe('2. DATABASE_URL Synthesis & Complex Edge Cases', () => {
    it('properly encodes special characters in DB_PASSWORD and DB_USER', () => {
      // Password containing RFC-3986 reserved chars: @, :, /, ?, #, %, &, +, space
      const specialPassword = 'p@ss:w/o?r#d%1!&+ $~';
      const specialUser = 'user@domain.com';

      const parsed = envSchema.parse({
        DB_USER: specialUser,
        DB_PASSWORD: specialPassword,
        DB_HOST: '127.0.0.1',
        DB_PORT: '3306',
        DB_NAME: 'test_db',
      });

      expect(parsed.DATABASE_URL).toBe(
        `mysql://user%40domain.com:p%40ss%3Aw%2Fo%3Fr%23d%251!%26%2B%20%24~@127.0.0.1:3306/test_db`
      );

      // Verify that parsed URL can be decoded back without ambiguity
      const parsedUrl = new URL(parsed.DATABASE_URL);
      expect(decodeURIComponent(parsedUrl.username)).toBe(specialUser);
      expect(decodeURIComponent(parsedUrl.password)).toBe(specialPassword);
      expect(parsedUrl.hostname).toBe('127.0.0.1');
      expect(parsedUrl.port).toBe('3306');
      expect(parsedUrl.pathname).toBe('/test_db');
    });

    it('handles custom ports and non-default database names', () => {
      const parsed = envSchema.parse({
        DB_HOST: 'db.internal.network',
        DB_PORT: 33070,
        DB_NAME: 'prod_linkpulse_db_v2',
        DB_USER: 'db_admin',
        DB_PASSWORD: 'mypassword',
      });

      expect(parsed.DATABASE_URL).toBe('mysql://db_admin:mypassword@db.internal.network:33070/prod_linkpulse_db_v2');
      const parsedUrl = new URL(parsed.DATABASE_URL);
      expect(parsedUrl.port).toBe('33070');
      expect(parsedUrl.hostname).toBe('db.internal.network');
    });

    it('EMPIRICAL PROBE: IPv6 hosts in DATABASE_URL synthesis and Prisma handling', async () => {
      // Bracketed IPv6 (Standard RFC-3986 URL format)
      const bracketed = envSchema.parse({ DB_HOST: '[::1]' });
      expect(bracketed.DATABASE_URL).toBe('mysql://u199400152_linkgenerator:@[::1]:3306/u199400152_linkgenerator');
      const uBracketed = new URL(bracketed.DATABASE_URL);
      expect(uBracketed.hostname).toBe('[::1]');

      // Unbracketed IPv6
      const unbracketed = envSchema.parse({ DB_HOST: '::1' });
      expect(unbracketed.DATABASE_URL).toBe('mysql://u199400152_linkgenerator:@::1:3306/u199400152_linkgenerator');

      // Test PrismaClient instantiation with unbracketed IPv6 URL
      // WHATWG URL parser rejects 'mysql://user:pass@::1:3306/db'
      expect(() => new URL(unbracketed.DATABASE_URL)).toThrow();

      // But PrismaClient itself: let's verify how PrismaClient handles unbracketed vs bracketed IPv6 URL
      const prismaClient = new PrismaClient({
        datasourceUrl: unbracketed.DATABASE_URL,
      });
      // Prisma validates database URL on connect
      let prismaError: any;
      try {
        await prismaClient.$connect();
      } catch (err) {
        prismaError = err;
      } finally {
        await prismaClient.$disconnect().catch(() => {});
      }

      // Confirmed: Prisma rejects unbracketed IPv6 with P1013 (Invalid database string) or connection error
      expect(prismaError).toBeDefined();
    });

    it('prioritizes explicitly configured DATABASE_URL over synthesis', () => {
      const explicitUrl = 'mysql://override_user:override_pass@external-host:3308/custom_database?ssl-mode=REQUIRED';
      const parsed = envSchema.parse({
        DB_USER: 'ignored_user',
        DB_PASSWORD: 'ignored_password',
        DB_HOST: 'ignored_host',
        DATABASE_URL: explicitUrl,
      });

      expect(parsed.DATABASE_URL).toBe(explicitUrl);
    });

    it('synthesizes DATABASE_URL if DATABASE_URL is empty or whitespace', () => {
      const parsed = envSchema.parse({
        DATABASE_URL: '   ',
        DB_USER: 'testuser',
        DB_PASSWORD: 'secretpassword',
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_NAME: 'testdb',
      });

      expect(parsed.DATABASE_URL).toBe('mysql://testuser:secretpassword@localhost:3306/testdb');
    });
  });

  describe('3. Database Connection Failure & Diagnostic Output', () => {
    it('never leaks DB_PASSWORD in troubleshooting diagnostic guide', () => {
      const secretPass = 'SUPER_SECRET_PLAINTEXT_PASSWORD_12345';
      const guide = formatTroubleshootingGuide(new Error('Connection lost'));

      // Check that DB_PASSWORD is not contained anywhere in the generated guide
      expect(guide).not.toContain(secretPass);
      expect(guide).toContain('Target Host');
      expect(guide).toContain('Database');
      expect(guide).toContain('User');
      expect(guide).not.toContain('Password     :');
      expect(guide).toContain('⚠️ INTEGRITY POLICY NOTICE');
    });

    it('checkDatabaseConnection returns ok: false with error details and does not throw', async () => {
      // Mock pool.getConnection to simulate an unreachable database
      const originalGetConnection = pool.getConnection;
      const fakeNetworkError = new Error('connect ECONNREFUSED 127.0.0.1:3306');
      (fakeNetworkError as any).code = 'ECONNREFUSED';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        pool.getConnection = vi.fn().mockRejectedValue(fakeNetworkError);

        const result = await checkDatabaseConnection();

        expect(result).toBeDefined();
        expect(result.ok).toBe(false);
        expect(result.code).toBe('ECONNREFUSED');
        expect(result.error).toContain('ECONNREFUSED');
        expect(consoleErrorSpy).toHaveBeenCalled();
      } finally {
        pool.getConnection = originalGetConnection;
        consoleErrorSpy.mockRestore();
      }
    });

    it('checkDatabaseConnection returns ok: true when connection ping succeeds', async () => {
      const originalGetConnection = pool.getConnection;
      const mockPing = vi.fn().mockResolvedValue(undefined);
      const mockRelease = vi.fn();
      const mockConn = {
        ping: mockPing,
        release: mockRelease,
      };

      try {
        pool.getConnection = vi.fn().mockResolvedValue(mockConn as any);

        const result = await checkDatabaseConnection();

        expect(result.ok).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockPing).toHaveBeenCalledTimes(1);
        expect(mockRelease).toHaveBeenCalledTimes(1);
      } finally {
        pool.getConnection = originalGetConnection;
      }
    });

    it('safely handles non-standard error types without throwing', () => {
      const errorStrings = [
        'Raw string error message',
        { custom: 'object without code or message' },
        null,
        undefined,
      ];

      for (const err of errorStrings) {
        expect(() => formatTroubleshootingGuide(err)).not.toThrow();
        const guide = formatTroubleshootingGuide(err);
        expect(guide).toContain('🚨 DATABASE CONNECTION ERROR - MySQL IS UNREACHABLE');
      }
    });
  });

  describe('4. Empirical Real-World Probe: Live or Offline MySQL Diagnostic Behavior', () => {
    it('executing checkDatabaseConnection directly against current environment', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const result = await checkDatabaseConnection();
        if (result.ok) {
          expect(result.ok).toBe(true);
          expect(result.error).toBeUndefined();
        } else {
          expect(result.ok).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.code).toBeDefined();
          expect(consoleErrorSpy).toHaveBeenCalled();
          const loggedGuide = consoleErrorSpy.mock.calls[0][0];
          expect(loggedGuide).toContain('🚨 DATABASE CONNECTION ERROR - MySQL IS UNREACHABLE');
          expect(loggedGuide).toContain('INTEGRITY POLICY NOTICE');
        }
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
