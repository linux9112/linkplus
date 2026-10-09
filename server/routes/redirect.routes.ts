import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { validateDestinationUrl } from '../utils/ssrf.js';
import {
  isBotUserAgent,
  classifyDevice,
  classifyReferrer,
  computeDailyVisitorHash,
} from './public.routes.js';

const router = Router();

/**
 * GET /r/:linkId
 * Server-side tracked redirect with schedule validation, SSRF guard, UTM parameter injection, and bot-filtered click tracking.
 */
router.get('/:linkId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const linkId = String(req.params.linkId || '').trim();

    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: { user: { include: { profile: true } } },
    });

    if (!link || !link.isActive || link.isHidden || link.user.status !== 'active') {
      res.status(404).json({ error: 'Link not found or inactive' });
      return;
    }

    // Enforce server-side scheduling rules
    const now = new Date();
    if (link.scheduledStart && link.scheduledStart > now) {
      res.status(404).json({ error: 'Link is not yet active' });
      return;
    }
    if (link.scheduledEnd && link.scheduledEnd < now) {
      res.status(404).json({ error: 'Link has expired' });
      return;
    }

    // Re-validate destination URL to prevent dangerous redirects
    const urlCheck = validateDestinationUrl(link.destinationUrl);
    if (!urlCheck.valid) {
      res.status(400).json({ error: 'Invalid or unsafe redirect destination' });
      return;
    }

    const userAgent = req.get('User-Agent') || '';
    const referrer = req.get('Referrer') || '';
    const queryRef = typeof req.query.ref === 'string' ? req.query.ref : undefined;

    if (!isBotUserAgent(userAgent) && link.user.profile) {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const visitorHash = computeDailyVisitorHash(ip, userAgent);
      const deviceCategory = classifyDevice(userAgent);
      const referrerCategory = classifyReferrer(referrer, queryRef);

      await Promise.all([
        prisma.link.update({
          where: { id: link.id },
          data: { clickCount: { increment: 1 } },
        }),
        prisma.analyticsEvent.create({
          data: {
            profileId: link.user.profile.id,
            linkId: link.id,
            eventType: 'link_click',
            visitorHash,
            deviceCategory,
            referrerCategory,
            campaignId: (req.query.utm_campaign as string) || queryRef || null,
          },
        }),
      ]).catch((err) => console.error('Click tracking error:', err));
    }

    // Append UTM parameters if configured on the link
    let finalUrl = link.destinationUrl;
    if (link.utmParams && typeof link.utmParams === 'object') {
      try {
        const parsed = new URL(finalUrl);
        for (const [key, val] of Object.entries(link.utmParams as Record<string, string>)) {
          if (val && typeof val === 'string' && val.trim()) {
            parsed.searchParams.set(key, val.trim());
          }
        }
        finalUrl = parsed.toString();
      } catch {
        // Keep original destinationUrl if URL construction fails
      }
    }

    res.redirect(302, finalUrl);
  } catch (error) {
    next(error);
  }
});

export default router;
