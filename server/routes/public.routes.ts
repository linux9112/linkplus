import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { isReservedUsername } from '../utils/reserved-usernames.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { formatProfile } from './profile.routes.js';
import { formatLink } from './link.routes.js';
import { parseDataImageUri, readFromDiskIfPossible } from '../utils/image-storage.js';
import { githubStorageService } from '../services/github-storage.service.js';


const router = Router();

export function isBotUserAgent(userAgent: string): boolean {
  if (!userAgent) return false;
  return /(bot|crawl|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|curl|python-requests|wget|headless)/i.test(
    userAgent
  );
}

export function classifyDevice(userAgent: string): string {
  if (!userAgent) return 'desktop';
  if (isBotUserAgent(userAgent)) return 'bot';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) return 'tablet';
  if (/(mobile|iphone|ipod|android|blackberry|opera mini|windows phone)/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export function classifyReferrer(referrer: string, queryRef?: string): string {
  if (queryRef === 'qr') return 'qr_campaign';
  if (!referrer) return 'direct';
  if (/(mail\.|outlook\.|gmail\.)/i.test(referrer)) return 'email';
  if (/(google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.)/i.test(referrer)) return 'search';
  if (/(facebook\.|twitter\.|x\.com|t\.co|instagram\.|linkedin\.|tiktok\.|youtube\.|reddit\.|discord\.)/i.test(referrer)) {
    return 'social';
  }
  return 'other';
}

export function computeDailyVisitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().split('T')[0];
  return crypto
    .createHash('sha256')
    .update(`${ip}-${userAgent}-${day}-${env.SESSION_SECRET}`)
    .digest('hex');
}

/**
 * GET /api/public/image-proxy
 * Public anonymous proxy endpoint for images stored in GitHub repository.
 * Ensures images are delivered even if the repository is private or CDN is throttled.
 */
router.get('/image-proxy', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawPath = String(req.query.path || '').trim();
    if (!rawPath) {
      res.status(400).json({ error: 'Image path parameter is required.' });
      return;
    }

    const fetched = await githubStorageService.fetchImage(rawPath);
    if (!fetched) {
      res.status(404).json({ error: 'Image not found in storage repository.' });
      return;
    }

    res.setHeader('Content-Type', fetched.contentType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.status(200).send(fetched.buffer);
  } catch {
    res.status(502).json({ error: 'Failed to proxy requested image.' });
  }
});

/**
 * GET /api/public/avatar/:userId
 * Serve the user's uploaded profile photo directly from MySQL, GitHub, or disk fallback.
 */
router.get('/avatar/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId) {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }

    // If avatarUrl is an external URL (e.g. GitHub raw URL), redirect to it
    if (profile.avatarUrl && (profile.avatarUrl.startsWith('http://') || profile.avatarUrl.startsWith('https://'))) {
      res.redirect(302, profile.avatarUrl);
      return;
    }

    const themeSettings =
      profile.themeSettings && typeof profile.themeSettings === 'object'
        ? (profile.themeSettings as Record<string, any>)
        : {};

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

    // Disk fallback if avatarUrl points to a local file
    if (profile.avatarUrl && typeof profile.avatarUrl === 'string') {
      const filenameMatch = /([^/?#]+)$/.exec(profile.avatarUrl);
      if (filenameMatch) {
        const diskBuf = readFromDiskIfPossible('avatars', filenameMatch[1]);
        if (diskBuf) {
          const ext = filenameMatch[1].split('.').pop()?.toLowerCase() || 'jpeg';
          res.setHeader('Content-Type', ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.status(200).send(diskBuf);
          return;
        }
      }
    }

    res.status(404).json({ error: 'Avatar not found' });
  } catch (error) {
    next(error);
  }
});


/**
 * GET /api/public/cover/:userId
 * Serve the user's uploaded cover photo directly from MySQL (or disk fallback).
 */
router.get('/cover/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId) {
      res.status(404).json({ error: 'Cover not found' });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      res.status(404).json({ error: 'Cover not found' });
      return;
    }

    const themeSettings =
      profile.themeSettings && typeof profile.themeSettings === 'object'
        ? (profile.themeSettings as Record<string, any>)
        : {};

    // External URL redirect (e.g. GitHub raw URL)
    if (themeSettings?.cover_url && (themeSettings.cover_url.startsWith('http://') || themeSettings.cover_url.startsWith('https://'))) {
      res.redirect(302, themeSettings.cover_url);
      return;
    }

    const dataUri =
      themeSettings?.cover_data_url ||
      (typeof themeSettings?.cover_url === 'string' && themeSettings.cover_url.startsWith('data:image/')
        ? themeSettings.cover_url
        : null);


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

    // Disk fallback if cover_url points to a local file
    if (themeSettings?.cover_url && typeof themeSettings.cover_url === 'string') {
      const filenameMatch = /([^/?#]+)$/.exec(themeSettings.cover_url);
      if (filenameMatch) {
        const diskBuf = readFromDiskIfPossible('covers', filenameMatch[1]);
        if (diskBuf) {
          const ext = filenameMatch[1].split('.').pop()?.toLowerCase() || 'jpeg';
          res.setHeader('Content-Type', ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.status(200).send(diskBuf);
          return;
        }
      }
    }

    res.status(404).json({ error: 'Cover not found' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/link-logo/:linkId
 * Serve custom link logo/thumbnail directly from MySQL (or pending upload buffer).
 */
router.get('/link-logo/:linkId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = String(req.params.linkId || '').trim();
    if (!rawId) {
      res.status(404).json({ error: 'Logo not found' });
      return;
    }

    // Case 1: Temporary pending logo created before link is saved (temp_${userId}_${token})
    const tempMatch = /^temp_([^_]+)_(.+)$/.exec(rawId);
    if (tempMatch) {
      const userId = tempMatch[1];
      const token = tempMatch[2];
      const profile = await prisma.profile.findUnique({ where: { userId } });
      const themeSettings = (profile?.themeSettings as Record<string, any>) || {};
      const pendingDataUri = themeSettings?.pending_logos?.[token];
      if (pendingDataUri && typeof pendingDataUri === 'string') {
        const parsed = parseDataImageUri(pendingDataUri);
        if (parsed) {
          res.setHeader('Content-Type', parsed.mimeType);
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.status(200).send(parsed.buffer);
          return;
        }
      }
    }

    // Case 2: Saved link record
    const link = await prisma.link.findUnique({
      where: { id: rawId },
    });

    if (link) {
      if (link.thumbnailUrl && (link.thumbnailUrl.startsWith('http://') || link.thumbnailUrl.startsWith('https://'))) {
        res.redirect(302, link.thumbnailUrl);
        return;
      }

      const utmParams = (link.utmParams as Record<string, any>) || {};
      const dataUri =

        utmParams?.logo_data_url ||
        (link.thumbnailUrl && link.thumbnailUrl.startsWith('data:image/') ? link.thumbnailUrl : null);

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

      // Disk fallback
      if (link.thumbnailUrl && typeof link.thumbnailUrl === 'string') {
        const filenameMatch = /([^/?#]+)$/.exec(link.thumbnailUrl);
        if (filenameMatch) {
          const diskBuf = readFromDiskIfPossible('links', filenameMatch[1]);
          if (diskBuf) {
            const ext = filenameMatch[1].split('.').pop()?.toLowerCase() || 'png';
            res.setHeader('Content-Type', ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.status(200).send(diskBuf);
            return;
          }
        }
      }
    }

    res.status(404).json({ error: 'Logo not found' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/:username
 * Resolve public profile, active/scheduled links, and record privacy-safe analytics event.
 */
router.get('/:username', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawUsername = String(req.params.username || '').trim();
    const normalizedUsername = rawUsername.toLowerCase();

    if (!normalizedUsername || isReservedUsername(normalizedUsername)) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { normalizedUsername },
      include: { profile: true },
    });

    if (!user || user.status !== 'active' || !user.profile || !user.profile.isPublic) {
      res.status(404).json({ error: 'Profile not found or private' });
      return;
    }

    const now = new Date();

    const links = await prisma.link.findMany({
      where: {
        userId: user.id,
        isActive: true,
        isHidden: false,
        AND: [
          {
            OR: [{ scheduledStart: null }, { scheduledStart: { lte: now } }],
          },
          {
            OR: [{ scheduledEnd: null }, { scheduledEnd: { gte: now } }],
          },
        ],
      },
      orderBy: [{ isPinned: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });

    // Privacy-conscious analytics logging (bot-filtered, daily-salted hash, no raw IP stored)
    const userAgent = req.get('User-Agent') || '';
    const referrer = req.get('Referrer') || '';
    const queryRef = typeof req.query.ref === 'string' ? req.query.ref : undefined;
    const campaign = typeof req.query.campaign === 'string' ? req.query.campaign : queryRef || null;

    if (!isBotUserAgent(userAgent)) {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const visitorHash = computeDailyVisitorHash(ip, userAgent);
      const deviceCategory = classifyDevice(userAgent);
      const referrerCategory = classifyReferrer(referrer, queryRef);
      const eventType = queryRef === 'qr' ? 'qr_scan' : 'profile_view';

      prisma.analyticsEvent
        .create({
          data: {
            profileId: user.profile.id,
            eventType,
            visitorHash,
            deviceCategory,
            referrerCategory,
            campaignId: campaign,
          },
        })
        .catch((err) => console.error('Analytics event error:', err));

      // Also record profile_view when visited via QR so total profile views include QR visits
      if (eventType === 'qr_scan') {
        prisma.analyticsEvent
          .create({
            data: {
              profileId: user.profile.id,
              eventType: 'profile_view',
              visitorHash,
              deviceCategory,
              referrerCategory: 'qr_campaign',
              campaignId: campaign,
            },
          })
          .catch(() => {});
      }
    }

    const canonicalUrl = `${env.APP_URL.replace(/\/$/, '')}/${user.username}`;

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
      profile: formatProfile(user.profile),
      links: links.map(formatLink),
      meta: {
        canonicalUrl,
        title: `${user.profile.displayName || user.username} (@${user.username}) | LinkPulse`,
        description: user.profile.bio || `Check out ${user.profile.displayName || user.username}'s links on LinkPulse.`,
        ogImage: user.profile.avatarUrl || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/public/:username/report
 * Submit a moderation report for a public profile or specific link.
 */
router.post(
  '/:username/report',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const normalizedUsername = String(req.params.username || '').trim().toLowerCase();
      const { reason, details, linkId } = req.body || {};

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        res.status(400).json({ error: 'Report reason is required' });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { normalizedUsername },
      });

      if (!targetUser) {
        res.status(404).json({ error: 'Reported profile not found' });
        return;
      }

      const report = await prisma.moderationReport.create({
        data: {
          reporterUserId: req.user?.id || null,
          reportedUserId: targetUser.id,
          reportedLinkId: linkId ? String(linkId) : null,
          reason: reason.trim().slice(0, 255),
          details: details ? String(details).trim().slice(0, 2000) : null,
          status: 'pending',
        },
      });

      res.status(201).json({
        report,
        message: 'Report submitted for moderation review.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
