import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export interface QrPreset {
  name: string;
  foregroundColor: string;
  backgroundColor: string;
  dotStyle: 'squares' | 'rounded' | 'dots' | 'diamond' | 'classy';
  cornerStyle: 'square' | 'rounded' | 'circle';
  gradient?: {
    enabled: boolean;
    color1: string;
    color2: string;
    type: 'linear' | 'radial';
  } | null;
}

export const QR_PRESETS: QrPreset[] = [
  {
    name: 'Classic Black',
    foregroundColor: '#000000',
    backgroundColor: '#ffffff',
    dotStyle: 'squares',
    cornerStyle: 'square',
    gradient: null,
  },
  {
    name: 'Midnight',
    foregroundColor: '#0f172a',
    backgroundColor: '#f8fafc',
    dotStyle: 'rounded',
    cornerStyle: 'rounded',
    gradient: { enabled: true, color1: '#0f172a', color2: '#312e81', type: 'linear' },
  },
  {
    name: 'Ocean Blue',
    foregroundColor: '#0369a1',
    backgroundColor: '#f0f9ff',
    dotStyle: 'dots',
    cornerStyle: 'rounded',
    gradient: { enabled: true, color1: '#0284c7', color2: '#1d4ed8', type: 'linear' },
  },
  {
    name: 'Emerald',
    foregroundColor: '#065f46',
    backgroundColor: '#ecfdf5',
    dotStyle: 'rounded',
    cornerStyle: 'rounded',
    gradient: { enabled: true, color1: '#059669', color2: '#064e3b', type: 'linear' },
  },
  {
    name: 'Violet Glow',
    foregroundColor: '#5b21b6',
    backgroundColor: '#faf5ff',
    dotStyle: 'classy',
    cornerStyle: 'rounded',
    gradient: { enabled: true, color1: '#6366f1', color2: '#9333ea', type: 'linear' },
  },
  {
    name: 'Sunset',
    foregroundColor: '#9a3412',
    backgroundColor: '#fff7ed',
    dotStyle: 'rounded',
    cornerStyle: 'circle',
    gradient: { enabled: true, color1: '#ea580c', color2: '#be123c', type: 'linear' },
  },
  {
    name: 'Minimal White',
    foregroundColor: '#1e293b',
    backgroundColor: '#ffffff',
    dotStyle: 'dots',
    cornerStyle: 'square',
    gradient: null,
  },
  {
    name: 'Brand Colors',
    foregroundColor: '#4f46e5',
    backgroundColor: '#eef2ff',
    dotStyle: 'rounded',
    cornerStyle: 'rounded',
    gradient: { enabled: true, color1: '#4f46e5', color2: '#7c3aed', type: 'radial' },
  },
];

export interface StyledQrProps {
  url: string;
  foregroundColor: string;
  backgroundColor: string;
  dotStyle: string;
  cornerStyle: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  size?: number;
  transparentBackground?: boolean;
  logoUrl?: string | null;
  logoSizeRatio?: number;
  gradientSettings?: {
    enabled?: boolean;
    color1?: string;
    color2?: string;
    type?: 'linear' | 'radial';
  } | null;
  onVerificationChange?: (result: { scannable: boolean; decodedUrl: string | null }) => void;
}

function isFinderPattern(row: number, col: number, moduleCount: number): boolean {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= moduleCount - 7) return true;
  if (row >= moduleCount - 7 && col < 7) return true;
  return false;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

function drawFinderPattern(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  cellSize: number,
  cornerStyle: string,
  fgFill: string | CanvasGradient,
  bgColor: string,
  transparentBg: boolean
) {
  const outerSize = cellSize * 7;
  const innerWhiteSize = cellSize * 5;
  const centerDotSize = cellSize * 3;

  ctx.fillStyle = fgFill;
  if (cornerStyle === 'circle') {
    ctx.beginPath();
    ctx.arc(startX + outerSize / 2, startY + outerSize / 2, outerSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (transparentBg) {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.fillStyle = transparentBg ? '#000000' : bgColor;
    ctx.beginPath();
    ctx.arc(startX + outerSize / 2, startY + outerSize / 2, innerWhiteSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = fgFill;
    ctx.beginPath();
    ctx.arc(startX + outerSize / 2, startY + outerSize / 2, centerDotSize / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const outerRadius = cornerStyle === 'rounded' ? cellSize * 1.8 : 0;
    const innerRadius = cornerStyle === 'rounded' ? cellSize * 1.2 : 0;
    const dotRadius = cornerStyle === 'rounded' ? cellSize * 0.8 : 0;

    drawRoundedRect(ctx, startX, startY, outerSize, outerSize, outerRadius);

    ctx.save();
    if (transparentBg) {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.fillStyle = transparentBg ? '#000000' : bgColor;
    drawRoundedRect(
      ctx,
      startX + cellSize,
      startY + cellSize,
      innerWhiteSize,
      innerWhiteSize,
      innerRadius
    );
    ctx.restore();

    ctx.fillStyle = fgFill;
    drawRoundedRect(
      ctx,
      startX + cellSize * 2,
      startY + cellSize * 2,
      centerDotSize,
      centerDotSize,
      dotRadius
    );
  }
}

export const StyledQrCanvas: React.FC<StyledQrProps> = ({
  url,
  foregroundColor = '#000000',
  backgroundColor = '#ffffff',
  dotStyle = 'squares',
  cornerStyle = 'square',
  errorCorrectionLevel = 'H',
  margin = 2,
  size = 340,
  transparentBackground = false,
  logoUrl = null,
  logoSizeRatio = 0.18,
  gradientSettings = null,
  onVerificationChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [verification, setVerification] = useState<{ scannable: boolean; decodedUrl: string | null }>({
    scannable: true,
    decodedUrl: url,
  });

  const renderQrToCanvas = useCallback(
    async (targetCanvas: HTMLCanvasElement, targetPixelSize: number, forceOpaqueBg: boolean = false) => {
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      targetCanvas.width = targetPixelSize;
      targetCanvas.height = targetPixelSize;

      const qr = QRCode.create(url || 'https://linkpulse.app', {
        errorCorrectionLevel: errorCorrectionLevel || 'H',
      });

      const moduleCount = qr.modules.size;
      const safeMargin = Math.max(1, margin);
      const totalModules = moduleCount + safeMargin * 2;
      const cellSize = targetPixelSize / totalModules;

      ctx.clearRect(0, 0, targetPixelSize, targetPixelSize);

      const useTransparent = transparentBackground && !forceOpaqueBg;
      if (!useTransparent) {
        ctx.fillStyle = backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, targetPixelSize, targetPixelSize);
      }

      let fgFill: string | CanvasGradient = foregroundColor || '#000000';
      if (gradientSettings && gradientSettings.enabled && gradientSettings.color1 && gradientSettings.color2) {
        if (gradientSettings.type === 'radial') {
          const grad = ctx.createRadialGradient(
            targetPixelSize / 2,
            targetPixelSize / 2,
            targetPixelSize * 0.1,
            targetPixelSize / 2,
            targetPixelSize / 2,
            targetPixelSize * 0.65
          );
          grad.addColorStop(0, gradientSettings.color1);
          grad.addColorStop(1, gradientSettings.color2);
          fgFill = grad;
        } else {
          const grad = ctx.createLinearGradient(0, 0, targetPixelSize, targetPixelSize);
          grad.addColorStop(0, gradientSettings.color1);
          grad.addColorStop(1, gradientSettings.color2);
          fgFill = grad;
        }
      }

      // Clamp logo size to safe ratio (max 20% of QR area so Level H easily recovers)
      const clampedLogoRatio = logoUrl ? Math.min(0.2, Math.max(0.1, logoSizeRatio)) : 0;
      const centerStartModule = Math.floor(moduleCount * (0.5 - clampedLogoRatio / 2));
      const centerEndModule = Math.ceil(moduleCount * (0.5 + clampedLogoRatio / 2));

      // Draw data modules
      ctx.fillStyle = fgFill;
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (isFinderPattern(r, c, moduleCount)) continue;
          if (
            logoUrl &&
            r >= centerStartModule &&
            r < centerEndModule &&
            c >= centerStartModule &&
            c < centerEndModule
          ) {
            continue;
          }

          if (qr.modules.get(r, c)) {
            const x = (c + safeMargin) * cellSize;
            const y = (r + safeMargin) * cellSize;

            if (dotStyle === 'dots') {
              ctx.beginPath();
              ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.44, 0, Math.PI * 2);
              ctx.fill();
            } else if (dotStyle === 'rounded') {
              drawRoundedRect(ctx, x + cellSize * 0.05, y + cellSize * 0.05, cellSize * 0.9, cellSize * 0.9, cellSize * 0.3);
            } else if (dotStyle === 'diamond') {
              ctx.beginPath();
              ctx.moveTo(x + cellSize / 2, y + cellSize * 0.05);
              ctx.lineTo(x + cellSize * 0.95, y + cellSize / 2);
              ctx.lineTo(x + cellSize / 2, y + cellSize * 0.95);
              ctx.lineTo(x + cellSize * 0.05, y + cellSize / 2);
              ctx.closePath();
              ctx.fill();
            } else if (dotStyle === 'classy') {
              drawRoundedRect(ctx, x, y, cellSize * 0.94, cellSize * 0.94, cellSize * 0.42);
            } else {
              ctx.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
            }
          }
        }
      }

      // Draw 3 Finder Patterns
      const finderPositions = [
        { r: 0, c: 0 },
        { r: 0, c: moduleCount - 7 },
        { r: moduleCount - 7, c: 0 },
      ];

      for (const pos of finderPositions) {
        drawFinderPattern(
          ctx,
          (pos.c + safeMargin) * cellSize,
          (pos.r + safeMargin) * cellSize,
          cellSize,
          cornerStyle,
          fgFill,
          backgroundColor || '#ffffff',
          useTransparent
        );
      }

      // Draw center logo if provided
      if (logoUrl) {
        const logoBoxSize = targetPixelSize * clampedLogoRatio;
        const logoX = (targetPixelSize - logoBoxSize) / 2;
        const logoY = (targetPixelSize - logoBoxSize) / 2;

        // Quiet zone background behind logo
        ctx.fillStyle = backgroundColor || '#ffffff';
        drawRoundedRect(ctx, logoX - 4, logoY - 4, logoBoxSize + 8, logoBoxSize + 8, 10);

        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            drawRoundedRect(ctx, logoX, logoY, logoBoxSize, logoBoxSize, 8);
            ctx.clip();
            ctx.drawImage(img, logoX, logoY, logoBoxSize, logoBoxSize);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = logoUrl;
        });
      }
    },
    [
      url,
      foregroundColor,
      backgroundColor,
      dotStyle,
      cornerStyle,
      errorCorrectionLevel,
      margin,
      transparentBackground,
      logoUrl,
      logoSizeRatio,
      gradientSettings,
    ]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    (async () => {
      await renderQrToCanvas(canvas, size, false);
      if (cancelled) return;

      // Verify scannability using jsQR on an opaque verification buffer
      const verifyCanvas = document.createElement('canvas');
      await renderQrToCanvas(verifyCanvas, 400, true);
      const vCtx = verifyCanvas.getContext('2d');
      if (vCtx) {
        const imgData = vCtx.getImageData(0, 0, 400, 400);
        const decoded = jsQR(imgData.data, 400, 400);
        const result = {
          scannable: Boolean(decoded && decoded.data === url),
          decodedUrl: decoded ? decoded.data : null,
        };
        setVerification(result);
        onVerificationChange?.(result);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [renderQrToCanvas, size, url, onVerificationChange]);

  return (
    <div className="flex flex-col items-center">
      <div className="p-4 rounded-2xl bg-white/5 border border-slate-800 shadow-2xl inline-block">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-xl max-w-full h-auto"
        />
      </div>

      {/* Live Scannability Verification Badge */}
      <div className="mt-3 flex items-center gap-2">
        {verification.scannable ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Scannable (jsQR Decoded: Level {errorCorrectionLevel})</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Low Contrast Warning — Increase contrast between foreground & background</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyledQrCanvas;
