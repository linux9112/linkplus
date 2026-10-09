import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { env } from '../config/env.js';

const router = Router();

export function formatQrSettings(settings: any) {
  if (!settings) return null;
  return {
    id: settings.id,
    user_id: settings.userId,
    userId: settings.userId,
    foreground_color: settings.foregroundColor,
    foregroundColor: settings.foregroundColor,
    background_color: settings.backgroundColor,
    backgroundColor: settings.backgroundColor,
    gradient_settings: settings.gradientSettings,
    gradientSettings: settings.gradientSettings,
    dot_style: settings.dotStyle,
    dotStyle: settings.dotStyle,
    corner_style: settings.cornerStyle,
    cornerStyle: settings.cornerStyle,
    logo_url: settings.logoUrl,
    logoUrl: settings.logoUrl,
    error_correction_level: settings.errorCorrectionLevel,
    errorCorrectionLevel: settings.errorCorrectionLevel,
    margin: settings.margin,
    resolution: settings.resolution,
    transparent_background: settings.transparentBackground,
    transparentBackground: settings.transparentBackground,
    preset_name: settings.presetName,
    presetName: settings.presetName,
    updated_at: settings.updatedAt,
  };
}

/**
 * Programmatically verifies a QR code payload using jsQR.
 */
export function verifyQrPayload(
  targetUrl: string,
  ecLevel: 'L' | 'M' | 'Q' | 'H' = 'H',
  margin: number = 2
): { scannable: boolean; decodedUrl: string | null; moduleCount: number } {
  const qr = QRCode.create(targetUrl, { errorCorrectionLevel: ecLevel });
  const moduleCount = qr.modules.size;
  const scale = 4;
  const totalModules = moduleCount + margin * 2;
  const pixelWidth = totalModules * scale;
  const pixelHeight = totalModules * scale;
  const rgbaBuffer = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);
  rgbaBuffer.fill(255);

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.modules.get(r, c)) {
        const startX = (c + margin) * scale;
        const startY = (r + margin) * scale;
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const idx = ((startY + py) * pixelWidth + (startX + px)) * 4;
            rgbaBuffer[idx] = 0;
            rgbaBuffer[idx + 1] = 0;
            rgbaBuffer[idx + 2] = 0;
            rgbaBuffer[idx + 3] = 255;
          }
        }
      }
    }
  }

  const decodeQr = (typeof jsQR === 'function' ? jsQR : (jsQR as any).default) as (
    data: Uint8ClampedArray,
    width: number,
    height: number
  ) => { data: string } | null;
  const decoded = decodeQr(rgbaBuffer, pixelWidth, pixelHeight);
  return {
    scannable: Boolean(decoded && decoded.data === targetUrl),
    decodedUrl: decoded ? decoded.data : null,
    moduleCount,
  };
}

const getSettingsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let settings = await prisma.qrSetting.findUnique({
      where: { userId: req.user!.id },
    });

    if (!settings) {
      settings = await prisma.qrSetting.create({
        data: {
          userId: req.user!.id,
          foregroundColor: '#000000',
          backgroundColor: '#ffffff',
          gradientSettings: Prisma.JsonNull,
          dotStyle: 'squares',
          cornerStyle: 'square',
          logoUrl: null,
          errorCorrectionLevel: 'H',
          margin: 2,
          resolution: 1024,
          transparentBackground: false,
          presetName: 'Classic Black',
        },
      });
    }

    const baseUrl = env.APP_URL.replace(/\/$/, '');
    const profileUrl = `${baseUrl}/${req.user!.username}`;
    const formatted = formatQrSettings(settings);

    res.status(200).json({
      settings: formatted,
      qr_settings: formatted,
      appUrl: baseUrl,
      profileUrl,
    });
  } catch (error) {
    next(error);
  }
};

const updateSettingsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body || {};
    const foregroundColor = body.foreground_color ?? body.foregroundColor;
    const backgroundColor = body.background_color ?? body.backgroundColor;
    const gradientSettings = body.gradient_settings !== undefined ? body.gradient_settings : body.gradientSettings;
    const dotStyle = body.dot_style ?? body.dotStyle;
    const cornerStyle = body.corner_style ?? body.cornerStyle;
    const logoUrl = body.logo_url !== undefined ? body.logo_url : body.logoUrl;
    const errorCorrectionLevel = body.error_correction_level ?? body.errorCorrectionLevel;
    const margin = body.margin;
    const resolution = body.resolution;
    const transparentBackground =
      body.transparent_background !== undefined ? body.transparent_background : body.transparentBackground;
    const presetName = body.preset_name !== undefined ? body.preset_name : body.presetName;

    const updateData: Record<string, any> = {};
    if (foregroundColor !== undefined) updateData.foregroundColor = String(foregroundColor);
    if (backgroundColor !== undefined) updateData.backgroundColor = String(backgroundColor);
    if (gradientSettings !== undefined) {
      updateData.gradientSettings = gradientSettings === null ? Prisma.JsonNull : gradientSettings;
    }
    if (dotStyle !== undefined) updateData.dotStyle = String(dotStyle);
    if (cornerStyle !== undefined) updateData.cornerStyle = String(cornerStyle);
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl ? String(logoUrl) : null;
    if (errorCorrectionLevel !== undefined) {
      const validEc = ['L', 'M', 'Q', 'H'].includes(String(errorCorrectionLevel))
        ? String(errorCorrectionLevel)
        : 'H';
      updateData.errorCorrectionLevel = validEc;
    }
    if (margin !== undefined) updateData.margin = Math.max(0, Math.min(10, Number(margin)));
    if (resolution !== undefined) updateData.resolution = Math.max(256, Math.min(4096, Number(resolution)));
    if (transparentBackground !== undefined) updateData.transparentBackground = Boolean(transparentBackground);
    if (presetName !== undefined) updateData.presetName = presetName ? String(presetName) : null;

    const settings = await prisma.qrSetting.upsert({
      where: { userId: req.user!.id },
      update: updateData,
      create: {
        userId: req.user!.id,
        foregroundColor: updateData.foregroundColor ?? '#000000',
        backgroundColor: updateData.backgroundColor ?? '#ffffff',
        gradientSettings: updateData.gradientSettings ?? Prisma.JsonNull,
        dotStyle: updateData.dotStyle ?? 'squares',
        cornerStyle: updateData.cornerStyle ?? 'square',
        logoUrl: updateData.logoUrl ?? null,
        errorCorrectionLevel: updateData.errorCorrectionLevel ?? 'H',
        margin: updateData.margin ?? 2,
        resolution: updateData.resolution ?? 1024,
        transparentBackground: updateData.transparentBackground ?? false,
        presetName: updateData.presetName ?? 'Classic Black',
      },
    });

    const formatted = formatQrSettings(settings);
    res.status(200).json({
      settings: formatted,
      qr_settings: formatted,
      message: 'QR Studio settings saved to MySQL successfully',
    });
  } catch (error) {
    next(error);
  }
};

router.get('/', requireAuth, getSettingsHandler);
router.put('/', requireAuth, updateSettingsHandler);
router.get('/settings', requireAuth, getSettingsHandler);
router.put('/settings', requireAuth, updateSettingsHandler);

/**
 * GET /api/qr/generate
 * Generates downloadable PNG or SVG QR code for the authenticated user's public profile URL.
 */
router.get('/generate', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    let settings = await prisma.qrSetting.findUnique({ where: { userId: user.id } });
    if (!settings) {
      settings = await prisma.qrSetting.create({ data: { userId: user.id } });
    }

    const format = (req.query.format as string) === 'svg' ? 'svg' : 'png';
    const size = Math.max(256, Math.min(4096, parseInt(req.query.size as string, 10) || settings.resolution || 1024));
    const baseUrl = env.APP_URL.replace(/\/$/, '');
    const profileUrl = `${baseUrl}/${user.username}`;

    const opts: any = {
      errorCorrectionLevel: (settings.errorCorrectionLevel as 'L' | 'M' | 'Q' | 'H') || 'H',
      margin: settings.margin ?? 2,
      width: size,
      color: {
        dark: settings.foregroundColor || '#000000',
        light: settings.transparentBackground ? '#00000000' : settings.backgroundColor || '#ffffff',
      },
    };

    if (format === 'svg') {
      const svg = await QRCode.toString(profileUrl, { ...opts, type: 'svg' });
      res.setHeader('Content-Disposition', `attachment; filename="${user.username}-qr.svg"`);
      res.type('image/svg+xml').send(svg);
    } else {
      const buffer = await QRCode.toBuffer(profileUrl, { ...opts, type: 'png' });
      res.setHeader('Content-Disposition', `attachment; filename="${user.username}-qr.png"`);
      res.type('image/png').send(buffer);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/qr/generate
 * Generates QR metadata, SVG, data URI, and verifies scannability via jsQR.
 */
router.post('/generate', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const baseUrl = env.APP_URL.replace(/\/$/, '');
    const targetUrl = `${baseUrl}/${user.username}`;
    const ecLevel = ((req.body?.error_correction_level || req.body?.errorCorrectionLevel || 'H') as 'L' | 'M' | 'Q' | 'H');
    const margin = req.body?.margin !== undefined ? Number(req.body.margin) : 2;

    const verification = verifyQrPayload(targetUrl, ecLevel, margin);
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: ecLevel,
      margin,
      width: 512,
    });

    res.status(200).json({
      url: targetUrl,
      dataUrl,
      scannable: verification.scannable,
      decodedUrl: verification.decodedUrl,
      module_count: verification.moduleCount,
      error_correction_level: ecLevel,
      message: `QR Code generated and verified with Level ${ecLevel} error correction`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
