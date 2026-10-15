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

// ============================================================================
// BADGE MANAGEMENT SYSTEM (Super Admin)
// ============================================================================

/**
 * GET /api/admin/badges/overview
 * KPI statistics and recently awarded badges.
 */
router.get('/badges/overview', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();

    const [totalBadgesAwarded, totalVerifiedUsers, totalTrustedUsers, recentlyAwardedRaw] = await Promise.all([
      prisma.userBadge.count({
        where: {
          status: 'active',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.userBadge.count({
        where: {
          badgeType: { name: { equals: 'Verified' } },
          status: 'active',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.userBadge.count({
        where: {
          badgeType: { name: { equals: 'Trusted' } },
          status: 'active',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.userBadge.findMany({
        take: 8,
        orderBy: { awardedAt: 'desc' },
        include: {
          badgeType: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
          awardedByUser: { select: { id: true, username: true } },
        },
      }),
    ]);

    const recentlyAwarded = recentlyAwardedRaw.map((b) => ({
      id: b.id,
      user_id: b.userId,
      username: b.user?.username || 'user',
      displayName: b.user?.profile?.displayName || b.user?.username || 'User',
      avatarUrl: b.user?.profile?.avatarUrl || null,
      badge: {
        id: b.badgeType?.id,
        name: b.badgeType?.name,
        public_label: b.badgeType?.publicLabel,
        icon: b.badgeType?.icon,
        color: b.badgeType?.color,
      },
      awarded_at: b.awardedAt,
      awarded_by_username: b.awardedByUser?.username || 'Super Admin',
      status: b.status,
      expires_at: b.expiresAt,
      internal_note: b.internalNote,
    }));

    res.status(200).json({
      stats: {
        total_badges: totalBadgesAwarded,
        total_awarded: totalBadgesAwarded,
        totalBadgesAwarded,
        total_verified: totalVerifiedUsers,
        totalVerifiedUsers,
        total_trusted: totalTrustedUsers,
        totalTrustedUsers,
        active_assignments: totalBadgesAwarded,
      },
      recentlyAwarded,
      recent_awards: recentlyAwarded,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/badges/types
 * List all badge types with active assignment counts.
 */
router.get('/badges/types', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const types = await prisma.badgeType.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            userBadges: {
              where: {
                status: 'active',
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      badge_types: types.map((t) => ({
        id: t.id,
        name: t.name,
        public_label: t.publicLabel,
        description: t.description,
        icon: t.icon,
        color: t.color,
        is_active: t.isActive,
        active_users_count: t._count.userBadges,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/badges/types
 * Create a new badge type.
 */
router.post('/badges/types', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, name, public_label, description, icon, color, is_active } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Badge name is required' });
      return;
    }
    if (!public_label || typeof public_label !== 'string' || !public_label.trim()) {
      res.status(400).json({ error: 'Public label is required' });
      return;
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: 'Badge description is required' });
      return;
    }
    if (!icon || typeof icon !== 'string' || !icon.trim()) {
      res.status(400).json({ error: 'Badge icon is required' });
      return;
    }
    if (!color || typeof color !== 'string' || !color.trim()) {
      res.status(400).json({ error: 'Badge color is required' });
      return;
    }

    const typeId = (id && typeof id === 'string' ? id : name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const existing = await prisma.badgeType.findUnique({ where: { id: typeId } });
    if (existing) {
      res.status(409).json({ error: `A badge type with ID '${typeId}' already exists.` });
      return;
    }

    const created = await prisma.badgeType.create({
      data: {
        id: typeId,
        name: name.trim(),
        publicLabel: public_label.trim(),
        description: description.trim(),
        icon: icon.trim(),
        color: color.trim(),
        isActive: is_active !== undefined ? Boolean(is_active) : true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'badge_type_created',
        targetType: 'badge_type',
        targetId: created.id,
        details: { name: created.name, publicLabel: created.publicLabel },
      },
    });

    res.status(201).json({
      badge_type: {
        id: created.id,
        name: created.name,
        public_label: created.publicLabel,
        description: created.description,
        icon: created.icon,
        color: created.color,
        is_active: created.isActive,
      },
      message: 'Badge type created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/badges/types/:id
 * Modify badge metadata (name, public label, description, icon, color, active status).
 */
router.put('/badges/types/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.badgeType.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Badge type not found' });
      return;
    }

    const { name, public_label, description, icon, color, is_active } = req.body || {};

    const updated = await prisma.badgeType.update({
      where: { id },
      data: {
        name: name ? String(name).trim() : existing.name,
        publicLabel: public_label ? String(public_label).trim() : existing.publicLabel,
        description: description ? String(description).trim() : existing.description,
        icon: icon ? String(icon).trim() : existing.icon,
        color: color ? String(color).trim() : existing.color,
        isActive: is_active !== undefined ? Boolean(is_active) : existing.isActive,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'badge_type_updated',
        targetType: 'badge_type',
        targetId: id,
        details: { name: updated.name, publicLabel: updated.publicLabel, isActive: updated.isActive },
      },
    });

    res.status(200).json({
      badge_type: {
        id: updated.id,
        name: updated.name,
        public_label: updated.publicLabel,
        description: updated.description,
        icon: updated.icon,
        color: updated.color,
        is_active: updated.isActive,
      },
      message: 'Badge type updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/badges/users
 * Search users and retrieve badge assignments with status/type filters.
 */
router.get('/badges/users', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 15));
    const skip = (page - 1) * limit;
    const search = String(req.query.q || '').trim().toLowerCase();
    const badgeFilter = String(req.query.badge_type_id || '').trim();
    const statusFilter = String(req.query.status || 'all').trim().toLowerCase();

    const where: Record<string, any> = {};

    if (search) {
      where.OR = [
        { normalizedUsername: { contains: search } },
        { normalizedEmail: { contains: search } },
        { profile: { displayName: { contains: search } } },
      ];
    }

    const now = new Date();

    if (badgeFilter && badgeFilter !== 'all') {
      if (statusFilter === 'active') {
        where.assignedBadges = {
          some: {
            badgeTypeId: badgeFilter,
            status: 'active',
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        };
      } else if (statusFilter === 'expired') {
        where.assignedBadges = {
          some: {
            badgeTypeId: badgeFilter,
            OR: [
              { status: 'expired' },
              { status: 'active', expiresAt: { lte: now } },
            ],
          },
        };
      } else if (statusFilter === 'revoked') {
        where.assignedBadges = {
          some: {
            badgeTypeId: badgeFilter,
            status: 'revoked',
          },
        };
      } else {
        // all or has_badge
        where.assignedBadges = {
          some: {
            badgeTypeId: badgeFilter,
          },
        };
      }
    } else if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'has_badge') {
        where.assignedBadges = {
          some: {},
        };
      } else if (statusFilter === 'no_badge') {
        where.assignedBadges = {
          none: {},
        };
      } else if (statusFilter === 'active') {
        where.assignedBadges = {
          some: {
            status: 'active',
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        };
      } else if (statusFilter === 'expired') {
        where.assignedBadges = {
          some: {
            OR: [
              { status: 'expired' },
              { status: 'active', expiresAt: { lte: now } },
            ],
          },
        };
      } else if (statusFilter === 'revoked') {
        where.assignedBadges = {
          some: {
            status: 'revoked',
          },
        };
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: { displayName: true, avatarUrl: true, bio: true },
          },
          assignedBadges: {
            include: {
              badgeType: true,
              awardedByUser: { select: { id: true, username: true } },
              revokedByUser: { select: { id: true, username: true } },
            },
            orderBy: { awardedAt: 'desc' },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        displayName: u.profile?.displayName || u.username,
        avatarUrl: u.profile?.avatarUrl || null,
        profile: {
          displayName: u.profile?.displayName || u.username,
          avatarUrl: u.profile?.avatarUrl || null,
          bio: u.profile?.bio || null,
        },
        badges: u.assignedBadges.map((b) => {
          const isExpired = b.expiresAt ? b.expiresAt <= now : false;
          const effectiveStatus = b.status === 'active' && isExpired ? 'expired' : b.status;
          const badgeTypeData = b.badgeType
            ? {
                id: b.badgeType.id,
                name: b.badgeType.name,
                public_label: b.badgeType.publicLabel,
                description: b.badgeType.description,
                icon: b.badgeType.icon,
                color: b.badgeType.color,
                is_active: b.badgeType.isActive,
              }
            : {
                id: b.badgeTypeId,
                name: 'Badge',
                public_label: 'Badge',
                description: '',
                icon: 'Award',
                color: '#4F46E5',
                is_active: true,
              };

          return {
            id: b.id,
            user_id: b.userId,
            badge_type_id: b.badgeTypeId,
            name: badgeTypeData.name,
            public_label: badgeTypeData.public_label,
            description: badgeTypeData.description,
            icon: badgeTypeData.icon,
            color: badgeTypeData.color,
            badge_type: badgeTypeData,
            status: effectiveStatus,
            awarded_at: b.awardedAt,
            expires_at: b.expiresAt,
            internal_note: b.internalNote,
            revocation_reason: b.revocationReason,
            awarded_by_username: b.awardedByUser?.username || 'Super Admin',
            revoked_by_username: b.revokedByUser?.username || null,
          };
        }),
      })),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/badges/award
 * Award one or multiple badges to a user.
 */
router.post('/badges/award', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user_id, badge_type_ids, badge_type_id, expires_at, internal_note } = req.body || {};

    if (!user_id || typeof user_id !== 'string') {
      res.status(400).json({ error: 'Target user ID is required' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: user_id },
      include: { profile: true },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    // Collect array of badge type IDs
    const rawIds = Array.isArray(badge_type_ids) ? badge_type_ids : badge_type_id ? [badge_type_id] : [];
    const typeIds = rawIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim());

    if (typeIds.length === 0) {
      res.status(400).json({ error: 'At least one valid badge type ID is required' });
      return;
    }

    const expiryDate = expires_at ? new Date(expires_at) : null;
    if (expires_at && isNaN(expiryDate!.getTime())) {
      res.status(400).json({ error: 'Invalid expiry date format' });
      return;
    }

    const now = new Date();
    const awardedBadges: any[] = [];

    for (const typeId of typeIds) {
      const badgeType = await prisma.badgeType.findUnique({ where: { id: typeId } });
      if (!badgeType) {
        res.status(404).json({ error: `Badge type '${typeId}' not found.` });
        return;
      }
      if (!badgeType.isActive) {
        res.status(400).json({ error: `Badge '${badgeType.name}' is currently disabled.` });
        return;
      }

      // Check for active duplicate assignment
      const existingActive = await prisma.userBadge.findFirst({
        where: {
          userId: targetUser.id,
          badgeTypeId: typeId,
          status: 'active',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });

      if (existingActive) {
        res.status(409).json({
          error: `@${targetUser.username} already has an active '${badgeType.publicLabel}' badge.`,
        });
        return;
      }

      const createdBadge = await prisma.userBadge.create({
        data: {
          userId: targetUser.id,
          badgeTypeId: typeId,
          awardedBy: req.user!.id,
          awardedAt: now,
          expiresAt: expiryDate,
          internalNote: internal_note ? String(internal_note).trim() : null,
          status: 'active',
        },
        include: { badgeType: true },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminUserId: req.user!.id,
          action: 'badge_awarded',
          targetType: 'user_badge',
          targetId: createdBadge.id,
          details: {
            username: targetUser.username,
            badgeName: badgeType.name,
            expiresAt: expiryDate,
            note: internal_note,
          },
        },
      });

      awardedBadges.push(createdBadge);
    }

    res.status(200).json({
      success: true,
      message: `Successfully awarded ${awardedBadges.length} badge(s) to @${targetUser.username}.`,
      badges: awardedBadges,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/badges/revoke
 * Revoke an active badge assignment with reason.
 */
router.post('/badges/revoke', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user_badge_id, reason } = req.body || {};

    if (!user_badge_id) {
      res.status(400).json({ error: 'user_badge_id is required' });
      return;
    }

    const badge = await prisma.userBadge.findUnique({
      where: { id: user_badge_id },
      include: { user: true, badgeType: true },
    });

    if (!badge) {
      res.status(404).json({ error: 'Badge assignment not found' });
      return;
    }

    const revocationReason = reason ? String(reason).trim() : 'Revoked by administrator';

    const updated = await prisma.userBadge.update({
      where: { id: user_badge_id },
      data: {
        status: 'revoked',
        revokedBy: req.user!.id,
        revokedAt: new Date(),
        revocationReason,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'badge_revoked',
        targetType: 'user_badge',
        targetId: badge.id,
        details: {
          username: badge.user?.username || 'user',
          badgeName: badge.badgeType?.name || 'Badge',
          reason: revocationReason,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: `Revoked '${badge.badgeType?.publicLabel || 'Badge'}' badge from @${badge.user?.username || 'user'}.`,
      badge: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/badges/restore
 * Restore a revoked or expired badge back to active.
 */
router.post('/badges/restore', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user_badge_id, expires_at } = req.body || {};

    if (!user_badge_id) {
      res.status(400).json({ error: 'user_badge_id is required' });
      return;
    }

    const badge = await prisma.userBadge.findUnique({
      where: { id: user_badge_id },
      include: { user: true, badgeType: true },
    });

    if (!badge) {
      res.status(404).json({ error: 'Badge assignment not found' });
      return;
    }

    const now = new Date();

    // Prevent duplicate active badge
    const existingActive = await prisma.userBadge.findFirst({
      where: {
        id: { not: badge.id },
        userId: badge.userId,
        badgeTypeId: badge.badgeTypeId,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (existingActive) {
      res.status(409).json({
        error: `@${badge.user?.username || 'user'} already has another active assignment of '${badge.badgeType?.publicLabel || 'Badge'}'.`,
      });
      return;
    }

    const expiryDate = expires_at !== undefined ? (expires_at ? new Date(expires_at) : null) : badge.expiresAt;

    const updated = await prisma.userBadge.update({
      where: { id: user_badge_id },
      data: {
        status: 'active',
        expiresAt: expiryDate,
        revokedBy: null,
        revokedAt: null,
        revocationReason: null,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'badge_restored',
        targetType: 'user_badge',
        targetId: badge.id,
        details: {
          username: badge.user?.username || 'user',
          badgeName: badge.badgeType?.name || 'Badge',
        },
      },
    });

    res.status(200).json({
      success: true,
      message: `Restored '${badge.badgeType?.publicLabel || 'Badge'}' badge for @${badge.user?.username || 'user'}.`,
      badge: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/badges/:id
 * Modify existing badge assignment expiry or internal administrative note.
 */
router.put('/badges/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.userBadge.findUnique({
      where: { id },
      include: { user: true, badgeType: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Badge assignment not found' });
      return;
    }

    const { expires_at, internal_note } = req.body || {};

    const updated = await prisma.userBadge.update({
      where: { id },
      data: {
        expiresAt: expires_at !== undefined ? (expires_at ? new Date(expires_at) : null) : existing.expiresAt,
        internalNote: internal_note !== undefined ? (internal_note ? String(internal_note).trim() : null) : existing.internalNote,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        action: 'badge_assignment_modified',
        targetType: 'user_badge',
        targetId: id,
        details: {
          username: existing.user?.username || 'user',
          badgeName: existing.badgeType?.name || 'Badge',
          expiresAt: updated.expiresAt,
          note: updated.internalNote,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Badge assignment updated successfully.',
      badge: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/badges/history
 * Comprehensive audit log of all badge assignments, revocations, and restorations.
 */
router.get('/badges/history', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.userBadge.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
          badgeType: true,
          awardedByUser: { select: { id: true, username: true } },
          revokedByUser: { select: { id: true, username: true } },
        },
      }),
      prisma.userBadge.count(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      history: history.map((h) => ({
        id: h.id,
        userId: h.userId,
        username: h.user?.username || 'user',
        displayName: h.user?.profile?.displayName || h.user?.username || 'user',
        badge: {
          id: h.badgeType?.id,
          name: h.badgeType?.name || 'Badge',
          public_label: h.badgeType?.publicLabel || 'Badge',
          icon: h.badgeType?.icon || 'Award',
          color: h.badgeType?.color || '#2563EB',
        },
        status: h.status,
        awarded_at: h.awardedAt,
        expires_at: h.expiresAt,
        internal_note: h.internalNote,
        revoked_at: h.revokedAt,
        revocation_reason: h.revocationReason,
        awarded_by_username: h.awardedByUser?.username || 'Super Admin',
        revoked_by_username: h.revokedByUser?.username || null,
      })),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
