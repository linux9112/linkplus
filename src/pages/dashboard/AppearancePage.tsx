import React, { useState, useEffect } from 'react';
import { Palette, Save, Sparkles, Type, Square, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { Link as LinkItem, Profile } from '../../types/index';
import PublicProfileRenderer, { THEME_PRESETS } from '../../components/profile/PublicProfileRenderer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

const CURATED_FONTS = [
  'Inter',
  'Plus Jakarta Sans',
  'Poppins',
  'Space Grotesk',
  'JetBrains Mono',
  'Georgia',
];

export const AppearancePage: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [preset, setPreset] = useState('default');
  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image'>('gradient');
  const [backgroundValue, setBackgroundValue] = useState(THEME_PRESETS.default.backgroundValue);
  const [buttonShape, setButtonShape] = useState<'rounded' | 'rounded-lg' | 'rounded-full' | 'sharp'>('rounded-full');
  const [buttonStyle, setButtonStyle] = useState<'solid' | 'glass' | 'outline' | 'brutal'>('glass');
  const [buttonColor, setButtonColor] = useState('');
  const [textColor, setTextColor] = useState('#171923');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [linkSpacing, setLinkSpacing] = useState<'compact' | 'normal' | 'relaxed'>('normal');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ links: LinkItem[] }>('/api/links')
      .then((res) => setLinks((res.links || []).filter((l) => l.is_active && !l.is_hidden)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (profile) {
      const ts: Record<string, any> = profile.theme_settings || (profile as any).themeSettings || {};
      const pKey = String(ts.preset || 'default');
      const pDef = THEME_PRESETS[pKey] || THEME_PRESETS.default;

      setPreset(pKey);
      setBackgroundType((ts.background_type as any) || pDef.backgroundType);
      setBackgroundValue(String(ts.background_value || pDef.backgroundValue));
      setButtonShape((ts.button_shape as any) || pDef.buttonShape);
      setButtonStyle((ts.button_style as any) || pDef.buttonStyle);
      setButtonColor(String(ts.button_color || ''));
      setTextColor(String(ts.text_color || pDef.textColor));
      setFontFamily(String(ts.font_family || pDef.fontFamily));
      setLinkSpacing((ts.link_spacing as any) || 'normal');
    }
  }, [profile]);

  const handleSelectPreset = (presetId: string) => {
    const pDef = THEME_PRESETS[presetId];
    if (!pDef) return;
    setPreset(presetId);
    setBackgroundType(pDef.backgroundType);
    setBackgroundValue(pDef.backgroundValue);
    setButtonShape(pDef.buttonShape);
    setButtonStyle(pDef.buttonStyle);
    setButtonColor('');
    setTextColor(pDef.textColor);
    setFontFamily(pDef.fontFamily);
  };

  const handlePublishAppearance = async () => {
    setSaving(true);
    try {
      await api.put('/api/profile', {
        theme_settings: {
          preset,
          background_type: backgroundType,
          background_value: backgroundValue,
          button_shape: buttonShape,
          button_style: buttonStyle,
          button_color: buttonColor || undefined,
          text_color: textColor,
          font_family: fontFamily,
          link_spacing: linkSpacing,
        },
      });
      await refreshUser();
      showToast('Appearance published to your live profile!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save appearance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewProfile: Profile = {
    id: profile?.id || 'preview',
    display_name: profile?.display_name || user?.username || 'Creator',
    bio: profile?.bio || 'Customizing my LinkPlus theme in real time.',
    avatar_url: profile?.avatar_url || null,
    is_public: true,
    social_links: profile?.social_links || [],
    theme_settings: {
      preset,
      background_type: backgroundType,
      background_value: backgroundValue,
      button_shape: buttonShape,
      button_style: buttonStyle,
      button_color: buttonColor || undefined,
      text_color: textColor,
      font_family: fontFamily,
      link_spacing: linkSpacing,
    },
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Left Column: Customization Controls */}
      <div className="xl:col-span-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB]">Theme & Appearance</h1>
            <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
              Customize themes, backgrounds, button shapes, and typography with real-time preview before publishing.
            </p>
          </div>
          <Button
            onClick={handlePublishAppearance}
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Publish Theme
          </Button>
        </div>

        {/* 1. Curated Theme Presets */}
        <Card
          title="Theme Presets"
          subtitle="Light, Dark, Gradient, Glassmorphism, and Brutalist themes"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.values(THEME_PRESETS).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  preset === item.id
                    ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20 bg-[#EEF2FF] dark:bg-[#4F46E5]/10'
                    : 'border-[#E5E7EB] dark:border-[#343B4B] bg-[#F7F8FA] dark:bg-[#202430] hover:border-[#D1D5DB]'
                }`}
              >
                <div
                  style={{ background: item.backgroundValue }}
                  className="w-full h-16 rounded-xl mb-2.5 border border-[#E5E7EB]/40 flex items-center justify-center shadow-inner"
                >
                  <div
                    style={{
                      backgroundColor: item.cardBg,
                      borderColor: item.cardBorder,
                      color: item.cardText,
                    }}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                  >
                    Link Button
                  </div>
                </div>
                <p className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB] truncate">{item.name}</p>
                <p className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] uppercase tracking-wider mt-0.5">
                  {item.category}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* 2. Background Customization */}
        <Card title="Background Style" subtitle="Solid color, custom CSS gradient, or background image">
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['color', 'gradient', 'image'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBackgroundType(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                    backgroundType === t
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'bg-white dark:bg-[#202430] border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {backgroundType === 'color' && (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundValue.startsWith('#') ? backgroundValue : '#F7F8FA'}
                  onChange={(e) => setBackgroundValue(e.target.value)}
                  className="w-12 h-11 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] cursor-pointer"
                />
                <Input
                  value={backgroundValue}
                  onChange={(e) => setBackgroundValue(e.target.value)}
                  placeholder="#F7F8FA"
                />
              </div>
            )}

            {backgroundType === 'gradient' && (
              <div className="space-y-2">
                <Input
                  label="CSS Linear Gradient"
                  value={backgroundValue}
                  onChange={(e) => setBackgroundValue(e.target.value)}
                  placeholder="linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    'linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)',
                    'linear-gradient(135deg, #F7F8FA 0%, #E0E7FF 100%)',
                    'linear-gradient(135deg, #171923 0%, #202430 100%)',
                    'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
                    'linear-gradient(135deg, #064E3B 0%, #059669 100%)',
                  ].map((g, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBackgroundValue(g)}
                      style={{ background: g }}
                      className="w-10 h-8 rounded-lg border border-[#E5E7EB] dark:border-[#343B4B] hover:scale-105 transition-transform"
                      title={`Gradient ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {backgroundType === 'image' && (
              <Input
                label="Background Image URL"
                value={backgroundValue}
                onChange={(e) => setBackgroundValue(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
              />
            )}
          </div>
        </Card>

        {/* 3. Button Shapes & Typography */}
        <Card title="Buttons, Fonts & Spacing" subtitle="Fine-tune button corners, styles, and font family">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2 flex items-center gap-1.5">
                <Square className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Button Corner Shape</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(
                  [
                    { id: 'rounded-full', label: 'Pill (Full)' },
                    { id: 'rounded-lg', label: 'Rounded XL' },
                    { id: 'rounded', label: 'Soft Corners' },
                    { id: 'sharp', label: 'Sharp Brutal' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setButtonShape(s.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      buttonShape === s.id
                        ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] dark:bg-[#4F46E5]/20 dark:text-[#818CF8]'
                        : 'bg-white dark:bg-[#202430] border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Button Surface Style</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['glass', 'solid', 'outline', 'brutal'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setButtonStyle(st)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                      buttonStyle === st
                        ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] dark:bg-[#4F46E5]/20 dark:text-[#818CF8]'
                        : 'bg-white dark:bg-[#202430] border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>Font Family</span>
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-[#F9FAFB] focus:border-[#4F46E5] focus:outline-none"
                >
                  {CURATED_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>Link Spacing</span>
                </label>
                <select
                  value={linkSpacing}
                  onChange={(e) => setLinkSpacing(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-[#F9FAFB] focus:border-[#4F46E5] focus:outline-none"
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxed</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column: Live Interactive Preview */}
      <div className="xl:col-span-5 xl:sticky xl:top-24 flex flex-col items-center">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD]">
          <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
          <span>Interactive Preview (Unpublished Draft)</span>
        </div>
        <div className="w-full max-w-[340px] rounded-[42px] p-3 bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] shadow-xl">
          <div className="rounded-[32px] overflow-hidden max-h-[640px] overflow-y-auto border border-[#E5E7EB] dark:border-[#343B4B]">
            <PublicProfileRenderer
              username={user?.username || 'creator'}
              profile={previewProfile}
              links={links}
              isPreview
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearancePage;