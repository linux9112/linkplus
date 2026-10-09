import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { sanitizeUser } from '../services/auth.service.js';

const router = Router();

router.use(requireAdmin);

router.get('/overview', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalUsers, totalProfiles, totalLinks, totalEvents, pendingReports, suspendedUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.profile.count(),
        prisma.link.count(),
        prisma.analyticsEvent.count(),
        prisma.moderationReport.count({ where: { status: 'pending' } }),
        prisma.user.count({ where: { status: 'suspended' } }),
      ]);

    res.status(200).json({
      stats: {
        totalUsers,
        totalProfiles,
        totalLinks,
        totalEvents,
        pendingReports,
        suspendedUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;
    const search = String(req.query.q || req.query.search || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || '').trim();

    const where: Record<string, any> = {};
    if (search) {
      where.OR = [
        { normalizedUsername: { contains: search } },
        { normalizedEmail: { contains: search } },
      ];
    }
    if (statusFilter && ['active', 'suspended'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: { displayName: true, isPublic: true },
          },
          _count: {
            select: { links: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      users: users.map((u) => ({
        ...sanitizeUser(u),
        displayName: u.profile?.displayName || u.username,
        isPublic: u.profile?.isPublic ?? true,
        linksCount: u._count.links,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

const suspendUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (id === req.user!.id) {
      res.status(400).json({ error: 'Administrators cannot suspend their own account' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'suspended' },
    });

    await prisma.session.deleteMany({ where: { userId: id } });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'user_suspend',
        targetType: 'user',
        targetId: id,
        details: {
          username: existing.username,
          reason: req.body?.reason || 'Administrative suspension',
        },
      },
    });

    res.status(200).json({
      user: sanitizeUser(user),
      message: 'User suspended and sessions revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

const reactivateUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'active' },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'user_reactivate',
        targetType: 'user',
        targetId: id,
        details: { username: existing.username },
      },
    });

    res.status(200).json({
      user: sanitizeUser(user),
      message: 'User reactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

router.put('/users/:id/suspend', suspendUserHandler);
router.post('/users/:id/suspend', suspendUserHandler);
router.put('/users/:id/reactivate', reactivateUserHandler);
router.post('/users/:id/reactivate', reactivateUserHandler);

router.get('/links', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = String(req.query.q || '').trim();
    const where: Record<string, any> = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { destinationUrl: { contains: search } },
      ];
    }

    const links = await prisma.link.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    res.status(200).json({ links });
  } catch (error) {
    next(error);
  }
});

router.delete('/links/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.link.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    await prisma.link.delete({ where: { id } });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'link_delete',
        targetType: 'link',
        targetId: id,
        details: {
          title: existing.title,
          destination_url: existing.destinationUrl,
          userId: existing.userId,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Link moderated and removed',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/reports', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reports = await prisma.moderationReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reportedUser: { select: { id: true, username: true, email: true, status: true } },
        reportedLink: { select: { id: true, title: true, destinationUrl: true } },
      },
    });
    res.status(200).json({ reports });
  } catch (error) {
    next(error);
  }
});

router.put('/reports/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, resolutionNotes, removeLink, suspendUser } = req.body || {};

    const existing = await prisma.moderationReport.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (removeLink && existing.reportedLinkId) {
      await prisma.link.delete({ where: { id: existing.reportedLinkId } }).catch(() => {});
    }

    if (suspendUser && existing.reportedUserId) {
      await prisma.user.update({
        where: { id: existing.reportedUserId },
        data: { status: 'suspended' },
      }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: existing.reportedUserId } }).catch(() => {});
    }

    const report = await prisma.moderationReport.update({
      where: { id },
      data: {
        status: status || 'resolved',
        resolutionNotes: resolutionNotes || null,
        resolvedBy: req.user!.id,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'resolve_report',
        targetType: 'report',
        targetId: id,
        details: { status: report.status, removeLink: Boolean(removeLink), suspendUser: Boolean(suspendUser) },
      },
    });

    res.status(200).json({ report, message: 'Report updated successfully' });
  } catch (error) {
    next(error);
  }
});

const auditLogHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 25));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: { select: { id: true, username: true, email: true } },
        },
      }),
      prisma.adminAuditLog.count(),
    ]);

    const formatted = logs.map((l) => ({
      id: l.id,
      admin_user_id: l.adminUserId,
      adminUsername: l.adminUser?.username || 'Admin',
      action: l.action,
      target_type: l.targetType,
      targetType: l.targetType,
      target_id: l.targetId,
      targetId: l.targetId,
      details: l.details,
      created_at: l.createdAt,
      createdAt: l.createdAt,
    }));

    res.status(200).json({
      logs: formatted,
      audit_logs: formatted,
      total,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

router.get('/audit-log', auditLogHandler);
router.get('/audit-logs', auditLogHandler);

router.get('/platform-settings', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await prisma.platformSetting.findMany();
    const settingsMap: Record<string, any> = {
      allow_registrations: true,
      maintenance_mode: false,
      default_theme: 'midnight',
      require_email_verification: false,
    };

    for (const row of rows) {
      try {
        settingsMap[row.key] = JSON.parse(row.value);
      } catch {
        settingsMap[row.key] = row.value;
      }
    }

    res.status(200).json({ settings: settingsMap });
  } catch (error) {
    next(error);
  }
});

router.put('/platform-settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates = req.body || {};
    const entries = Object.entries(updates);

    for (const [key, val] of entries) {
      const strValue = typeof val === 'string' ? val : JSON.stringify(val);
      await prisma.platformSetting.upsert({
        where: { key },
        update: {
          value: strValue,
          updatedBy: req.user!.id,
        },
        create: {
          key,
          value: strValue,
          isPublic: ['allow_registrations', 'maintenance_mode', 'default_theme'].includes(key),
          updatedBy: req.user!.id,
        },
      });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'update_platform_settings',
        targetType: 'settings',
        targetId: 'global',
        details: updates,
      },
    });

    res.status(200).json({
      settings: updates,
      message: 'Platform settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
