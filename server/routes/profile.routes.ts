import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { isReservedUsername, validateUsername } from '../utils/reserved-usernames.js';
import { sanitizeUser } from '../services/auth.service.js';
import { parseDataImageUri, MAX_UPLOAD_SIZE, validateImageMagicBytes } from '../utils/image-storage.js';
import { githubStorageService, GitHubStorageError } from '../services/github-storage.service.js';


const router = Router();

function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatProfile(profile: any) {
  if (!profile) return null;
  return {
    id: profile.id,
    user_id: profile.userId,
    userId: profile.userId,
    display_name: profile.displayName,
    displayName: profile.displayName,
    bio: profile.bio,
    avatar_url: profile.avatarUrl,
    avatarUrl: profile.avatarUrl,
    theme_settings: profile.themeSettings,
    themeSettings: profile.themeSettings,
    social_links: profile.socialLinks,
    socialLinks: profile.socialLinks,
    is_public: profile.isPublic,
    isPublic: profile.isPublic,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

/**
 * GET /api/profile
 * Retrieve the authenticated user's profile and customization settings.
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: req.user!.id,
          displayName: req.user!.username,
          bio: '',
          avatarUrl: null,
          themeSettings: {
            preset: 'default',
            background_type: 'color',
            background_value: '#0f172a',
            button_shape: 'rounded-full',
            font_family: 'Inter',
          },
          socialLinks: [],
          isPublic: true,
        },
      });
    }

    res.status(200).json({ profile: formatProfile(profile) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/profile
 * Update the authenticated user's profile, theme settings, social links, and visibility.
 */
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body || {};
    const displayNameRaw = body.display_name !== undefined ? body.display_name : body.displayName;
    const bioRaw = body.bio;
    const avatarUrlRaw = body.avatar_url !== undefined ? body.avatar_url : body.avatarUrl;
    const themeSettingsRaw = body.theme_settings !== undefined ? body.theme_settings : body.themeSettings;
    const socialLinksRaw = body.social_links !== undefined ? body.social_links : body.socialLinks;
    const isPublicRaw = body.is_public !== undefined ? body.is_public : body.isPublic;

    const existing = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const existingTheme =
      typeof existing.themeSettings === 'object' && existing.themeSettings !== null
        ? { ...(existing.themeSettings as Record<string, any>) }
        : {};

    const updateData: Record<string, any> = {};
    if (displayNameRaw !== undefined) {
      updateData.displayName = sanitizeHtml(String(displayNameRaw).trim().slice(0, 100));
    }
    if (bioRaw !== undefined) {
      updateData.bio = bioRaw === null || bioRaw === '' ? null : sanitizeHtml(String(bioRaw).trim().slice(0, 1000));
    }

    if (themeSettingsRaw !== undefined && typeof themeSettingsRaw === 'object') {
      Object.assign(existingTheme, themeSettingsRaw);
    }

    if (avatarUrlRaw !== undefined) {
      const trimmedAvatar = avatarUrlRaw ? String(avatarUrlRaw).trim() : '';
      if (!trimmedAvatar) {
        updateData.avatarUrl = null;
        delete existingTheme.avatar_data_url;
      } else if (trimmedAvatar.startsWith('data:image/')) {
        const parsed = parseDataImageUri(trimmedAvatar);
        if (parsed) {
          existingTheme.avatar_data_url = trimmedAvatar;
          updateData.avatarUrl = `/api/public/avatar/${req.user!.id}?v=${Date.now()}`;
        }
      } else {
        updateData.avatarUrl = trimmedAvatar.slice(0, 1000);
      }
    }

    const coverDataUrl = themeSettingsRaw?.cover_data_url || body.cover_data_url;
    if (coverDataUrl !== undefined) {
      const trimmedCover = coverDataUrl ? String(coverDataUrl).trim() : '';
      if (!trimmedCover) {
        delete existingTheme.cover_data_url;
        delete existingTheme.cover_url;
      } else if (trimmedCover.startsWith('data:image/')) {
        const parsed = parseDataImageUri(trimmedCover);
        if (parsed) {
          existingTheme.cover_data_url = trimmedCover;
          existingTheme.cover_url = `/api/public/cover/${req.user!.id}?v=${Date.now()}`;
        }
      }
    } else if (typeof existingTheme.cover_url === 'string' && existingTheme.cover_url.startsWith('data:image/')) {
      const parsed = parseDataImageUri(existingTheme.cover_url);
      if (parsed) {
        existingTheme.cover_data_url = existingTheme.cover_url;
        existingTheme.cover_url = `/api/public/cover/${req.user!.id}?v=${Date.now()}`;
      }
    }

    if (themeSettingsRaw !== undefined || avatarUrlRaw !== undefined || coverDataUrl !== undefined) {
      updateData.themeSettings = existingTheme;
    }

    if (socialLinksRaw !== undefined) {
      updateData.socialLinks = Array.isArray(socialLinksRaw) ? socialLinksRaw : [];
    }
    if (isPublicRaw !== undefined) {
      updateData.isPublic = Boolean(isPublicRaw);
    }

    const profile = await prisma.profile.update({
      where: { userId: req.user!.id },
      data: updateData,
    });

    res.status(200).json({
      profile: formatProfile(profile),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/profile/avatar
 * Upload a custom profile photo (base64 data URI) and persist it in MySQL.
 */
router.post('/avatar', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body || {};
    const imageData = String(body.image_data || body.imageData || body.avatar || '').trim();

    if (!imageData) {
      res.status(400).json({ error: 'Image data is required.' });
      return;
    }

    const parsed = parseDataImageUri(imageData);
    if (!parsed) {
      res.status(400).json({
        error: 'Invalid image format. Please upload a valid PNG, JPG, WebP, GIF, or SVG image.',
      });
      return;
    }

    if (parsed.buffer.length > MAX_UPLOAD_SIZE) {
      res.status(400).json({
        error: 'Profile photo must be smaller than 5 MB.',
      });
      return;
    }

    if (!validateImageMagicBytes(parsed.buffer, parsed.format)) {
      res.status(400).json({
        error: 'Image file content does not match its declared format or is corrupt.',
      });
      return;
    }

    const existing = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
    });

    const existingTheme: Record<string, any> =
      existing && typeof existing.themeSettings === 'object' && existing.themeSettings !== null
        ? { ...(existing.themeSettings as Record<string, any>) }
        : {
            preset: 'default',
            background_type: 'color',
            background_value: '#0f172a',
            button_shape: 'rounded-full',
            font_family: 'Inter',
          };

    existingTheme.avatar_data_url = imageData;
    let avatarUrl = `/api/public/avatar/${req.user!.id}?v=${Date.now()}`;

    if (githubStorageService.isConfigured()) {
      try {
        const githubResult = await githubStorageService.uploadImage({
          category: 'avatars',
          userId: req.user!.id,
          buffer: parsed.buffer,
          ext: parsed.ext,
          mimeType: parsed.mimeType,
          commitMessage: `Upload avatar for @${req.user!.username} [skip ci]`,
        });

        // Clean up previous GitHub avatar if present
        const oldAvatar = existingTheme.github_avatar;
        if (oldAvatar?.path && oldAvatar.path !== githubResult.path) {
          githubStorageService
            .deleteImage({ path: oldAvatar.path, sha: oldAvatar.sha, userId: req.user!.id })
            .catch(() => {});
        }

        avatarUrl = githubResult.url;
        existingTheme.github_avatar = {
          path: githubResult.path,
          sha: githubResult.sha,
          url: githubResult.url,
          raw_url: githubResult.rawUrl,
          cdn_url: githubResult.cdnUrl,
          proxy_url: githubResult.proxyUrl,
          uploaded_at: new Date().toISOString(),
        };
      } catch (err: any) {
        if (err instanceof GitHubStorageError) {
          res.status(err.statusCode).json({ error: err.message, code: err.code });
          return;
        }
        throw err;
      }
    }

    const profile = existing

      ? await prisma.profile.update({
          where: { userId: req.user!.id },
          data: {
            avatarUrl,
            themeSettings: existingTheme,
          },
        })
      : await prisma.profile.create({
          data: {
            userId: req.user!.id,
            displayName: req.user!.username,
            bio: '',
            avatarUrl,
            themeSettings: existingTheme,
            socialLinks: [],
            isPublic: true,
          },
        });

    res.status(200).json({
      avatar_url: avatarUrl,
      avatarUrl,
      profile: formatProfile(profile),
      message: 'Profile photo uploaded and saved!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/profile/username
 * Change the authenticated user's unique username with case-insensitive conflict & reserved word check.
 */
router.put('/username', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username } = req.body || {};
    const validation = validateUsername(username);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error || 'Invalid username', field: 'username' });
      return;
    }

    const trimmedUsername = String(username).trim();
    const normalizedUsername = trimmedUsername.toLowerCase();

    if (isReservedUsername(normalizedUsername)) {
      res.status(400).json({ error: 'Username is reserved by the platform', field: 'username' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { normalizedUsername } });
    if (existing && existing.id !== req.user!.id) {
      res.status(409).json({ error: 'Username is already taken', field: 'username' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { username: trimmedUsername, normalizedUsername },
    });

    res.status(200).json({
      user: sanitizeUser(user),
      message: 'Username updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
