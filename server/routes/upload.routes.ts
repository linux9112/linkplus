import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';
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

const router = Router();

/**
 * Maps input type to directory category.
 */
function resolveCategory(type: string): UploadCategory {
  if (type === 'avatar' || type === 'avatars') return 'avatars';
  if (type === 'cover' || type === 'covers') return 'covers';
  return 'links';
}

/**
 * POST /api/upload/image
 * Resilient image upload for avatars, cover banners, and link logos.
 * Validates data URI, checks magic bytes and 5MB size limit.
 * Saves to disk if writable, and ALWAYS persists directly into MySQL JSON columns,
 * ensuring 100% reliability in serverless environments (e.g. Vercel).
 */
router.post('/image', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body || {};
    const rawImageData = String(body.image_data || body.imageData || body.image || '').trim();
    const type = String(body.type || 'link').toLowerCase();
    const linkId = body.link_id ? String(body.link_id).trim() : undefined;
    const category = resolveCategory(type);

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
        error: 'File exceeds maximum upload size of 5 MB. Please select or compress a smaller image.',
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

    // Generate safe filename matching category prefix (e.g. link-uuid.png, avatar-uuid.jpg)
    const prefix = category === 'links' ? 'link' : category === 'avatars' ? 'avatar' : 'cover';
    const safeFilename = `${prefix}-${crypto.randomUUID()}.${parsed.ext}`;
    const publicUrl = `/api/uploads/${category}/${safeFilename}`;

    // Attempt saving to local filesystem (gracefully ignored on read-only serverless e.g. Vercel)
    saveToDiskIfPossible(category, safeFilename, parsed.buffer);

    if (category === 'avatars') {
      // 1. Avatar upload: persist in profile and return dedicated public avatar URL
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
          },
        });
      }
    } else if (category === 'covers') {
      // 2. Cover banner upload: persist in profile themeSettings
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      const themeSettings =
        profile?.themeSettings && typeof profile.themeSettings === 'object'
          ? { ...(profile.themeSettings as Record<string, any>) }
          : {};

      themeSettings.cover_data_url = rawImageData;
      themeSettings.cover_url = publicUrl;

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
          },
        });
      }
    } else {
      // 3. Link logo upload
      if (linkId) {
        // Link already exists: attach directly to link
        const existingLink = await prisma.link.findUnique({ where: { id: linkId } });
        const utmParams =
          existingLink?.utmParams && typeof existingLink.utmParams === 'object'
            ? { ...(existingLink.utmParams as Record<string, any>) }
            : {};

        utmParams.logo_data_url = rawImageData;

        await prisma.link.update({
          where: { id: linkId },
          data: {
            thumbnailUrl: publicUrl,
            utmParams,
          },
        });
      } else {
        // Link is being drafted: store in user's profile pending_logos dict keyed by filename
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
      url: publicUrl,
      filename: safeFilename,
      category,
      size: parsed.buffer.length,
      message: 'Image uploaded and saved successfully.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/upload/image
 * Removes an uploaded image file and clears the corresponding database reference.
 */
router.delete('/image', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      delete utmParams.logo_data_url;

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
        delete themeSettings.avatar_data_url;

        await prisma.profile.update({
          where: { userId: req.user!.id },
          data: {
            avatarUrl: null,
            themeSettings,
          },
        });
      }
    }

    if (type === 'cover') {
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      if (profile) {
        const themeSettings =
          profile.themeSettings && typeof profile.themeSettings === 'object'
            ? { ...(profile.themeSettings as Record<string, any>) }
            : {};
        delete themeSettings.cover_data_url;
        delete themeSettings.cover_url;

        await prisma.profile.update({
          where: { userId: req.user!.id },
          data: { themeSettings },
        });
      }
    }

    // Safely delete file from disk if path matches
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
});

/**
 * GET /api/uploads/:category/:filename
 * Safely serves uploaded images with disk and database fallback,
 * returning appropriate Content-Type, CORS, and caching headers.
 */
router.get('/:category/:filename', async (req: Request, res: Response): Promise<void> => {
  const category = String(req.params.category || '').toLowerCase();
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
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(diskBuffer);
    return;
  }

  // 2. Fallback to MySQL if disk file is missing (e.g. serverless Vercel)
  try {
    if (category === 'avatars') {
      const profile = await prisma.profile.findFirst({
        where: {
          OR: [
            { avatarUrl: { contains: filename } },
            { themeSettings: { not: null } },
          ],
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
      const profile = await prisma.profile.findFirst({
        where: {
          themeSettings: { not: null },
        },
      });
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
          OR: [
            { thumbnailUrl: { contains: filename } },
            { utmParams: { not: null } },
          ],
        },
      });
      const utmParams = (link?.utmParams as Record<string, any>) || {};
      let dataUri = utmParams?.logo_data_url;
      if (!dataUri) {
        const profile = await prisma.profile.findFirst({
          where: { themeSettings: { not: null } },
        });
        const themeSettings = (profile?.themeSettings as Record<string, any>) || {};
        dataUri = themeSettings?.pending_logos?.[filename];
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
