import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadRateLimiter } from '../middleware/rate-limit.middleware.js';
import {
  ALLOWED_CATEGORIES,
  MAX_UPLOAD_SIZE,
  parseDataImageUri,
  validateImageMagicBytes,
  saveToDiskIfPossible,
  readFromDiskIfPossible,
  deleteFromDiskIfPossible,
} from '../utils/image-storage.js';
import type { UploadCategory } from '../utils/image-storage.js';
import {
  githubStorageService,
  GitHubStorageError,
  normalizeCategory,
  StorageCategory,
} from '../services/github-storage.service.js';

const router = Router();

/**
 * Maps input type to normalized storage category ('avatars' | 'banners' | 'links').
 */
function resolveStorageCategory(type: string): StorageCategory {
  return normalizeCategory(type);
}

/**
 * POST /api/upload/image
 * Centralized image upload endpoint for avatars, cover banners, and link logos.
 * Rate-limited to 30 uploads/15 min to protect GitHub API limits.
 * Authenticates user, validates image magic bytes and 5 MB size limit.
 * If GitHub storage is enabled, uploads to GitHub Contents API and stores the GitHub URL in MySQL.
 * Falls back safely to disk and MySQL storage when GitHub storage is unconfigured.
 */
router.post(
  '/image',
  uploadRateLimiter,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body || {};
      const rawImageData = String(body.image_data || body.imageData || body.image || '').trim();
      const type = String(body.type || 'link').toLowerCase();
      const linkId = body.link_id ? String(body.link_id).trim() : undefined;
      const category = resolveStorageCategory(type);

      if (!rawImageData) {
        res.status(400).json({ error: 'Image data is required.' });
        return;
      }

      const parsed = parseDataImageUri(rawImageData);
      if (!parsed) {
        res.status(400).json({
          error: 'Invalid image format. Supported formats: PNG, JPG, JPEG, WebP, GIF, and SVG (up to 5 MB).',
        });
        return;
      }

      if (parsed.buffer.length > MAX_UPLOAD_SIZE) {
        res.status(400).json({
          error: `File exceeds maximum upload size of 5 MB (received ${(parsed.buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
        });
        return;
      }

      if (!validateImageMagicBytes(parsed.buffer, parsed.format)) {
        res.status(400).json({
          error: 'Image file content does not match its declared format or is corrupt.',
        });
        return;
      }

      // If linkId is provided, enforce strict ownership authorization
      if (linkId) {
        const link = await prisma.link.findUnique({ where: { id: linkId } });
        if (!link) {
          res.status(404).json({ error: 'Target link not found.' });
          return;
        }
        if (link.userId !== req.user!.id) {
          res.status(403).json({ error: 'Not authorized to modify this link.' });
          return;
        }
      }

      // =========================================================================
      // PATHWAY 1: CENTRALIZED GITHUB REPOSITORY STORAGE
      // =========================================================================
      if (githubStorageService.isConfigured()) {
        try {
          const githubResult = await githubStorageService.uploadImage({
            category,
            userId: req.user!.id,
            buffer: parsed.buffer,
            ext: parsed.ext,
            mimeType: parsed.mimeType,
            commitMessage: `Upload ${category.slice(0, -1)} for @${req.user!.username} [skip ci]`,
          });

          const publicUrl = githubResult.url;

          if (category === 'avatars') {
            // 1. Avatar upload
            const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
            const themeSettings =
              profile?.themeSettings && typeof profile.themeSettings === 'object'
                ? { ...(profile.themeSettings as Record<string, any>) }
                : {};

            // Clean up previous GitHub avatar if present
            const oldAvatar = themeSettings.github_avatar;
            if (oldAvatar?.path && oldAvatar.path !== githubResult.path) {
              githubStorageService
                .deleteImage({ path: oldAvatar.path, sha: oldAvatar.sha, userId: req.user!.id })
                .catch(() => {});
            }

            themeSettings.avatar_data_url = rawImageData;
            themeSettings.github_avatar = {
              path: githubResult.path,
              sha: githubResult.sha,
              url: publicUrl,
              raw_url: githubResult.rawUrl,
              cdn_url: githubResult.cdnUrl,
              proxy_url: githubResult.proxyUrl,
              uploaded_at: new Date().toISOString(),
            };

            if (profile) {
              await prisma.profile.update({
                where: { userId: req.user!.id },
                data: {
                  avatarUrl: publicUrl,
                  themeSettings,
                },
              });
            } else {
              await prisma.profile.create({
                data: {
                  userId: req.user!.id,
                  displayName: req.user!.username,
                  avatarUrl: publicUrl,
                  themeSettings,
                  socialLinks: [],
                },
              });

            }
          } else if (category === 'banners') {
            // 2. Cover banner upload
            const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
            const themeSettings =
              profile?.themeSettings && typeof profile.themeSettings === 'object'
                ? { ...(profile.themeSettings as Record<string, any>) }
                : {};

            // Clean up previous GitHub cover banner if present
            const oldCover = themeSettings.github_cover;
            if (oldCover?.path && oldCover.path !== githubResult.path) {
              githubStorageService
                .deleteImage({ path: oldCover.path, sha: oldCover.sha, userId: req.user!.id })
                .catch(() => {});
            }

            themeSettings.cover_data_url = rawImageData;
            themeSettings.cover_url = publicUrl;
            themeSettings.github_cover = {
              path: githubResult.path,
              sha: githubResult.sha,
              url: publicUrl,
              raw_url: githubResult.rawUrl,
              cdn_url: githubResult.cdnUrl,
              proxy_url: githubResult.proxyUrl,
              uploaded_at: new Date().toISOString(),
            };

            if (profile) {
              await prisma.profile.update({
                where: { userId: req.user!.id },
                data: { themeSettings },
              });
            } else {
              await prisma.profile.create({
                data: {
                  userId: req.user!.id,
                  displayName: req.user!.username,
                  themeSettings,
                  socialLinks: [],
                },
              });

            }
          } else {
            // 3. Link logo upload
            if (linkId) {
              // Existing link: attach directly and preserve link independence
              const existingLink = await prisma.link.findUnique({ where: { id: linkId } });
              const utmParams =
                existingLink?.utmParams && typeof existingLink.utmParams === 'object'
                  ? { ...(existingLink.utmParams as Record<string, any>) }
                  : {};

              // Clean up previous GitHub link logo if present
              const oldLogo = utmParams.github_logo;
              if (oldLogo?.path && oldLogo.path !== githubResult.path) {
                githubStorageService
                  .deleteImage({ path: oldLogo.path, sha: oldLogo.sha, userId: req.user!.id })
                  .catch(() => {});
              }

              utmParams.logo_data_url = rawImageData;
              utmParams.github_logo = {
                path: githubResult.path,
                sha: githubResult.sha,
                url: publicUrl,
                raw_url: githubResult.rawUrl,
                cdn_url: githubResult.cdnUrl,
                proxy_url: githubResult.proxyUrl,
                uploaded_at: new Date().toISOString(),
              };

              await prisma.link.update({
                where: { id: linkId },
                data: {
                  thumbnailUrl: publicUrl,
                  utmParams,
                },
              });
            } else {
              // Drafting a new link: record in profile pending_logos dict
              const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
              const themeSettings =
                profile?.themeSettings && typeof profile.themeSettings === 'object'
                  ? { ...(profile.themeSettings as Record<string, any>) }
                  : {};

              const pendingLogos =
                themeSettings.pending_logos && typeof themeSettings.pending_logos === 'object'
                  ? { ...themeSettings.pending_logos }
                  : {};

              pendingLogos[githubResult.filename] = {
                url: publicUrl,
                raw_url: githubResult.rawUrl,
                cdn_url: githubResult.cdnUrl,
                proxy_url: githubResult.proxyUrl,
                path: githubResult.path,
                sha: githubResult.sha,
                data_url: rawImageData,
              };

              themeSettings.pending_logos = pendingLogos;

              if (profile) {
                await prisma.profile.update({
                  where: { userId: req.user!.id },
                  data: { themeSettings },
                });
              }
            }
          }

          res.status(200).json({
            url: publicUrl,
            raw_url: githubResult.rawUrl,
            cdn_url: githubResult.cdnUrl,
            proxy_url: githubResult.proxyUrl,
            filename: githubResult.filename,
            path: githubResult.path,
            sha: githubResult.sha,
            category,
            size: parsed.buffer.length,
            storage: 'github',
            message: 'Image successfully uploaded to GitHub repository and saved.',
          });
          return;
        } catch (err: any) {
          if (err instanceof GitHubStorageError) {
            res.status(err.statusCode).json({
              error: err.message,
              code: err.code,
            });
            return;
          }
          throw err;
        }
      }

      // =========================================================================
      // PATHWAY 2: LOCAL DISK & MYSQL FALLBACK (when GitHub storage is not active)
      // =========================================================================
      const localPrefix = category === 'links' ? 'link' : category === 'avatars' ? 'avatar' : 'cover';
      const safeFilename = `${localPrefix}-${crypto.randomUUID()}.${parsed.ext}`;
      const localPublicUrl = `/api/uploads/${category === 'banners' ? 'covers' : category}/${safeFilename}`;

      saveToDiskIfPossible(category === 'banners' ? 'covers' : category, safeFilename, parsed.buffer);

      if (category === 'avatars') {
        const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
        const themeSettings =
          profile?.themeSettings && typeof profile.themeSettings === 'object'
            ? { ...(profile.themeSettings as Record<string, any>) }
            : {};

        themeSettings.avatar_data_url = rawImageData;

        if (profile) {
          await prisma.profile.update({
            where: { userId: req.user!.id },
            data: {
              avatarUrl: localPublicUrl,
              themeSettings,
            },
          });
        } else {
          await prisma.profile.create({
            data: {
              userId: req.user!.id,
              displayName: req.user!.username,
              avatarUrl: localPublicUrl,
              themeSettings,
              socialLinks: [],
            },
          });
        }
      } else if (category === 'banners') {
        const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
        const themeSettings =
          profile?.themeSettings && typeof profile.themeSettings === 'object'
            ? { ...(profile.themeSettings as Record<string, any>) }
            : {};

        themeSettings.cover_data_url = rawImageData;
        themeSettings.cover_url = localPublicUrl;

        if (profile) {
          await prisma.profile.update({
            where: { userId: req.user!.id },
            data: { themeSettings },
          });
        } else {
          await prisma.profile.create({
            data: {
              userId: req.user!.id,
              displayName: req.user!.username,
              themeSettings,
              socialLinks: [],
            },
          });
        }

      } else {
        if (linkId) {
          const existingLink = await prisma.link.findUnique({ where: { id: linkId } });
          const utmParams =
            existingLink?.utmParams && typeof existingLink.utmParams === 'object'
              ? { ...(existingLink.utmParams as Record<string, any>) }
              : {};

          utmParams.logo_data_url = rawImageData;

          await prisma.link.update({
            where: { id: linkId },
            data: {
              thumbnailUrl: localPublicUrl,
              utmParams,
            },
          });
        } else {
          const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
          const themeSettings =
            profile?.themeSettings && typeof profile.themeSettings === 'object'
              ? { ...(profile.themeSettings as Record<string, any>) }
              : {};

          const pendingLogos =
            themeSettings.pending_logos && typeof themeSettings.pending_logos === 'object'
              ? { ...themeSettings.pending_logos }
              : {};

          pendingLogos[safeFilename] = rawImageData;
          themeSettings.pending_logos = pendingLogos;

          if (profile) {
            await prisma.profile.update({
              where: { userId: req.user!.id },
              data: { themeSettings },
            });
          }
        }
      }

      res.status(200).json({
        url: localPublicUrl,
        filename: safeFilename,
        category,
        size: parsed.buffer.length,
        storage: 'local',
        message: 'Image uploaded and saved locally.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/upload/image
 * Removes an uploaded image file from GitHub or local disk and clears the MySQL reference.
 */
router.delete(
  '/image',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url, link_id: linkId, type } = req.body || {};
      const urlStr = String(url || '').trim();

      if (linkId) {
        const link = await prisma.link.findUnique({ where: { id: String(linkId) } });
        if (!link) {
          res.status(404).json({ error: 'Link not found' });
          return;
        }
        if (link.userId !== req.user!.id) {
          res.status(403).json({ error: 'Not authorized to modify this link' });
          return;
        }
        const utmParams =
          link.utmParams && typeof link.utmParams === 'object'
            ? { ...(link.utmParams as Record<string, any>) }
            : {};

        // If GitHub logo exists, delete from GitHub
        if (utmParams.github_logo?.path) {
          githubStorageService
            .deleteImage({
              path: utmParams.github_logo.path,
              sha: utmParams.github_logo.sha,
              userId: req.user!.id,
            })
            .catch(() => {});
        }

        delete utmParams.logo_data_url;
        delete utmParams.github_logo;

        await prisma.link.update({
          where: { id: String(linkId) },
          data: {
            thumbnailUrl: null,
            utmParams,
          },
        });
      }

      if (type === 'avatar') {
        const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
        if (profile) {
          const themeSettings =
            profile.themeSettings && typeof profile.themeSettings === 'object'
              ? { ...(profile.themeSettings as Record<string, any>) }
              : {};

          if (themeSettings.github_avatar?.path) {
            githubStorageService
              .deleteImage({
                path: themeSettings.github_avatar.path,
                sha: themeSettings.github_avatar.sha,
                userId: req.user!.id,
              })
              .catch(() => {});
          }

          delete themeSettings.avatar_data_url;
          delete themeSettings.github_avatar;

          await prisma.profile.update({
            where: { userId: req.user!.id },
            data: {
              avatarUrl: null,
              themeSettings,
            },
          });
        }
      }

      if (type === 'cover' || type === 'banner') {
        const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
        if (profile) {
          const themeSettings =
            profile.themeSettings && typeof profile.themeSettings === 'object'
              ? { ...(profile.themeSettings as Record<string, any>) }
              : {};

          if (themeSettings.github_cover?.path) {
            githubStorageService
              .deleteImage({
                path: themeSettings.github_cover.path,
                sha: themeSettings.github_cover.sha,
                userId: req.user!.id,
              })
              .catch(() => {});
          }

          delete themeSettings.cover_data_url;
          delete themeSettings.cover_url;
          delete themeSettings.github_cover;

          await prisma.profile.update({
            where: { userId: req.user!.id },
            data: { themeSettings },
          });
        }
      }

      // Safely delete file from local disk if local path matches
      const filenameMatch = /([^/?#]+)$/.exec(urlStr);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        for (const cat of ALLOWED_CATEGORIES) {
          deleteFromDiskIfPossible(cat, filename);
        }
      }

      res.status(200).json({ message: 'Image removed successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/uploads/:category/:filename
 * Serves uploaded images with disk and database fallback,
 * returning appropriate Content-Type, CORS, and caching headers.
 */
router.get('/:category/:filename', async (req: Request, res: Response): Promise<void> => {
  const rawCat = String(req.params.category || '').toLowerCase();
  const category = rawCat === 'banners' ? 'covers' : rawCat;
  const filename = String(req.params.filename || '');

  if (!ALLOWED_CATEGORIES.includes(category as UploadCategory)) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename)) {
    res.status(400).json({ error: 'Invalid file name.' });
    return;
  }

  // 1. Try disk read first
  const diskBuffer = readFromDiskIfPossible(category, filename);
  if (diskBuffer) {
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg';
    const mimeType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
        ? 'image/webp'
        : ext === 'svg'
        ? 'image/svg+xml'
        : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(diskBuffer);
    return;
  }

  // 2. Fallback to MySQL if disk file is missing
  try {
    if (category === 'avatars') {
      const profile = await prisma.profile.findFirst({
        where: {
          avatarUrl: { contains: filename },
        },
      });

      const themeSettings = (profile?.themeSettings as Record<string, any>) || {};
      const dataUri = themeSettings?.avatar_data_url;
      if (dataUri && typeof dataUri === 'string') {
        const parsed = parseDataImageUri(dataUri);
        if (parsed) {
          res.setHeader('Content-Type', parsed.mimeType);
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.status(200).send(parsed.buffer);
          return;
        }
      }
    } else if (category === 'covers') {
      const profile = await prisma.profile.findFirst();
      const themeSettings = (profile?.themeSettings as Record<string, any>) || {};
      const dataUri = themeSettings?.cover_data_url;
      if (dataUri && typeof dataUri === 'string') {
        const parsed = parseDataImageUri(dataUri);
        if (parsed) {
          res.setHeader('Content-Type', parsed.mimeType);
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.status(200).send(parsed.buffer);
          return;
        }
      }
    } else if (category === 'links') {
      const link = await prisma.link.findFirst({
        where: {
          thumbnailUrl: { contains: filename },
        },
      });
      const utmParams = (link?.utmParams as Record<string, any>) || {};
      let dataUri = utmParams?.logo_data_url;
      if (!dataUri) {
        const profile = await prisma.profile.findFirst();
        const themeSettings = (profile?.themeSettings as Record<string, any>) || {};
        dataUri = themeSettings?.pending_logos?.[filename];
        if (dataUri && typeof dataUri === 'object') {
          dataUri = dataUri.data_url || dataUri.url;
        }
      }


      if (dataUri && typeof dataUri === 'string') {
        const parsed = parseDataImageUri(dataUri);
        if (parsed) {
          res.setHeader('Content-Type', parsed.mimeType);
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.status(200).send(parsed.buffer);
          return;
        }
      }
    }
  } catch {
    // ignore db read error
  }

  res.status(404).json({ error: 'Image not found.' });
});

export default router;
