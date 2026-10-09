import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Share2,
  RotateCcw,
  Save,
  Check,
  Sparkles,
  Image as ImageIcon,
  Printer,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import StyledQrCanvas, { QR_PRESETS, type QrPreset } from '../../components/qr/StyledQrCanvas';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

export const QRStudioPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [profileUrl, setProfileUrl] = useState(`${window.location.origin}/${user?.username || ''}`);
  const [presetName, setPresetName] = useState<string>('Classic Black');
  const [foregroundColor, setForegroundColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [dotStyle, setDotStyle] = useState<'squares' | 'rounded' | 'dots' | 'diamond' | 'classy'>('squares');
  const [cornerStyle, setCornerStyle] = useState<'square' | 'rounded' | 'circle'>('square');
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [margin, setMargin] = useState<number>(2);
  const [resolution, setResolution] = useState<number>(1024);
  const [transparentBackground, setTransparentBackground] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoSizeRatio, setLogoSizeRatio] = useState<number>(0.18);
  const [useGradient, setUseGradient] = useState<boolean>(false);
  const [gradColor1, setGradColor1] = useState<string>('#4f46e5');
  const [gradColor2, setGradColor2] = useState<string>('#9333ea');
  const [gradType, setGradType] = useState<'linear' | 'radial'>('linear');

  useEffect(() => {
    let active = true;
    api
      .get('/api/qr/settings')
      .then((res) => {
        if (!active) return;
        const s = res.settings || res.qr_settings;
        if (res.profileUrl) setProfileUrl(res.profileUrl);
        if (s) {
          setForegroundColor(s.foreground_color || s.foregroundColor || '#000000');
          setBackgroundColor(s.background_color || s.backgroundColor || '#ffffff');
          setDotStyle((s.dot_style || s.dotStyle || 'squares') as any);
          setCornerStyle((s.corner_style || s.cornerStyle || 'square') as any);
          setErrorCorrectionLevel((s.error_correction_level || s.errorCorrectionLevel || 'H') as any);
          setMargin(s.margin ?? 2);
          setResolution(s.resolution ?? 1024);
          setTransparentBackground(Boolean(s.transparent_background ?? s.transparentBackground));
          setLogoUrl(s.logo_url || s.logoUrl || '');
          setPresetName(s.preset_name || s.presetName || 'Classic Black');

          const g = s.gradient_settings || s.gradientSettings;
          if (g && typeof g === 'object' && g.enabled) {
            setUseGradient(true);
            setGradColor1(g.color1 || '#4f46e5');
            setGradColor2(g.color2 || '#9333ea');
            setGradType(g.type === 'radial' ? 'radial' : 'linear');
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const applyPreset = (preset: QrPreset) => {
    setPresetName(preset.name);
    setForegroundColor(preset.foregroundColor);
    setBackgroundColor(preset.backgroundColor);
    setDotStyle(preset.dotStyle);
    setCornerStyle(preset.cornerStyle);
    if (preset.gradient && preset.gradient.enabled) {
      setUseGradient(true);
      setGradColor1(preset.gradient.color1);
      setGradColor2(preset.gradient.color2);
      setGradType(preset.gradient.type);
    } else {
      setUseGradient(false);
    }
  };

  const handleResetDefault = () => {
    applyPreset(QR_PRESETS[0]);
    setErrorCorrectionLevel('H');
    setMargin(2);
    setResolution(1024);
    setTransparentBackground(false);
    setLogoUrl('');
    setLogoSizeRatio(0.18);
    showToast('Reset to Classic Black default settings', 'info');
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/api/qr/settings', {
        foreground_color: foregroundColor,
        background_color: backgroundColor,
        dot_style: dotStyle,
        corner_style: cornerStyle,
        error_correction_level: errorCorrectionLevel,
        margin,
        resolution,
        transparent_background: transparentBackground,
        logo_url: logoUrl.trim() || null,
        preset_name: presetName,
        gradient_settings: useGradient
          ? { enabled: true, color1: gradColor1, color2: gradColor2, type: gradType }
          : null,
      });
      showToast('QR Code Studio preferences saved to MySQL!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save QR settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    showToast('Public profile URL copied!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || user?.username} on LinkPulse`,
          text: `Scan or visit @${user?.username}'s profile`,
          url: profileUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await handleCopyUrl();
  };

  const handleDownloadPng = async (exportSize: number = resolution) => {
    try {
      const dataUrl = await QRCode.toDataURL(profileUrl, {
        errorCorrectionLevel,
        margin,
        width: exportSize,
        color: {
          dark: useGradient ? gradColor1 : foregroundColor,
          light: transparentBackground ? '#00000000' : backgroundColor,
        },
      });
      const link = document.createElement('a');
      link.download = `${user?.username || 'linkpulse'}-qr-${exportSize}px.png`;
      link.href = dataUrl;
      link.click();
      showToast(`Downloaded ${exportSize}x${exportSize}px PNG QR Code!`, 'success');
    } catch {
      showToast('Failed to export PNG', 'error');
    }
  };

  const handleDownloadSvg = async () => {
    try {
      const svgString = await QRCode.toString(profileUrl, {
        type: 'svg',
        errorCorrectionLevel,
        margin,
        width: resolution,
        color: {
          dark: useGradient ? gradColor1 : foregroundColor,
          light: transparentBackground ? '#00000000' : backgroundColor,
        },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${user?.username || 'linkpulse'}-qr.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded vector SVG QR Code!', 'success');
    } catch {
      showToast('Failed to export SVG', 'error');
    }
  };

  const handleDownloadProfileCard = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1040;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Card Background
      const bgGrad = ctx.createLinearGradient(0, 0, 800, 1040);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 1040);

      // Decorative border
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, 744, 984);

      // Title & Username
      const displayName = profile?.display_name || user?.username || 'Creator';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(displayName, 400, 130);

      ctx.fillStyle = '#818cf8';
      ctx.font = '600 26px monospace';
      ctx.fillText(`@${user?.username}`, 400, 178);

      // White QR frame
      ctx.fillStyle = backgroundColor || '#ffffff';
      ctx.fillRect(140, 230, 520, 520);

      const qrDataUrl = await QRCode.toDataURL(profileUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 480,
        color: {
          dark: useGradient ? gradColor1 : foregroundColor,
          light: backgroundColor || '#ffffff',
        },
      });

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 160, 250, 480, 480);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = qrDataUrl;
      });

      // Bottom URL & Callout
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 24px monospace';
      ctx.fillText(profileUrl, 400, 835);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 20px Inter, sans-serif';
      ctx.fillText('Scan with your phone camera to connect • Powered by LinkPulse', 400, 910);

      const cardUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${user?.username || 'profile'}-qr-card.png`;
      a.href = cardUrl;
      a.click();
      showToast('Downloaded printable QR Profile Card!', 'success');
    } catch {
      showToast('Failed to generate profile card', 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading QR Code Studio..." />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Left Column: Customization Controls & Presets */}
      <div className="xl:col-span-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171923] dark:text-[#F9FAFB] flex items-center gap-2.5">
              <QrCode className="w-6 h-6 text-[#4F46E5] dark:text-[#6366F1]" />
              <span>QR Code Studio</span>
            </h1>
            <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
              Customise and download your profile QR code pointing to <code className="font-mono text-[#4F46E5] dark:text-[#6366F1]">{profileUrl}</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetDefault}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              isLoading={saving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Preferences
            </Button>
          </div>
        </div>

        {/* 1. Preset Gallery (8 Presets) */}
        <Card title="Preset Themes" subtitle="8 curated high-contrast scannable QR themes">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  presetName === preset.name
                    ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20 bg-[#EEF2FF]/60 dark:bg-[#272D3A]'
                    : 'border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] hover:border-[#626B7A]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    style={{
                      background: preset.gradient?.enabled
                        ? `linear-gradient(135deg, ${preset.gradient.color1}, ${preset.gradient.color2})`
                        : preset.foregroundColor,
                    }}
                    className="w-6 h-6 rounded-lg border border-black/10 shrink-0"
                  />
                  <span
                    style={{ backgroundColor: preset.backgroundColor }}
                    className="w-6 h-6 rounded-lg border border-[#E5E7EB] dark:border-[#343B4B] shrink-0"
                  />
                </div>
                <p className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB] truncate">{preset.name}</p>
                <p className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] capitalize mt-0.5">
                  {preset.dotStyle} • {preset.cornerStyle}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* 2. Colors & Gradient Controls */}
        <Card title="Colors & Gradients" subtitle="Maintain high contrast between foreground modules and background">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                  Foreground Color
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="w-11 h-10 rounded-xl bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] cursor-pointer"
                  />
                  <Input
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                  Background Color
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    disabled={transparentBackground}
                    className="w-11 h-10 rounded-xl bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] cursor-pointer disabled:opacity-40"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    disabled={transparentBackground}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs text-[#424B5A] dark:text-[#D1D5DB] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useGradient}
                  onChange={(e) => setUseGradient(e.target.checked)}
                  className="rounded border-[#E5E7EB] dark:border-[#343B4B] text-[#4F46E5] focus:ring-[#4F46E5]"
                />
                <span>Enable Foreground Gradient</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#424B5A] dark:text-[#D1D5DB] cursor-pointer">
                <input
                  type="checkbox"
                  checked={transparentBackground}
                  onChange={(e) => setTransparentBackground(e.target.checked)}
                  className="rounded border-[#E5E7EB] dark:border-[#343B4B] text-[#4F46E5] focus:ring-[#4F46E5]"
                />
                <span>Transparent Background (PNG/SVG Export)</span>
              </label>
            </div>

            {useGradient && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
                <div>
                  <label className="block text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD] mb-1">Start Color</label>
                  <input
                    type="color"
                    value={gradColor1}
                    onChange={(e) => setGradColor1(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD] mb-1">End Color</label>
                  <input
                    type="color"
                    value={gradColor2}
                    onChange={(e) => setGradColor2(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD] mb-1">Gradient Direction</label>
                  <select
                    value={gradType}
                    onChange={(e) => setGradType(e.target.value as 'linear' | 'radial')}
                    className="w-full h-10 px-3 bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-lg text-xs text-[#171923] dark:text-[#F9FAFB]"
                  >
                    <option value="linear">Linear Diagonal</option>
                    <option value="radial">Radial Center</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 3. Module Dots, Corner Finder Styles & Center Logo */}
        <Card title="Pattern Geometry & Center Logo" subtitle="Customize module dots, finder corners, error correction, and center badge">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2">
                Module / Dot Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['squares', 'rounded', 'dots', 'classy', 'diamond'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setDotStyle(style)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      dotStyle === style
                        ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] dark:bg-[#1E1B4B] dark:border-[#6366F1] dark:text-[#818CF8]'
                        : 'bg-white dark:bg-[#171923] border-[#E5E7EB] dark:border-[#343B4B] text-[#424B5A] dark:text-[#A7AFBD] hover:bg-slate-50 dark:hover:bg-[#272D3A]'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2">
                Corner Finder-Pattern Style
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['square', 'rounded', 'circle'] as const).map((cStyle) => (
                  <button
                    key={cStyle}
                    type="button"
                    onClick={() => setCornerStyle(cStyle)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      cornerStyle === cStyle
                        ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] dark:bg-[#1E1B4B] dark:border-[#6366F1] dark:text-[#818CF8]'
                        : 'bg-white dark:bg-[#171923] border-[#E5E7EB] dark:border-[#343B4B] text-[#424B5A] dark:text-[#A7AFBD] hover:bg-slate-50 dark:hover:bg-[#272D3A]'
                    }`}
                  >
                    {cStyle}
                  </button>
                ))}
              </div>
            </div>

            {/* Center Logo / Avatar Controls */}
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#6366F1]" />
                  <span>Center Logo / Avatar URL (Optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('/logo.jpg');
                      setErrorCorrectionLevel('H');
                    }}
                    className="text-xs text-[#4F46E5] dark:text-[#818CF8] hover:underline font-medium"
                  >
                    Use LinkPlus Logo
                  </button>
                  {profile?.avatar_url && (
                    <>
                      <span className="text-[#626B7A] dark:text-[#A7AFBD]">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl(profile.avatar_url || '');
                          setErrorCorrectionLevel('H');
                        }}
                        className="text-xs text-[#4F46E5] dark:text-[#818CF8] hover:underline font-medium"
                      >
                        Use My Avatar
                      </button>
                    </>
                  )}
                </div>
              </div>

              <Input
                value={logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  if (e.target.value) setErrorCorrectionLevel('H');
                }}
                placeholder="https://... (Leave blank for no center logo)"
              />

              {logoUrl && (
                <div>
                  <div className="flex justify-between text-xs text-[#626B7A] dark:text-[#A7AFBD] mb-1">
                    <span>Center Logo Size (Clamped to preserve Level H scannability)</span>
                    <span>{Math.round(logoSizeRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.12"
                    max="0.20"
                    step="0.01"
                    value={logoSizeRatio}
                    onChange={(e) => setLogoSizeRatio( parseFloat(e.target.value) )}
                    className="w-full accent-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Margin, Resolution & Error Correction */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B]">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                  Quiet Zone Margin ({margin})
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                  Export Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-[#F9FAFB]"
                >
                  <option value={512}>512 × 512 px (Web)</option>
                  <option value={1024}>1024 × 1024 px (HD)</option>
                  <option value={2048}>2048 × 2048 px (Print)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                  Error Correction
                </label>
                <select
                  value={errorCorrectionLevel}
                  onChange={(e) => setErrorCorrectionLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-[#F9FAFB]"
                >
                  <option value="H">High (H - 30% recovery)</option>
                  <option value="Q">Quartile (Q - 25%)</option>
                  <option value="M">Medium (M - 15%)</option>
                  <option value="L">Low (L - 7%)</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column: Large Live Preview & Multi-Format Export */}
      <div className="xl:col-span-5 xl:sticky xl:top-24 space-y-6">
        <Card
          title="Live Scannable QR Preview"
          subtitle="Test with your smartphone camera right now"
          action={
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#818CF8] border border-[#4F46E5]/20">
              <Sparkles className="w-3 h-3" />
              {presetName}
            </span>
          }
        >
          <div className="flex flex-col items-center">
            <StyledQrCanvas
              url={profileUrl}
              foregroundColor={foregroundColor}
              backgroundColor={backgroundColor}
              dotStyle={dotStyle}
              cornerStyle={cornerStyle}
              errorCorrectionLevel={errorCorrectionLevel}
              margin={margin}
              size={300}
              transparentBackground={transparentBackground}
              logoUrl={logoUrl || null}
              logoSizeRatio={logoSizeRatio}
              gradientSettings={
                useGradient
                  ? { enabled: true, color1: gradColor1, color2: gradColor2, type: gradType }
                  : null
              }
            />

            {/* Encoded Target URL Display */}
            <div className="mt-5 w-full p-3 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-[#4F46E5] dark:text-[#6366F1] truncate">{profileUrl}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded-lg bg-white dark:bg-[#202430] hover:bg-slate-100 text-[#171923] dark:text-[#F9FAFB] border border-[#E5E7EB] dark:border-[#343B4B] text-xs flex items-center gap-1 shadow-sm"
                  title="Copy Profile URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleShareProfile}
                  className="p-1.5 rounded-lg bg-white dark:bg-[#202430] hover:bg-slate-100 text-[#171923] dark:text-[#F9FAFB] border border-[#E5E7EB] dark:border-[#343B4B] text-xs shadow-sm"
                  title="Share Profile"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Export Action Buttons */}
            <div className="mt-5 w-full grid grid-cols-2 gap-2.5">
              <Button
                onClick={() => handleDownloadPng(resolution)}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download PNG
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownloadSvg}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download SVG
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDownloadPng(2048)}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print Hi-Res
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownloadProfileCard}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Profile Card
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QRStudioPage;