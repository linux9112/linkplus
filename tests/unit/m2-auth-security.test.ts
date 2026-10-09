import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import {
  isReservedUsername,
  validateUsername,
  RESERVED_USERNAMES,
} from '../../server/utils/reserved-usernames.js';
import {
  isPrivateOrBlockedUrl,
  validateDestinationUrl,
  sanitizeHtml,
} from '../../server/utils/ssrf.js';

describe('Milestone 2 Unit & API Contract Verification', () => {
  const app = createApp();

  // ==========================================================================
  // 1. Reserved Usernames Verification
  // ==========================================================================
  describe('Reserved Usernames (server/utils/reserved-usernames.ts)', () => {
    it('should block all platform-critical keywords case-insensitively', () => {
      const keywords = [
        'admin',
        'ADMIN',
        'login',
        'Login',
        'signup',
        'dashboard',
        'settings',
        'api',
        'assets',
        'r',
        'public',
        'auth',
        'profile',
        'links',
        'qr',
        'analytics',
        'null',
        'undefined',
        '404',
      ];

      for (const kw of keywords) {
        expect(isReservedUsername(kw)).toBe(true);
      }
    });

    it('should validate format and reject reserved usernames via validateUsername', () => {
      expect(validateUsername('admin')).toEqual({
        valid: false,
        error: 'Username is reserved by the platform',
      });
      expect(validateUsername('ab')).toEqual({
        valid: false,
        error: 'Username must be between 3 and 30 characters',
      });
      expect(validateUsername('user!name')).toEqual({
        valid: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens',
      });
      expect(validateUsername('valid_creator-99')).toEqual({ valid: true });
    });
  });

  // ==========================================================================
  // 2. SSRF Protection Verification
  // ==========================================================================
  describe('SSRF Protection (server/utils/ssrf.ts)', () => {
    it('should block private subnets, loopbacks, and cloud metadata IPs', () => {
      const blockedUrls = [
        'http://localhost',
        'http://localhost:3000',
        'http://127.0.0.1:8080/admin',
        'http://0.0.0.0:5000',
        'http://10.0.0.1/internal',
        'http://172.16.0.1/secret',
        'http://192.168.1.1/router',
        'http://169.254.169.254/latest/meta-data/',
        'http://100.64.0.1',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'data:text/html,test',
        'ftp://example.com/file',
      ];

      for (const url of blockedUrls) {
        expect(isPrivateOrBlockedUrl(url)).toBe(true);
        expect(validateDestinationUrl(url).valid).toBe(false);
      }
    });

    it('should allow legitimate public HTTP/HTTPS URLs', () => {
      const allowedUrls = [
        'https://github.com/myuser',
        'https://twitter.com/myuser',
        'https://example.com/blog/article?id=42&ref=social',
        'http://myportfolio.dev',
      ];

      for (const url of allowedUrls) {
        expect(isPrivateOrBlockedUrl(url)).toBe(false);
        expect(validateDestinationUrl(url).valid).toBe(true);
      }
    });

    it('should sanitize HTML to protect against XSS', () => {
      const malicious = '<script>alert(1)</script>&"test"\'val\'';
      const clean = sanitizeHtml(malicious);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
      expect(clean).toContain('&amp;');
      expect(clean).toContain('&quot;');
      expect(clean).toContain('&#039;');
    });
  });

  // ==========================================================================
  // 3. Express App & Security Middleware Verification
  // ==========================================================================
  describe('Express App & Middleware (server/app.ts)', () => {
    it('GET /api/health should return 200 with service status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('linkpulse-api');
    });

    it('POST /api/auth/signup should enforce strictly 3 fields and reject extra fields', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'ValidUser',
          email: 'valid@example.com',
          password: 'Password123!',
          is_admin: true, // Forbidden extra field
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('strictly username, email, and password');
    });

    it('POST /api/auth/signup should reject reserved usernames with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'admin',
          email: 'admin@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('username');
      expect(res.body.error).toContain('reserved');
    });

    it('POST /api/auth/signup should reject invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'validuser',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('email');
    });

    it('POST /api/auth/signup should reject short passwords with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'validuser',
          email: 'user@example.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe('password');
    });

    it('POST /api/auth/login should reject missing credentials with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('GET /api/auth/me without session cookie should return 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('GET /api/nonexistent-route should return 404 JSON', async () => {
      const res = await request(app).get('/api/nonexistent-route');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('API route not found');
    });
  });
});
