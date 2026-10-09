import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const ALLOWED_CATEGORIES = ['avatars', 'links', 'covers'] as const;
type UploadCategory = typeof ALLOWED_CATEGORIES[number];

// Ensure upload directories exist on server startup
for (const cat of ALLOWED_CATEGORIES) {
  const dir = path.join(UPLOADS_ROOT, cat);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const DATA_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates binary image magic headers to prevent MIME spoofing.
 */
function validateImageMagicBytes(buffer: Buffer, declaredExt: string): boolean {
  if (buffer.length < 4) return false;

  // PNG: 89 50 4E 47
  if (declaredExt === 'png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }

  // JPEG / JPG: FF D8 FF
  if (declaredExt === 'jpeg' || declaredExt === 'jpg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  // WebP: RIFF .... WEBP
  if (declaredExt === 'webp') {
    return (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.length >= 12 &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  // GIF: GIF87a or GIF89a
  if (declaredExt === 'gif') {
    return buffer.toString('ascii', 0, 4) === 'GIF8';
  }

  return false;
}

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
 * Uploads an image (avatar, cover, or individual link logo), validates magic bytes & size,
 * generates a secure UUID filename, saves to disk, and updates the database record if requested.
 */
router.post('/image', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body || {};
    const imageData = String(body.image_data || body.imageData || body.image || '').trim();
    const type = String(body.type || 'link').toLowerCase();
    const linkId = body.link_id ? String(body.link_id).trim() : undefined;
    const category = resolveCategory(type);

    if (!imageData) {
      res.status(400).json({ error: 'Image data is required.' });
      return;
    }

    const match = DATA_IMAGE_REGEX.exec(imageData);
    if (!match) {
      res.status(400).json({
        error: 'Invalid image format. Supported formats: PNG, JPG, JPEG, and WebP (up to 5 MB).',
      });
      return;
    }

    const rawFormat = match[1].toLowerCase();
    const ext = rawFormat === 'jpeg' ? 'jpg' : rawFormat;
    const base64Data = match[2].replace(/\s/g, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_UPLOAD_SIZE) {
      res.status(400).json({
        error: 'File exceeds maximum upload size of 5 MB. Please select or compress a smaller image.',
      });
      return;
    }

    if (!validateImageMagicBytes(buffer, rawFormat)) {
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

    // Generate safe UUID filename
    const safeFilename = `${category}-${crypto.randomUUID()}.${ext}`;
    const targetDir = path.join(UPLOADS_ROOT, category);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/api/uploads/${category}/${safeFilename}`;

    // If linkId is supplied, immediately update the link record
    if (linkId) {
      await prisma.link.update({
        where: { id: linkId },
        data: { thumbnailUrl: publicUrl },
      });
    }

    // If type is avatar, update profile record
    if (category === 'avatars') {
      await prisma.profile.update({
        where: { userId: req.user!.id },
        data: { avatarUrl: publicUrl },
      });
    }

    res.status(200).json({
      url: publicUrl,
      filename: safeFilename,
      category,
      size: buffer.length,
      message: 'Image uploaded successfully.',
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
      await prisma.link.update({
        where: { id: String(linkId) },
        data: { thumbnailUrl: null },
      });
    }

    if (type === 'avatar') {
      await prisma.profile.update({
        where: { userId: req.user!.id },
        data: { avatarUrl: null },
      });
    }

    // Safely delete file from disk if it points to /api/uploads/ or /uploads/
    const parsedPath = urlStr.replace(/^\/?(api\/)?uploads\//, '');
    if (parsedPath && !parsedPath.includes('..')) {
      const filePath = path.resolve(UPLOADS_ROOT, parsedPath);
      if (filePath.startsWith(UPLOADS_ROOT) && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore disk unlink errors
        }
      }
    }

    res.status(200).json({ message: 'Image removed successfully.' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/uploads/:category/:filename
 * Safely serves uploaded images with appropriate Content-Type, CORS, and caching headers.
 */
router.get('/:category/:filename', (req: Request, res: Response): void => {
  const category = String(req.params.category || '').toLowerCase();
  const filename = String(req.params.filename || '');

  // Strict validation against directory traversal and unauthorized filenames
  if (!ALLOWED_CATEGORIES.includes(category as UploadCategory)) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    res.status(400).json({ error: 'Invalid file name.' });
    return;
  }

  const filePath = path.resolve(UPLOADS_ROOT, category, filename);

  // Security guard against path traversal outside UPLOADS_ROOT
  if (!filePath.startsWith(UPLOADS_ROOT)) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Image not found.' });
    return;
  }

  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(filePath).pipe(res);
});

export default router;
