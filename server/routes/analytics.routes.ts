import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { analyticsRateLimiter } from '../middleware/rate-limit.middleware.js';
import { formatLink } from './link.routes.js';

const router = Router();

router.use(analyticsRateLimiter);

function parseDaysParam(daysQuery: unknown): number {
  const parsed = Number(daysQuery);
  if ([7, 14, 30, 60, 90, 365].includes(parsed)) return parsed;
  return 30;
}

const getSummaryHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const days = parseDaysParam(req.query.days);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const [totalViews, totalClicks, qrScans, totalEvents, topLinks, recentEvents] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: 'profile_view', createdAt: { gte: sinceDate } },
      }),
      prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: 'link_click', createdAt: { gte: sinceDate } },
      }),
      prisma.analyticsEvent.count({
        where: { profileId: profile.id, eventType: 'qr_scan', createdAt: { gte: sinceDate } },
      }),
      prisma.analyticsEvent.count({
        where: { profileId: profile.id, createdAt: { gte: sinceDate } },
      }),
      prisma.link.findMany({
        where: { userId: req.user!.id },
        orderBy: { clickCount: 'desc' },
        take: 5,
      }),
      prisma.analyticsEvent.findMany({
        where: { profileId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          link: {
            select: { id: true, title: true, destinationUrl: true },
          },
        },
      }),
    ]);

    const ctr = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(2)) : 0;

    res.status(200).json({
      totalViews,
      totalClicks,
      qrScans,
      ctr,
      topLinks: topLinks.map(formatLink),
      recentActivity: recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        event_type: e.eventType,
        referrerCategory: e.referrerCategory,
        deviceCategory: e.deviceCategory,
        campaignId: e.campaignId,
        linkTitle: e.link?.title || null,
        createdAt: e.createdAt.toISOString(),
      })),
      summary: {
        total_views: totalViews,
        total_clicks: totalClicks,
        qr_scans: qrScans,
        ctr,
      },
      events_count: totalEvents,
    });
  } catch (error) {
    next(error);
  }
};

router.get('/', requireAuth, getSummaryHandler);
router.get('/overview', requireAuth, getSummaryHandler);

router.get('/views', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const days = parseDaysParam(req.query.days);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const events = await prisma.analyticsEvent.findMany({
      where: {
        profileId: profile.id,
        eventType: { in: ['profile_view', 'link_click', 'qr_scan'] },
        createdAt: { gte: sinceDate },
      },
      select: { eventType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap: Record<string, { date: string; views: number; clicks: number; qrScans: number; count: number }> = {};

    // Pre-populate date buckets so the chart is continuous
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, views: 0, clicks: 0, qrScans: 0, count: 0 };
    }

    events.forEach((e) => {
      const date = e.createdAt.toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { date, views: 0, clicks: 0, qrScans: 0, count: 0 };
      }
      if (e.eventType === 'profile_view') {
        dailyMap[date].views += 1;
        dailyMap[date].count += 1;
      } else if (e.eventType === 'link_click') {
        dailyMap[date].clicks += 1;
      } else if (e.eventType === 'qr_scan') {
        dailyMap[date].qrScans += 1;
      }
    });

    res.status(200).json({ views: Object.values(dailyMap) });
  } catch (error) {
    next(error);
  }
});

router.get('/clicks', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const days = parseDaysParam(req.query.days);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const events = await prisma.analyticsEvent.findMany({
      where: {
        profileId: profile.id,
        eventType: 'link_click',
        createdAt: { gte: sinceDate },
      },
      select: { createdAt: true },
    });

    const dailyClicks: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyClicks[key] = 0;
    }

    events.forEach((e) => {
      const date = e.createdAt.toISOString().split('T')[0];
      dailyClicks[date] = (dailyClicks[date] || 0) + 1;
    });

    res.status(200).json({
      clicks: Object.entries(dailyClicks).map(([date, count]) => ({ date, count })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/top-links', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const links = await prisma.link.findMany({
      where: { userId: req.user!.id },
      orderBy: { clickCount: 'desc' },
      take: 10,
    });
    res.status(200).json({ topLinks: links.map(formatLink) });
  } catch (error) {
    next(error);
  }
});

router.get('/referrers', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const data = await prisma.analyticsEvent.groupBy({
      by: ['referrerCategory'],
      where: { profileId: profile.id },
      _count: { referrerCategory: true },
    });

    res.status(200).json({
      referrers: data.map((d) => ({
        category: d.referrerCategory,
        count: d._count.referrerCategory,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/devices', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const data = await prisma.analyticsEvent.groupBy({
      by: ['deviceCategory'],
      where: { profileId: profile.id },
      _count: { deviceCategory: true },
    });

    res.status(200).json({
      devices: data.map((d) => ({
        category: d.deviceCategory,
        count: d._count.deviceCategory,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
