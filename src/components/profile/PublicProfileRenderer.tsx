import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Pin,
  Globe,
  Github,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Music,
  Video,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Folder,
  BookOpen,
} from 'lucide-react';
import type { Profile, Link as LinkItem } from '../../types/index';
import Avatar from '../ui/Avatar';
import { sanitizeCustomCss } from '../../utils/contrast';

export interface ThemePresetDefinition {
  id: string;
  name: string;
  category: 'dark' | 'light' | 'gradient' | 'glass';
  backgroundType: 'color' | 'gradient' | 'image' | 'pattern';
  backgroundValue: string;
  backgroundPattern?: 'none' | 'dots' | 'grid' | 'mesh' | 'waves';
  textColor: string;
  subtextColor: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  buttonShape: 'rounded-full' | 'rounded-2xl' | 'rounded-lg' | 'sharp' | 'brutal';
  buttonStyle: 'solid' | 'glass' | 'outline' | 'brutal' | 'gradient' | 'shadow' | 'minimal';
  accentColor: string;
  fontFamily: string;
}

export const THEME_PRESETS: Record<string, ThemePresetDefinition> = {
  default: {
    id: 'default',
    name: 'Midnight Slate',
    category: 'dark',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #090d16 100%)',
    textColor: '#f8fafc',
    subtextColor: '#94a3b8',
    cardBg: 'rgba(30, 41, 59, 0.78)',
    cardBorder: 'rgba(148, 163, 184, 0.18)',
    cardText: '#f8fafc',
    buttonShape: 'rounded-full',
    buttonStyle: 'glass',
    accentColor: '#6366f1',
    fontFamily: 'Inter',
  },
  glass_aurora: {
    id: 'glass_aurora',
    name: 'Aurora Glass',
    category: 'glass',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)',
    textColor: '#ffffff',
    subtextColor: '#cbd5e1',
    cardBg: 'rgba(255, 255, 255, 0.10)',
    cardBorder: 'rgba(255, 255, 255, 0.22)',
    cardText: '#ffffff',
    buttonShape: 'rounded-lg',
    buttonStyle: 'glass',
    accentColor: '#a855f7',
    fontFamily: 'Plus Jakarta Sans',
  },
  ocean_breeze: {
    id: 'ocean_breeze',
    name: 'Ocean Breeze',
    category: 'gradient',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(150deg, #082f49 0%, #0369a1 50%, #0f172a 100%)',
    textColor: '#f0f9ff',
    subtextColor: '#bae6fd',
    cardBg: 'rgba(12, 74, 110, 0.65)',
    cardBorder: 'rgba(56, 189, 248, 0.30)',
    cardText: '#f0f9ff',
    buttonShape: 'rounded-full',
    buttonStyle: 'glass',
    accentColor: '#38bdf8',
    fontFamily: 'Inter',
  },
  emerald_forest: {
    id: 'emerald_forest',
    name: 'Emerald Canopy',
    category: 'gradient',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(150deg, #022c22 0%, #065f46 60%, #090d16 100%)',
    textColor: '#ecfdf5',
    subtextColor: '#a7f3d0',
    cardBg: 'rgba(6, 78, 59, 0.65)',
    cardBorder: 'rgba(52, 211, 153, 0.28)',
    cardText: '#ecfdf5',
    buttonShape: 'rounded-lg',
    buttonStyle: 'solid',
    accentColor: '#10b981',
    fontFamily: 'Inter',
  },
  sunset_glow: {
    id: 'sunset_glow',
    name: 'Sunset Glow',
    category: 'gradient',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #431407 0%, #9a3412 45%, #581c87 100%)',
    textColor: '#fff7ed',
    subtextColor: '#fed7aa',
    cardBg: 'rgba(255, 255, 255, 0.12)',
    cardBorder: 'rgba(251, 146, 60, 0.32)',
    cardText: '#fff7ed',
    buttonShape: 'rounded-full',
    buttonStyle: 'glass',
    accentColor: '#f97316',
    fontFamily: 'Plus Jakarta Sans',
  },
  minimal_light: {
    id: 'minimal_light',
    name: 'Minimal Daylight',
    category: 'light',
    backgroundType: 'color',
    backgroundValue: '#f8fafc',
    textColor: '#0f172a',
    subtextColor: '#475569',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardText: '#0f172a',
    buttonShape: 'rounded-lg',
    buttonStyle: 'solid',
    accentColor: '#4f46e5',
    fontFamily: 'Inter',
  },
  editorial_cream: {
    id: 'editorial_cream',
    name: 'Neo Brutal Cream',
    category: 'light',
    backgroundType: 'color',
    backgroundValue: '#fef3c7',
    textColor: '#111827',
    subtextColor: '#374151',
    cardBg: '#ffffff',
    cardBorder: '#111827',
    cardText: '#111827',
    buttonShape: 'rounded-2xl',
    buttonStyle: 'brutal',
    accentColor: '#d97706',
    fontFamily: 'Plus Jakarta Sans',
  },
  cyber_neon: {
    id: 'cyber_neon',
    name: 'Cyber Matrix',
    category: 'dark',
    backgroundType: 'color',
    backgroundValue: '#05050a',
    textColor: '#f8fafc',
    subtextColor: '#94a3b8',
    cardBg: 'rgba(15, 23, 42, 0.9)',
    cardBorder: '#6366f1',
    cardText: '#e0e7ff',
    buttonShape: 'sharp',
    buttonStyle: 'outline',
    accentColor: '#818cf8',
    fontFamily: 'JetBrains Mono',
  },
  obsidian_noir: {
    id: 'obsidian_noir',
    name: 'Obsidian Gold',
    category: 'dark',
    backgroundType: 'color',
    backgroundValue: '#09090b',
    textColor: '#f4f4f5',
    subtextColor: '#a1a1aa',
    cardBg: '#18181b',
    cardBorder: '#27272a',
    cardText: '#fafafa',
    buttonShape: 'rounded-lg',
    buttonStyle: 'solid',
    accentColor: '#eab308',
    fontFamily: 'Playfair Display',
  },
  nordic_frost: {
    id: 'nordic_frost',
    name: 'Nordic Frost',
    category: 'light',
    backgroundType: 'color',
    backgroundValue: '#f1f5f9',
    textColor: '#0f172a',
    subtextColor: '#64748b',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardText: '#0f172a',
    buttonShape: 'rounded-2xl',
    buttonStyle: 'shadow',
    accentColor: '#0ea5e9',
    fontFamily: 'Outfit',
  },
  retro_synth: {
    id: 'retro_synth',
    name: 'Retro Synthwave',
    category: 'gradient',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #18002e 0%, #3b0764 50%, #4c0519 100%)',
    textColor: '#22d3ee',
    subtextColor: '#f472b6',
    cardBg: 'rgba(59, 7, 100, 0.65)',
    cardBorder: 'rgba(244, 63, 94, 0.45)',
    cardText: '#ffffff',
    buttonShape: 'rounded-full',
    buttonStyle: 'glass',
    accentColor: '#f43f5e',
    fontFamily: 'Space Grotesk',
  },
  pastel_blush: {
    id: 'pastel_blush',
    name: 'Pastel Blush',
    category: 'light',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fce7f3 100%)',
    textColor: '#4c0519',
    subtextColor: '#9f1239',
    cardBg: '#ffffff',
    cardBorder: '#fecdd3',
    cardText: '#881337',
    buttonShape: 'rounded-full',
    buttonStyle: 'solid',
    accentColor: '#fb7185',
    fontFamily: 'Poppins',
  },
};

export const SOCIAL_PLATFORMS_META: Record<
  string,
  { label: string; bg: string; color: string; icon: (props: any) => JSX.Element }
> = {
  youtube: {
    label: 'YouTube',
    bg: '#FF0000',
    color: '#FFFFFF',
    icon: (p) => <Video {...p} className="w-5 h-5 fill-current" />,
  },
  instagram: {
    label: 'Instagram',
    bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    color: '#FFFFFF',
    icon: (p) => <Instagram {...p} className="w-5 h-5" />,
  },
  twitter: {
    label: 'X',
    bg: '#000000',
    color: '#FFFFFF',
    icon: (p) => <Twitter {...p} className="w-5 h-5 fill-current" />,
  },
  x: {
    label: 'X',
    bg: '#000000',
    color: '#FFFFFF',
    icon: (p) => <Twitter {...p} className="w-5 h-5 fill-current" />,
  },
  github: {
    label: 'GitHub',
    bg: '#24292e',
    color: '#FFFFFF',
    icon: (p) => <Github {...p} className="w-5 h-5 fill-current" />,
  },
  linkedin: {
    label: 'LinkedIn',
    bg: '#0A66C2',
    color: '#FFFFFF',
    icon: (p) => <Linkedin {...p} className="w-5 h-5 fill-current" />,
  },
  facebook: {
    label: 'Facebook',
    bg: '#1877F2',
    color: '#FFFFFF',
    icon: (p) => <Globe {...p} className="w-5 h-5" />,
  },
  whatsapp: {
    label: 'WhatsApp',
    bg: '#25D366',
    color: '#FFFFFF',
    icon: (p) => <Mail {...p} className="w-5 h-5" />,
  },
  telegram: {
    label: 'Telegram',
    bg: '#229ED9',
    color: '#FFFFFF',
    icon: (p) => <Globe {...p} className="w-5 h-5" />,
  },
  website: {
    label: 'Website',
    bg: '#4F46E5',
    color: '#FFFFFF',
    icon: (p) => <Globe {...p} className="w-5 h-5" />,
  },
  email: {
    label: 'Email',
    bg: '#EA4335',
    color: '#FFFFFF',
    icon: (p) => <Mail {...p} className="w-5 h-5" />,
  },
  tiktok: {
    label: 'TikTok',
    bg: '#000000',
    color: '#FFFFFF',
    icon: (p) => <Music {...p} className="w-5 h-5" />,
  },
  spotify: {
    label: 'Spotify',
    bg: '#1DB954',
    color: '#FFFFFF',
    icon: (p) => <Music {...p} className="w-5 h-5" />,
  },
};

export function renderLinkIcon(iconName?: string | null, title?: string, destinationUrl?: string) {
  const norm = `${iconName || ''} ${title || ''} ${destinationUrl || ''}`.toLowerCase();

  if (norm.includes('youtube') || norm.includes('video')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#FF0000] text-white flex items-center justify-center shadow-xs shrink-0">
        <Video className="w-5 h-5 fill-current" />
      </div>
    );
  }
  if (norm.includes('project') || norm.includes('folder') || norm.includes('work') || norm.includes('portfolio')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
        <Folder className="w-5 h-5 fill-current" />
      </div>
    );
  }
  if (norm.includes('note') || norm.includes('study') || norm.includes('book') || norm.includes('doc') || norm.includes('course')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shadow-xs shrink-0">
        <BookOpen className="w-5 h-5" />
      </div>
    );
  }
  if (norm.includes('contact') || norm.includes('mail') || norm.includes('message') || norm.includes('chat')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#9333EA] text-white flex items-center justify-center shadow-xs shrink-0">
        <Mail className="w-5 h-5" />
      </div>
    );
  }
  if (norm.includes('github') || norm.includes('code') || norm.includes('repo')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#1F2937] text-white flex items-center justify-center shadow-xs shrink-0">
        <Github className="w-5 h-5" />
      </div>
    );
  }
  if (norm.includes('shop') || norm.includes('store') || norm.includes('buy') || norm.includes('product')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center shadow-xs shrink-0">
        <ShoppingBag className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
      <Globe className="w-5 h-5" />
    </div>
  );
}

export function renderSocialIcon(platform: string) {
  const key = platform.toLowerCase();
  const meta = SOCIAL_PLATFORMS_META[key];
  if (meta) {
    return meta.icon({});
  }
  return <Globe className="w-5 h-5" />;
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export interface PublicProfileRendererProps {
  username: string;
  profile: Profile;
  links: LinkItem[];
  isPreview?: boolean;
  previewDevice?: 'mobile' | 'desktop';
  onReportClick?: (linkId?: string) => void;
}

export const PublicProfileRenderer: React.FC<PublicProfileRendererProps> = ({
  username,
  profile,
  links,
  isPreview = false,
  previewDevice = 'mobile',
  onReportClick,
}) => {
  const [expandedEmbeds, setExpandedEmbeds] = useState<Record<string, boolean>>({});

  const rawTheme = (profile?.theme_settings || (profile as any)?.themeSettings || {}) as Record<string, any>;
  const presetKey = String(rawTheme.preset || 'default');
  const preset = THEME_PRESETS[presetKey] || THEME_PRESETS.default;

  // Background settings
  const bgType = (rawTheme.background_type as string) || preset.backgroundType;
  const bgValue = (rawTheme.background_value as string) || preset.backgroundValue;
  const bgPattern = (rawTheme.background_pattern as string) || preset.backgroundPattern || 'none';
  const bgOverlayOpacity = typeof rawTheme.background_overlay_opacity === 'number' ? rawTheme.background_overlay_opacity : 0.4;
  const bgOverlayColor = (rawTheme.background_overlay_color as string) || '#000000';

  // Typography settings
  const fontFamily = (rawTheme.font_family as string) || preset.fontFamily;
  const fontSizeScale = (rawTheme.font_size_scale as string) || 'normal';
  const headingStyle = (rawTheme.heading_style as string) || 'extrabold';
  const customTextColor = (rawTheme.text_color as string) || preset.textColor;
  const customSubtextColor = (rawTheme.subtext_color as string) || preset.subtextColor;
  const customNameColor = (rawTheme.name_color as string) || customTextColor;
  const customBioColor = (rawTheme.bio_color as string) || customSubtextColor;

  // Layout settings
  const layoutType = (rawTheme.layout_type as string) || 'classic';
  const profileAlignment = (rawTheme.profile_alignment as string) || 'center';
  const linkSpacing = (rawTheme.link_spacing as string) || 'normal';

  // Profile element settings
  const avatarSize = (rawTheme.avatar_size as string) || (layoutType === 'compact' ? 'md' : 'xl');
  const avatarShape = (rawTheme.avatar_shape as string) || 'circle';
  const avatarBorderWidth = typeof rawTheme.avatar_border_width === 'number' ? rawTheme.avatar_border_width : 4;
  const avatarBorderColor = (rawTheme.avatar_border_color as string) || '#ffffff';
  const coverUrl = (rawTheme.cover_url as string) || (profile as any)?.cover_url || null;
  const coverHeight = typeof rawTheme.cover_height === 'number' ? rawTheme.cover_height : 160;

  // Button settings
  const buttonShape = (rawTheme.button_shape as string) || preset.buttonShape;
  const buttonCustomRadius = typeof rawTheme.button_custom_radius === 'number' ? rawTheme.button_custom_radius : undefined;
  const buttonStyle = (rawTheme.button_style as string) || preset.buttonStyle;
  const customButtonColor = (rawTheme.button_color as string) || preset.cardBg;
  const customButtonTextColor = (rawTheme.button_text_color as string) || preset.cardText;
  const customButtonBorderColor = (rawTheme.button_border_color as string) || preset.cardBorder;
  const buttonBorderWidth = typeof rawTheme.button_border_width === 'number' ? rawTheme.button_border_width : 1;
  const buttonHeight = (rawTheme.button_height as string) || 'normal';
  const buttonTitleAlignment = (rawTheme.button_title_alignment as string) || 'left';
  const buttonIconPosition = (rawTheme.button_icon_position as string) || 'left';
  const buttonHoverEffect = (rawTheme.button_hover_effect as string) || 'lift';
  const linkOverrides: Record<string, any> = rawTheme.link_overrides || {};

  // Social icon settings
  const socialSize = (rawTheme.social_size as string) || 'md';
  const socialShape = (rawTheme.social_shape as string) || 'rounded-xl';
  const socialTheme = (rawTheme.social_theme as string) || 'platform';
  const socialCustomColor = (rawTheme.social_custom_color as string) || preset.accentColor;
  const socialPlacement = (rawTheme.social_placement as string) || 'top';

  // Effects & branding
  const animationEntrance = (rawTheme.animation_entrance as string) || 'fade';
  const glassBlur = typeof rawTheme.glass_blur_intensity === 'number' ? rawTheme.glass_blur_intensity : 12;
  const reducedMotion = Boolean(rawTheme.reduced_motion);
  const footerVisible = rawTheme.footer_visible !== false;
  const footerText = (rawTheme.footer_text as string) || '';
  const hideBranding = Boolean(rawTheme.hide_branding);
  const footerAlignment = (rawTheme.footer_alignment as string) || 'center';
  const customCss = (rawTheme.custom_css as string) || '';

  // Dynamically load Google Font
  useEffect(() => {
    if (!fontFamily || fontFamily === 'Inter' || fontFamily === 'Georgia') return;
    const fontId = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700;800&display=swap`;
      document.head.appendChild(link);
    }
  }, [fontFamily]);

  // Container styling
  const containerStyle: React.CSSProperties = {
    fontFamily: `${fontFamily}, Inter, sans-serif`,
    color: customTextColor,
  };

  // Background styling calculation
  if (bgType === 'image' && bgValue) {
    containerStyle.backgroundImage = `url(${bgValue})`;
    containerStyle.backgroundSize = 'cover';
    containerStyle.backgroundPosition = 'center';
    containerStyle.backgroundRepeat = 'no-repeat';
  } else if (bgType === 'gradient' || String(bgValue).startsWith('linear-gradient') || String(bgValue).startsWith('radial-gradient')) {
    containerStyle.background = String(bgValue);
  } else {
    containerStyle.backgroundColor = String(bgValue);
  }

  // Pattern overlays
  let patternSvg = '';
  if (bgPattern === 'dots') {
    patternSvg = `radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)`;
  } else if (bgPattern === 'grid') {
    patternSvg = `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`;
  }

  // Button shape calculation
  const getShapeClasses = (shape: string) => {
    if (buttonCustomRadius !== undefined) return '';
    if (shape === 'rounded-full') return 'rounded-full';
    if (shape === 'sharp') return 'rounded-none';
    if (shape === 'rounded-lg') return 'rounded-xl';
    if (shape === 'rounded-2xl') return 'rounded-2xl';
    return 'rounded-xl';
  };

  const spacingClass =
    linkSpacing === 'compact' ? 'space-y-2.5' : linkSpacing === 'relaxed' ? 'space-y-5' : 'space-y-3.5';

  const socialLinks = Array.isArray(profile?.social_links)
    ? profile.social_links.filter((s) => Boolean(s.url))
    : Array.isArray((profile as any)?.socialLinks)
    ? (profile as any).socialLinks.filter((s: any) => Boolean(s.url))
    : [];

  const displayName = profile?.display_name || (profile as any)?.displayName || username;
  const avatarUrl = profile?.avatar_url ?? (profile as any)?.avatarUrl ?? null;
  const tagline = (rawTheme.title_tagline as string) || (profile as any)?.title_tagline || (profile as any)?.tagline || null;

  // Group links by category
  const categories: string[] = [];
  links.forEach((l) => {
    const cat = l.category?.trim() || '';
    if (!categories.includes(cat)) categories.push(cat);
  });

  // Social handles bar helper
  const renderSocials = () => {
    if (socialLinks.length === 0) return null;
    return (
      <div
        className={`flex flex-wrap items-center gap-2.5 mt-4 ${
          profileAlignment === 'left' ? 'justify-start' : profileAlignment === 'right' ? 'justify-end' : 'justify-center'
        }`}
      >
        {socialLinks.map((s: { platform: string; url: string }, idx: number) => {
          const key = s.platform.toLowerCase();
          const meta = SOCIAL_PLATFORMS_META[key];

          const sizeClass = socialSize === 'sm' ? 'w-8 h-8' : socialSize === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
          const shapeClass =
            socialShape === 'circle'
              ? 'rounded-full'
              : socialShape === 'square'
              ? 'rounded-none'
              : socialShape === 'outline'
              ? 'rounded-xl border'
              : 'rounded-xl';

          let bg = meta ? meta.bg : preset.cardBg;
          let color = meta ? meta.color : preset.cardText;

          if (socialTheme === 'monochrome') {
            bg = preset.cardBg;
            color = customTextColor;
          } else if (socialTheme === 'custom') {
            bg = socialCustomColor;
            color = '#ffffff';
          }

          return (
            <a
              key={`${s.platform}-${idx}`}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (isPreview) e.preventDefault();
              }}
              style={{
                background: bg,
                color,
                borderColor: preset.cardBorder,
              }}
              className={`${sizeClass} ${shapeClass} flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-all duration-150`}
              title={meta?.label || s.platform}
            >
              {renderSocialIcon(s.platform)}
            </a>
          );
        })}
      </div>
    );
  };

  // Header content block
  const renderHeader = () => (
    <div
      className={`flex flex-col w-full ${
        profileAlignment === 'left'
          ? 'items-start text-left'
          : profileAlignment === 'right'
          ? 'items-end text-right'
          : 'items-center text-center'
      }`}
    >
      {/* Avatar Container */}
      <div className="relative mb-3.5">
        <div
          style={{
            borderWidth: `${avatarBorderWidth}px`,
            borderColor: avatarBorderColor,
            borderRadius:
              avatarShape === 'circle' ? '9999px' : avatarShape === 'square' ? '0px' : avatarShape === 'rounded-2xl' ? '1.5rem' : '1rem',
          }}
          className="overflow-hidden shadow-md"
        >
          <Avatar
            src={avatarUrl}
            name={displayName}
            size={avatarSize === 'sm' ? 'md' : avatarSize === 'md' ? 'lg' : 'xl'}
          />
        </div>
      </div>

      <h1
        style={{ color: customNameColor }}
        className={`tracking-tight ${
          fontSizeScale === 'large' ? 'text-3xl sm:text-4xl' : fontSizeScale === 'compact' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
        } ${headingStyle === 'bold' ? 'font-bold' : headingStyle === 'normal' ? 'font-medium' : 'font-extrabold'}`}
      >
        {displayName}
      </h1>

      <p style={{ color: customSubtextColor }} className="text-xs font-semibold opacity-75 mt-0.5">
        @{username}
      </p>

      {tagline && (
        <p
          style={{ color: preset.accentColor }}
          className="text-xs sm:text-sm font-semibold opacity-95 mt-1.5 tracking-wide"
        >
          {tagline}
        </p>
      )}

      {profile?.bio && (
        <p
          style={{ color: customBioColor }}
          className={`mt-3 leading-relaxed whitespace-pre-line max-w-md ${
            fontSizeScale === 'large' ? 'text-base' : fontSizeScale === 'compact' ? 'text-xs' : 'text-sm sm:text-base'
          }`}
        >
          {profile.bio}
        </p>
      )}

      {(socialPlacement === 'top' || socialPlacement === 'both') && renderSocials()}
    </div>
  );

  // Link button item renderer
  const renderLinkItem = (link: LinkItem, index: number, isFeaturedCard = false) => {
    const isPinned = link.is_pinned ?? (link as any).isPinned;
    const isFeatured = isFeaturedCard || link.is_featured || (link as any).isFeatured;
    const thumb = link.thumbnail_url ?? (link as any).thumbnailUrl;
    const label = link.custom_label ?? (link as any).customLabel;
    const mediaUrl = link.media_url ?? (link as any).mediaUrl;
    const ytEmbed = getYoutubeEmbedUrl(mediaUrl || link.destination_url || '') || null;
    const isEmbedOpen = Boolean(expandedEmbeds[link.id]);

    const override = linkOverrides[link.id] || {};
    const itemCardBg = override.button_color || customButtonColor;
    const itemCardText = override.text_color || customButtonTextColor;
    const itemCardBorder = override.border_color || customButtonBorderColor;
    const itemButtonShape = override.button_shape || buttonShape;
    const itemButtonStyle = override.button_style || buttonStyle;

    const cardStyle: React.CSSProperties = {
      backgroundColor: itemCardBg,
      borderColor: isFeatured ? preset.accentColor : itemCardBorder,
      borderWidth: `${buttonBorderWidth}px`,
      color: itemCardText,
    };

    if (buttonCustomRadius !== undefined) {
      cardStyle.borderRadius = `${buttonCustomRadius}px`;
    }

    if (itemButtonStyle === 'outline') {
      cardStyle.backgroundColor = 'transparent';
      cardStyle.borderColor = itemCardText;
    } else if (itemButtonStyle === 'glass') {
      cardStyle.backdropFilter = `blur(${glassBlur}px)`;
      cardStyle.WebkitBackdropFilter = `blur(${glassBlur}px)`;
    } else if (itemButtonStyle === 'brutal') {
      cardStyle.boxShadow = '4px 4px 0px 0px rgba(17,24,39,1)';
      cardStyle.borderWidth = '2px';
      cardStyle.borderColor = '#111827';
    } else if (itemButtonStyle === 'shadow') {
      cardStyle.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    }

    const paddingClass =
      buttonHeight === 'compact'
        ? 'py-2.5 px-3.5 sm:py-3 sm:px-4'
        : buttonHeight === 'spacious'
        ? 'py-4.5 px-5 sm:py-5 sm:px-6'
        : 'py-3.5 px-4 sm:py-4 sm:px-5';

    const hoverClass =
      buttonHoverEffect === 'lift'
        ? 'hover:-translate-y-1 hover:shadow-xl'
        : buttonHoverEffect === 'scale'
        ? 'hover:scale-[1.02] hover:shadow-lg'
        : buttonHoverEffect === 'glow'
        ? 'hover:ring-2 hover:ring-indigo-400/50'
        : '';

    const href = isPreview ? link.destination_url : `/r/${link.id}`;

    return (
      <motion.div
        key={link.id}
        initial={reducedMotion ? false : { opacity: 0, y: animationEntrance === 'slide' ? 16 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { delay: index * 0.03 }}
        className="w-full"
      >
        <div
          style={cardStyle}
          className={`group relative w-full border transition-all duration-200 ${getShapeClasses(
            itemButtonShape
          )} ${hoverClass} ${isFeatured ? 'ring-2 ring-indigo-500/50' : ''}`}
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (isPreview) e.preventDefault();
            }}
            className={`flex items-center justify-between gap-3.5 w-full ${paddingClass}`}
          >
            {/* Left Icon or Thumbnail */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {buttonIconPosition !== 'none' && (
                <>
                  {thumb ? (
                    <div className="w-11 h-11 rounded-xl bg-white/10 dark:bg-black/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/20 p-1">
                      <img
                        src={thumb}
                        alt={link.title}
                        loading="lazy"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 shrink-0">
                      {renderLinkIcon(link.icon, link.title, link.destination_url)}
                    </div>
                  )}
                </>
              )}

              <div
                className={`min-w-0 flex-1 ${
                  buttonTitleAlignment === 'center'
                    ? 'text-center'
                    : buttonTitleAlignment === 'right'
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                <div
                  className={`flex items-center gap-2 flex-wrap ${
                    buttonTitleAlignment === 'center'
                      ? 'justify-center'
                      : buttonTitleAlignment === 'right'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <span className="font-semibold text-sm sm:text-base truncate">{link.title}</span>
                  {isPinned && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        preset.category === 'light'
                          ? 'bg-indigo-100 text-[#4F46E5] border border-indigo-200'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/20'
                      }`}
                    >
                      <Pin className="w-2.5 h-2.5" />
                      Pinned
                    </span>
                  )}
                  {label && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        preset.category === 'light'
                          ? 'bg-amber-100 text-[#B45309] border border-amber-200'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/20'
                      }`}
                    >
                      {label}
                    </span>
                  )}
                </div>
                {link.description && (
                  <p className="text-xs opacity-75 truncate mt-0.5">{link.description}</p>
                )}
              </div>
            </div>

            {/* Right Action */}
            <div className="flex items-center gap-2 shrink-0">
              {ytEmbed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpandedEmbeds((prev) => ({
                      ...prev,
                      [link.id]: !prev[link.id],
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-xs font-medium flex items-center gap-1"
                >
                  <span>Video</span>
                  {isEmbedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
              <ChevronRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </a>

          {/* Embedded Video Player */}
          {ytEmbed && isEmbedOpen && (
            <div className="px-4 pb-4">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe
                  src={ytEmbed}
                  title={link.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Links list layout selector
  const renderLinksContainer = () => {
    if (links.length === 0) {
      return (
        <div
          style={{
            backgroundColor: preset.cardBg,
            borderColor: preset.cardBorder,
            color: preset.subtextColor,
          }}
          className="text-center py-10 px-6 rounded-2xl border backdrop-blur-md text-sm w-full"
        >
          No public links published yet.
        </div>
      );
    }

    if (layoutType === 'grid') {
      return (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {links.map((link, idx) => renderLinkItem(link, idx))}
        </div>
      );
    }

    if (layoutType === 'featured' && links.length > 0) {
      const [first, ...rest] = links;
      return (
        <div className={`w-full ${spacingClass}`}>
          {renderLinkItem(first, 0, true)}
          {rest.map((link, idx) => renderLinkItem(link, idx + 1))}
        </div>
      );
    }

    // Categorized or standard stack
    return (
      <div className={`w-full ${spacingClass}`}>
        {categories.map((cat) => {
          const catLinks = links.filter((l) => (l.category?.trim() || '') === cat);
          return (
            <div key={cat || '__uncat'} className={spacingClass}>
              {cat && (
                <div className="pt-2 pb-1 text-center">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-75">{cat}</span>
                </div>
              )}
              {catLinks.map((link, idx) => renderLinkItem(link, idx))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={containerStyle}
      className={`linkplus-profile-container relative w-full ${
        isPreview ? 'min-h-full py-8 px-4' : 'min-h-screen py-12 px-4 sm:px-6'
      } flex flex-col items-center justify-between transition-all duration-300`}
    >
      {/* Pattern background overlay */}
      {patternSvg && (
        <div
          style={{ backgroundImage: patternSvg, backgroundSize: '24px 24px' }}
          className="absolute inset-0 pointer-events-none z-0 opacity-40"
        />
      )}

      {/* Background tint overlay */}
      {bgType === 'image' && bgValue && (
        <div
          style={{ backgroundColor: bgOverlayColor, opacity: bgOverlayOpacity }}
          className="absolute inset-0 pointer-events-none z-0"
        />
      )}

      {/* Injected Scoped Custom CSS */}
      {customCss && (
        <style dangerouslySetInnerHTML={{ __html: sanitizeCustomCss(customCss, '.linkplus-profile-container') }} />
      )}

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center">
        {/* Cover Photo Banner */}
        {coverUrl && (
          <div
            style={{ height: `${coverHeight}px` }}
            className="w-full rounded-2xl overflow-hidden mb-[-44px] shadow-sm relative z-0 border border-white/15"
          >
            <img src={coverUrl} alt="Cover Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/25" />
          </div>
        )}

        {/* Layout rendering logic */}
        {layoutType === 'cards' ? (
          <div
            style={{
              backgroundColor: preset.cardBg,
              borderColor: preset.cardBorder,
            }}
            className="w-full rounded-3xl p-6 sm:p-8 border shadow-xl backdrop-blur-md flex flex-col items-center mb-6"
          >
            {renderHeader()}
            <div className="w-full mt-6">{renderLinksContainer()}</div>
          </div>
        ) : layoutType === 'split' && previewDevice === 'desktop' ? (
          <div className="w-full flex flex-col md:flex-row md:items-start md:gap-8">
            <div className="w-full md:w-5/12 sticky top-6">{renderHeader()}</div>
            <div className="w-full md:w-7/12 mt-6 md:mt-0">{renderLinksContainer()}</div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className={`w-full mb-8 ${coverUrl ? 'relative z-10' : ''}`}>{renderHeader()}</div>
            {renderLinksContainer()}
          </div>
        )}

        {(socialPlacement === 'bottom' || socialPlacement === 'both') && renderSocials()}
      </div>

      {/* Footer & Branding */}
      {footerVisible && (
        <div
          className={`relative z-10 mt-12 pt-4 flex flex-col items-center gap-2 text-xs opacity-80 ${
            footerAlignment === 'left' ? 'self-start' : footerAlignment === 'right' ? 'self-end' : 'self-center'
          }`}
        >
          {footerText && <p className="font-medium">{footerText}</p>}
          <div className="flex items-center gap-4">
            {!hideBranding && (
              <a
                href="/"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:opacity-100 transition-opacity"
              >
                <img src="/logo.jpg" alt="LinkPlus" className="w-3.5 h-3.5 rounded-sm object-cover" />
                <span className="font-semibold">LinkPlus</span>
              </a>
            )}
            {!isPreview && onReportClick && (
              <button
                type="button"
                onClick={() => onReportClick()}
                className="text-[11px] opacity-60 hover:opacity-100 underline"
              >
                Report Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfileRenderer;
