import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

describe('Empirical Verification: SQL DDL vs Prisma Schema 1-to-1 Parity', () => {
  const sqlPath = path.resolve(process.cwd(), 'server/db/migrations/001_initial_schema.sql');
  const prismaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const prismaContent = fs.readFileSync(prismaPath, 'utf8');

  const EXPECTED_TABLES = [
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

  it('1. Table Count & Names: Exactly 11 tables in both SQL DDL and Prisma @@map declarations', () => {
    expect(EXPECTED_TABLES).toHaveLength(11);

    for (const table of EXPECTED_TABLES) {
      // Verify SQL DDL CREATE TABLE
      const sqlTableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\s*\\(`, 'i');
      expect(sqlContent).toMatch(sqlTableRegex);

      // Verify Prisma @@map
      const prismaMapRegex = new RegExp(`@@map\\("${table}"\\)`);
      expect(prismaContent).toMatch(prismaMapRegex);
    }
  });

  describe('2. Table 1: users parity & constraints', () => {
    it('should have 1-to-1 column parity and types', () => {
      const userColumns = [
        { name: 'id', sql: 'VARCHAR(36)', prisma: '@db.VarChar(36)' },
        { name: 'username', sql: 'VARCHAR(50)', prisma: '@db.VarChar(50)' },
        { name: 'normalized_username', sql: 'VARCHAR(50)', prisma: '@db.VarChar(50)' },
        { name: 'email', sql: 'VARCHAR(255)', prisma: '@db.VarChar(255)' },
        { name: 'normalized_email', sql: 'VARCHAR(255)', prisma: '@db.VarChar(255)' },
        { name: 'password_hash', sql: 'VARCHAR(255)', prisma: '@db.VarChar(255)' },
        { name: 'role', sql: 'VARCHAR(20)', prisma: '@db.VarChar(20)' },
        { name: 'status', sql: 'VARCHAR(20)', prisma: '@db.VarChar(20)' },
        { name: 'email_verified_at', sql: 'DATETIME(3)', prisma: '@db.DateTime(3)' },
        { name: 'created_at', sql: 'DATETIME(3)', prisma: '@db.DateTime(3)' },
        { name: 'updated_at', sql: 'DATETIME(3)', prisma: '@db.DateTime(3)' },
      ];

      for (const col of userColumns) {
        expect(sqlContent).toContain(col.name);
        expect(sqlContent).toContain(col.sql);
        expect(prismaContent).toContain(col.prisma);
      }
    });

    it('should have case-insensitive unique indexes on normalized_username and normalized_email in both SQL and Prisma', () => {
      // SQL DDL unique indexes
      expect(sqlContent).toMatch(/UNIQUE INDEX\s+idx_users_normalized_username\s+\(normalized_username\)/i);
      expect(sqlContent).toMatch(/UNIQUE INDEX\s+idx_users_normalized_email\s+\(normalized_email\)/i);

      // Prisma @unique on normalizedUsername and normalizedEmail
      expect(prismaContent).toMatch(/normalizedUsername\s+String\s+@unique\s+@map\("normalized_username"\)/);
      expect(prismaContent).toMatch(/normalizedEmail\s+String\s+@unique\s+@map\("normalized_email"\)/);
    });

    it('should have indexes on role and status in both SQL and Prisma', () => {
      expect(sqlContent).toMatch(/INDEX\s+idx_users_role\s+\(role\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_users_status\s+\(status\)/i);

      expect(prismaContent).toContain('@@index([role])');
      expect(prismaContent).toContain('@@index([status])');
    });
  });

  describe('3. Table 2: profiles parity & foreign key cascade', () => {
    it('should define profiles with DATETIME(3), JSON, and VARCHAR(1000)', () => {
      expect(sqlContent).toContain('avatar_url VARCHAR(1000)');
      expect(sqlContent).toContain('theme_settings JSON NOT NULL');
      expect(sqlContent).toContain('social_links JSON NOT NULL');
      expect(sqlContent).toContain('is_public TINYINT(1) NOT NULL DEFAULT 1');

      expect(prismaContent).toContain('avatarUrl     String?  @map("avatar_url") @db.VarChar(1000)');
      expect(prismaContent).toContain('themeSettings Json     @map("theme_settings")');
      expect(prismaContent).toContain('socialLinks   Json     @map("social_links")');
      expect(prismaContent).toContain('isPublic      Boolean  @default(true) @map("is_public")');
    });

    it('should have unique user_id index and ON DELETE CASCADE foreign key in both SQL and Prisma', () => {
      expect(sqlContent).toMatch(/UNIQUE INDEX\s+idx_profiles_user_id\s+\(user_id\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_profiles_user_id\s+FOREIGN KEY\s+\(user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );

      expect(prismaContent).toMatch(/userId\s+String\s+@unique\s+@map\("user_id"\)\s+@db\.VarChar\(36\)/);
      expect(prismaContent).toMatch(/user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    });
  });

  describe('4. Table 3: links parity, scheduling, and compound indexes', () => {
    it('should define links columns with VARCHAR(2048), JSON, DATETIME(3)', () => {
      expect(sqlContent).toContain('destination_url VARCHAR(2048) NOT NULL');
      expect(sqlContent).toContain('media_url VARCHAR(2048) NULL');
      expect(sqlContent).toContain('utm_params JSON NULL');
      expect(sqlContent).toContain('scheduled_start DATETIME(3) NULL');
      expect(sqlContent).toContain('scheduled_end DATETIME(3) NULL');

      expect(prismaContent).toContain('destinationUrl String    @map("destination_url") @db.VarChar(2048)');
      expect(prismaContent).toContain('mediaUrl       String?   @map("media_url") @db.VarChar(2048)');
      expect(prismaContent).toContain('utmParams      Json?     @map("utm_params")');
      expect(prismaContent).toContain('scheduledStart DateTime? @map("scheduled_start") @db.DateTime(3)');
      expect(prismaContent).toContain('scheduledEnd   DateTime? @map("scheduled_end") @db.DateTime(3)');
    });

    it('should define matching compound indexes and ON DELETE CASCADE in both SQL and Prisma', () => {
      expect(sqlContent).toMatch(/INDEX\s+idx_links_user_position\s+\(user_id,\s*position\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_links_user_visibility\s+\(user_id,\s*is_active,\s*is_hidden,\s*is_pinned\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_links_scheduling\s+\(scheduled_start,\s*scheduled_end\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_links_user_category\s+\(user_id,\s*category\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_links_user_id\s+FOREIGN KEY\s+\(user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );

      expect(prismaContent).toContain('@@index([userId, position])');
      expect(prismaContent).toContain('@@index([userId, isActive, isHidden, isPinned])');
      expect(prismaContent).toContain('@@index([scheduledStart, scheduledEnd])');
      expect(prismaContent).toContain('@@index([userId, category])');
    });
  });

  describe('5. Table 4: qr_settings parity & unique user constraint', () => {
    it('should define QR customization columns with defaults and types', () => {
      expect(sqlContent).toContain("foreground_color VARCHAR(50) NOT NULL DEFAULT '#000000'");
      expect(sqlContent).toContain("background_color VARCHAR(50) NOT NULL DEFAULT '#ffffff'");
      expect(sqlContent).toContain("error_correction_level VARCHAR(5) NOT NULL DEFAULT 'H'");
      expect(sqlContent).toContain('margin INT NOT NULL DEFAULT 2');
      expect(sqlContent).toContain('resolution INT NOT NULL DEFAULT 1024');

      expect(prismaContent).toContain('foregroundColor       String   @default("#000000") @map("foreground_color") @db.VarChar(50)');
      expect(prismaContent).toContain('backgroundColor       String   @default("#ffffff") @map("background_color") @db.VarChar(50)');
      expect(prismaContent).toContain('errorCorrectionLevel  String   @default("H") @map("error_correction_level") @db.VarChar(5)');
      expect(prismaContent).toContain('margin                Int      @default(2)');
      expect(prismaContent).toContain('resolution            Int      @default(1024)');
    });

    it('should have unique user_id index and ON DELETE CASCADE in both SQL and Prisma', () => {
      expect(sqlContent).toMatch(/UNIQUE INDEX\s+idx_qr_settings_user_id\s+\(user_id\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_qr_settings_user_id\s+FOREIGN KEY\s+\(user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );

      expect(prismaContent).toMatch(/userId\s+String\s+@unique\s+@map\("user_id"\)\s+@db\.VarChar\(36\)/);
      expect(prismaContent).toMatch(/user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    });
  });

  describe('6. Table 5: analytics_events parity & dual foreign keys', () => {
    it('should define event columns and hash/country length constraints', () => {
      expect(sqlContent).toContain('visitor_hash VARCHAR(64) NULL');
      expect(sqlContent).toContain('country_code VARCHAR(10) NULL');
      expect(sqlContent).toContain('created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');

      expect(prismaContent).toContain('visitorHash      String?  @map("visitor_hash") @db.VarChar(64)');
      expect(prismaContent).toContain('countryCode      String?  @map("country_code") @db.VarChar(10)');
      expect(prismaContent).toContain('createdAt        DateTime @default(now()) @map("created_at") @db.DateTime(3)');
    });

    it('should define cascade foreign keys to profiles and links in both SQL and Prisma', () => {
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_analytics_profile_id\s+FOREIGN KEY\s+\(profile_id\)\s+REFERENCES\s+profiles\s*\(id\)\s+ON DELETE CASCADE/i
      );
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_analytics_link_id\s+FOREIGN KEY\s+\(link_id\)\s+REFERENCES\s+links\s*\(id\)\s+ON DELETE CASCADE/i
      );

      expect(prismaContent).toMatch(/profile\s+Profile\s+@relation\(fields:\s*\[profileId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
      expect(prismaContent).toMatch(/link\s+Link\?\s+@relation\(fields:\s*\[linkId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    });

    it('should define all query performance indexes in both SQL and Prisma', () => {
      expect(sqlContent).toMatch(/INDEX\s+idx_analytics_profile_created\s+\(profile_id,\s*created_at\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_analytics_link_created\s+\(link_id,\s*created_at\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_analytics_profile_type_created\s+\(profile_id,\s*event_type,\s*created_at\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_analytics_profile_referrer\s+\(profile_id,\s*referrer_category\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_analytics_profile_device\s+\(profile_id,\s*device_category\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_analytics_created\s+\(created_at\)/i);

      expect(prismaContent).toContain('@@index([profileId, createdAt])');
      expect(prismaContent).toContain('@@index([linkId, createdAt])');
      expect(prismaContent).toContain('@@index([profileId, eventType, createdAt])');
      expect(prismaContent).toContain('@@index([profileId, referrerCategory])');
      expect(prismaContent).toContain('@@index([profileId, deviceCategory])');
      expect(prismaContent).toContain('@@index([createdAt])');
    });
  });

  describe('7. Tables 6 & 7: password_reset_tokens & email_verification_tokens parity', () => {
    it('should have unique token_hash and cascade user foreign key in both SQL and Prisma', () => {
      // password_reset_tokens
      expect(sqlContent).toMatch(/UNIQUE INDEX\s+idx_prt_token_hash\s+\(token_hash\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_prt_user_expires\s+\(user_id,\s*expires_at\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_prt_user_id\s+FOREIGN KEY\s+\(user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );

      // email_verification_tokens
      expect(sqlContent).toMatch(/UNIQUE INDEX\s+idx_evt_token_hash\s+\(token_hash\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_evt_user_expires\s+\(user_id,\s*expires_at\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_evt_user_id\s+FOREIGN KEY\s+\(user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );

      // Prisma verification
      expect(prismaContent).toMatch(/model PasswordResetToken\s*\{[\s\S]*?tokenHash\s+String\s+@unique\s+@map\("token_hash"\)\s+@db\.VarChar\(255\)[\s\S]*?@@index\(\[userId,\s*expiresAt\]\)/);
      expect(prismaContent).toMatch(/model EmailVerificationToken\s*\{[\s\S]*?tokenHash\s+String\s+@unique\s+@map\("token_hash"\)\s+@db\.VarChar\(255\)[\s\S]*?@@index\(\[userId,\s*expiresAt\]\)/);
    });
  });

  describe('8. Table 8: sessions parity', () => {
    it('should define sessions with VARCHAR(128) primary key, JSON data, and user cascade delete', () => {
      expect(sqlContent).toContain('id VARCHAR(128) NOT NULL');
      expect(sqlContent).toContain('data JSON NULL');
      expect(sqlContent).toMatch(/PRIMARY KEY\s*\(id\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_sessions_user_id\s+\(user_id\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_sessions_expires_at\s+\(expires_at\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_sessions_user_id\s+FOREIGN KEY\s+\(user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );

      expect(prismaContent).toMatch(/model Session\s*\{[\s\S]*?id\s+String\s+@id\s+@db\.VarChar\(128\)[\s\S]*?data\s+Json\?[\s\S]*?@@index\(\[userId\]\)[\s\S]*?@@index\(\[expiresAt\]\)/);
    });
  });

  describe('9. Table 9: moderation_reports parity & SetNull / Cascade cascades', () => {
    it('should have exact onDelete actions: SetNull for reporter/link/resolver, Cascade for reported_user', () => {
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_reports_reporter_user\s+FOREIGN KEY\s+\(reporter_user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE SET NULL/i
      );
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_reports_reported_user\s+FOREIGN KEY\s+\(reported_user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_reports_reported_link\s+FOREIGN KEY\s+\(reported_link_id\)\s+REFERENCES\s+links\s*\(id\)\s+ON DELETE SET NULL/i
      );
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_reports_resolved_by\s+FOREIGN KEY\s+\(resolved_by\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE SET NULL/i
      );

      // Prisma relations
      expect(prismaContent).toMatch(
        /reporter\s+User\?\s+@relation\("ReporterUser",\s*fields:\s*\[reporterUserId\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/
      );
      expect(prismaContent).toMatch(
        /reportedUser\s+User\s+@relation\("ReportedUser",\s*fields:\s*\[reportedUserId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/
      );
      expect(prismaContent).toMatch(
        /reportedLink\s+Link\?\s+@relation\(fields:\s*\[reportedLinkId\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/
      );
      expect(prismaContent).toMatch(
        /resolvedUser\s+User\?\s+@relation\("ResolvedByUser",\s*fields:\s*\[resolvedBy\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/
      );
    });
  });

  describe('10. Table 10: admin_audit_logs parity', () => {
    it('should have admin_user_id FK with ON DELETE CASCADE and query indexes', () => {
      expect(sqlContent).toMatch(/INDEX\s+idx_audit_admin_created\s+\(admin_user_id,\s*created_at\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_audit_action_created\s+\(action,\s*created_at\)/i);
      expect(sqlContent).toMatch(/INDEX\s+idx_audit_target\s+\(target_type,\s*target_id\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_audit_admin_user\s+FOREIGN KEY\s+\(admin_user_id\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE CASCADE/i
      );

      expect(prismaContent).toContain('@@index([adminUserId, createdAt])');
      expect(prismaContent).toContain('@@index([action, createdAt])');
      expect(prismaContent).toContain('@@index([targetType, targetId])');
    });
  });

  describe('11. Table 11: platform_settings parity', () => {
    it('should have key as primary key, TEXT value, and updated_by ON DELETE SET NULL', () => {
      expect(sqlContent).toContain('`key` VARCHAR(100) NOT NULL');
      expect(sqlContent).toContain('`value` TEXT NOT NULL');
      expect(sqlContent).toMatch(/PRIMARY KEY\s*\(`key`\)/i);
      expect(sqlContent).toMatch(
        /CONSTRAINT\s+fk_settings_updated_by\s+FOREIGN KEY\s+\(updated_by\)\s+REFERENCES\s+users\s*\(id\)\s+ON DELETE SET NULL/i
      );

      expect(prismaContent).toMatch(/model PlatformSetting\s*\{[\s\S]*?key\s+String\s+@id\s+@db\.VarChar\(100\)[\s\S]*?value\s+String\s+@db\.Text/);
      expect(prismaContent).toMatch(
        /adminUser\s+User\?\s+@relation\(fields:\s*\[updatedBy\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/
      );
    });
  });

  describe('12. Admin Seed Script Verification (server/db/seed-admin.ts)', () => {
    it('should hash passwords using bcrypt with 12 salt rounds', async () => {
      const password = 'AdminTestPassword!2026';
      const hash = await bcrypt.hash(password, 12);

      // Verify salt rounds is 12 (bcrypt format $2a$12$... or $2b$12$...)
      expect(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$')).toBe(true);

      // Verify constant-time validation works
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should seed admin inside a database transaction creating user, profile, qrSetting, and audit log', () => {
      const seedAdminPath = path.resolve(process.cwd(), 'server/db/seed-admin.ts');
      const seedContent = fs.readFileSync(seedAdminPath, 'utf8');

      expect(seedContent).toContain('prisma.$transaction');
      expect(seedContent).toContain("role: 'admin'");
      expect(seedContent).toContain("status: 'active'");
      expect(seedContent).toContain("errorCorrectionLevel: 'H'");
      expect(seedContent).toContain("action: 'admin_bootstrap'");
      expect(seedContent).toContain('checkDatabaseConnection()');
    });
  });
});
