import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  MousePointerClick,
  QrCode,
  TrendingUp,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Link2,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StyledQrCanvas from '../../components/qr/StyledQrCanvas';
import { useToast } from '../../components/ui/Toast';

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

export const OverviewPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<OverviewStats>({
    totalViews: 0,
    totalClicks: 0,
    qrScans: 0,
    ctr: 0,
    topLinks: [],
    recentActivity: [],
  });
  const [chartData, setChartData] = useState<Array<{ date: string; views: number; clicks: number }>>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<OverviewStats>('/api/analytics/overview'),
      api.get<{ views: Array<{ date: string; views: number; clicks: number }> }>('/api/analytics/views?days=14'),
    ])
      .then(([ovRes, viewsRes]) => {
        if (!active) return;
        setStats({
          totalViews: ovRes.totalViews || 0,
          totalClicks: ovRes.totalClicks || 0,
          qrScans: ovRes.qrScans || 0,
          ctr: ovRes.ctr || 0,
          topLinks: ovRes.topLinks || [],
          recentActivity: ovRes.recentActivity || [],
        });
        if (viewsRes.views) {
          setChartData(
            viewsRes.views.map((item) => ({
              date: item.date.slice(5),
              views: item.views || 0,
              clicks: item.clicks || 0,
            }))
          );
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

  const publicUrl = `${window.location.origin}/${user?.username || ''}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    showToast('Profile URL copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return <LoadingSpinner label="Loading dashboard overview..." />;
  }

  const kpiCards = [
    {
      label: 'Profile Views',
      value: stats.totalViews.toLocaleString(),
      badge: '+12%',
      icon: Eye,
      iconBg: 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1]',
    },
    {
      label: 'Link Clicks',
      value: stats.totalClicks.toLocaleString(),
      badge: '+18%',
      icon: MousePointerClick,
      iconBg: 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1]',
    },
    {
      label: 'Total Links',
      value: stats.topLinks.length.toLocaleString(),
      badge: `CTR ${stats.ctr}%`,
      icon: Link2,
      iconBg: 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1]',
    },
    {
      label: 'QR Scans',
      value: stats.qrScans.toLocaleString(),
      badge: 'Active',
      icon: QrCode,
      iconBg: 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171923] dark:text-[#F9FAFB]">
            Overview
          </h1>
          <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
            Welcome back, {profile?.display_name || user?.username}! Here&apos;s your profile performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4 text-[#15803D]" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied' : 'Copy Link'}
          </Button>
          <a
            href={`/${user?.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <span>View Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            to="/dashboard/links"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#202430] hover:bg-slate-50 border border-[#E5E7EB] dark:border-[#343B4B] text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-5 shadow-card flex items-start justify-between"
            >
              <div>
                <p className="text-xs font-medium text-[#626B7A] dark:text-[#A7AFBD]">
                  {kpi.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-[#171923] dark:text-[#F9FAFB] mt-2">
                  {kpi.value}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center text-[11px] font-semibold text-[#15803D] bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                    {kpi.badge}
                  </span>
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${kpi.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Top Links Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Views & Clicks Bar Chart */}
        <div className="lg:col-span-8">
          <Card
            title="Views & Clicks"
            subtitle="Daily profile views and link clicks"
            action={
              <Link
                to="/dashboard/analytics"
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1"
              >
                <span>Full Analytics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#626B7A]">
                No views recorded yet
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#343B4B' : '#E5E7EB'} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: isDark ? '#A7AFBD' : '#626B7A', fontSize: 11 }}
                      axisLine={{ stroke: isDark ? '#343B4B' : '#E5E7EB' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: isDark ? '#A7AFBD' : '#626B7A', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#202430' : '#FFFFFF',
                        border: isDark ? '1px solid #343B4B' : '1px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        color: isDark ? '#F9FAFB' : '#171923',
                      }}
                      itemStyle={{ color: isDark ? '#F9FAFB' : '#171923' }}
                      labelStyle={{ color: isDark ? '#A7AFBD' : '#626B7A', fontWeight: 600 }}
                    />
                    <Bar dataKey="views" name="Profile Views" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" name="Link Clicks" fill="#818CF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Top Links Card */}
        <div className="lg:col-span-4">
          <Card
            title="Top Links"
            subtitle="Most clicked destinations"
            action={
              <Link
                to="/dashboard/links"
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
              >
                See all
              </Link>
            }
          >
            {stats.topLinks.length === 0 ? (
              <EmptyState
                icon={<Link2 className="w-5 h-5" />}
                title="No links created yet"
                description="Add your first destination link to track performance."
                action={
                  <Link
                    to="/dashboard/links"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {stats.topLinks.slice(0, 5).map((link, i) => {
                  const clicks = link.click_count ?? (link as any).clickCount ?? 0;
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <span className="w-5 h-5 rounded-full bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-center font-bold text-[#626B7A] dark:text-[#A7AFBD] shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-[#171923] dark:text-[#F9FAFB] truncate">{link.title}</p>
                          <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] truncate">{link.destination_url || (link as any).destinationUrl}</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#4F46E5] dark:text-[#6366F1] shrink-0 bg-white dark:bg-[#202430] px-2 py-0.5 rounded border border-[#E5E7EB] dark:border-[#343B4B]">
                        {clicks} clicks
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* QR Code Shortcut Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <Card
            title="Profile QR Code"
            subtitle="Scannable Level-H QR code for flyers, business cards, and social headers"
            action={
              <Link
                to="/dashboard/qr"
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
              >
                Customize Studio →
              </Link>
            }
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm shrink-0">
                <StyledQrCanvas
                  url={publicUrl}
                  foregroundColor="#4F46E5"
                  backgroundColor="#FFFFFF"
                  dotStyle="rounded"
                  cornerStyle="rounded"
                  size={140}
                />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <h4 className="text-sm font-semibold text-[#171923] dark:text-[#F9FAFB]">
                  Ready to print & share
                </h4>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] leading-relaxed">
                  Visitors scanning this QR code will instantly open your public profile at <code className="font-mono text-[#4F46E5]">/{user?.username}</code>.
                </p>
                <div className="pt-1">
                  <Link
                    to="/dashboard/qr"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Download PNG / SVG</span>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Links Shortcut Card */}
        <div className="lg:col-span-6">
          <Card
            title="Recent Activity Stream"
            subtitle="Real-time visitor views and tracked link clicks"
            action={
              <Link
                to="/dashboard/analytics"
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
              >
                View Log →
              </Link>
            }
          >
            {stats.recentActivity.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-5 h-5" />}
                title="No visitor events yet"
                description="Share your link to see live views and clicks here."
              />
            ) : (
              <div className="space-y-2.5">
                {stats.recentActivity.slice(0, 4).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          evt.eventType === 'link_click' ? 'bg-[#15803D]' : 'bg-[#4F46E5]'
                        }`}
                      />
                      <span className="font-medium text-[#171923] dark:text-[#F9FAFB] truncate">
                        {evt.eventType === 'link_click'
                          ? `Clicked "${evt.linkTitle || 'Link'}"`
                          : 'Viewed Profile'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#626B7A] capitalize shrink-0">
                      {evt.deviceCategory || 'mobile'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;