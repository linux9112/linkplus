import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateDestinationUrl } from '../utils/ssrf.js';

const router = Router();

function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatLink(link: any) {
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
    media_type: link.mediaType,
    mediaType: link.mediaType,
    media_url: link.mediaUrl,
    mediaUrl: link.mediaUrl,
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
 * GET /api/links
 * List all links belonging to the authenticated user.
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const links = await prisma.link.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });
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

    const maxLink = await prisma.link.findFirst({
      where: { userId: req.user!.id },
      orderBy: { position: 'desc' },
    });
    const position = maxLink ? maxLink.position + 1 : 0;

    const link = await prisma.link.create({
      data: {
        userId: req.user!.id,
        title: sanitizeHtml(title.trim().slice(0, 255)),
        destinationUrl: destinationUrl.trim(),
        description: description ? sanitizeHtml(String(description).trim().slice(0, 1000)) : null,
        icon: icon ? String(icon).trim().slice(0, 100) : null,
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim().slice(0, 1000) : null,
        isHidden: Boolean(isHidden),
        isPinned: Boolean(isPinned),
        isFeatured: Boolean(isFeatured),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        category: category ? sanitizeHtml(String(category).trim().slice(0, 100)) : null,
        customLabel: customLabel ? sanitizeHtml(String(customLabel).trim().slice(0, 100)) : null,
        mediaType: mediaType ? String(mediaType).trim().slice(0, 50) : null,
        mediaUrl: mediaUrl ? String(mediaUrl).trim().slice(0, 2048) : null,
        utmParams: utmParams && typeof utmParams === 'object' ? utmParams : null,
        position,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      },
    });

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

    const link = await prisma.link.update({
      where: { id },
      data: {
        title: title !== undefined ? sanitizeHtml(String(title).trim().slice(0, 255)) : existing.title,
        destinationUrl: destinationUrl !== undefined ? String(destinationUrl).trim() : existing.destinationUrl,
        description:
          description !== undefined
            ? description
              ? sanitizeHtml(String(description).trim().slice(0, 1000))
              : null
            : existing.description,
        icon: icon !== undefined ? (icon ? String(icon).trim().slice(0, 100) : null) : existing.icon,
        thumbnailUrl:
          thumbnailUrl !== undefined
            ? thumbnailUrl
              ? String(thumbnailUrl).trim().slice(0, 1000)
              : null
            : existing.thumbnailUrl,
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
        mediaType: mediaType !== undefined ? (mediaType ? String(mediaType).trim() : null) : existing.mediaType,
        mediaUrl: mediaUrl !== undefined ? (mediaUrl ? String(mediaUrl).trim() : null) : existing.mediaUrl,
        utmParams: utmParams !== undefined ? utmParams : (existing.utmParams as any),
        position: position !== undefined ? Number(position) : existing.position,
        scheduledStart:
          scheduledStart !== undefined ? (scheduledStart ? new Date(scheduledStart) : null) : existing.scheduledStart,
        scheduledEnd:
          scheduledEnd !== undefined ? (scheduledEnd ? new Date(scheduledEnd) : null) : existing.scheduledEnd,
      },
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
