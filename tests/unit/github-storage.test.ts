import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  githubStorageService,
  GitHubStorageError,
  normalizeCategory,
  isAllowedImageExtension,
  generateSafeGitHubPath,
  buildRawGitHubUrl,
  buildCdnGitHubUrl,
  buildProxyImageUrl,
  MAX_IMAGE_SIZE,
} from '../../server/services/github-storage.service.js';
import { validateImageMagicBytes, parseDataImageUri } from '../../server/utils/image-storage.js';
import { uploadRateLimiter } from '../../server/middleware/rate-limit.middleware.js';

describe('GitHub Centralized Image Storage Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Configuration & Metadata', () => {
    it('should expose storage configuration without leaking sensitive tokens', () => {
      const config = githubStorageService.getConfig();
      expect(config.owner).toBe('linux9112');
      expect(config.repo).toBe('linkplus');
      expect(config.branch).toBe('main');
      expect(config.pathPrefix).toBe('uploads');
      // Token must not be present in public config object
      expect((config as any).token).toBeUndefined();
      expect((config as any).GITHUB_TOKEN).toBeUndefined();
    });

    it('should correctly normalize storage categories', () => {
      expect(normalizeCategory('avatar')).toBe('avatars');
      expect(normalizeCategory('avatars')).toBe('avatars');
      expect(normalizeCategory('cover')).toBe('banners');
      expect(normalizeCategory('covers')).toBe('banners');
      expect(normalizeCategory('banner')).toBe('banners');
      expect(normalizeCategory('banners')).toBe('banners');
      expect(normalizeCategory('link')).toBe('links');
      expect(normalizeCategory('links')).toBe('links');
      expect(normalizeCategory('anything_else')).toBe('links');
    });

    it('should validate allowed image formats', () => {
      expect(isAllowedImageExtension('png')).toBe(true);
      expect(isAllowedImageExtension('jpg')).toBe(true);
      expect(isAllowedImageExtension('jpeg')).toBe(true);
      expect(isAllowedImageExtension('webp')).toBe(true);
      expect(isAllowedImageExtension('svg')).toBe(true);
      expect(isAllowedImageExtension('gif')).toBe(true);

      expect(isAllowedImageExtension('exe')).toBe(false);
      expect(isAllowedImageExtension('sh')).toBe(false);
      expect(isAllowedImageExtension('php')).toBe(false);
      expect(isAllowedImageExtension('html')).toBe(false);
    });
  });

  describe('Path Generation & Traversal Prevention', () => {
    it('should generate isolated, unique paths organized by category and user ID', () => {
      const userId = 'usr-123456';
      const { relativePath, filename } = generateSafeGitHubPath('avatars', userId, 'webp');

      expect(relativePath).toMatch(/^uploads\/avatars\/usr-123456\/avatar-[a-f0-9]{16}\.webp$/);
      expect(filename).toMatch(/^avatar-[a-f0-9]{16}\.webp$/);
    });

    it('should sanitize user ID and prevent directory traversal', () => {
      const maliciousUserId = '../../etc/passwd';
      const { relativePath } = generateSafeGitHubPath('banners', maliciousUserId, 'png');

      expect(relativePath).not.toContain('..');
      expect(relativePath).toMatch(/^uploads\/banners\/etcpasswd\/banner-[a-f0-9]{16}\.png$/);
    });

    it('should throw an error if user ID is empty after sanitization', () => {
      expect(() => generateSafeGitHubPath('links', '///..//', 'jpg')).toThrow(GitHubStorageError);
    });
  });

  describe('Public Delivery URL Helpers', () => {
    it('should generate valid raw.githubusercontent.com URLs for public repos', () => {
      const path = 'uploads/avatars/user-1/avatar-123.webp';
      const rawUrl = buildRawGitHubUrl(path);
      expect(rawUrl).toBe('https://raw.githubusercontent.com/linux9112/linkplus/main/uploads/avatars/user-1/avatar-123.webp');
    });

    it('should generate valid jsDelivr CDN URLs', () => {
      const path = 'uploads/banners/user-1/banner-abc.png';
      const cdnUrl = buildCdnGitHubUrl(path);
      expect(cdnUrl).toBe('https://cdn.jsdelivr.net/gh/linux9112/linkplus@main/uploads/banners/user-1/banner-abc.png');
    });

    it('should generate valid anonymous backend proxy URLs', () => {
      const path = 'uploads/links/user-1/link-xyz.png';
      const proxyUrl = buildProxyImageUrl(path);
      expect(proxyUrl).toBe('/api/public/image-proxy?path=uploads%2Flinks%2Fuser-1%2Flink-xyz.png');
    });
  });

  describe('Binary Validation & Magic Bytes', () => {
    it('should validate valid PNG magic bytes (89 50 4E 47)', () => {
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateImageMagicBytes(validPng, 'png')).toBe(true);
    });

    it('should validate valid JPEG magic bytes (FF D8 FF)', () => {
      const validJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(validateImageMagicBytes(validJpg, 'jpeg')).toBe(true);
      expect(validateImageMagicBytes(validJpg, 'jpg')).toBe(true);
    });

    it('should validate valid WebP magic bytes (RIFF .... WEBP)', () => {
      const validWebp = Buffer.from('RIFF\x20\x00\x00\x00WEBPVP8 ', 'ascii');
      expect(validateImageMagicBytes(validWebp, 'webp')).toBe(true);
    });

    it('should reject corrupted or spoofed payloads', () => {
      const fakePng = Buffer.from('GIF89a Fake PNG with GIF header');
      expect(validateImageMagicBytes(fakePng, 'png')).toBe(false);
    });
  });

  describe('Upload File Size Enforcement', () => {
    it('should enforce 5 MB maximum upload limit', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_IMAGE_SIZE + 100);
      await expect(
        githubStorageService.uploadImage({
          category: 'avatars',
          userId: 'test-user',
          buffer: oversizedBuffer,
          ext: 'png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow('File exceeds maximum upload size of 5 MB');
    });
  });

  describe('GitHub Contents API Integration & Error Handling', () => {
    const validBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    it('should successfully handle 201 Created from GitHub Contents API', async () => {
      const mockResponse = {
        content: {
          sha: 'b123456789abcdef0123456789abcdef01234567',
          path: 'uploads/avatars/user-99/avatar-123.png',
          size: validBuffer.length,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        status: 201,
        ok: true,
        headers: new Headers({ 'x-ratelimit-remaining': '4999' }),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      } as any);

      const result = await githubStorageService.uploadImage({
        category: 'avatars',
        userId: 'user-99',
        buffer: validBuffer,
        ext: 'png',
        mimeType: 'image/png',
      });

      expect(result.sha).toBe('b123456789abcdef0123456789abcdef01234567');
      expect(result.url).toContain('https://raw.githubusercontent.com/');
      expect(result.path).toMatch(/^uploads\/avatars\/user-99\/avatar-[a-f0-9]{16}\.png$/);
      expect(result.category).toBe('avatars');
      expect(result.size).toBe(validBuffer.length);
    });

    it('should handle 401 Unauthorized with descriptive error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ message: 'Bad credentials' })),
      } as any);

      await expect(
        githubStorageService.uploadImage({
          category: 'avatars',
          userId: 'user-99',
          buffer: validBuffer,
          ext: 'png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow('GITHUB_TOKEN is invalid or has expired');
    });

    it('should handle 403 Forbidden with missing Contents:write permissions and actionable instructions', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
        headers: new Headers({
          'x-ratelimit-remaining': '4950',
          'x-accepted-github-permissions': 'contents=write',
        }),
        text: () => Promise.resolve(JSON.stringify({ message: 'Resource not accessible by personal access token' })),
      } as any);

      try {
        await githubStorageService.uploadImage({
          category: 'banners',
          userId: 'user-99',
          buffer: validBuffer,
          ext: 'png',
          mimeType: 'image/png',
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(GitHubStorageError);
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('GITHUB_PERMISSION_DENIED');
        expect(err.message).toContain('Contents: Read and write');
      }
    });

    it('should handle 403 rate limit exhaustion (429 status mapped)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
        headers: new Headers({
          'x-ratelimit-remaining': '0',
        }),
        text: () => Promise.resolve(JSON.stringify({ message: 'API rate limit exceeded' })),
      } as any);

      try {
        await githubStorageService.uploadImage({
          category: 'links',
          userId: 'user-99',
          buffer: validBuffer,
          ext: 'png',
          mimeType: 'image/png',
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(GitHubStorageError);
        expect(err.statusCode).toBe(429);
        expect(err.code).toBe('GITHUB_RATE_LIMITED');
      }
    });

    it('should handle 404 Repository or Branch Not Found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ message: 'Not Found' })),
      } as any);

      await expect(
        githubStorageService.uploadImage({
          category: 'links',
          userId: 'user-99',
          buffer: validBuffer,
          ext: 'png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow('GitHub repository or branch not found');
    });

    it('should handle 409 Conflict gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 409,
        ok: false,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({ message: 'conflict' })),
      } as any);

      await expect(
        githubStorageService.uploadImage({
          category: 'avatars',
          userId: 'user-99',
          buffer: validBuffer,
          ext: 'png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow('conflict');
    });
  });

  describe('Safe Image Deletion & Git History Semantics', () => {
    it('should reject deletion of path outside user namespace', async () => {
      const res = await githubStorageService.deleteImage({
        path: 'uploads/avatars/other-user/avatar-123.png',
        userId: 'my-user-id',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
    });

    it('should successfully delete an existing file when SHA is provided', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ commit: { sha: 'commit-sha' } }),
      } as any);

      const res = await githubStorageService.deleteImage({
        path: 'uploads/avatars/user-123/avatar-abc.png',
        sha: 'blob-sha-123',
        userId: 'user-123',
      });

      expect(res.success).toBe(true);
      expect(res.deleted).toBe(true);
    });

    it('should fetch blob SHA before deleting if SHA is not supplied', async () => {
      global.fetch = vi
        .fn()
        // 1st call: GET to retrieve file SHA
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ sha: 'discovered-blob-sha' }),
        } as any)
        // 2nd call: DELETE
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ commit: { sha: 'del-commit' } }),
        } as any);

      const res = await githubStorageService.deleteImage({
        path: 'uploads/banners/user-123/banner-abc.png',
        userId: 'user-123',
      });

      expect(res.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return success if file already does not exist (404)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      } as any);

      const res = await githubStorageService.deleteImage({
        path: 'uploads/links/user-123/link-already-deleted.png',
        userId: 'user-123',
      });

      expect(res.success).toBe(true);
      expect(res.deleted).toBe(false);
    });
  });

  describe('Anonymous Image Proxy Delivery', () => {
    it('should fetch and decode base64 contents via GitHub Contents API', async () => {
      const mockRawContent = Buffer.from('hello-image-bytes').toString('base64');
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ content: mockRawContent }),
      } as any);

      const result = await githubStorageService.fetchImage('uploads/avatars/user-1/avatar.webp');
      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      expect(result?.buffer.toString('utf-8')).toBe('hello-image-bytes');
    });

    it('should reject paths attempting directory traversal', async () => {
      const result = await githubStorageService.fetchImage('uploads/../package.json');
      expect(result).toBeNull();
    });
  });

  describe('Upload Rate Limiter Middleware', () => {
    it('should export uploadRateLimiter middleware configured for file uploads', () => {
      expect(uploadRateLimiter).toBeDefined();
      expect(typeof uploadRateLimiter).toBe('function');
    });
  });
});
