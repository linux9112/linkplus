import { describe, it, expect } from 'vitest';
import {
  isPrivateOrBlockedUrl,
  sanitizeHtml,
  generateVisitorHash,
  isBot,
} from '../setup.js';

describe('Unit: Security Middleware & Sanitization Primitives', () => {
  describe('SSRF Protection (isPrivateOrBlockedUrl)', () => {
    it('should block localhost and private IPv4 ranges', () => {
      expect(isPrivateOrBlockedUrl('http://localhost')).toBe(true);
      expect(isPrivateOrBlockedUrl('http://localhost:8080/admin')).toBe(true);
      expect(isPrivateOrBlockedUrl('http://127.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedUrl('http://10.0.0.1')).toBe(true);
      expect(isPrivateOrBlockedUrl('http://172.16.0.1')).toBe(true);
      expect(isPrivateOrBlockedUrl('http://192.168.1.1')).toBe(true);
      expect(isPrivateOrBlockedUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
    });

    it('should block invalid schemes like file: and javascript:', () => {
      expect(isPrivateOrBlockedUrl('file:///etc/passwd')).toBe(true);
      expect(isPrivateOrBlockedUrl('javascript:alert(1)')).toBe(true);
    });

    it('should allow genuine public HTTPS and HTTP URLs', () => {
      expect(isPrivateOrBlockedUrl('https://github.com')).toBe(false);
      expect(isPrivateOrBlockedUrl('https://example.com/shop?id=123')).toBe(false);
      expect(isPrivateOrBlockedUrl('http://myblog.org/article')).toBe(false);
    });
  });

  describe('HTML / XSS Sanitization (sanitizeHtml)', () => {
    it('should escape angle brackets, ampersands, and quotes', () => {
      const malicious = '<script>alert("xss")</script>&<img src="x" onerror=\'test()\'>';
      const clean = sanitizeHtml(malicious);

      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('</script>');
      expect(clean).not.toContain('<img');
      expect(clean).toContain('&lt;script&gt;');
      expect(clean).toContain('&amp;');
      expect(clean).toContain('&quot;');
      expect(clean).toContain('&#039;');
    });
  });

  describe('Privacy-Conscious Visitor Hashing (generateVisitorHash)', () => {
    it('should generate a 64-character SHA-256 hash without exposing raw IP', () => {
      const ip = '203.0.113.195';
      const userAgent = 'Mozilla/5.0';
      const hash1 = generateVisitorHash(ip, userAgent, '2026-10-09');
      const hash2 = generateVisitorHash(ip, userAgent, '2026-10-09');
      const differentDayHash = generateVisitorHash(ip, userAgent, '2026-10-10');

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(differentDayHash);
      expect(hash1).not.toContain(ip);
    });
  });

  describe('Bot User-Agent Filtering (isBot)', () => {
    it('should flag automated crawlers, spiders, and curl', () => {
      expect(isBot('Googlebot/2.1')).toBe(true);
      expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
      expect(isBot('curl/7.68.0')).toBe(true);
      expect(isBot('python-requests/2.28.1')).toBe(true);
      expect(isBot('Wget/1.20.3')).toBe(true);
    });

    it('should identify legitimate user browsers', () => {
      expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')).toBe(false);
      expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')).toBe(false);
    });
  });
});
