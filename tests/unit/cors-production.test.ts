import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { isAllowedOrigin } from '../../server/middleware/security.middleware.js';
import { buildApiUrl, API_BASE_URL } from '../../src/api/client.js';

describe('Production CORS & API Communication Verification', () => {
  const app = createApp();

  describe('Origin Allowlist Logic (isAllowedOrigin)', () => {
    it('should allow the deployed Vercel production origin', () => {
      expect(isAllowedOrigin('https://linkkpluss.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://linkkpluss.vercel.app/')).toBe(true);
    });

    it('should allow local development origins', () => {
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
    });

    it('should reject unauthorized malicious third-party origins', () => {
      expect(isAllowedOrigin('https://evil-hacker.com')).toBe(false);
      expect(isAllowedOrigin('http://malicious-site.org')).toBe(false);
    });

    it('should permit non-browser or server-to-server requests without origin', () => {
      expect(isAllowedOrigin(undefined)).toBe(true);
      expect(isAllowedOrigin('')).toBe(true);
    });
  });

  describe('OPTIONS Preflight Handling', () => {
    it('should respond to preflight OPTIONS for https://linkkpluss.vercel.app with 204 and CORS headers', async () => {
      const res = await request(app)
        .options('/api/auth/signup')
        .set('Origin', 'https://linkkpluss.vercel.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('https://linkkpluss.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should respond to preflight OPTIONS for localhost:5173', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Frontend API URL Construction (src/api/client.ts)', () => {
    it('should construct correct API endpoints without duplicate slashes', () => {
      const url1 = buildApiUrl('/api/auth/signup');
      expect(url1).toBe(`${API_BASE_URL}/api/auth/signup`);
      expect(url1).not.toContain('//api');

      const url2 = buildApiUrl('api/auth/login');
      expect(url2).toBe(`${API_BASE_URL}/api/auth/login`);

      const absolute = buildApiUrl('https://example.com/api/test');
      expect(absolute).toBe('https://example.com/api/test');
    });
  });

  describe('CORS Headers on Errors for Legitimate Origins', () => {
    it('should ensure validation errors (400) return CORS headers to https://linkkpluss.vercel.app', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .set('Origin', 'https://linkkpluss.vercel.app')
        .send({
          username: '',
          email: 'invalid-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.headers['access-control-allow-origin']).toBe('https://linkkpluss.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.body.error).toBeDefined();
    });
  });
});
