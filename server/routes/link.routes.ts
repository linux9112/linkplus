import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { Prisma } from '@prisma/client';

import { requireAuth } from '../middleware/auth.middleware.js';
import { validateDestinationUrl } from '../utils/ssrf.js';
import { parseDataImageUri } from '../utils/image-storage.js';
import { autoMigrateDatabase } from '../db/check-connection.js';

const router = Router();

function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function isValidHexColor(color: unknown): boolean {
  if (!color || typeof color !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim());
}

export function formatLink(link: any) {
  const appearance =
    link.utmParams && typeof link.utmParams === 'object' ? (link.utmParams as any).appearance : null;
  const resolvedBg = link.backgroundColor ?? appearance?.backgroundColor ?? appearance?.background_color ?? null;
  const resolvedText = link.textColor ?? appearance?.textColor ?? appearance?.text_color ?? null;

  return {
    id: link.id,
    user_id: link.userId,
    userId: link.userId,
    title: link.title,
    destination_url: link.destinationUrl,
    destinationUrl: link.destinationUrl,
    description: link.description,
    icon: link.icon,
    thumbnail_url: link.thumbnailUrl,
    thumbnailUrl: link.thumbnailUrl,
    position: link.position,
    is_active: link.isActive,
    isActive: link.isActive,
    is_pinned: link.isPinned,
    isPinned: link.isPinned,
    is_hidden: link.isHidden,
    isHidden: link.isHidden,
    is_featured: link.isFeatured,
    isFeatured: link.isFeatured,
    category: link.category,
    custom_label: link.customLabel,
    customLabel: link.customLabel,
    background_color: resolvedBg,
    backgroundColor: resolvedBg,
    text_color: resolvedText,
    textColor: resolvedText,
    media_type: link.mediaType,
    mediaType: link.mediaType,
    mediaUrl: link.mediaUrl,
    media_url: link.mediaUrl,
    utm_params: link.utmParams,
    utmParams: link.utmParams,
    click_count: link.clickCount,
    clickCount: link.clickCount,
    scheduled_start: link.scheduledStart ? link.scheduledStart.toISOString() : null,
    scheduledStart: link.scheduledStart ? link.scheduledStart.toISOString() : null,
    scheduled_end: link.scheduledEnd ? link.scheduledEnd.toISOString() : null,
    scheduledEnd: link.scheduledEnd ? link.scheduledEnd.toISOString() : null,
    created_at: link.createdAt ? link.createdAt.toISOString() : undefined,
    updated_at: link.updatedAt ? link.updatedAt.toISOString() : undefined,
  };
}

/**
 * Resiliently executes prisma.link.create with automatic schema migration and fallback.
 */
async function safeCreateLink(data: any): Promise<any> {
  try {
    return await prisma.link.create({ data });
  } catch (err: any) {
    const msg = String(err.message || '');
    if (
      msg.includes('background_color') ||
      msg.includes('text_color') ||
      msg.includes('Unknown column') ||
      err.code === 'P2022'
    ) {
      await autoMigrateDatabase().catch(() => {});
      try {
        return await prisma.link.create({ data });
      } catch {
        // Fallback: omit non-existent columns and preserve values in utmParams.appearance
        const { backgroundColor, textColor, utmParams, ...safeData } = data;
        const fallbackUtm = {
          ...(typeof utmParams === 'object' && utmParams !== null ? utmParams : {}),
          appearance: { backgroundColor, textColor },
        };
        return await prisma.link.create({
          data: {
            ...safeData,
            utmParams: fallbackUtm,
          },
        });
      }
    }
    throw err;
  }
}

/**
 * Resiliently executes prisma.link.update with automatic schema migration and fallback.
 */
async function safeUpdateLink(id: string, data: any): Promise<any> {
  try {
    return await prisma.link.update({ where: { id }, data });
  } catch (err: any) {
    const msg = String(err.message || '');
    if (
      msg.includes('background_color') ||
      msg.includes('text_color') ||
      msg.includes('Unknown column') ||
      err.code === 'P2022'
    ) {
      await autoMigrateDatabase().catch(() => {});
      try {
        return await prisma.link.update({ where: { id }, data });
      } catch {
        // Fallback: omit non-existent columns and preserve values in utmParams.appearance
        const { backgroundColor, textColor, utmParams, ...safeData } = data;
        const fallbackUtm = {
          ...(typeof utmParams === 'object' && utmParams !== null ? utmParams : {}),
          appearance: { backgroundColor, textColor },
        };
        return await prisma.link.update({
          where: { id },
          data: {
            ...safeData,
            utmParams: fallbackUtm,
          },
        });
      }
    }
    throw err;
  }
}

/**
 * GET /api/links
 * List all links belonging to the authenticated user.
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let links;
    try {
      links = await prisma.link.findMany({
        where: { userId: req.user!.id },
        orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }],
      });
    } catch (err: any) {
      const msg = String(err.message || '');
      if (
        msg.includes('background_color') ||
        msg.includes('text_color') ||
        msg.includes('Unknown column') ||
        err.code === 'P2022'
      ) {
        await autoMigrateDatabase().catch(() => {});
        links = await prisma.link.findMany({
          where: { userId: req.user!.id },
          orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }],
        });
      } else {
        throw err;
      }
    }
    res.status(200).json({ links: links.map(formatLink) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/links/reorder
 * Reorder links via drag-and-drop. Must be defined BEFORE /:id routes.
 */
router.put('/reorder', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body;
    let updates: Array<{ id: string; position: number }> = [];

    if (Array.isArray(body)) {
      updates = body.map((item, idx) =>
        typeof item === 'string'
          ? { id: item, position: idx }
          : { id: String(item.id), position: typeof item.position === 'number' ? item.position : idx }
      );
    } else if (body && Array.isArray(body.linkIds)) {
      updates = body.linkIds.map((id: string, idx: number) => ({ id: String(id), position: idx }));
    } else if (body && Array.isArray(body.items)) {
      updates = body.items.map((item: any, idx: number) => ({
        id: String(item.id),
        position: typeof item.position === 'number' ? item.position : idx,
      }));
    } else {
      res.status(400).json({ error: 'linkIds array or items array is required' });
      return;
    }

    await prisma.$transaction(
      updates.map((item) =>
        prisma.link.updateMany({
          where: { id: item.id, userId: req.user!.id },
          data: { position: item.position },
        })
      )
    );

    const updatedLinks = await prisma.link.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isPinned: 'desc' }, { position: 'asc' }],
    });

    res.status(200).json({
      success: true,
      message: 'Links reordered successfully',
      links: updatedLinks.map(formatLink),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/links
 * Create a new link with SSRF validation and advanced options.
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body || {};
    const title = body.title;
    const destinationUrl = body.destination_url !== undefined ? body.destination_url : body.destinationUrl;
    const description = body.description;
    const icon = body.icon;
    const thumbnailUrl = body.thumbnail_url !== undefined ? body.thumbnail_url : body.thumbnailUrl;
    const isHidden = body.is_hidden !== undefined ? body.is_hidden : body.isHidden;
    const isPinned = body.is_pinned !== undefined ? body.is_pinned : body.isPinned;
    const isActive = body.is_active !== undefined ? body.is_active : body.isActive;
    const isFeatured = body.is_featured !== undefined ? body.is_featured : body.isFeatured;
    const category = body.category;
    const customLabel = body.custom_label !== undefined ? body.custom_label : body.customLabel;
    const backgroundColor = body.background_color !== undefined ? body.background_color : body.backgroundColor;
    const textColor = body.text_color !== undefined ? body.text_color : body.textColor;
    const mediaType = body.media_type !== undefined ? body.media_type : body.mediaType;
    const mediaUrl = body.media_url !== undefined ? body.media_url : body.mediaUrl;
    const utmParams = body.utm_params !== undefined ? body.utm_params : body.utmParams;
    const scheduledStart = body.scheduled_start !== undefined ? body.scheduled_start : body.scheduledStart;
    const scheduledEnd = body.scheduled_end !== undefined ? body.scheduled_end : body.scheduledEnd;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Title is required', field: 'title' });
      return;
    }
    if (!destinationUrl || typeof destinationUrl !== 'string' || !destinationUrl.trim()) {
      res.status(400).json({ error: 'Destination URL is required', field: 'destination_url' });
      return;
    }

    const validation = validateDestinationUrl(destinationUrl.trim());
    if (!validation.valid) {
      res.status(400).json({ error: validation.error || 'Invalid destination URL', field: 'destination_url' });
      return;
    }

    if (mediaUrl) {
      const mediaValidation = validateDestinationUrl(String(mediaUrl).trim());
      if (!mediaValidation.valid) {
        res.status(400).json({ error: 'Invalid media embed URL', field: 'media_url' });
        return;
      }
    }

    let validatedBgColor: string | null = null;
    if (backgroundColor !== undefined && backgroundColor !== null && String(backgroundColor).trim() !== '') {
      const trimmedBg = String(backgroundColor).trim();
      if (!isValidHexColor(trimmedBg)) {
        res.status(400).json({ error: 'Background color must be a valid hex color code (e.g. #4F46E5)', field: 'background_color' });
        return;
      }
      validatedBgColor = trimmedBg;
    }

    let validatedTextColor: string | null = null;
    if (textColor !== undefined && textColor !== null && String(textColor).trim() !== '') {
      const trimmedText = String(textColor).trim();
      if (!isValidHexColor(trimmedText)) {
        res.status(400).json({ error: 'Text color must be a valid hex color code (e.g. #FFFFFF)', field: 'text_color' });
        return;
      }
      validatedTextColor = trimmedText;
    }

    const maxLink = await prisma.link.findFirst({
      where: { userId: req.user!.id },
      orderBy: { position: 'desc' },
    });
    const position = maxLink ? maxLink.position + 1 : 0;

    let initialThumbnailUrl: string | null = thumbnailUrl ? String(thumbnailUrl).trim().slice(0, 1000) : null;
    let initialUtmParams: Record<string, any> | null = utmParams && typeof utmParams === 'object' ? { ...utmParams } : null;

    if (initialThumbnailUrl) {
      const filenameMatch = /([^/?#]+)$/.exec(initialThumbnailUrl);
      const filename = filenameMatch ? filenameMatch[1] : '';
      const tempMatch = /temp_[^_]+_([a-zA-Z0-9_-]+)/.exec(initialThumbnailUrl);
      const token = tempMatch ? tempMatch[1] : filename;

      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      const themeSettings = (profile?.themeSettings as Record<string, any>) || {};
      const pendingDataUri = themeSettings?.pending_logos?.[token] || themeSettings?.pending_logos?.[filename];

      if (pendingDataUri) {
        initialUtmParams = initialUtmParams || {};
        initialUtmParams.logo_data_url = pendingDataUri;
        if (themeSettings.pending_logos) {
          delete themeSettings.pending_logos[token];
          delete themeSettings.pending_logos[filename];
          await prisma.profile.update({
            where: { userId: req.user!.id },
            data: { themeSettings },
          }).catch(() => {});
        }
      } else if (initialThumbnailUrl.startsWith('data:image/')) {
        const parsed = parseDataImageUri(initialThumbnailUrl);
        if (parsed) {
          initialUtmParams = initialUtmParams || {};
          initialUtmParams.logo_data_url = initialThumbnailUrl;
        }
      }
    }

    let link = await safeCreateLink({
      userId: req.user!.id,
      title: sanitizeHtml(title.trim().slice(0, 255)),
        destinationUrl: destinationUrl.trim(),
        description: description ? sanitizeHtml(String(description).trim().slice(0, 1000)) : null,
        icon: icon ? String(icon).trim().slice(0, 100) : null,
        thumbnailUrl: initialThumbnailUrl,
        isHidden: Boolean(isHidden),
        isPinned: Boolean(isPinned),
        isFeatured: Boolean(isFeatured),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        category: category ? sanitizeHtml(String(category).trim().slice(0, 100)) : null,
        customLabel: customLabel ? sanitizeHtml(String(customLabel).trim().slice(0, 100)) : null,
        backgroundColor: validatedBgColor,
        textColor: validatedTextColor,
        mediaType: mediaType ? String(mediaType).trim().slice(0, 50) : null,
        mediaUrl: mediaUrl ? String(mediaUrl).trim().slice(0, 2048) : null,
        utmParams: initialUtmParams ?? Prisma.DbNull,
        position,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
    });

    if (initialThumbnailUrl && initialThumbnailUrl.includes('temp_') && initialUtmParams?.logo_data_url) {
      const permanentLogoUrl = `/api/public/link-logo/${link.id}?v=${Date.now()}`;
      link = await prisma.link.update({
        where: { id: link.id },
        data: { thumbnailUrl: permanentLogoUrl },
      });
    }

    res.status(201).json({ link: formatLink(link) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/links/:id
 * Update an existing link owned by the authenticated user.
 */
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.link.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    if (existing.userId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to modify this link' });
      return;
    }

    const body = req.body || {};
    const title = body.title;
    const destinationUrl = body.destination_url !== undefined ? body.destination_url : body.destinationUrl;
    const description = body.description;
    const icon = body.icon;
    const thumbnailUrl = body.thumbnail_url !== undefined ? body.thumbnail_url : body.thumbnailUrl;
    const isHidden = body.is_hidden !== undefined ? body.is_hidden : body.isHidden;
    const isPinned = body.is_pinned !== undefined ? body.is_pinned : body.isPinned;
    const isActive = body.is_active !== undefined ? body.is_active : body.isActive;
    const isFeatured = body.is_featured !== undefined ? body.is_featured : body.isFeatured;
    const category = body.category;
    const customLabel = body.custom_label !== undefined ? body.custom_label : body.customLabel;
    const backgroundColor = body.background_color !== undefined ? body.background_color : body.backgroundColor;
    const textColor = body.text_color !== undefined ? body.text_color : body.textColor;
    const mediaType = body.media_type !== undefined ? body.media_type : body.mediaType;
    const mediaUrl = body.media_url !== undefined ? body.media_url : body.mediaUrl;
    const utmParams = body.utm_params !== undefined ? body.utm_params : body.utmParams;
    const scheduledStart = body.scheduled_start !== undefined ? body.scheduled_start : body.scheduledStart;
    const scheduledEnd = body.scheduled_end !== undefined ? body.scheduled_end : body.scheduledEnd;
    const position = body.position;

    if (destinationUrl !== undefined) {
      const validation = validateDestinationUrl(String(destinationUrl).trim());
      if (!validation.valid) {
        res.status(400).json({ error: validation.error || 'Invalid destination URL', field: 'destination_url' });
        return;
      }
    }

    let updatedBgColor: string | null = existing.backgroundColor;
    if (backgroundColor !== undefined) {
      if (backgroundColor === null || String(backgroundColor).trim() === '') {
        updatedBgColor = null;
      } else {
        const trimmedBg = String(backgroundColor).trim();
        if (!isValidHexColor(trimmedBg)) {
          res.status(400).json({ error: 'Background color must be a valid hex color code (e.g. #4F46E5)', field: 'background_color' });
          return;
        }
        updatedBgColor = trimmedBg;
      }
    }

    let updatedTextColor: string | null = existing.textColor;
    if (textColor !== undefined) {
      if (textColor === null || String(textColor).trim() === '') {
        updatedTextColor = null;
      } else {
        const trimmedText = String(textColor).trim();
        if (!isValidHexColor(trimmedText)) {
          res.status(400).json({ error: 'Text color must be a valid hex color code (e.g. #FFFFFF)', field: 'text_color' });
          return;
        }
        updatedTextColor = trimmedText;
      }
    }

    let updatedThumbnailUrl: string | null = existing.thumbnailUrl;
    let updatedUtmParams: Record<string, any> =
      utmParams !== undefined
        ? utmParams && typeof utmParams === 'object'
          ? { ...utmParams }
          : {}
        : existing.utmParams && typeof existing.utmParams === 'object'
        ? { ...(existing.utmParams as any) }
        : {};

    if (thumbnailUrl !== undefined) {
      const rawThumb = thumbnailUrl ? String(thumbnailUrl).trim() : '';
      if (!rawThumb) {
        updatedThumbnailUrl = null;
        delete updatedUtmParams.logo_data_url;
      } else {
        const filenameMatch = /([^/?#]+)$/.exec(rawThumb);
        const filename = filenameMatch ? filenameMatch[1] : '';
        const tempMatch = /temp_[^_]+_([a-zA-Z0-9_-]+)/.exec(rawThumb);
        const token = tempMatch ? tempMatch[1] : filename;

        const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
        const themeSettings = (profile?.themeSettings as Record<string, any>) || {};
        const pendingDataUri = themeSettings?.pending_logos?.[token] || themeSettings?.pending_logos?.[filename];

        if (pendingDataUri) {
          updatedUtmParams.logo_data_url = pendingDataUri;
          if (themeSettings.pending_logos) {
            delete themeSettings.pending_logos[token];
            delete themeSettings.pending_logos[filename];
            await prisma.profile.update({
              where: { userId: req.user!.id },
              data: { themeSettings },
            }).catch(() => {});
          }
          updatedThumbnailUrl = rawThumb.includes('temp_') ? `/api/public/link-logo/${id}?v=${Date.now()}` : rawThumb;
        } else if (rawThumb.startsWith('data:image/')) {
          const parsed = parseDataImageUri(rawThumb);
          if (parsed) {
            updatedUtmParams.logo_data_url = rawThumb;
            updatedThumbnailUrl = `/api/public/link-logo/${id}?v=${Date.now()}`;
          } else {
            updatedThumbnailUrl = rawThumb.slice(0, 1000);
          }
        } else {
          updatedThumbnailUrl = rawThumb.slice(0, 1000);
        }
      }
    }

    const link = await safeUpdateLink(id, {
      title: title !== undefined ? sanitizeHtml(String(title).trim().slice(0, 255)) : existing.title,
      destinationUrl: destinationUrl !== undefined ? String(destinationUrl).trim() : existing.destinationUrl,
      description:
        description !== undefined
          ? description
            ? sanitizeHtml(String(description).trim().slice(0, 1000))
            : null
          : existing.description,
      icon: icon !== undefined ? (icon ? String(icon).trim().slice(0, 100) : null) : existing.icon,
      thumbnailUrl: updatedThumbnailUrl,
      isHidden: isHidden !== undefined ? Boolean(isHidden) : existing.isHidden,
      isPinned: isPinned !== undefined ? Boolean(isPinned) : existing.isPinned,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existing.isFeatured,
      category:
        category !== undefined
          ? category
            ? sanitizeHtml(String(category).trim().slice(0, 100))
            : null
          : existing.category,
      customLabel:
        customLabel !== undefined
          ? customLabel
            ? sanitizeHtml(String(customLabel).trim().slice(0, 100))
            : null
          : existing.customLabel,
      backgroundColor: updatedBgColor,
      textColor: updatedTextColor,
      mediaType: mediaType !== undefined ? (mediaType ? String(mediaType).trim() : null) : existing.mediaType,
      mediaUrl: mediaUrl !== undefined ? (mediaUrl ? String(mediaUrl).trim() : null) : existing.mediaUrl,
      utmParams: Object.keys(updatedUtmParams).length ? updatedUtmParams : Prisma.DbNull,
      position: position !== undefined ? Number(position) : existing.position,
      scheduledStart:
        scheduledStart !== undefined ? (scheduledStart ? new Date(scheduledStart) : null) : existing.scheduledStart,
      scheduledEnd:
        scheduledEnd !== undefined ? (scheduledEnd ? new Date(scheduledEnd) : null) : existing.scheduledEnd,
    });

    res.status(200).json({ link: formatLink(link) });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/links/:id
 * Delete a link owned by the authenticated user.
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.link.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    if (existing.userId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to delete this link' });
      return;
    }
    await prisma.link.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/toggle', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.link.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    if (existing.userId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to modify this link' });
      return;
    }
    const link = await prisma.link.update({ where: { id }, data: { isActive: !existing.isActive } });
    res.status(200).json({ link: formatLink(link) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/pin', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.link.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    if (existing.userId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to modify this link' });
      return;
    }
    const link = await prisma.link.update({ where: { id }, data: { isPinned: !existing.isPinned } });
    res.status(200).json({ link: formatLink(link) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/hide', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.link.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    if (existing.userId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to modify this link' });
      return;
    }
    const link = await prisma.link.update({ where: { id }, data: { isHidden: !existing.isHidden } });
    res.status(200).json({ link: formatLink(link) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/duplicate', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.link.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    if (existing.userId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to duplicate this link' });
      return;
    }

    const maxLink = await prisma.link.findFirst({
      where: { userId: req.user!.id },
      orderBy: { position: 'desc' },
    });

    const link = await prisma.link.create({
      data: {
        userId: req.user!.id,
        title: `${existing.title} (Copy)`,
        destinationUrl: existing.destinationUrl,
        description: existing.description,
        icon: existing.icon,
        thumbnailUrl: existing.thumbnailUrl,
        position: maxLink ? maxLink.position + 1 : 0,
        isActive: existing.isActive,
        isPinned: existing.isPinned,
        isHidden: existing.isHidden,
        isFeatured: existing.isFeatured,
        category: existing.category,
        customLabel: existing.customLabel,
        backgroundColor: existing.backgroundColor,
        textColor: existing.textColor,
        mediaType: existing.mediaType,
        mediaUrl: existing.mediaUrl,
        utmParams: existing.utmParams as any,
      },
    });
    res.status(201).json({ link: formatLink(link) });
  } catch (error) {
    next(error);
  }
});

export default router;
