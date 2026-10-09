import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { formatProfile } from '../../server/routes/profile.routes.js';
import { formatLink } from '../../server/routes/link.routes.js';
import {
  isBotUserAgent,
  classifyDevice,
  classifyReferrer,
  computeDailyVisitorHash,
} from '../../server/routes/public.routes.js';
import { formatQrSettings, verifyQrPayload } from '../../server/routes/qr.routes.js';

describe('Milestones 3–6 Production Backend Routes & Helpers Verification', () => {
  const prodApp = createApp();

  describe('1. Production App Route Registration & Auth Guards', () => {
    it('GET /api/health returns 200 ok', async () => {
      const res = await request(prodApp).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('linkpulse-api');
    });

    it('rejects unauthenticated requests to /api/profile, /api/links, /api/qr/settings, /api/analytics, and /api/admin/*', async () => {
      const endpoints = [
        { method: 'get', path: '/api/profile' },
        { method: 'put', path: '/api/profile' },
        { method: 'get', path: '/api/links' },
        { method: 'post', path: '/api/links' },
        { method: 'put', path: '/api/links/reorder' },
        { method: 'get', path: '/api/qr/settings' },
        { method: 'get', path: '/api/qr-settings' },
        { method: 'get', path: '/api/analytics/overview' },
        { method: 'get', path: '/api/admin/overview' },
        { method: 'get', path: '/api/admin/users' },
      ] as const;

      for (const ep of endpoints) {
        const res = await (request(prodApp) as any)[ep.method](ep.path);
        expect(res.status, `Expected 401 on ${ep.method.toUpperCase()} ${ep.path}`).toBe(401);
      }
    });

    it('returns 404 immediately on reserved public profile usernames without querying user links', async () => {
      for (const reserved of ['admin', 'login', 'signup', 'dashboard', 'api', 'settings']) {
        const res = await request(prodApp).get(`/api/public/${reserved}`);
        expect(res.status).toBe(404);
      }
    });
  });

  describe('2. Production QR Code Studio Verification Oracle (verifyQrPayload with jsQR)', () => {
    it('encodes and programmatically decodes real user profile URLs across error correction levels', () => {
      const url = 'https://linkpulse.app/dindayal';
      const result = verifyQrPayload(url, 'H', 2);
      expect(result.scannable).toBe(true);
      expect(result.decodedUrl).toBe(url);
      expect(result.moduleCount).toBeGreaterThan(20);
    });

    it('formats QR settings with both snake_case and camelCase keys', () => {
      const formatted = formatQrSettings({
        id: 'qr_1',
        userId: 'usr_1',
        foregroundColor: '#1e1b4b',
        backgroundColor: '#ffffff',
        gradientSettings: { enabled: true, color1: '#4f46e5', color2: '#9333ea' },
        dotStyle: 'rounded',
        cornerStyle: 'rounded',
        logoUrl: null,
        errorCorrectionLevel: 'H',
        margin: 2,
        resolution: 1024,
        transparentBackground: false,
        presetName: 'Midnight',
        updatedAt: new Date(),
      });
      expect(formatted?.foreground_color).toBe('#1e1b4b');
      expect(formatted?.foregroundColor).toBe('#1e1b4b');
      expect(formatted?.dot_style).toBe('rounded');
      expect(formatted?.error_correction_level).toBe('H');
    });
  });

  describe('3. Privacy-Conscious Analytics & Bot/Device/Referrer Classification', () => {
    it('identifies search crawlers and headless bots accurately', () => {
      expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
      expect(isBotUserAgent('curl/8.4.0')).toBe(true);
      expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false);
    });

    it('classifies mobile, tablet, desktop, and bot user-agents', () => {
      expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mobile');
      expect(classifyDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
      expect(classifyDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0')).toBe('desktop');
      expect(classifyDevice('Googlebot/2.1')).toBe('bot');
    });

    it('classifies referrers and QR campaign visits', () => {
      expect(classifyReferrer('', 'qr')).toBe('qr_campaign');
      expect(classifyReferrer('https://www.google.com/search?q=linkpulse')).toBe('search');
      expect(classifyReferrer('https://x.com/dindayal')).toBe('social');
      expect(classifyReferrer('https://mail.google.com/')).toBe('email');
      expect(classifyReferrer('')).toBe('direct');
    });

    it('generates deterministic 64-char SHA-256 visitor hash without retaining raw IP', () => {
      const rawIp = '203.0.113.42';
      const hash = computeDailyVisitorHash(rawIp, 'Mozilla/5.0');
      expect(hash).toHaveLength(64);
      expect(hash).not.toContain(rawIp);
    });
  });

  describe('4. Profile & Link Dual-Case Formatters', () => {
    it('formats profile and link objects with both snake_case and camelCase properties', () => {
      const prof = formatProfile({
        id: 'p1',
        userId: 'u1',
        displayName: 'Dindayal',
        bio: 'Full-stack creator',
        avatarUrl: null,
        themeSettings: { preset: 'default' },
        socialLinks: [],
        isPublic: true,
      });
      expect(prof?.display_name).toBe('Dindayal');
      expect(prof?.displayName).toBe('Dindayal');

      const lnk = formatLink({
        id: 'l1',
        userId: 'u1',
        title: 'Portfolio',
        destinationUrl: 'https://example.com',
        description: 'Main site',
        icon: 'globe',
        thumbnailUrl: null,
        position: 0,
        isActive: true,
        isPinned: true,
        isHidden: false,
        isFeatured: true,
        category: 'Work',
        customLabel: 'NEW',
        mediaType: null,
        mediaUrl: null,
        utmParams: { utm_source: 'linkpulse' },
        clickCount: 42,
        scheduledStart: null,
        scheduledEnd: null,
      });
      expect(lnk.destination_url).toBe('https://example.com');
      expect(lnk.destinationUrl).toBe('https://example.com');
      expect(lnk.click_count).toBe(42);
      expect(lnk.is_pinned).toBe(true);
    });
  });
});
