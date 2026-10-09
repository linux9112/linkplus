import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { isReservedUsername } from '../utils/reserved-usernames.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { formatProfile } from './profile.routes.js';
import { formatLink } from './link.routes.js';

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
 * GET /api/public/avatar/:userId
 * Serve the user's uploaded profile photo directly from MySQL.
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

    const themeSettings =
      profile && typeof profile.themeSettings === 'object' && profile.themeSettings !== null
        ? (profile.themeSettings as Record<string, any>)
        : null;

    const dataUri = themeSettings?.avatar_data_url;
    if (!dataUri || typeof dataUri !== 'string') {
      res.status(404).json({ error: 'Avatar not found' });
      return;
    }

    const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUri);
    if (!match) {
      res.status(404).json({ error: 'Invalid avatar data' });
      return;
    }

    const format = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
    const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');

    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
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
