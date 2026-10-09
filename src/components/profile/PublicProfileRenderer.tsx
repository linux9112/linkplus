import React, { useState } from 'react';
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

export interface ThemePresetDefinition {
  id: string;
  name: string;
  category: 'dark' | 'light' | 'gradient' | 'glass';
  backgroundType: 'color' | 'gradient';
  backgroundValue: string;
  textColor: string;
  subtextColor: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  buttonShape: 'rounded' | 'rounded-lg' | 'rounded-full' | 'sharp';
  buttonStyle: 'solid' | 'glass' | 'outline' | 'brutal';
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
    buttonShape: 'rounded',
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
      <div className="w-10 h-10 rounded-xl bg-[#FF0000] text-white flex items-center justify-center shadow-sm">
        <Video className="w-5 h-5 fill-current" />
      </div>
    );
  }
  if (norm.includes('project') || norm.includes('folder') || norm.includes('work') || norm.includes('portfolio')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-sm">
        <Folder className="w-5 h-5 fill-current" />
      </div>
    );
  }
  if (norm.includes('note') || norm.includes('study') || norm.includes('book') || norm.includes('doc') || norm.includes('course')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shadow-sm">
        <BookOpen className="w-5 h-5" />
      </div>
    );
  }
  if (norm.includes('contact') || norm.includes('mail') || norm.includes('message') || norm.includes('chat')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#9333EA] text-white flex items-center justify-center shadow-sm">
        <Mail className="w-5 h-5" />
      </div>
    );
  }
  if (norm.includes('github') || norm.includes('code') || norm.includes('repo')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#1F2937] text-white flex items-center justify-center shadow-sm">
        <Github className="w-5 h-5" />
      </div>
    );
  }
  if (norm.includes('shop') || norm.includes('store') || norm.includes('buy') || norm.includes('product')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center shadow-sm">
        <ShoppingBag className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
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
  onReportClick?: (linkId?: string) => void;
}

export const PublicProfileRenderer: React.FC<PublicProfileRendererProps> = ({
  username,
  profile,
  links,
  isPreview = false,
  onReportClick,
}) => {
  const [expandedEmbeds, setExpandedEmbeds] = useState<Record<string, boolean>>({});

  const rawTheme = profile?.theme_settings || (profile as any)?.themeSettings || {};
  const presetKey = String(rawTheme.preset || 'default');
  const preset = THEME_PRESETS[presetKey] || THEME_PRESETS.default;

  const bgType = rawTheme.background_type || preset.backgroundType;
  const bgValue = rawTheme.background_value || preset.backgroundValue;
  const buttonShape = (rawTheme.button_shape as string) || preset.buttonShape;
  const buttonStyle = (rawTheme.button_style as string) || preset.buttonStyle;
  const fontFamily = (rawTheme.font_family as string) || preset.fontFamily;
  const customButtonColor = rawTheme.button_color as string | undefined;
  const customTextColor = (rawTheme.text_color as string) || preset.textColor;
  const linkSpacing = (rawTheme.link_spacing as string) || 'normal';

  const containerStyle: React.CSSProperties = {
    fontFamily: `${fontFamily}, Inter, sans-serif`,
    color: customTextColor,
  };

  if (bgType === 'image' && bgValue) {
    containerStyle.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.85)), url(${bgValue})`;
    containerStyle.backgroundSize = 'cover';
    containerStyle.backgroundPosition = 'center';
  } else if (bgType === 'gradient' || String(bgValue).startsWith('linear-gradient')) {
    containerStyle.background = String(bgValue);
  } else {
    containerStyle.backgroundColor = String(bgValue);
  }

  const shapeClass =
    buttonShape === 'rounded-full'
      ? 'rounded-full'
      : buttonShape === 'sharp'
      ? 'rounded-none'
      : buttonShape === 'rounded'
      ? 'rounded-lg'
      : 'rounded-2xl';

  const spacingClass =
    linkSpacing === 'compact' ? 'space-y-2.5' : linkSpacing === 'relaxed' ? 'space-y-5' : 'space-y-3.5';

  const socialLinks = Array.isArray(profile?.social_links)
    ? profile.social_links
    : Array.isArray((profile as any)?.socialLinks)
    ? (profile as any).socialLinks
    : [];

  const displayName = profile?.display_name || (profile as any)?.displayName || username;
  const avatarUrl = profile?.avatar_url ?? (profile as any)?.avatarUrl ?? null;
  const coverUrl = (rawTheme.cover_url as string) || (profile as any)?.cover_url || null;
  const tagline = (rawTheme.title_tagline as string) || (profile as any)?.title_tagline || (profile as any)?.tagline || null;

  // Group links if categories exist
  const categories: string[] = [];
  links.forEach((l) => {
    const cat = l.category?.trim() || '';
    if (!categories.includes(cat)) categories.push(cat);
  });

  return (
    <div
      style={containerStyle}
      className={`w-full ${
        isPreview ? 'min-h-full py-8 px-4' : 'min-h-screen py-12 px-4 sm:px-6'
      } flex flex-col items-center justify-between transition-all duration-300`}
    >
      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        {/* Cover Photo / Banner if configured */}
        {coverUrl && (
          <div className="w-full h-32 sm:h-40 rounded-2xl overflow-hidden mb-[-44px] shadow-sm relative z-0 border border-white/15">
            <img src={coverUrl} alt="Cover Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/25" />
          </div>
        )}

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col items-center text-center mb-8 w-full ${coverUrl ? 'relative z-10' : ''}`}
        >
          <div className="relative mb-3">
            <div className={coverUrl ? 'ring-4 ring-white dark:ring-[#202430] rounded-full' : ''}>
              <Avatar src={avatarUrl} name={displayName} size="xl" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{displayName}</h1>
          <p className="text-xs font-semibold opacity-70 mt-0.5">@{username}</p>

          {/* Professional Tagline / Role (e.g. "Student • Creator • Dreamer") */}
          {tagline && (
            <p className="text-xs sm:text-sm font-semibold opacity-90 mt-1.5 tracking-wide text-indigo-500 dark:text-indigo-400">
              {tagline}
            </p>
          )}

          {profile?.bio && (
            <p
              style={{ color: preset.subtextColor }}
              className="mt-3 text-sm sm:text-base max-w-md leading-relaxed whitespace-pre-line"
            >
              {profile.bio}
            </p>
          )}

          {/* Social Handles Bar */}
          {socialLinks.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              {socialLinks.map((s: { platform: string; url: string }, idx: number) => {
                const key = s.platform.toLowerCase();
                const meta = SOCIAL_PLATFORMS_META[key];
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
                      background: meta ? meta.bg : preset.cardBg,
                      color: meta ? meta.color : preset.cardText,
                      borderColor: meta ? 'transparent' : preset.cardBorder,
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm hover:scale-110 active:scale-95 transition-all"
                    title={meta?.label || s.platform}
                  >
                    {renderSocialIcon(s.platform)}
                  </a>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Links List */}
        <div className={`w-full ${spacingClass}`}>
          {links.length === 0 ? (
            <div
              style={{
                backgroundColor: preset.cardBg,
                borderColor: preset.cardBorder,
                color: preset.subtextColor,
              }}
              className="text-center py-10 px-6 rounded-2xl border backdrop-blur-md text-sm"
            >
              No public links published yet.
            </div>
          ) : (
            categories.map((cat) => {
              const catLinks = links.filter((l) => (l.category?.trim() || '') === cat);
              return (
                <div key={cat || '__uncategorized'} className={spacingClass}>
                  {cat && (
                    <div className="pt-2 pb-1 text-center">
                      <span className="text-xs font-bold uppercase tracking-widest opacity-70">{cat}</span>
                    </div>
                  )}

                  {catLinks.map((link, index) => {
                    const isPinned = link.is_pinned ?? (link as any).isPinned;
                    const isFeatured = link.is_featured ?? (link as any).isFeatured;
                    const thumb = link.thumbnail_url ?? (link as any).thumbnailUrl;
                    const label = link.custom_label ?? (link as any).customLabel;
                    const mediaUrl = link.media_url ?? (link as any).mediaUrl;
                    const ytEmbed =
                      getYoutubeEmbedUrl(mediaUrl || link.destination_url || '') || null;
                    const isEmbedOpen = Boolean(expandedEmbeds[link.id]);

                    const cardStyle: React.CSSProperties = {
                      backgroundColor: customButtonColor || preset.cardBg,
                      borderColor: isFeatured ? preset.accentColor : preset.cardBorder,
                      color: preset.cardText,
                    };

                    if (buttonStyle === 'brutal') {
                      cardStyle.boxShadow = '4px 4px 0px 0px rgba(17,24,39,1)';
                      cardStyle.borderWidth = '2px';
                    }

                    const href = isPreview ? link.destination_url : `/r/${link.id}`;

                    return (
                      <motion.div
                        key={link.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="w-full"
                      >
                        <div
                          style={cardStyle}
                          className={`group relative w-full border backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${shapeClass} ${
                            isFeatured ? 'ring-2 ring-indigo-500/50' : ''
                          }`}
                        >
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (isPreview) e.preventDefault();
                            }}
                            className="flex items-center justify-between gap-3.5 px-4 sm:px-5 py-3.5 sm:py-4 w-full"
                          >
                            {/* Left Icon or Thumbnail */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
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

                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm sm:text-base truncate">
                                    {link.title}
                                  </span>
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
                                  <p className="text-xs opacity-75 truncate mt-0.5">
                                    {link.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right Action: Chevron arrow matching mockup */}
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
                                  {isEmbedOpen ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                              <ChevronRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                            </div>
                          </a>

                          {/* Embedded Video Player if expanded */}
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
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-12 pt-4 flex items-center justify-center gap-4 text-xs opacity-75">
        <a
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:opacity-100 transition-opacity"
        >
          <img src="/logo.jpg" alt="LinkPlus Logo" className="w-3.5 h-3.5 rounded-sm object-cover" />
          <span className="font-semibold">LinkPlus</span>
        </a>
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
  );
};

export default PublicProfileRenderer;
