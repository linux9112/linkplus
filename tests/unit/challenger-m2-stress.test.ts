import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import {
  isPrivateOrBlockedUrl,
  validateDestinationUrl,
  sanitizeHtml,
} from '../../server/utils/ssrf.js';
import {
  createSession,
  validateSession,
  destroySession,
  destroyUserSessions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from '../../server/services/session.service.js';
import { requireAuth, requireAdmin } from '../../server/middleware/auth.middleware.js';
import { prisma } from '../../server/db/prisma.js';
import { getTestApp, resetTestDb, testDb } from '../setup.js';
import type { Request, Response, NextFunction } from 'express';

describe('CHALLENGER Stress Suite: Milestone 2 Robustness', () => {
  // ==========================================================================
  // 1. SSRF Protection Empirical Stress Testing (server/utils/ssrf.ts)
  // ==========================================================================
  describe('1. SSRF Protection Stress Testing', () => {
    describe('1.1 Mandated Malicious Targets', () => {
      it('blocks localhost in standard URL formats', () => {
        const localhostUrls = [
          'http://localhost',
          'https://localhost',
          'http://localhost:3000',
          'http://localhost:8080/admin',
          'http://localhost/api/internal',
          'http://sub.localhost',
          'http://dev.localhost:5000',
        ];

        for (const url of localhostUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          const validation = validateDestinationUrl(url);
          expect(validation.valid, `Expected invalid for ${url}`).toBe(false);
          expect(validation.error).toContain('restricted internal or private address');
        }
      });

      it('blocks 127.0.0.1 and entire loopback subnet (127.0.0.0/8)', () => {
        const loopbackUrls = [
          'http://127.0.0.1',
          'https://127.0.0.1',
          'http://127.0.0.1:8080',
          'http://127.0.0.1:3000/api',
          'http://127.0.0.2',
          'http://127.127.127.127',
          'http://127.255.255.254',
        ];

        for (const url of loopbackUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          expect(validateDestinationUrl(url).valid, `Expected invalid for ${url}`).toBe(false);
        }
      });

      it('blocks 10.0.0.1 and private Class A (10.0.0.0/8)', () => {
        const classAUrls = [
          'http://10.0.0.1',
          'https://10.0.0.1:443',
          'http://10.0.0.1/internal/config',
          'http://10.10.10.10',
          'http://10.254.254.254',
          'http://10.0.0.255',
        ];

        for (const url of classAUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          expect(validateDestinationUrl(url).valid, `Expected invalid for ${url}`).toBe(false);
        }
      });

      it('blocks 192.168.1.1 and private Class C (192.168.0.0/16)', () => {
        const classCUrls = [
          'http://192.168.1.1',
          'http://192.168.1.1/admin',
          'http://192.168.0.1',
          'http://192.168.100.50:8080',
          'http://192.168.255.254',
        ];

        for (const url of classCUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          expect(validateDestinationUrl(url).valid, `Expected invalid for ${url}`).toBe(false);
        }
      });

      it('blocks 169.254.169.254 and link-local / cloud metadata subnet (169.254.0.0/16)', () => {
        const metadataUrls = [
          'http://169.254.169.254',
          'http://169.254.169.254/latest/meta-data/',
          'http://169.254.169.254/computeMetadata/v1/',
          'http://169.254.169.254/metadata/v1/maintenance',
          'http://169.254.0.1',
          'http://169.254.255.254',
        ];

        for (const url of metadataUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          expect(validateDestinationUrl(url).valid, `Expected invalid for ${url}`).toBe(false);
        }
      });

      it('blocks javascript: URI schemes and variations', () => {
        const jsUrls = [
          'javascript:alert(1)',
          'javascript:alert(document.cookie)',
          'JAVASCRIPT:alert(1)',
          'javascript:void(0)',
          'javascript://test%0Aalert(1)',
        ];

        for (const url of jsUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          const validation = validateDestinationUrl(url);
          expect(validation.valid, `Expected invalid for ${url}`).toBe(false);
          expect(validation.error).toBe('Only HTTP and HTTPS URLs are supported');
        }
      });

      it('blocks file:// URI schemes and local path traversals', () => {
        const fileUrls = [
          'file:///etc/passwd',
          'file:///c:/windows/win.ini',
          'file://localhost/etc/shadow',
          'FILE:///etc/passwd',
          'file:///',
        ];

        for (const url of fileUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          const validation = validateDestinationUrl(url);
          expect(validation.valid, `Expected invalid for ${url}`).toBe(false);
          expect(validation.error).toBe('Only HTTP and HTTPS URLs are supported');
        }
      });
    });

    describe('1.2 Extended SSRF Defense Vectors', () => {
      it('blocks RFC1918 Class B (172.16.0.0/12: 172.16.0.0 - 172.31.255.255)', () => {
        const classBBlocked = [
          'http://172.16.0.1',
          'http://172.20.5.10',
          'http://172.31.255.255',
          'http://172.24.0.1:9000',
        ];

        for (const url of classBBlocked) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
        }

        // Boundary tests: 172.15.x.x and 172.32.x.x are public IPs and should NOT be blocked
        expect(isPrivateOrBlockedUrl('http://172.15.255.255')).toBe(false);
        expect(isPrivateOrBlockedUrl('http://172.32.0.1')).toBe(false);
      });

      it('blocks Carrier-Grade NAT (RFC 6598: 100.64.0.0/10: 100.64.0.0 - 100.127.255.255)', () => {
        expect(isPrivateOrBlockedUrl('http://100.64.0.1')).toBe(true);
        expect(isPrivateOrBlockedUrl('http://100.100.100.100')).toBe(true);
        expect(isPrivateOrBlockedUrl('http://100.127.255.254')).toBe(true);

        // Outside CGNAT range
        expect(isPrivateOrBlockedUrl('http://100.63.255.255')).toBe(false);
        expect(isPrivateOrBlockedUrl('http://100.128.0.1')).toBe(false);
      });

      it('blocks current network 0.0.0.0/8 and broadcast 255.255.255.255', () => {
        expect(isPrivateOrBlockedUrl('http://0.0.0.0')).toBe(true);
        expect(isPrivateOrBlockedUrl('http://0.0.0.0:8080')).toBe(true);
        expect(isPrivateOrBlockedUrl('http://0.1.2.3')).toBe(true);
        expect(isPrivateOrBlockedUrl('http://255.255.255.255')).toBe(true);
      });

      it('blocks internal and mDNS top-level domains without trailing dot', () => {
        const internalDomains = [
          'http://database.local',
          'http://service.internal',
          'http://router.lan',
          'http://nas.home',
          'http://vault.corp',
        ];

        for (const url of internalDomains) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
        }
      });

      it('blocks standard IPv6 loopback, link-local, and unique local addresses', () => {
        const standardIpv6Blocked = [
          'http://[::1]',
          'http://[::1]:8080',
          'http://[0000:0000:0000:0000:0000:0000:0000:0001]',
          'http://[::]',
          'http://[fe80::1]',
          'http://[fe80::2c4:2aff:fe3a:bc10]',
          'http://[fc00::1]',
          'http://[fd00::1234]',
        ];

        for (const url of standardIpv6Blocked) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
        }
      });

      it('EMPIRICAL VULNERABILITY 1: IPv4-mapped IPv6 addresses (::ffff:...) bypass ssrf.ts', () => {
        // In WHATWG URL parsing, new URL('http://[::ffff:127.0.0.1]').hostname
        // is normalized to '[::ffff:7f00:1]' (hex 16-bit notation), NOT dotted decimal.
        // As a result, checks like hostname.startsWith('::ffff:127.') evaluate to false!
        // This allows an attacker to bypass the loopback and metadata filters.
        const loopbackMapped = 'http://[::ffff:127.0.0.1]';
        const metadataMapped = 'http://[::ffff:169.254.169.254]';
        const privateClassAMapped = 'http://[::ffff:10.0.0.1]';
        const privateClassCMapped = 'http://[::ffff:192.168.1.1]';

        // EMPIRICAL OBSERVATION: isPrivateOrBlockedUrl returns false (permitted!)
        expect(isPrivateOrBlockedUrl(loopbackMapped)).toBe(false);
        expect(isPrivateOrBlockedUrl(metadataMapped)).toBe(false);
        expect(isPrivateOrBlockedUrl(privateClassAMapped)).toBe(false);
        expect(isPrivateOrBlockedUrl(privateClassCMapped)).toBe(false);

        // Destination validator incorrectly permits metadata through IPv4-mapped IPv6
        expect(validateDestinationUrl(metadataMapped).valid).toBe(true);
      });

      it('EMPIRICAL VULNERABILITY 2: Trailing FQDN root dot (e.g. localhost.) bypasses ssrf.ts', () => {
        // DNS resolvers consider 'localhost.' equivalent to 'localhost' (resolving to 127.0.0.1).
        // WHATWG URL parser preserves the trailing dot in hostname ('localhost.').
        // Because ssrf.ts compares hostname === 'localhost' without stripping trailing dots,
        // 'http://localhost./' bypasses the hostname check.
        const fqdnLocalhost = 'http://localhost./';
        const fqdnLocal = 'http://service.local./';

        // EMPIRICAL OBSERVATION: returns false (permitted!)
        expect(isPrivateOrBlockedUrl(fqdnLocalhost)).toBe(false);
        expect(isPrivateOrBlockedUrl(fqdnLocal)).toBe(false);
        expect(validateDestinationUrl(fqdnLocalhost).valid).toBe(true);
      });

      it('blocks alternate / obfuscated integer representations of IP addresses', () => {
        // Node WHATWG URL parser normalizes decimal, octal, and hex IPs to dotted decimal
        // 2130706433 = 127.0.0.1
        expect(isPrivateOrBlockedUrl('http://2130706433')).toBe(true);
        // 0x7f000001 = 127.0.0.1
        expect(isPrivateOrBlockedUrl('http://0x7f000001')).toBe(true);
        // 0177.0.0.1 = 127.0.0.1
        expect(isPrivateOrBlockedUrl('http://0177.0.0.1')).toBe(true);
        // 127.1 = 127.0.0.1
        expect(isPrivateOrBlockedUrl('http://127.1')).toBe(true);
        // 0 = 0.0.0.0
        expect(isPrivateOrBlockedUrl('http://0/')).toBe(true);
        // 2852039166 = 169.254.169.254
        expect(isPrivateOrBlockedUrl('http://2852039166')).toBe(true);
      });

      it('blocks non-HTTP protocols (data, ftp, gopher, ldap, ws, wss)', () => {
        const nonHttp = [
          'data:text/html,<h1>Hello</h1>',
          'ftp://ftp.example.com/archive.zip',
          'gopher://127.0.0.1:6379/_flushall',
          'ldap://127.0.0.1:389/dc=example,dc=com',
          'ws://localhost:3000',
          'wss://localhost:3000',
          'mailto:admin@example.com',
          'tel:+1234567890',
        ];

        for (const url of nonHttp) {
          expect(isPrivateOrBlockedUrl(url), `Failed for ${url}`).toBe(true);
          expect(validateDestinationUrl(url).valid).toBe(false);
        }
      });

      it('correctly permits genuine public internet URLs (zero false positives)', () => {
        const publicUrls = [
          'https://github.com/torvalds/linux',
          'https://twitter.com/creator',
          'http://example.com',
          'https://subdomain.mycompany.org/path/to/resource?query=1&flag=true#anchor',
          'https://1.1.1.1', // Cloudflare DNS
          'https://8.8.8.8', // Google DNS
          'https://93.184.216.34', // example.com IP
        ];

        for (const url of publicUrls) {
          expect(isPrivateOrBlockedUrl(url), `Failed for legitimate URL ${url}`).toBe(false);
          const validation = validateDestinationUrl(url);
          expect(validation.valid, `Expected valid for ${url}`).toBe(true);
          expect(validation.error).toBeUndefined();
        }
      });

      it('handles null, undefined, empty, and malformed inputs gracefully', () => {
        expect(isPrivateOrBlockedUrl('')).toBe(true);
        expect(isPrivateOrBlockedUrl('   ')).toBe(true);
        expect(isPrivateOrBlockedUrl(null as any)).toBe(true);
        expect(isPrivateOrBlockedUrl(undefined as any)).toBe(true);
        expect(isPrivateOrBlockedUrl('not a url at all')).toBe(true);
        expect(isPrivateOrBlockedUrl('http://')).toBe(true);
        expect(isPrivateOrBlockedUrl('https://')).toBe(true);

        expect(validateDestinationUrl('').valid).toBe(false);
        expect(validateDestinationUrl(null as any).valid).toBe(false);
        expect(validateDestinationUrl('invalid-url').valid).toBe(false);
      });
    });
  });

  // ==========================================================================
  // 2. Complete Session Lifecycle Verification
  // ==========================================================================
  describe('2. Complete Session Lifecycle Verification', () => {
    describe('2.1 End-to-End Session Lifecycle via Test Harness (Contract Verification)', () => {
      let app: any;

      beforeEach(() => {
        resetTestDb();
        app = getTestApp();
      });

      it('executes full lifecycle: signup -> session issued -> authenticated request -> logout -> session deleted -> cookie cleared -> 401', async () => {
        // Step 1: Signup
        const signupRes = await request(app)
          .post('/api/auth/signup')
          .send({
            username: 'SessionTestUser',
            email: 'sessiontest@example.com',
            password: 'StrongPassword123!',
          });

        expect(signupRes.status).toBe(201);
        expect(signupRes.body.user).toBeDefined();
        const userId = signupRes.body.user.id;
        expect(userId).toBeDefined();

        // Step 2: Session Issued
        const setCookieHeaders = signupRes.headers['set-cookie'];
        expect(setCookieHeaders).toBeDefined();
        const sessionCookieStr = setCookieHeaders.find((c: string) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
        expect(sessionCookieStr).toBeDefined();
        expect(sessionCookieStr).toContain('HttpOnly');
        expect(sessionCookieStr).toContain('Path=/');

        // Extract session ID from cookie
        const match = /linkpulse_session=([^;]+)/.exec(sessionCookieStr!);
        expect(match).toBeDefined();
        const sessionId = match![1];
        expect(sessionId.startsWith('sess_')).toBe(true);

        // Verify session exists in storage
        const storedSession = testDb.sessions.get(sessionId);
        expect(storedSession).toBeDefined();
        expect(storedSession?.user_id).toBe(userId);
        expect(new Date(storedSession!.expires_at).getTime()).toBeGreaterThan(Date.now());

        // Step 3: Authenticated Request
        const meRes = await request(app)
          .get('/api/auth/me')
          .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionId}`]);

        expect(meRes.status).toBe(200);
        expect(meRes.body.user).toBeDefined();
        expect(meRes.body.user.username).toBe('SessionTestUser');
        expect(meRes.body.user.email).toBe('sessiontest@example.com');
        expect(meRes.body.profile).toBeDefined();

        // Step 4: Logout
        const logoutRes = await request(app)
          .post('/api/auth/logout')
          .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionId}`]);

        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.message).toContain('Logged out successfully');

        // Step 5: Session deleted from sessions table
        expect(testDb.sessions.has(sessionId)).toBe(false);
        expect(testDb.sessions.get(sessionId)).toBeUndefined();

        // Step 6: Cookie cleared in logout response
        const logoutCookies = logoutRes.headers['set-cookie'];
        expect(logoutCookies).toBeDefined();
        const clearedCookieStr = logoutCookies.find((c: string) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
        expect(clearedCookieStr).toBeDefined();
        // Cleared cookies typically have Expires in the past or Max-Age=0 / empty value
        expect(
          clearedCookieStr!.includes('Expires=Thu, 01 Jan 1970') ||
          clearedCookieStr!.includes('Max-Age=0') ||
          clearedCookieStr!.startsWith(`${SESSION_COOKIE_NAME}=;`)
        ).toBe(true);

        // Step 7: Subsequent request with old session returns 401
        const subsequentRes = await request(app)
          .get('/api/auth/me')
          .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionId}`]);

        expect(subsequentRes.status).toBe(401);
        expect(subsequentRes.body.error).toBe('Session expired or invalid');

        // Step 8: Subsequent request without cookie returns 401
        const noCookieRes = await request(app).get('/api/auth/me');
        expect(noCookieRes.status).toBe(401);
        expect(noCookieRes.body.error).toBe('Authentication required');
      });
    });

    describe('2.2 Production Session Service Mechanics (server/services/session.service.ts)', () => {
      it('creates session with 32-byte hex ID, 7-day expiration, and metadata', async () => {
        const fakeUserId = 'usr_test_lifecycle_1';
        const mockCreate = vi.fn().mockImplementation(async (args) => {
          return {
            id: args.data.id,
            userId: args.data.userId,
            data: args.data.data,
            expiresAt: args.data.expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

        const originalCreate = prisma.session.create;
        (prisma.session as any).create = mockCreate;

        try {
          const session = await createSession(fakeUserId, {
            ip: '192.0.2.1',
            userAgent: 'Mozilla/5.0 Vitest Empirical Test',
          });

          expect(session).toBeDefined();
          expect(session.id.startsWith('sess_')).toBe(true);
          // 'sess_' (5 chars) + 64 hex chars = 69 chars
          expect(session.id.length).toBe(69);
          expect(session.userId).toBe(fakeUserId);

          const expectedExpiry = Date.now() + SESSION_DURATION_SECONDS * 1000;
          expect(session.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000);
          expect(session.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 5000);

          expect(mockCreate).toHaveBeenCalledTimes(1);
          const callData = mockCreate.mock.calls[0][0].data;
          expect(callData.userId).toBe(fakeUserId);
          expect(callData.data.ip).toBe('192.0.2.1');
          expect(callData.data.userAgent).toBe('Mozilla/5.0 Vitest Empirical Test');
        } finally {
          (prisma.session as any).create = originalCreate;
        }
      });

      it('validates active session and retrieves user relation', async () => {
        const fakeSessionId = 'sess_active_valid_session_token_12345';
        const fakeUser = {
          id: 'usr_valid_1',
          username: 'ValidUser',
          email: 'valid@example.com',
          role: 'user',
          status: 'active',
          emailVerifiedAt: new Date(),
        };

        const mockFindUnique = vi.fn().mockResolvedValue({
          id: fakeSessionId,
          userId: fakeUser.id,
          expiresAt: new Date(Date.now() + 100000),
          user: fakeUser,
        });

        const originalFind = prisma.session.findUnique;
        (prisma.session as any).findUnique = mockFindUnique;

        try {
          const result = await validateSession(fakeSessionId);
          expect(result).toBeDefined();
          expect(result?.session.id).toBe(fakeSessionId);
          expect(result?.user.id).toBe(fakeUser.id);
        } finally {
          (prisma.session as any).findUnique = originalFind;
        }
      });

      it('lazily deletes expired session and returns null', async () => {
        const expiredSessionId = 'sess_expired_session_token_12345';
        const mockFindUnique = vi.fn().mockResolvedValue({
          id: expiredSessionId,
          userId: 'usr_expired',
          expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
          user: { id: 'usr_expired', status: 'active' },
        });

        const mockDelete = vi.fn().mockResolvedValue({ id: expiredSessionId });

        const originalFind = prisma.session.findUnique;
        const originalDelete = prisma.session.delete;
        (prisma.session as any).findUnique = mockFindUnique;
        (prisma.session as any).delete = mockDelete;

        try {
          const result = await validateSession(expiredSessionId);
          expect(result).toBeNull();
          expect(mockDelete).toHaveBeenCalledWith({ where: { id: expiredSessionId } });
        } finally {
          (prisma.session as any).findUnique = originalFind;
          (prisma.session as any).delete = originalDelete;
        }
      });

      it('destroySession removes session by ID and returns boolean status', async () => {
        const sessionId = 'sess_to_destroy_12345';
        const mockDelete = vi.fn().mockResolvedValue({ id: sessionId });

        const originalDelete = prisma.session.delete;
        (prisma.session as any).delete = mockDelete;

        try {
          const destroyed = await destroySession(sessionId);
          expect(destroyed).toBe(true);
          expect(mockDelete).toHaveBeenCalledWith({ where: { id: sessionId } });

          // Non-existent session
          mockDelete.mockRejectedValueOnce(new Error('Record to delete does not exist'));
          const notFoundDestroy = await destroySession('sess_nonexistent');
          expect(notFoundDestroy).toBe(false);
        } finally {
          (prisma.session as any).delete = originalDelete;
        }
      });

      it('destroyUserSessions revokes all sessions for a user (account suspension / password reset)', async () => {
        const userId = 'usr_target_user_1';
        const mockDeleteMany = vi.fn().mockResolvedValue({ count: 3 });

        const originalDeleteMany = prisma.session.deleteMany;
        (prisma.session as any).deleteMany = mockDeleteMany;

        try {
          const count = await destroyUserSessions(userId);
          expect(count).toBe(3);
          expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId } });
        } finally {
          (prisma.session as any).deleteMany = originalDeleteMany;
        }
      });

      it('verifies session cookie security options', () => {
        const options = getSessionCookieOptions();
        expect(options.httpOnly).toBe(true);
        expect(options.sameSite).toBe('lax');
        expect(options.path).toBe('/');
        expect(options.maxAge).toBe(SESSION_DURATION_SECONDS * 1000);
      });
    });

    describe('2.3 Auth Middleware Rejection Policies (server/middleware/auth.middleware.ts)', () => {
      it('rejects unauthenticated request with 401 when cookie is missing', async () => {
        const req = { cookies: {} } as Request;
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        } as unknown as Response;
        const next = vi.fn();

        await requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(next).not.toHaveBeenCalled();
      });

      it('clears invalid cookie and returns 401 when session validation returns null', async () => {
        const req = { cookies: { [SESSION_COOKIE_NAME]: 'sess_invalid_token' } } as Request;
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
          clearCookie: vi.fn(),
        } as unknown as Response;
        const next = vi.fn();

        const originalFind = prisma.session.findUnique;
        (prisma.session as any).findUnique = vi.fn().mockResolvedValue(null);

        try {
          await requireAuth(req, res, next);
          expect(res.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, { path: '/' });
          expect(res.status).toHaveBeenCalledWith(401);
          expect(res.json).toHaveBeenCalledWith({ error: 'Session expired or invalid' });
          expect(next).not.toHaveBeenCalled();
        } finally {
          (prisma.session as any).findUnique = originalFind;
        }
      });

      it('rejects suspended user with 403', async () => {
        const req = { cookies: { [SESSION_COOKIE_NAME]: 'sess_suspended_user' } } as Request;
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        } as unknown as Response;
        const next = vi.fn();

        const originalFind = prisma.session.findUnique;
        (prisma.session as any).findUnique = vi.fn().mockResolvedValue({
          id: 'sess_suspended_user',
          userId: 'usr_suspended',
          expiresAt: new Date(Date.now() + 100000),
          user: { id: 'usr_suspended', status: 'suspended', role: 'user' },
        });

        try {
          await requireAuth(req, res, next);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith({ error: 'Account is suspended. Please contact support.' });
          expect(next).not.toHaveBeenCalled();
        } finally {
          (prisma.session as any).findUnique = originalFind;
        }
      });

      it('attaches user and session to request and calls next for valid active user', async () => {
        const req = { cookies: { [SESSION_COOKIE_NAME]: 'sess_active_user' } } as any;
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        } as unknown as Response;
        const next = vi.fn();

        const fakeSession = {
          id: 'sess_active_user',
          userId: 'usr_active',
          expiresAt: new Date(Date.now() + 100000),
        };
        const fakeUser = { id: 'usr_active', status: 'active', role: 'user' };

        const originalFind = prisma.session.findUnique;
        (prisma.session as any).findUnique = vi.fn().mockResolvedValue({
          ...fakeSession,
          user: fakeUser,
        });

        try {
          await requireAuth(req, res, next);
          expect(req.user).toEqual(fakeUser);
          expect(req.session).toEqual(expect.objectContaining(fakeSession));
          expect(next).toHaveBeenCalledTimes(1);
        } finally {
          (prisma.session as any).findUnique = originalFind;
        }
      });
    });
  });
});
