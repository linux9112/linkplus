import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  MousePointerClick,
  Link2,
  QrCode,
  Copy,
  Check,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Download,
  Sparkles,
  Pencil,
  Video,
  FileText,
  Code2,
  BookOpen,
  Mail,
  Globe,
  ChevronDown,
  Activity,
  Share2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../api/client';
import type { Link as LinkItem } from '../../types/index';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StyledQrCanvas from '../../components/qr/StyledQrCanvas';
import { useToast } from '../../components/ui/Toast';
import { renderSocialIcon } from '../../components/profile/PublicProfileRenderer';

interface OverviewStats {
  totalViews: number;
  totalClicks: number;
  qrScans: number;
  ctr: number;
  topLinks: LinkItem[];
  recentActivity: Array<{
    id: string;
    eventType: string;
    referrerCategory: string;
    deviceCategory: string;
    linkTitle: string | null;
    createdAt: string;
  }>;
}

interface ChartBucket {
  date: string;
  formattedDate: string;
  views: number;
  clicks: number;
  qrScans?: number;
}

// Relative time formatting helper
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recent';
  }
}

// Format 'YYYY-MM-DD' to 'MMM DD' (e.g. 'Sep 10')
function formatChartDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Custom Tooltip for AreaChart
const ChartTooltip: React.FC<any> = ({ active, payload, label, isDark }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={`p-3 rounded-xl border text-xs shadow-xl backdrop-blur-md ${
          isDark
            ? 'bg-[#202430]/95 border-[#343B4B] text-[#F9FAFB]'
            : 'bg-white/95 border-[#E5E7EB] text-[#171923]'
        }`}
      >
        <p className="font-bold mb-2 text-[#626B7A] dark:text-[#A7AFBD]">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-extrabold">{Number(entry.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Helper to choose appropriate icon for Top Links
function renderLinkCategoryIcon(link: LinkItem) {
  if (link.thumbnail_url) {
    return (
      <img
        src={link.thumbnail_url}
        alt=""
        className="w-8 h-8 rounded-lg object-contain bg-white dark:bg-[#202430] p-0.5 border border-[#E5E7EB] dark:border-[#343B4B] shrink-0"
      />
    );
  }

  const norm = `${link.title || ''} ${link.destination_url || ''}`.toLowerCase();

  if (norm.includes('youtube') || norm.includes('video') || norm.includes('channel')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-2xs">
        <Video className="w-4 h-4 fill-current" />
      </div>
    );
  }
  if (norm.includes('note') || norm.includes('study') || norm.includes('doc')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-2xs">
        <FileText className="w-4 h-4" />
      </div>
    );
  }
  if (norm.includes('project') || norm.includes('code') || norm.includes('github') || norm.includes('dev')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-[#1F2937] text-white flex items-center justify-center shrink-0 shadow-2xs">
        <Code2 className="w-4 h-4" />
      </div>
    );
  }
  if (norm.includes('library') || norm.includes('book') || norm.includes('read')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-2xs">
        <BookOpen className="w-4 h-4" />
      </div>
    );
  }
  if (norm.includes('contact') || norm.includes('mail') || norm.includes('message')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-2xs">
        <Mail className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-2xs">
      <Globe className="w-4 h-4" />
    </div>
  );
}

export const OverviewPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [userLinks, setUserLinks] = useState<LinkItem[]>([]);
  const [chartData, setChartData] = useState<ChartBucket[]>([]);
  const [stats, setStats] = useState<OverviewStats>({
    totalViews: 0,
    totalClicks: 0,
    qrScans: 0,
    ctr: 0,
    topLinks: [],
    recentActivity: [],
  });

  const publicUrl = `${window.location.origin}/${user?.username || ''}`;
  const displayName = profile?.display_name || (profile as any)?.displayName || user?.username || 'Creator';
  const rawTheme = (profile?.theme_settings || (profile as any)?.themeSettings || {}) as Record<string, any>;

  const avatarUrl = profile?.avatar_url || (profile as any)?.avatarUrl || rawTheme.avatar_data_url || null;
  const bio = profile?.bio?.trim() || '';
  const coverUrl = rawTheme.cover_url || rawTheme.cover_data_url || null;

  // Real social links from database
  const userSocials = Array.isArray(profile?.social_links)
    ? profile.social_links.filter((s) => Boolean(s.url))
    : [];

  // Fetch initial overview and user links directly from MySQL
  useEffect(() => {
    let active = true;

    Promise.all([
      api.get<OverviewStats>('/api/analytics/overview'),
      api.get<{ links: LinkItem[] }>('/api/links'),
    ])
      .then(([ovRes, linksRes]) => {
        if (!active) return;
        setStats({
          totalViews: ovRes.totalViews || 0,
          totalClicks: ovRes.totalClicks || 0,
          qrScans: ovRes.qrScans || 0,
          ctr: ovRes.ctr || 0,
          topLinks: ovRes.topLinks || [],
          recentActivity: ovRes.recentActivity || [],
        });
        setUserLinks(linksRes.links || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Fetch real continuous daily timeline when selectedDays changes
  const fetchChartData = useCallback(async (days: number) => {
    try {
      const res = await api.get<{
        views: Array<{ date: string; views: number; clicks: number; qrScans?: number }>;
      }>(`/api/analytics/views?days=${days}`);

      if (res.views && Array.isArray(res.views)) {
        setChartData(
          res.views.map((item) => ({
            date: item.date,
            formattedDate: formatChartDate(item.date),
            views: item.views || 0,
            clicks: item.clicks || 0,
            qrScans: item.qrScans || 0,
          }))
        );
      }
    } catch {
      // Keep existing chart data if request fails
    }
  }, []);

  useEffect(() => {
    fetchChartData(selectedDays);
  }, [selectedDays, fetchChartData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    showToast('Profile URL copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQrPng = () => {
    const canvas = document.querySelector('#overview-qr-box canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${user?.username || 'linkplus'}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Profile QR code downloaded!', 'success');
    } else {
      window.open(`/api/qr/generate?format=png&size=512`, '_blank');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading dashboard overview..." />;
  }

  // Pure real MySQL metrics
  const totalLinksCount = userLinks.length;
  const activeLinksCount = userLinks.filter((l) => l.is_active).length;
  const realViews = stats.totalViews;
  const realClicks = stats.totalClicks;
  const realQrScans = stats.qrScans;

  const kpiCards = [
    {
      label: 'Profile Views',
      value: realViews.toLocaleString(),
      badgeText: realViews > 0 ? `${realViews.toLocaleString()} total views` : 'No views yet',
      icon: Eye,
      iconBg: 'bg-[#F3E8FF] dark:bg-purple-950/40 text-[#9333EA] dark:text-purple-400',
    },
    {
      label: 'Link Clicks',
      value: realClicks.toLocaleString(),
      badgeText: realClicks > 0 ? `CTR ${stats.ctr}%` : '0 clicks',
      icon: MousePointerClick,
      iconBg: 'bg-[#DBEAFE] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400',
    },
    {
      label: 'Total Links',
      value: totalLinksCount.toLocaleString(),
      badgeText: `${activeLinksCount} active`,
      icon: Link2,
      iconBg: 'bg-[#D1FAE5] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-400',
    },
    {
      label: 'QR Scans',
      value: realQrScans.toLocaleString(),
      badgeText: realQrScans > 0 ? `${realQrScans} scans` : 'Ready to scan',
      icon: QrCode,
      iconBg: 'bg-[#FCE7F3] dark:bg-pink-950/40 text-[#DB2777] dark:text-pink-400',
    },
  ];

  // Top real links sorted by click count descending
  const topRealLinks: LinkItem[] = [...userLinks]
    .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
    .slice(0, 5);

  const hasChartActivity = chartData.some((d) => d.views > 0 || d.clicks > 0);

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. TOP WELCOME BANNER WITH 3D GRAPHIC & 4 REAL KPI METRIC CARDS     */}
      {/* =================================================================== */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/40 dark:from-[#202430] dark:via-[#252B3B] dark:to-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] shadow-xs relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171923] dark:text-[#F9FAFB] flex items-center gap-2">
              <span>Welcome back, {displayName}!</span>
              <span className="text-2xl sm:text-3xl">👋</span>
            </h1>
            <p className="text-sm sm:text-base text-[#626B7A] dark:text-[#A7AFBD] mt-1.5 font-medium">
              Here&apos;s your live profile performance and link analytics.
            </p>
          </div>

          {/* 3D Glossy Isometric Graphic */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#202430]/90 backdrop-blur-md border border-indigo-100 dark:border-indigo-900/40 text-xs font-bold text-[#4F46E5] dark:text-[#818CF8] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                <span>One Link. More Possibilities.</span>
              </div>
            </div>

            {/* Glossy 3D layered shapes */}
            <div className="relative w-32 h-24 shrink-0">
              <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
                <defs>
                  <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#C7D2FE" stopOpacity="0.85" />
                  </linearGradient>
                  <linearGradient id="cubeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="cubeRight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#818CF8" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="floatingPill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                <path d="M90 20 L130 40 L130 80 L90 60 Z" fill="url(#cubeRight)" opacity="0.6" />
                <path d="M50 40 L90 20 L130 40 L90 60 Z" fill="url(#cubeTop)" opacity="0.7" />
                <path d="M50 40 L90 60 L90 100 L50 80 Z" fill="url(#cubeLeft)" opacity="0.5" />
                <path d="M80 35 L120 55 L80 75 L40 55 Z" fill="url(#cubeTop)" />
                <path d="M40 55 L80 75 L80 110 L40 90 Z" fill="url(#cubeLeft)" />
                <path d="M80 75 L120 55 L120 90 L80 110 Z" fill="url(#cubeRight)" />
                <rect x="115" y="65" width="22" height="22" rx="6" transform="rotate(25 115 65)" fill="url(#floatingPill)" opacity="0.85" />
                <path d="M35 30 Q35 38 43 38 Q35 38 35 46 Q35 38 27 38 Q35 38 35 30 Z" fill="#60A5FA" opacity="0.9" />
              </svg>
            </div>
          </div>
        </div>

        {/* 4 Compact Real Statistic Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 relative z-10">
          {kpiCards.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-start justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD]">
                    {kpi.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#171923] dark:text-[#F9FAFB] mt-2">
                    {kpi.value}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      <TrendingUp className="w-3 h-3" />
                      <span>{kpi.badgeText}</span>
                    </span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.iconBg} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. MIDDLE ROW: REAL VIEWS & CLICKS (AREA CHART) + REAL TOP LINKS    */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (68% width): Curved AreaChart */}
        <div className="lg:col-span-8">
          <Card
            title="Profile Views & Link Clicks"
            subtitle={`Daily performance for the last ${selectedDays} days`}
            action={
              <div className="flex items-center gap-3">
                {/* Legend indicators */}
                <div className="hidden sm:flex items-center gap-3 text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                    <span>Profile Views</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                    <span>Link Clicks</span>
                  </span>
                </div>

                {/* Days Selector Dropdown */}
                <div className="relative inline-block">
                  <select
                    value={selectedDays}
                    onChange={(e) => setSelectedDays(Number(e.target.value))}
                    className="appearance-none bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-1.5 pr-7 text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] cursor-pointer"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#626B7A] dark:text-[#A7AFBD] absolute right-2 top-2.5 pointer-events-none" />
                </div>
              </div>
            }
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDark ? '#343B4B' : '#E5E7EB'}
                  />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fill: isDark ? '#A7AFBD' : '#626B7A', fontSize: 11 }}
                    axisLine={{ stroke: isDark ? '#343B4B' : '#E5E7EB' }}
                    tickLine={false}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#A7AFBD' : '#626B7A', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip isDark={isDark} />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Profile Views"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#viewsGradient)"
                    activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2, fill: '#4F46E5' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    name="Link Clicks"
                    stroke="#0284C7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#clicksGradient)"
                    activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2, fill: '#0284C7' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {!hasChartActivity && (
              <div className="mt-2 text-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                No visitor activity recorded yet in this timeframe. Share your profile link to begin recording live visits and link clicks.
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (32% width): Top Links */}
        <div className="lg:col-span-4">
          <Card
            title="Top Links"
            subtitle="Most clicked links this month"
            action={
              <Link
                to="/dashboard/links"
                className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] dark:text-[#818CF8] flex items-center gap-1"
              >
                <span>See all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {topRealLinks.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] dark:bg-[#272D3A] text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center mb-3">
                  <Link2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#171923] dark:text-[#F9FAFB]">
                  No links created yet
                </h4>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-1 max-w-xs">
                  Create your first link to start tracking clicks and visitor engagement.
                </p>
                <Link
                  to="/dashboard/links"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Link</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {topRealLinks.map((link, i) => {
                  const clicks = link.click_count ?? (link as any).clickCount ?? 0;
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] hover:border-[#4F46E5]/40 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <span className="w-5 h-5 rounded-md bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-center font-bold text-[#626B7A] dark:text-[#A7AFBD] shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        {renderLinkCategoryIcon(link)}
                        <div className="truncate">
                          <p className="font-bold text-[#171923] dark:text-[#F9FAFB] truncate">
                            {link.title}
                          </p>
                          <p className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] truncate">
                            {link.destination_url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-[#4F46E5] dark:text-[#818CF8] bg-white dark:bg-[#202430] px-2 py-0.5 rounded border border-[#E5E7EB] dark:border-[#343B4B]">
                          {clicks} clicks
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. BOTTOM ROW: 3 REAL CARDS (PROFILE, QR CODE, RECENT ACTIVITY)     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Your Profile */}
        <Card
          title="Your Profile"
          subtitle="Manage your public profile"
          action={
            <a
              href={`/${user?.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] dark:text-[#818CF8] flex items-center gap-1"
            >
              <span>View Profile</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          }
        >
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#343B4B] overflow-hidden bg-white dark:bg-[#202430] shadow-xs flex flex-col">
            {/* Cover image banner */}
            <div className="w-full h-24 overflow-hidden relative bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-indigo-950 flex items-center justify-center opacity-90" />
              )}
            </div>

            {/* Profile Information & Overlapping Avatar */}
            <div className="p-4 pt-0 text-center flex-1 flex flex-col">
              <div className="-mt-10 mx-auto w-20 h-20 rounded-full border-4 border-white dark:border-[#202430] shadow-md overflow-hidden bg-white dark:bg-[#272D3A]">
                <Avatar src={avatarUrl} name={displayName} size="xl" className="w-full h-full" />
              </div>

              <div className="mt-2.5">
                <h3 className="font-extrabold text-[#171923] dark:text-[#F9FAFB] text-base">
                  {displayName}
                </h3>
                <p className="text-xs font-medium text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                  @{user?.username}
                </p>
                {bio ? (
                  <p className="text-xs text-[#424B5A] dark:text-[#C2C8D2] mt-1.5 line-clamp-2 px-2 font-medium">
                    {bio}
                  </p>
                ) : (
                  <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-1.5 italic px-2">
                    No bio added yet
                  </p>
                )}
              </div>

              {/* Social media icons or prompt to add */}
              <div className="mt-3.5 min-h-[28px] flex items-center justify-center">
                {userSocials.length > 0 ? (
                  <div className="flex items-center justify-center gap-2">
                    {userSocials.map((soc, i) => (
                      <a
                        key={i}
                        href={soc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-[#F7F8FA] dark:bg-[#171923] hover:scale-110 border border-[#E5E7EB] dark:border-[#343B4B] text-[#171923] dark:text-[#F9FAFB] transition-transform shadow-2xs"
                        title={soc.platform}
                      >
                        <div className="w-3.5 h-3.5 flex items-center justify-center">
                          {renderSocialIcon(soc.platform)}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <Link
                    to="/dashboard/profile"
                    className="text-xs text-[#4F46E5] hover:text-[#4338CA] dark:text-[#818CF8] font-semibold hover:underline"
                  >
                    + Add social links
                  </Link>
                )}
              </div>

              {/* Edit Profile CTA Button */}
              <div className="mt-4 pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B]">
                <Link
                  to="/dashboard/profile"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#F7F8FA] hover:bg-slate-100 dark:bg-[#171923] dark:hover:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] text-xs font-bold text-[#171923] dark:text-[#F9FAFB] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                  <span>Edit Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Profile QR Code */}
        <Card
          title="Profile QR Code"
          subtitle="Share your profile anywhere"
          action={
            <Link
              to="/dashboard/qr"
              className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] dark:text-[#818CF8] flex items-center gap-1"
            >
              <span>Customize</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Scannable Styled QR Canvas with center avatar */}
            <div
              id="overview-qr-box"
              className="p-3 bg-white border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl shadow-xs"
            >
              <StyledQrCanvas
                url={publicUrl}
                foregroundColor="#2563EB"
                backgroundColor="#FFFFFF"
                dotStyle="rounded"
                cornerStyle="rounded"
                size={160}
                logoUrl={avatarUrl}
                logoSizeRatio={0.22}
              />
            </div>

            {/* Profile URL Display & Copy */}
            <div className="w-full flex items-center gap-2 bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3 py-2 text-xs">
              <span className="flex-1 truncate font-mono text-[#424B5A] dark:text-[#C2C8D2] text-left">
                {publicUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-lg text-[#626B7A] hover:text-[#171923] dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB] hover:bg-slate-200 dark:hover:bg-[#272D3A] transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-[#15803D]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Download PNG Button */}
            <button
              type="button"
              onClick={handleDownloadQrPng}
              className="w-full py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>
          </div>
        </Card>

        {/* Card 3: Recent Activity */}
        <Card
          title="Recent Activity"
          subtitle="Latest visitors and link clicks"
          action={
            <Link
              to="/dashboard/analytics"
              className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] dark:text-[#818CF8] flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {stats.recentActivity.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] dark:bg-[#272D3A] text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center mb-3">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#171923] dark:text-[#F9FAFB]">
                No activity recorded yet
              </h4>
              <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-1 max-w-xs">
                Real views and link clicks will appear here live once visitors open your profile.
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-slate-100 dark:bg-[#171923] dark:hover:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Share2 className="w-3.5 h-3.5 text-[#4F46E5]" />}
                <span>{copied ? 'Copied URL!' : 'Share Profile URL'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((evt) => {
                const isView = evt.eventType === 'profile_view';
                const isScan = evt.eventType === 'qr_scan';

                return (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] text-xs hover:border-[#4F46E5]/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isView
                            ? 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/40 dark:text-[#818CF8]'
                            : isScan
                            ? 'bg-[#FCE7F3] text-[#DB2777] dark:bg-pink-950/40 dark:text-pink-400'
                            : 'bg-[#EF4444] text-white'
                        }`}
                      >
                        {isView ? (
                          <Eye className="w-4 h-4" />
                        ) : isScan ? (
                          <QrCode className="w-4 h-4" />
                        ) : (
                          <Video className="w-4 h-4 fill-current" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-[#171923] dark:text-[#F9FAFB] truncate">
                          {isView
                            ? 'Profile viewed'
                            : isScan
                            ? 'QR Code scanned'
                            : evt.linkTitle || 'Link clicked'}
                        </p>
                        <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] truncate">
                          {isView
                            ? evt.referrerCategory || 'Direct visit'
                            : `Clicked from ${evt.deviceCategory || 'mobile'}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#626B7A] dark:text-[#A7AFBD] shrink-0">
                      {formatRelativeTime(evt.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OverviewPage;