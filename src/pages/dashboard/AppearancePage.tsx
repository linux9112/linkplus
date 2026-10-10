import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Palette,
  Layout,
  User as UserIcon,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  Share2,
  Sparkles,
  Sliders,
  Shield,
  Settings2,
  Save,
  RotateCcw,
  RotateCw,
  Eye,
  Check,
  ExternalLink,
  Smartphone,
  Monitor,
  Upload,
  Camera,
  Trash2,
  Download,
  FileCode,
  ChevronRight,
  Sparkle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { Link as LinkItem, Profile } from '../../types/index';
import PublicProfileRenderer, {
  THEME_PRESETS,
} from '../../components/profile/PublicProfileRenderer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ImageCropModal from '../../components/ui/ImageCropModal';
import { useToast } from '../../components/ui/Toast';
import { getContrastRatio } from '../../utils/contrast';
import { processImageFileToDataUri } from '../../utils/imageUpload';

export interface ThemeStudioSettings {
  preset: string;
  layout_type: 'classic' | 'compact' | 'cover' | 'cards' | 'minimal' | 'split' | 'grid' | 'featured' | 'editorial';
  profile_content_width: string;
  profile_alignment: 'center' | 'left' | 'right';
  avatar_size: 'sm' | 'md' | 'lg' | 'xl';
  avatar_shape: 'circle' | 'rounded-2xl' | 'rounded-lg' | 'square';
  avatar_border_width: number;
  avatar_border_color: string;
  cover_url: string;
  cover_data_url?: string;
  cover_height: number;
  title_tagline: string;
  background_type: 'color' | 'gradient' | 'image' | 'pattern';
  background_value: string;
  background_pattern: 'none' | 'dots' | 'grid' | 'mesh' | 'waves';
  background_overlay_color: string;
  background_overlay_opacity: number;
  text_color: string;
  subtext_color: string;
  name_color: string;
  bio_color: string;
  font_family: string;
  font_size_scale: 'compact' | 'normal' | 'large';
  heading_style: 'bold' | 'extrabold' | 'normal';
  button_shape: 'rounded-full' | 'rounded-2xl' | 'rounded-lg' | 'sharp' | 'brutal';
  button_custom_radius?: number;
  button_style: 'solid' | 'outline' | 'glass' | 'gradient' | 'shadow' | 'brutal' | 'minimal';
  button_color: string;
  button_text_color: string;
  button_border_color: string;
  button_border_width: number;
  button_height: 'compact' | 'normal' | 'spacious';
  button_title_alignment: 'left' | 'center' | 'right';
  button_icon_position: 'left' | 'right' | 'none';
  button_hover_effect: 'lift' | 'scale' | 'glow' | 'none';
  link_spacing: 'compact' | 'normal' | 'relaxed';
  link_logo_shape: 'square' | 'rounded' | 'circle';
  link_logo_size: number;
  link_logo_fit: 'contain' | 'cover';
  social_size: 'sm' | 'md' | 'lg';
  social_shape: 'circle' | 'rounded-xl' | 'square' | 'outline' | 'none';
  social_theme: 'platform' | 'monochrome' | 'custom';
  social_custom_color: string;
  social_placement: 'top' | 'bottom' | 'both';
  animation_entrance: 'none' | 'fade' | 'slide' | 'stagger';
  glass_blur_intensity: number;
  reduced_motion: boolean;
  footer_visible: boolean;
  footer_text: string;
  hide_branding: boolean;
  footer_alignment: 'center' | 'left' | 'right';
  custom_css: string;
  link_overrides: Record<string, any>;
}

const DEFAULT_SETTINGS: ThemeStudioSettings = {
  preset: 'default',
  layout_type: 'classic',
  profile_content_width: 'md',
  profile_alignment: 'center',
  avatar_size: 'xl',
  avatar_shape: 'circle',
  avatar_border_width: 4,
  avatar_border_color: '#ffffff',
  cover_url: '',
  cover_height: 160,
  title_tagline: '',
  background_type: 'gradient',
  background_value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #090d16 100%)',
  background_pattern: 'none',
  background_overlay_color: '#000000',
  background_overlay_opacity: 0.4,
  text_color: '#f8fafc',
  subtext_color: '#94a3b8',
  name_color: '#f8fafc',
  bio_color: '#94a3b8',
  font_family: 'Inter',
  font_size_scale: 'normal',
  heading_style: 'extrabold',
  button_shape: 'rounded-full',
  button_style: 'glass',
  button_color: 'rgba(30, 41, 59, 0.78)',
  button_text_color: '#f8fafc',
  button_border_color: 'rgba(148, 163, 184, 0.18)',
  button_border_width: 1,
  button_height: 'normal',
  button_title_alignment: 'left',
  button_icon_position: 'left',
  button_hover_effect: 'lift',
  link_spacing: 'normal',
  link_logo_shape: 'rounded',
  link_logo_size: 44,
  link_logo_fit: 'contain',
  social_size: 'md',
  social_shape: 'rounded-xl',
  social_theme: 'platform',
  social_custom_color: '#6366f1',
  social_placement: 'top',
  animation_entrance: 'fade',
  glass_blur_intensity: 12,
  reduced_motion: false,
  footer_visible: true,
  footer_text: '',
  hide_branding: false,
  footer_alignment: 'center',
  custom_css: '',
  link_overrides: {},
};

const CATEGORIES = [
  { id: 'presets', label: 'Theme Presets', icon: Sparkles, desc: 'Curated 1-click styles' },
  { id: 'profile', label: 'Profile Header', icon: UserIcon, desc: 'Avatar, cover & title' },
  { id: 'layout', label: 'Layout Builder', icon: Layout, desc: '9 genuine profile structures' },
  { id: 'background', label: 'Background', icon: ImageIcon, desc: 'Colors, gradients & patterns' },
  { id: 'colors', label: 'Color Palette', icon: Palette, desc: 'Accessible custom colors' },
  { id: 'typography', label: 'Typography', icon: Type, desc: 'Curated web fonts & sizing' },
  { id: 'buttons', label: 'Link Buttons', icon: MousePointerClick, desc: 'Shapes, surfaces & borders' },
  { id: 'logos', label: 'Link Logos', icon: Sparkle, desc: 'Thumbnail sizing & shapes' },
  { id: 'socials', label: 'Social Icons', icon: Share2, desc: 'Icon size, shapes & themes' },
  { id: 'effects', label: 'Effects & Motion', icon: Sliders, desc: 'Animations & glassmorphism' },
  { id: 'footer', label: 'Footer & Branding', icon: Shield, desc: 'Custom footer & credits' },
  { id: 'advanced', label: 'Advanced & CSS', icon: Settings2, desc: 'Custom CSS & JSON export' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const CURATED_FONTS = [
  'Inter',
  'Plus Jakarta Sans',
  'Poppins',
  'Space Grotesk',
  'JetBrains Mono',
  'Outfit',
  'DM Sans',
  'Playfair Display',
  'Cinzel',
  'Montserrat',
  'Roboto',
  'Georgia',
];

export const AppearancePage: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('presets');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [mobileViewTab, setMobileViewTab] = useState<'editor' | 'preview'>('editor');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Settings & History State
  const [settings, setSettings] = useState<ThemeStudioSettings>(DEFAULT_SETTINGS);
  const [publishedSettings, setPublishedSettings] = useState<ThemeStudioSettings>(DEFAULT_SETTINGS);
  const [historyPast, setHistoryPast] = useState<ThemeStudioSettings[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ThemeStudioSettings[]>([]);

  // Modals & Cropping
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetSectionModalOpen, setResetSectionModalOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string>('');
  const [cropTarget, setCropTarget] = useState<'avatar' | 'cover' | 'link'>('cover');
  const [importJsonModalOpen, setImportJsonModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);

  const publicUrl = `${window.location.origin}/${user?.username || ''}`;

  // Fetch links from MySQL
  useEffect(() => {
    api
      .get<{ links: LinkItem[] }>('/api/links')
      .then((res) => setLinks((res.links || []).filter((l) => l.is_active && !l.is_hidden)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Initialize settings from profile.theme_settings
  useEffect(() => {
    if (profile) {
      const rawTheme = (profile.theme_settings || (profile as any).themeSettings || {}) as Record<string, any>;
      const initial: ThemeStudioSettings = {
        ...DEFAULT_SETTINGS,
        ...rawTheme,
        cover_url: String(rawTheme.cover_url || (profile as any).cover_url || ''),
        title_tagline: String(rawTheme.title_tagline || (profile as any).title_tagline || ''),
      };

      setSettings(initial);
      setPublishedSettings(initial);
    }
  }, [profile]);

  // Update settings with Undo / Redo history tracking
  const updateSettings = useCallback((updates: Partial<ThemeStudioSettings>) => {
    setSettings((current) => {
      setHistoryPast((past) => [...past.slice(-30), current]);
      setHistoryFuture([]);
      return { ...current, ...updates };
    });
  }, []);

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((past) => past.slice(0, past.length - 1));
    setHistoryFuture((future) => [settings, ...future]);
    setSettings(previous);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past, settings]);
    setSettings(next);
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyPast, historyFuture, settings]);

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(publishedSettings);

  // Apply a Theme Preset
  const handleApplyPreset = (presetId: string) => {
    const pDef = THEME_PRESETS[presetId];
    if (!pDef) return;

    updateSettings({
      preset: presetId,
      background_type: pDef.backgroundType,
      background_value: pDef.backgroundValue,
      text_color: pDef.textColor,
      subtext_color: pDef.subtextColor,
      name_color: pDef.textColor,
      bio_color: pDef.subtextColor,
      button_shape: pDef.buttonShape,
      button_style: pDef.buttonStyle,
      button_color: pDef.cardBg,
      button_text_color: pDef.cardText,
      button_border_color: pDef.cardBorder,
      font_family: pDef.fontFamily,
    });
    showToast(`Applied preset: ${pDef.name}`, 'info');
  };

  // Publish changes to MySQL
  const handlePublish = async () => {
    setSaving(true);
    try {
      await api.put('/api/profile', {
        theme_settings: settings,
      });
      await refreshUser();
      setPublishedSettings(settings);
      showToast('All appearance customizations published to your live profile!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to publish appearance settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save as Draft
  const handleSaveDraft = () => {
    try {
      localStorage.setItem(`linkplus_theme_draft_${user?.id}`, JSON.stringify(settings));
      showToast('Appearance settings saved as draft.', 'success');
    } catch {
      showToast('Unable to store draft locally.', 'error');
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    setSettings(publishedSettings);
    setHistoryPast([]);
    setHistoryFuture([]);
    showToast('Discarded unsaved changes. Reverted to published profile.', 'info');
  };

  // Reset Section
  const handleResetSection = () => {
    const pDef = THEME_PRESETS[settings.preset] || THEME_PRESETS.default;

    if (activeCategory === 'buttons') {
      updateSettings({
        button_shape: pDef.buttonShape,
        button_style: pDef.buttonStyle,
        button_color: pDef.cardBg,
        button_text_color: pDef.cardText,
        button_border_color: pDef.cardBorder,
        button_border_width: 1,
        button_height: 'normal',
        button_title_alignment: 'left',
        button_icon_position: 'left',
        button_hover_effect: 'lift',
      });
    } else if (activeCategory === 'background') {
      updateSettings({
        background_type: pDef.backgroundType,
        background_value: pDef.backgroundValue,
        background_pattern: 'none',
      });
    } else if (activeCategory === 'colors') {
      updateSettings({
        text_color: pDef.textColor,
        subtext_color: pDef.subtextColor,
        name_color: pDef.textColor,
        bio_color: pDef.subtextColor,
        button_color: pDef.cardBg,
        button_text_color: pDef.cardText,
        button_border_color: pDef.cardBorder,
      });
    } else if (activeCategory === 'typography') {
      updateSettings({
        font_family: pDef.fontFamily,
        font_size_scale: 'normal',
        heading_style: 'extrabold',
      });
    } else if (activeCategory === 'layout') {
      updateSettings({
        layout_type: 'classic',
        profile_content_width: 'md',
        profile_alignment: 'center',
        link_spacing: 'normal',
      });
    }

    setResetSectionModalOpen(false);
    showToast(`Reset ${activeCategory} to preset defaults.`, 'info');
  };

  // Reset All
  const handleResetAll = () => {
    const pDef = THEME_PRESETS[settings.preset] || THEME_PRESETS.default;
    const resetState: ThemeStudioSettings = {
      ...DEFAULT_SETTINGS,
      preset: settings.preset,
      background_type: pDef.backgroundType,
      background_value: pDef.backgroundValue,
      text_color: pDef.textColor,
      subtext_color: pDef.subtextColor,
      name_color: pDef.textColor,
      bio_color: pDef.subtextColor,
      button_shape: pDef.buttonShape,
      button_style: pDef.buttonStyle,
      button_color: pDef.cardBg,
      button_text_color: pDef.cardText,
      button_border_color: pDef.cardBorder,
      font_family: pDef.fontFamily,
    };
    updateSettings(resetState);
    setResetModalOpen(false);
    showToast('Reset all customization settings to preset defaults.', 'info');
  };

  // Export JSON Theme
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `linkplus-theme-${user?.username || 'custom'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Theme configuration exported as JSON!', 'success');
  };

  // Import JSON Theme
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid JSON');
      updateSettings(parsed);
      setImportJsonModalOpen(false);
      setImportJsonText('');
      showToast('Imported theme configuration successfully!', 'success');
    } catch {
      showToast('Invalid JSON format. Please verify configuration file.', 'error');
    }
  };

  // Image upload triggers
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await processImageFileToDataUri(file, 1400, 'cover');
      setCropSource(dataUri);
      setCropTarget('cover');
      setCropModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Invalid cover image', 'error');
    }
  };

  const handleApplyCroppedImage = async (croppedDataUri: string) => {
    if (cropTarget === 'cover') {
      try {
        const res = await api.post<{ url: string }>('/api/upload/image', {
          image_data: croppedDataUri,
          type: 'cover',
        });
        updateSettings({
          cover_url: res.url,
          cover_data_url: croppedDataUri,
        });
        showToast('Cover banner updated and saved!', 'success');
        setCropModalOpen(false);
      } catch (err: any) {
        showToast(err.message || 'Failed to upload cover banner', 'error');
      }
    }
  };


  // Real-time Preview Profile Object
  const previewProfile: Profile = {
    id: profile?.id || 'preview',
    display_name: profile?.display_name || user?.username || 'Creator',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || null,
    is_public: true,
    social_links: profile?.social_links || [],
    theme_settings: settings as any,
  };

  // Live Contrast Ratio Calculation for Colors category
  const textBgContrast = getContrastRatio(settings.text_color, settings.background_value.startsWith('#') ? settings.background_value : '#0f172a');
  const buttonContrast = getContrastRatio(settings.button_text_color, settings.button_color.startsWith('#') ? settings.button_color : '#ffffff');

  if (loading && !profile) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* =================================================================== */}
      {/* 1. TOP STUDIO TOOLBAR (UNDO, REDO, PRESET, ACTIONS, VIEW PROFILE)   */}
      {/* =================================================================== */}
      <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] dark:bg-[#272D3A] text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center font-bold">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                Appearance Studio
              </h1>
              {hasUnsavedChanges ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                  <Check className="w-3 h-3" />
                  Live & published
                </span>
              )}
            </div>
            <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
              Visual profile builder & custom styling engine
            </p>
          </div>
        </div>

        {/* Center: Undo / Redo & Device Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl overflow-hidden bg-[#F7F8FA] dark:bg-[#171923]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyPast.length === 0}
              className="p-2 text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB] disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-[#E5E7EB] dark:bg-[#343B4B]" />
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyFuture.length === 0}
              className="p-2 text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB] disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Device Mode Toggle */}
          <div className="hidden sm:flex items-center border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl overflow-hidden bg-[#F7F8FA] dark:bg-[#171923]">
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`p-2 transition-colors ${
                previewDevice === 'mobile'
                  ? 'bg-white dark:bg-[#202430] text-[#4F46E5] dark:text-[#818CF8] shadow-2xs font-bold'
                  : 'text-[#626B7A] dark:text-[#A7AFBD]'
              }`}
              title="Mobile Mockup View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`p-2 transition-colors ${
                previewDevice === 'desktop'
                  ? 'bg-white dark:bg-[#202430] text-[#4F46E5] dark:text-[#818CF8] shadow-2xs font-bold'
                  : 'text-[#626B7A] dark:text-[#A7AFBD]'
              }`}
              title="Desktop Wide View"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile responsive toggle tab */}
          <div className="lg:hidden flex items-center border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMobileViewTab('editor')}
              className={`px-3 py-1.5 transition-colors ${
                mobileViewTab === 'editor'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white dark:bg-[#202430] text-[#626B7A]'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setMobileViewTab('preview')}
              className={`px-3 py-1.5 transition-colors ${
                mobileViewTab === 'preview'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white dark:bg-[#202430] text-[#626B7A]'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="text-xs font-semibold text-[#626B7A] hover:text-[#B91C1C] dark:text-[#A7AFBD] dark:hover:text-red-400 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-[#E5E7EB] dark:hover:border-[#343B4B] transition-colors"
            >
              Discard
            </button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            className="text-xs"
          >
            Save Draft
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            isLoading={saving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Publish Changes
          </Button>

          <a
            href={`/${user?.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB] hover:bg-slate-100 dark:hover:bg-[#272D3A] transition-colors"
            title="Open Published Profile"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. THREE-COLUMN STUDIO LAYOUT (CATEGORIES | CONTROLS | LIVE PREVIEW)*/}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =============================================================== */}
        {/* COLUMN 1: CATEGORIES SIDEBAR (2.5 Cols / 12)                    */}
        {/* =============================================================== */}
        <div className={`lg:col-span-3 ${mobileViewTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-2.5 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD]">
              Customization Studio
            </div>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8] shadow-2xs font-bold'
                      : 'text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB] hover:bg-slate-50 dark:hover:bg-[#272D3A]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="text-left truncate">
                      <p className="truncate">{cat.label}</p>
                      <p className="text-[10px] font-normal opacity-75 truncate">{cat.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'translate-x-0.5 text-[#4F46E5] dark:text-[#818CF8]' : 'opacity-40'}`} />
                </button>
              );
            })}

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B] px-1 space-y-1">
              <button
                type="button"
                onClick={() => setResetSectionModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold text-[#626B7A] dark:text-[#A7AFBD] hover:bg-slate-100 dark:hover:bg-[#272D3A] transition-colors text-left"
              >
                Reset current section
              </button>
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold text-[#B91C1C] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
              >
                Reset all to defaults
              </button>
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* COLUMN 2: EDITING CONTROLS FOR ACTIVE CATEGORY (4.5 Cols / 12)  */}
        {/* =============================================================== */}
        <div className={`lg:col-span-5 ${mobileViewTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-5 shadow-xs space-y-6">
            {/* Category Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#343B4B]">
              <div>
                <h2 className="text-sm font-bold text-[#171923] dark:text-[#F9FAFB]">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                </h2>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.desc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetSectionModalOpen(true)}
                className="text-[11px] font-semibold text-[#4F46E5] dark:text-[#818CF8] hover:underline"
              >
                Reset section
              </button>
            </div>

            {/* CATEGORY 1: PRESETS */}
            {activeCategory === 'presets' && (
              <div className="space-y-4">
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                  Choose from our curated professional presets or customize your own theme. Selecting a preset updates all settings without altering the original template.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(THEME_PRESETS).map((pDef) => {
                    const isSelected = settings.preset === pDef.id;
                    return (
                      <button
                        key={pDef.id}
                        type="button"
                        onClick={() => handleApplyPreset(pDef.id)}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                          isSelected
                            ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20 shadow-sm'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] hover:border-slate-300'
                        }`}
                        style={{
                          background: pDef.backgroundValue.startsWith('linear-gradient') || pDef.backgroundValue.startsWith('radial-gradient')
                            ? pDef.backgroundValue
                            : pDef.backgroundValue,
                          color: pDef.textColor,
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold truncate drop-shadow-xs">{pDef.name}</span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#4F46E5] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {/* Miniature link button simulation */}
                        <div
                          style={{
                            background: pDef.cardBg,
                            borderColor: pDef.cardBorder,
                            color: pDef.cardText,
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold truncate flex items-center justify-between ${
                            pDef.buttonStyle === 'brutal' ? 'border-2 border-black' : ''
                          }`}
                        >
                          <span className="truncate">Sample Link</span>
                          <ChevronRight className="w-3 h-3 opacity-70 shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CATEGORY 2: PROFILE HEADER */}
            {activeCategory === 'profile' && (
              <div className="space-y-5">
                {/* Cover Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-2">
                    Cover Banner Photo
                  </label>
                  <div className="relative h-28 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#343B4B] overflow-hidden bg-slate-50 dark:bg-[#171923] flex items-center justify-center group">
                    {settings.cover_url ? (
                      <>
                        <img src={settings.cover_url} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className="px-2.5 py-1.5 rounded-lg bg-white text-xs font-bold text-[#171923] shadow-sm flex items-center gap-1"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Change</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSettings({ cover_url: '', cover_data_url: '' })}
                            className="p-1.5 rounded-lg bg-red-600 text-white shadow-sm"
                            title="Remove Cover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-6 h-6 text-[#626B7A] mx-auto mb-1.5" />
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="text-xs font-bold text-[#4F46E5] dark:text-[#818CF8] hover:underline"
                        >
                          Upload cover banner
                        </button>
                        <p className="text-[10px] text-[#626B7A] mt-0.5">Recommended 1200x400 (PNG or JPG)</p>
                      </div>
                    )}
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileChange}
                      className="hidden"
                    />
                  </div>

                  {settings.cover_url && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>Cover Height</span>
                        <span>{settings.cover_height}px</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="260"
                        step="10"
                        value={settings.cover_height}
                        onChange={(e) => updateSettings({ cover_height: Number(e.target.value) })}
                        className="w-full accent-[#4F46E5]"
                      />
                    </div>
                  )}
                </div>

                {/* Professional Tagline / Role */}
                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                    Profile Tagline / Occupation
                  </label>
                  <Input
                    value={settings.title_tagline}
                    onChange={(e) => updateSettings({ title_tagline: e.target.value })}
                    placeholder="e.g. Student • Creator • Dreamer"
                  />
                  <p className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] mt-1">
                    Subtle badge displayed directly beneath your username.
                  </p>
                </div>

                {/* Avatar Shape & Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                      Avatar Shape
                    </label>
                    <select
                      value={settings.avatar_shape}
                      onChange={(e) => updateSettings({ avatar_shape: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="circle">Circle (Round)</option>
                      <option value="rounded-2xl">Rounded Soft</option>
                      <option value="rounded-lg">Slight Curve</option>
                      <option value="square">Sharp Square</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                      Avatar Size
                    </label>
                    <select
                      value={settings.avatar_size}
                      onChange={(e) => updateSettings({ avatar_size: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="sm">Small (64px)</option>
                      <option value="md">Medium (80px)</option>
                      <option value="lg">Large (96px)</option>
                      <option value="xl">Extra Large (112px)</option>
                    </select>
                  </div>
                </div>

                {/* Avatar Border & Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                      Border Thickness ({settings.avatar_border_width}px)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={settings.avatar_border_width}
                      onChange={(e) => updateSettings({ avatar_border_width: Number(e.target.value) })}
                      className="w-full accent-[#4F46E5] mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                      Border Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.avatar_border_color}
                        onChange={(e) => updateSettings({ avatar_border_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-[#E5E7EB] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.avatar_border_color}
                        onChange={(e) => updateSettings({ avatar_border_color: e.target.value })}
                        className="flex-1 bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 3: LAYOUT BUILDER */}
            {activeCategory === 'layout' && (
              <div className="space-y-4">
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                  Select from 9 genuine layout architectures. Each alters the physical structure and arrangement of profile elements.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'classic', label: 'Classic Centered', desc: 'Canonical vertical stack' },
                    { id: 'compact', label: 'Compact Minimal', desc: 'Space-saving tight gap' },
                    { id: 'cover', label: 'Cover Banner Hero', desc: 'Overlapping avatar banner' },
                    { id: 'cards', label: 'Card-Enclosed Surface', desc: 'Elevated framed profile card' },
                    { id: 'minimal', label: 'Minimalist Editorial', desc: 'Pure typography focus' },
                    { id: 'split', label: 'Split Two-Column', desc: 'Bio left & links right (desktop)' },
                    { id: 'grid', label: 'Two-Column Grid', desc: 'Tile link grid layout' },
                    { id: 'featured', label: 'Featured Top Hero', desc: 'Expanded top link highlight' },
                    { id: 'editorial', label: 'Creator Magazine', desc: 'Sophisticated editorial look' },
                  ].map((l) => {
                    const isSelected = settings.layout_type === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => updateSettings({ layout_type: l.id as any })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#4F46E5] bg-[#EEF2FF]/60 dark:bg-[#272D3A] ring-2 ring-[#4F46E5]/20 shadow-2xs'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">{l.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#4F46E5]" />}
                        </div>
                        <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">{l.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B] space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                      Profile Content Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateSettings({ profile_alignment: align })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                            settings.profile_alignment === align
                              ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8]'
                              : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A]'
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                      Link Vertical Spacing
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['compact', 'normal', 'relaxed'] as const).map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => updateSettings({ link_spacing: sp })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                            settings.link_spacing === sp
                              ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8]'
                              : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A]'
                          }`}
                        >
                          {sp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 4: BACKGROUND EDITOR */}
            {activeCategory === 'background' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-2">
                    Background Style
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'color', label: 'Solid' },
                      { id: 'gradient', label: 'Gradient' },
                      { id: 'pattern', label: 'Pattern' },
                      { id: 'image', label: 'Image' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => updateSettings({ background_type: b.id as any })}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          settings.background_type === b.id
                            ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8]'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A]'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid Color Picker */}
                {settings.background_type === 'color' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Solid Page Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.background_value.startsWith('#') ? settings.background_value : '#0f172a'}
                        onChange={(e) => updateSettings({ background_value: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-[#E5E7EB] cursor-pointer"
                      />
                      <Input
                        value={settings.background_value}
                        onChange={(e) => updateSettings({ background_value: e.target.value })}
                        placeholder="#0f172a"
                      />
                    </div>
                    {/* Swatches */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['#ffffff', '#f8fafc', '#f1f5f9', '#0f172a', '#171923', '#09090b', '#431407', '#022c22'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateSettings({ background_value: c })}
                          style={{ backgroundColor: c }}
                          className="w-6 h-6 rounded-lg border border-[#E5E7EB] shadow-2xs hover:scale-110 transition-transform"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Gradient Picker */}
                {settings.background_type === 'gradient' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                      CSS Gradient Formula
                    </label>
                    <Input
                      value={settings.background_value}
                      onChange={(e) => updateSettings({ background_value: e.target.value })}
                      placeholder="linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)"
                    />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { label: 'Deep Midnight', val: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #090d16 100%)' },
                        { label: 'Neon Aurora', val: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)' },
                        { label: 'Sunset Blaze', val: 'linear-gradient(135deg, #431407 0%, #9a3412 45%, #581c87 100%)' },
                        { label: 'Ocean Twilight', val: 'linear-gradient(150deg, #082f49 0%, #0369a1 50%, #0f172a 100%)' },
                        { label: 'Pastel Whisper', val: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fce7f3 100%)' },
                        { label: 'Emerald Mesh', val: 'linear-gradient(150deg, #022c22 0%, #065f46 60%, #090d16 100%)' },
                      ].map((grad) => (
                        <button
                          key={grad.label}
                          type="button"
                          onClick={() => updateSettings({ background_value: grad.val })}
                          style={{ background: grad.val }}
                          className="p-2.5 rounded-xl border border-white/20 text-white text-[11px] font-bold text-left shadow-2xs truncate"
                        >
                          {grad.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtle Texture Patterns */}
                <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B]">
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-2">
                    Subtle Geometric Overlay Pattern
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'dots', label: 'Dot Grid' },
                      { id: 'grid', label: 'Lines Grid' },
                      { id: 'waves', label: 'Contour' },
                    ].map((pat) => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => updateSettings({ background_pattern: pat.id as any })}
                        className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                          settings.background_pattern === pat.id
                            ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8]'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A]'
                        }`}
                      >
                        {pat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 5: COLOR PALETTE & CONTRAST */}
            {activeCategory === 'colors' && (
              <div className="space-y-4">
                {/* Live WCAG Contrast Indicator */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Live WCAG Contrast Analysis
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          textBgContrast.isAccessible
                            ? 'bg-emerald-100 text-[#15803D] dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-[#B45309] dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                        title="Text vs Page Background"
                      >
                        Text: {textBgContrast.score} ({textBgContrast.ratio}:1)
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          buttonContrast.isAccessible
                            ? 'bg-emerald-100 text-[#15803D] dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-[#B45309] dark:bg-amber-950/40 dark:text-amber-400'
                        }`}
                        title="Button Text vs Button Surface"
                      >
                        Buttons: {buttonContrast.score} ({buttonContrast.ratio}:1)
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                    {textBgContrast.recommendation || buttonContrast.recommendation || 'Excellent contrast. All text and button elements meet WCAG standards for readability.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Main Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.text_color}
                        onChange={(e) => updateSettings({ text_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-[#E5E7EB] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.text_color}
                        onChange={(e) => updateSettings({ text_color: e.target.value })}
                        className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Subtext / Bio Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.subtext_color}
                        onChange={(e) => updateSettings({ subtext_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-[#E5E7EB] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.subtext_color}
                        onChange={(e) => updateSettings({ subtext_color: e.target.value })}
                        className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Link Button Surface</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.button_color.startsWith('#') ? settings.button_color : '#ffffff'}
                        onChange={(e) => updateSettings({ button_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-[#E5E7EB] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.button_color}
                        onChange={(e) => updateSettings({ button_color: e.target.value })}
                        className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Link Button Text</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.button_text_color}
                        onChange={(e) => updateSettings({ button_text_color: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-[#E5E7EB] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.button_text_color}
                        onChange={(e) => updateSettings({ button_text_color: e.target.value })}
                        className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 6: TYPOGRAPHY */}
            {activeCategory === 'typography' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-2">
                    Curated Web Font Family
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CURATED_FONTS.map((font) => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => updateSettings({ font_family: font })}
                        style={{ fontFamily: font }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          settings.font_family === font
                            ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8] font-bold'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#171923] dark:text-[#F9FAFB]'
                        }`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Font Size Scale</label>
                    <select
                      value={settings.font_size_scale}
                      onChange={(e) => updateSettings({ font_size_scale: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="compact">Compact (0.9x)</option>
                      <option value="normal">Standard (1.0x)</option>
                      <option value="large">Large & Bold (1.15x)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Heading Style</label>
                    <select
                      value={settings.heading_style}
                      onChange={(e) => updateSettings({ heading_style: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="normal">Regular Font Weight</option>
                      <option value="bold">Bold</option>
                      <option value="extrabold">Extra Bold</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 7: LINK BUTTON DESIGN */}
            {activeCategory === 'buttons' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-2">
                    Corner Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'rounded-full', label: 'Pill / Full' },
                      { id: 'rounded-2xl', label: 'Soft 2XL' },
                      { id: 'rounded-lg', label: 'Rounded LG' },
                      { id: 'sharp', label: 'Sharp 90°' },
                      { id: 'brutal', label: 'Neo-Brutal' },
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => updateSettings({ button_shape: shape.id as any })}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                          settings.button_shape === shape.id
                            ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8]'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A]'
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-2">
                    Surface Material
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'glass', label: 'Frosted Glass' },
                      { id: 'solid', label: 'Solid Opaque' },
                      { id: 'outline', label: 'Border Outline' },
                      { id: 'shadow', label: 'Elevated Shadow' },
                      { id: 'brutal', label: 'Neo Brutalist' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => updateSettings({ button_style: st.id as any })}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                          settings.button_style === st.id
                            ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8]'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Hover Dynamic Effect</label>
                    <select
                      value={settings.button_hover_effect}
                      onChange={(e) => updateSettings({ button_hover_effect: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="lift">Elevation Lift Up</option>
                      <option value="scale">Subtle Scale (1.02x)</option>
                      <option value="glow">Indigo Ring Glow</option>
                      <option value="none">No Motion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Button Padding Height</label>
                    <select
                      value={settings.button_height}
                      onChange={(e) => updateSettings({ button_height: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="compact">Compact Height</option>
                      <option value="normal">Standard Height</option>
                      <option value="spacious">Spacious Height</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Title Alignment</label>
                    <select
                      value={settings.button_title_alignment}
                      onChange={(e) => updateSettings({ button_title_alignment: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered Title</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Icon Placement</label>
                    <select
                      value={settings.button_icon_position}
                      onChange={(e) => updateSettings({ button_icon_position: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="left">Left of Title</option>
                      <option value="none">Hide Icons</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 8: LINK LOGOS & THUMBNAILS */}
            {activeCategory === 'logos' && (
              <div className="space-y-4">
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                  Customize how uploaded logos and category icons render inside each link button.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Logo Container Shape</label>
                    <select
                      value={settings.link_logo_shape}
                      onChange={(e) => updateSettings({ link_logo_shape: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="rounded">Rounded Box</option>
                      <option value="circle">Circular</option>
                      <option value="square">Sharp Square</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Image Fit</label>
                    <select
                      value={settings.link_logo_fit}
                      onChange={(e) => updateSettings({ link_logo_fit: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="contain">Contain (Preserve aspect)</option>
                      <option value="cover">Cover (Fill container)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 9: SOCIAL ICONS */}
            {activeCategory === 'socials' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Icon Size</label>
                    <select
                      value={settings.social_size}
                      onChange={(e) => updateSettings({ social_size: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="sm">Small (32px)</option>
                      <option value="md">Standard (40px)</option>
                      <option value="lg">Large (48px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Icon Shape</label>
                    <select
                      value={settings.social_shape}
                      onChange={(e) => updateSettings({ social_shape: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="rounded-xl">Rounded Soft</option>
                      <option value="circle">Circular Pill</option>
                      <option value="square">Sharp Square</option>
                      <option value="outline">Outline Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Color Palette</label>
                    <select
                      value={settings.social_theme}
                      onChange={(e) => updateSettings({ social_theme: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="platform">Official Platform Colors</option>
                      <option value="monochrome">Monochrome Clean</option>
                      <option value="custom">Brand Accent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Placement Position</label>
                    <select
                      value={settings.social_placement}
                      onChange={(e) => updateSettings({ social_placement: e.target.value as any })}
                      className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value="top">Header (Below Bio)</option>
                      <option value="bottom">Bottom (Above Footer)</option>
                      <option value="both">Both Top & Bottom</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 10: EFFECTS & ANIMATION */}
            {activeCategory === 'effects' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                    Page Entrance Animation
                  </label>
                  <select
                    value={settings.animation_entrance}
                    onChange={(e) => updateSettings({ animation_entrance: e.target.value as any })}
                    className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="fade">Subtle Smooth Fade-In</option>
                    <option value="slide">Upward Slide Reveal</option>
                    <option value="stagger">Staggered Card Entrance</option>
                    <option value="none">No Animation</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Glassmorphism Blur ({settings.glass_blur_intensity}px)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={settings.glass_blur_intensity}
                    onChange={(e) => updateSettings({ glass_blur_intensity: Number(e.target.value) })}
                    className="w-full accent-[#4F46E5]"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] bg-slate-50 dark:bg-[#171923]">
                  <div>
                    <span className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Respect Reduced Motion
                    </span>
                    <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                      Disable entrance movement for accessibility.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reduced_motion}
                    onChange={(e) => updateSettings({ reduced_motion: e.target.checked })}
                    className="w-4 h-4 accent-[#4F46E5] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 11: FOOTER & BRANDING */}
            {activeCategory === 'footer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                    Custom Footer Note / Copyright
                  </label>
                  <Input
                    value={settings.footer_text}
                    onChange={(e) => updateSettings({ footer_text: e.target.value })}
                    placeholder={`© ${new Date().getFullYear()} ${user?.username}. All rights reserved.`}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] bg-slate-50 dark:bg-[#171923]">
                  <div>
                    <span className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Display Footer
                    </span>
                    <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                      Toggle bottom copyright and credits.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.footer_visible}
                    onChange={(e) => updateSettings({ footer_visible: e.target.checked })}
                    className="w-4 h-4 accent-[#4F46E5] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] bg-slate-50 dark:bg-[#171923]">
                  <div>
                    <span className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Hide LinkPlus Branding Badge
                    </span>
                    <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                      Remove LinkPlus badge from bottom.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.hide_branding}
                    onChange={(e) => updateSettings({ hide_branding: e.target.checked })}
                    className="w-4 h-4 accent-[#4F46E5] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* CATEGORY 12: ADVANCED & CUSTOM CSS */}
            {activeCategory === 'advanced' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Custom Scoped CSS
                    </label>
                    <span className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD]">
                      Scoped to your profile container
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={settings.custom_css}
                    onChange={(e) => updateSettings({ custom_css: e.target.value })}
                    placeholder={`.my-link { font-weight: 700; }\na:hover { transform: scale(1.01); }`}
                    className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <p className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] mt-1">
                    Strictly sanitized. Scripts and external imports are prohibited.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B] flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExportJson}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    className="text-xs flex-1"
                  >
                    Export JSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setImportJsonModalOpen(true)}
                    leftIcon={<FileCode className="w-3.5 h-3.5" />}
                    className="text-xs flex-1"
                  >
                    Import JSON
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* COLUMN 3: LIVE PROFILE PREVIEW IN DEVICE MOCKUP (4 Cols / 12)   */}
        {/* =============================================================== */}
        <div className={`lg:col-span-4 ${mobileViewTab === 'editor' ? 'hidden lg:block' : 'block'} sticky top-20`}>
          <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-4 shadow-xs flex flex-col items-center">
            {/* Mockup Frame Header */}
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-[#E5E7EB] dark:border-[#343B4B] text-xs">
              <span className="font-bold text-[#171923] dark:text-[#F9FAFB] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Live Profile Preview</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="text-[11px] font-semibold text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB] flex items-center gap-1 transition-colors"
                  title="Copy Profile URL"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3 h-3" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#4F46E5] dark:text-[#818CF8] hover:underline flex items-center gap-1"
                >
                  <span>Open Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Device Container */}
            <div
              className={`w-full transition-all duration-300 flex justify-center ${
                previewDevice === 'desktop' ? 'max-w-full' : 'max-w-[340px]'
              }`}
            >
              {/* Realistic Mobile Device Mockup Frame */}
              <div className="w-full bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700/60 relative">
                {/* Speaker pill notch */}
                <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
                  <div className="w-8 h-1 rounded-full bg-slate-800" />
                </div>

                {/* Inner Device Screen */}
                <div className="w-full rounded-[28px] overflow-hidden min-h-[520px] max-h-[620px] overflow-y-auto bg-slate-950 border border-white/10 relative">
                  <PublicProfileRenderer
                    username={user?.username || 'user'}
                    profile={previewProfile}
                    links={links}
                    isPreview={true}
                    previewDevice={previewDevice}
                  />
                </div>

                {/* Home Indicator Bar */}
                <div className="w-28 h-1 bg-white/40 rounded-full mx-auto mt-2.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. MODALS: CROP, RESET CONFIRMATION & JSON IMPORT                   */}
      {/* =================================================================== */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropSource}
        isCircular={cropTarget === 'avatar'}
        title="Crop Cover Photo"
        onClose={() => setCropModalOpen(false)}
        onApply={handleApplyCroppedImage}
      />

      {/* Reset Section Modal */}
      <Modal
        isOpen={resetSectionModalOpen}
        onClose={() => setResetSectionModalOpen(false)}
        title="Reset Current Section?"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
            Are you sure you want to reset all controls in <strong>{activeCategory}</strong> back to the default preset values?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setResetSectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleResetSection}>
              Reset Section
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset All Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset All Appearance Settings?"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
            This will reset all layouts, colors, typography, buttons, and animations back to the default theme template.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleResetAll}>
              Reset Everything
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import JSON Modal */}
      <Modal
        isOpen={importJsonModalOpen}
        onClose={() => setImportJsonModalOpen(false)}
        title="Import Theme JSON Configuration"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
            Paste your exported LinkPlus theme JSON configuration below to restore it into the studio.
          </p>
          <textarea
            rows={8}
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            placeholder={`{\n  "preset": "default",\n  "layout_type": "classic",\n  ...\n}`}
            className="w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setImportJsonModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleImportJson}>
              Import & Apply
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AppearancePage;