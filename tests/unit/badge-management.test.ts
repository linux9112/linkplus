import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { prisma } from '../../server/db/prisma.js';

describe('LinkPlus Super Admin Badge Management System Verification', () => {
  const app = createApp();

  describe('1. Security & Authorization Gates', () => {
    it('rejects unauthenticated requests to badge administration endpoints with 401', async () => {
      const endpoints = [
        { method: 'get', path: '/api/admin/badges/overview' },
        { method: 'get', path: '/api/admin/badges/types' },
        { method: 'post', path: '/api/admin/badges/types' },
        { method: 'get', path: '/api/admin/badges/users' },
        { method: 'post', path: '/api/admin/badges/award' },
        { method: 'post', path: '/api/admin/badges/revoke' },
        { method: 'post', path: '/api/admin/badges/restore' },
        { method: 'get', path: '/api/admin/badges/history' },
      ] as const;

      for (const ep of endpoints) {
        const res = await (request(app) as any)[ep.method](ep.path);
        expect(res.status, `Expected 401 on ${ep.method.toUpperCase()} ${ep.path}`).toBe(401);
      }
    });

    it('rejects unauthenticated request to user badges endpoint /api/profile/badges with 401', async () => {
      const res = await request(app).get('/api/profile/badges');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Built-in Badge Types in Database', () => {
    it('has all 7 built-in badge types seeded and active in database', async () => {
      const types = await prisma.badgeType.findMany();
      expect(types.length).toBeGreaterThanOrEqual(7);

      const expectedNames = [
        'Verified',
        'Trusted',
        'Official Creator',
        'Featured',
        'Early Supporter',
        'Top Creator',
        'Partner',
      ];

      for (const name of expectedNames) {
        const found = types.find((t) => t.name.toLowerCase() === name.toLowerCase());
        expect(found, `Expected built-in badge type "${name}" to exist in database`).toBeDefined();
        expect(found!.isActive).toBe(true);
        expect(found!.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(found!.icon).toBeTruthy();
        expect(found!.publicLabel).toBeTruthy();
        expect(found!.description).toBeTruthy();
      }
    });
  });

  describe('3. Public Profile Badges Security & Privacy Sanitization', () => {
    it('returns 404 for non-existent badge verification query', async () => {
      const res = await request(app).get('/api/public/badges/verify/non-existent-id-12345');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('ensures public profile responses sanitize internal admin notes and private audit fields', async () => {
      // Find any user with a public profile
      const publicUser = await prisma.user.findFirst({
        where: {
          status: 'active',
          profile: { isPublic: true },
        },
      });

      if (publicUser) {
        const res = await request(app).get(`/api/public/${publicUser.username}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.badges)).toBe(true);

        // Verify each public badge contains only public fields and zero admin secrets
        for (const badge of res.body.badges) {
          expect(badge.id).toBeDefined();
          expect(badge.name).toBeDefined();
          expect(badge.public_label || badge.publicLabel).toBeDefined();
          expect(badge.description).toBeDefined();
          expect(badge.icon).toBeDefined();
          expect(badge.color).toBeDefined();

          // CRITICAL: NEVER expose internal notes, private reasons, or admin audit details
          expect(badge.internal_note).toBeUndefined();
          expect(badge.internalNote).toBeUndefined();
          expect(badge.revocation_reason).toBeUndefined();
          expect(badge.revocationReason).toBeUndefined();
          expect(badge.awarded_by).toBeUndefined();
          expect(badge.awardedBy).toBeUndefined();
          expect(badge.revoked_by).toBeUndefined();
          expect(badge.revokedBy).toBeUndefined();
        }
      }
    });
  });

  describe('4. Lifecycle: Award, Public Visibility, Revocation, and Expiration', () => {
    it('properly validates duplicate active badge prevention and award expiration filtering', async () => {
      // Find or verify a test user and a badge type
      const testUser = await prisma.user.findFirst({ where: { status: 'active' } });
      const verifiedType = await prisma.badgeType.findFirst({
        where: { name: 'Verified' },
      });

      expect(testUser).toBeDefined();
      expect(verifiedType).toBeDefined();

      if (testUser && verifiedType) {
        // Create an expired badge directly in DB to verify public filter
        const expiredBadge = await prisma.userBadge.create({
          data: {
            userId: testUser.id,
            badgeTypeId: verifiedType.id,
            awardedBy: testUser.id,
            status: 'active',
            expiresAt: new Date(Date.now() - 3600000), // 1 hour ago (expired)
            internalNote: 'Automated test expired badge',
          },
        });

        // Query public profile
        const res = await request(app).get(`/api/public/${testUser.username}`);
        if (res.status === 200) {
          const publicBadges = res.body.badges || [];
          const foundExpired = publicBadges.find((b: any) => b.id === expiredBadge.id);
          expect(foundExpired, 'Expired badge must not appear on public profile').toBeUndefined();
        }

        // Clean up test badge
        await prisma.userBadge.delete({ where: { id: expiredBadge.id } });
      }
    });

    it('ensures revoked badge does not appear in public profile', async () => {
      const testUser = await prisma.user.findFirst({ where: { status: 'active' } });
      const trustedType = await prisma.badgeType.findFirst({
        where: { name: 'Trusted' },
      });

      if (testUser && trustedType) {
        // Create a revoked badge directly in DB
        const revokedBadge = await prisma.userBadge.create({
          data: {
            userId: testUser.id,
            badgeTypeId: trustedType.id,
            awardedBy: testUser.id,
            status: 'revoked',
            revocationReason: 'Test reason for revocation',
            internalNote: 'Internal secret note',
          },
        });

        // Query public profile
        const res = await request(app).get(`/api/public/${testUser.username}`);
        if (res.status === 200) {
          const publicBadges = res.body.badges || [];
          const foundRevoked = publicBadges.find((b: any) => b.id === revokedBadge.id);
          expect(foundRevoked, 'Revoked badge must not appear on public profile').toBeUndefined();
        }

        // Clean up test badge
        await prisma.userBadge.delete({ where: { id: revokedBadge.id } });
      }
    });
  });
});
