import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  getTestApp,
  resetTestDb,
  createTestSession,
  testDb,
} from '../setup.js';

describe('Tier 2: Boundary & Corner Cases (Stress & Security)', () => {
  let app: any;
  let standardCookie: string;

  beforeEach(() => {
    resetTestDb();
    app = getTestApp();
    const sessionId = createTestSession('usr_standard_1');
    standardCookie = `linkpulse_session=${sessionId}`;
  });

  // ==========================================================================
  // 1. Email Boundary & Malformation Tests
  // ==========================================================================
  describe('1. Email Format & Boundary Validation', () => {
    it('1.1 should reject email missing "@" symbol', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'ValidUser',
          email: 'invalidemail.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('email');
    });

    it('1.2 should reject email missing TLD or domain', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'ValidUser',
          email: 'user@nodomain',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('email');
    });

    it('1.3 should reject email with spaces', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'ValidUser',
          email: 'user name@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('email');
    });

    it('1.4 should reject email exceeding 255 characters', async () => {
      const longLocal = 'a'.repeat(250);
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'ValidUser',
          email: `${longLocal}@example.com`,
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('email');
    });
  });

  // ==========================================================================
  // 2. Username Length & Character Boundaries
  // ==========================================================================
  describe('2. Username Length & Character Boundaries', () => {
    it('2.1 should reject username shorter than 3 characters (boundary: 2 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'ab',
          email: 'ab@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('username');
    });

    it('2.2 should accept exact minimum boundary username (boundary: 3 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'abc',
          email: 'abc@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe('abc');
    });

    it('2.3 should accept exact maximum boundary username (boundary: 30 chars)', async () => {
      const exact30 = 'a'.repeat(30);
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: exact30,
          email: 'max30@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe(exact30);
    });

    it('2.4 should reject username exceeding 30 characters (boundary: 31 chars)', async () => {
      const long31 = 'a'.repeat(31);
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: long31,
          email: 'over30@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('username');
    });

    it('2.5 should reject special characters in username (spaces, $, #, @, dots)', async () => {
      const invalidNames = ['user name', 'user$name', 'user#1', 'user.name', 'user!'];

      for (const username of invalidNames) {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            username,
            email: `test_${Math.random()}@example.com`,
            password: 'Password123!',
          });

        expect(res.status).toBe(400);
        expect(res.body.field).toBe('username');
      }
    });
  });

  // ==========================================================================
  // 3. SQL Injection Payloads Defense
  // ==========================================================================
  describe('3. SQL Injection Resilience', () => {
    it('3.1 should safely handle SQL injection login bypass payload in identifier', async () => {
      const payloads = [
        "' OR '1'='1",
        "admin'--",
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
      ];

      for (const identifier of payloads) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            identifier,
            password: 'Password123!',
          });

        // Must reject without crashing or authenticating
        expect(res.status).toBe(401);
      }
    });

    it('3.2 should safely handle SQL injection payload in search queries', async () => {
      const adminSess = createTestSession('usr_admin_1');
      const res = await request(app)
        .get('/api/admin/users?q=%27%20OR%201=1%20--')
        .set('Cookie', [`linkpulse_session=${adminSess}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Stored XSS & HTML Sanitization
  // ==========================================================================
  describe('4. Stored XSS & HTML Sanitization', () => {
    it('4.1 should sanitize XSS payloads in profile display_name and bio', async () => {
      const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';

      const res = await request(app)
        .put('/api/profile')
        .set('Cookie', [standardCookie])
        .send({
          display_name: xssPayload,
          bio: 'Safe bio ' + xssPayload,
        });

      expect(res.status).toBe(200);
      // Assert tags are escaped
      expect(res.body.profile.display_name).not.toContain('<script>');
      expect(res.body.profile.display_name).toContain('&lt;script&gt;');
      expect(res.body.profile.bio).not.toContain('<img');
    });

    it('4.2 should sanitize XSS in link titles and descriptions', async () => {
      const res = await request(app)
        .post('/api/links')
        .set('Cookie', [standardCookie])
        .send({
          title: '<svg onload=alert(1)>Malicious Title',
          destination_url: 'https://example.com/safe',
          description: '<iframe src="evil.com"></iframe>',
        });

      expect(res.status).toBe(201);
      expect(res.body.link.title).not.toContain('<svg');
      expect(res.body.link.title).toContain('&lt;svg');
      expect(res.body.link.description).not.toContain('<iframe');
    });
  });

  // ==========================================================================
  // 5. SSRF Attack Protection on Link Destinations
  // ==========================================================================
  describe('5. SSRF Defense on Destination URLs', () => {
    it('5.1 should block localhost and loopback IPv4 addresses', async () => {
      const blockedUrls = [
        'http://localhost',
        'http://localhost:3000',
        'http://127.0.0.1',
        'http://127.0.0.1:8080/admin',
        'http://0.0.0.0',
      ];

      for (const url of blockedUrls) {
        const res = await request(app)
          .post('/api/links')
          .set('Cookie', [standardCookie])
          .send({ title: 'Internal', destination_url: url });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('internal or private');
      }
    });

    it('5.2 should block cloud metadata IP (169.254.169.254)', async () => {
      const res = await request(app)
        .post('/api/links')
        .set('Cookie', [standardCookie])
        .send({
          title: 'AWS Meta',
          destination_url: 'http://169.254.169.254/latest/meta-data/',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('internal or private');
    });

    it('5.3 should block private subnet IPs (10.x.x.x, 192.168.x.x, 172.16.x.x)', async () => {
      const privateIps = [
        'http://10.0.0.1',
        'http://192.168.1.1/router',
        'http://172.16.0.10',
      ];

      for (const url of privateIps) {
        const res = await request(app)
          .post('/api/links')
          .set('Cookie', [standardCookie])
          .send({ title: 'Subnet', destination_url: url });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('internal or private');
      }
    });

    it('5.4 should block non-http protocols (file://, javascript:, ftp://)', async () => {
      const blockedProtocols = [
        'file:///etc/passwd',
        'javascript:alert(1)',
        'ftp://example.com/file',
      ];

      for (const url of blockedProtocols) {
        const res = await request(app)
          .post('/api/links')
          .set('Cookie', [standardCookie])
          .send({ title: 'Protocol Attack', destination_url: url });

        expect(res.status).toBe(400);
      }
    });
  });

  // ==========================================================================
  // 6. Precise Scheduling Boundary Tests
  // ==========================================================================
  describe('6. Precise Scheduling Boundary Calculations', () => {
    it('6.1 should show link whose scheduled start was 1 second ago', async () => {
      const past1s = new Date(Date.now() - 1000);
      await request(app)
        .post('/api/links')
        .set('Cookie', [standardCookie])
        .send({
          title: 'Start 1s Ago',
          destination_url: 'https://example.com',
          scheduled_start: past1s.toISOString(),
        });

      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(200);
      expect(res.body.links.some((l: any) => l.title === 'Start 1s Ago')).toBe(true);
    });

    it('6.2 should NOT show link whose scheduled start is 5 seconds in the future', async () => {
      const future5s = new Date(Date.now() + 5000);
      await request(app)
        .post('/api/links')
        .set('Cookie', [standardCookie])
        .send({
          title: 'Start 5s Future',
          destination_url: 'https://example.com',
          scheduled_start: future5s.toISOString(),
        });

      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(200);
      expect(res.body.links.some((l: any) => l.title === 'Start 5s Future')).toBe(false);
    });

    it('6.3 should show link whose scheduled end is 5 seconds in the future', async () => {
      const future5s = new Date(Date.now() + 5000);
      await request(app)
        .post('/api/links')
        .set('Cookie', [standardCookie])
        .send({
          title: 'End 5s Future',
          destination_url: 'https://example.com',
          scheduled_end: future5s.toISOString(),
        });

      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(200);
      expect(res.body.links.some((l: any) => l.title === 'End 5s Future')).toBe(true);
    });

    it('6.4 should NOT show link whose scheduled end was 1 second ago', async () => {
      const past1s = new Date(Date.now() - 1000);
      await request(app)
        .post('/api/links')
        .set('Cookie', [standardCookie])
        .send({
          title: 'End 1s Past',
          destination_url: 'https://example.com',
          scheduled_end: past1s.toISOString(),
        });

      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(200);
      expect(res.body.links.some((l: any) => l.title === 'End 1s Past')).toBe(false);
    });
  });

  // ==========================================================================
  // 7. Expired & Tampered Sessions
  // ==========================================================================
  describe('7. Session Security & Edge Cases', () => {
    it('7.1 should reject non-existent session cookie with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['linkpulse_session=sess_nonexistent_fake_token']);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Session expired or invalid');
    });

    it('7.2 should reject expired session with 401', async () => {
      // Create session expired 1 hour ago
      const expiredSessId = 'sess_expired_1';
      testDb.sessions.set(expiredSessId, {
        id: expiredSessId,
        user_id: 'usr_standard_1',
        data: null,
        expires_at: new Date(Date.now() - 3600000), // -1 hour
        created_at: new Date(Date.now() - 7200000),
        updated_at: new Date(Date.now() - 7200000),
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`linkpulse_session=${expiredSessId}`]);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Session expired or invalid');
    });
  });

  // ==========================================================================
  // 8. Bot User-Agent Filtering on Analytics
  // ==========================================================================
  describe('8. Bot User-Agent Analytics Filtering', () => {
    it('8.1 should NOT record analytics event when visited by search engine crawler or curl', async () => {
      const botAgents = [
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'curl/7.68.0',
        'python-requests/2.28.1',
      ];

      for (const userAgent of botAgents) {
        await request(app)
          .get('/api/public/StandardUser')
          .set('User-Agent', userAgent);
      }

      // Zero analytics events should have been created for crawlers
      expect(testDb.analyticsEvents).toHaveLength(0);
    });

    it('8.2 should record analytics event for genuine human mobile browser', async () => {
      await request(app)
        .get('/api/public/StandardUser')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15');

      expect(testDb.analyticsEvents).toHaveLength(1);
      expect(testDb.analyticsEvents[0].device_category).toBe('mobile');
    });
  });

  // ==========================================================================
  // 9. Empty States & Non-Existent Resources
  // ==========================================================================
  describe('9. Empty States & Missing Resources', () => {
    it('9.1 should return empty array when user profile has no links created yet', async () => {
      const res = await request(app).get('/api/public/StandardUser');
      expect(res.status).toBe(200);
      expect(res.body.links).toEqual([]);
    });

    it('9.2 should return 404 when redirecting to non-existent link ID', async () => {
      const res = await request(app).get('/r/non_existent_link_id');
      expect(res.status).toBe(404);
    });

    it('9.3 should return 404 when updating non-existent link ID', async () => {
      const res = await request(app)
        .put('/api/links/non_existent_link_id')
        .set('Cookie', [standardCookie])
        .send({ title: 'New' });

      expect(res.status).toBe(404);
    });

    it('9.4 should return 404 when deleting non-existent link ID', async () => {
      const res = await request(app)
        .delete('/api/links/non_existent_link_id')
        .set('Cookie', [standardCookie]);

      expect(res.status).toBe(404);
    });
  });
});
