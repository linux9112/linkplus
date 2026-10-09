import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Eye,
  MousePointerClick,
  TrendingUp,
  QrCode,
  ShieldCheck,
  Smartphone,
  Globe,
} from 'lucide-react';
import { api } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import type { Link as LinkItem } from '../../types/index';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CHART_COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#10B981', '#F59E0B', '#EC4899'];

export const AnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState({
    totalViews: 0,
    totalClicks: 0,
    qrScans: 0,
    ctr: 0,
  });
  const [timeSeries, setTimeSeries] = useState<
    Array<{ date: string; views: number; clicks: number; qrScans: number }>
  >([]);
  const [topLinks, setTopLinks] = useState<LinkItem[]>([]);
  const [referrers, setReferrers] = useState<Array<{ category: string; count: number }>>([]);
  const [devices, setDevices] = useState<Array<{ category: string; count: number }>>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      api.get('/api/analytics/overview', { params: { days } }),
      api.get('/api/analytics/views', { params: { days } }),
      api.get('/api/analytics/top-links'),
      api.get('/api/analytics/referrers'),
      api.get('/api/analytics/devices'),
    ])
      .then(([ovRes, viewsRes, topRes, refRes, devRes]) => {
        if (!active) return;
        setOverview({
          totalViews: ovRes.totalViews || 0,
          totalClicks: ovRes.totalClicks || 0,
          qrScans: ovRes.qrScans || 0,
          ctr: ovRes.ctr || 0,
        });
        setTimeSeries(viewsRes.views || []);
        setTopLinks(topRes.topLinks || []);
        setReferrers(refRes.referrers || []);
        setDevices(devRes.devices || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [days]);

  if (loading) {
    return <LoadingSpinner label="Aggregating MySQL analytics events..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB] flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#4F46E5] dark:text-[#6366F1]" />
            <span>Audience Analytics</span>
          </h1>
          <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#15803D]" />
            <span>Privacy-conscious MySQL tracking • Bot-filtered • Zero raw IP storage</span>
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#EEF2FF] dark:bg-[#171923] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B]">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                days === d
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
              }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Profile Views', value: overview.totalViews.toLocaleString(), icon: Eye, color: 'text-[#4F46E5] dark:text-[#818CF8]', bg: 'bg-[#EEF2FF] dark:bg-[#4F46E5]/10' },
          { label: 'Link Clicks', value: overview.totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-[#15803D]', bg: 'bg-[#DCFCE7] dark:bg-[#15803D]/10' },
          { label: 'Click-Through Rate', value: `${overview.ctr}%`, icon: TrendingUp, color: 'text-[#4F46E5] dark:text-[#818CF8]', bg: 'bg-[#EEF2FF] dark:bg-[#4F46E5]/10' },
          { label: 'QR Campaign Scans', value: overview.qrScans.toLocaleString(), icon: QrCode, color: 'text-[#B45309]', bg: 'bg-[#FEF3C7] dark:bg-[#B45309]/10' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD]">
                  {item.label}
                </span>
                <div className={`p-2 rounded-xl ${item.bg}`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#171923] dark:text-[#F9FAFB] mt-2 tracking-tight">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Views & Clicks Over Time Chart */}
      <Card
        title="Profile Views & Link Clicks Over Time"
        subtitle={`Daily activity trend across the last ${days} days`}
      >
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#343B4B' : '#E5E7EB'} />
              <XAxis
                dataKey="date"
                stroke={isDark ? '#A7AFBD' : '#626B7A'}
                tick={{ fontSize: 11, fill: isDark ? '#A7AFBD' : '#626B7A' }}
                tickFormatter={(v) => String(v).slice(5)}
              />
              <YAxis stroke={isDark ? '#A7AFBD' : '#626B7A'} tick={{ fontSize: 11, fill: isDark ? '#A7AFBD' : '#626B7A' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#202430' : '#FFFFFF',
                  borderColor: isDark ? '#343B4B' : '#E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  color: isDark ? '#F9FAFB' : '#171923',
                }}
                itemStyle={{ color: isDark ? '#F9FAFB' : '#171923' }}
                labelStyle={{ color: isDark ? '#A7AFBD' : '#626B7A', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area
                type="monotone"
                dataKey="views"
                name="Profile Views"
                stroke="#4F46E5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
              />
              <Area
                type="monotone"
                dataKey="clicks"
                name="Link Clicks"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorClicks)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Referrers & Devices Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Referrer Categories" subtitle="Where your visitors originate">
          {referrers.length === 0 ? (
            <EmptyState
              icon={<Globe className="w-6 h-6" />}
              title="No referrer data yet"
              description="Referrer categories (Direct, Social, Search, QR Campaign, Email) appear once visitors view your profile."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={referrers}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ category, count }) => `${category} (${count})`}
                  >
                    {referrers.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#202430' : '#FFFFFF',
                      borderColor: isDark ? '#343B4B' : '#E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      color: isDark ? '#F9FAFB' : '#171923',
                    }}
                    itemStyle={{ color: isDark ? '#F9FAFB' : '#171923' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Device Breakdown" subtitle="Desktop, Mobile, and Tablet distribution">
          {devices.length === 0 ? (
            <EmptyState
              icon={<Smartphone className="w-6 h-6" />}
              title="No device metrics yet"
              description="Device categories are detected automatically from visitor requests."
            />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={devices}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#343B4B' : '#E5E7EB'} />
                  <XAxis dataKey="category" stroke={isDark ? '#A7AFBD' : '#626B7A'} tick={{ fontSize: 12, fill: isDark ? '#A7AFBD' : '#626B7A' }} />
                  <YAxis stroke={isDark ? '#A7AFBD' : '#626B7A'} tick={{ fontSize: 12, fill: isDark ? '#A7AFBD' : '#626B7A' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#202430' : '#FFFFFF',
                      borderColor: isDark ? '#343B4B' : '#E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      color: isDark ? '#F9FAFB' : '#171923',
                    }}
                    itemStyle={{ color: isDark ? '#F9FAFB' : '#171923' }}
                    labelStyle={{ color: isDark ? '#A7AFBD' : '#626B7A', fontWeight: 600 }}
                  />
                  <Bar dataKey="count" name="Events" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Individual Link Performance Table */}
      <Card title="Individual Link Performance" subtitle="Click counts and destination breakdown">
        {topLinks.length === 0 ? (
          <EmptyState
            icon={<MousePointerClick className="w-6 h-6" />}
            title="No links to analyze"
            description="Create links in the Links Manager to measure individual click performance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#343B4B] text-xs font-semibold uppercase text-[#626B7A] dark:text-[#A7AFBD]">
                  <th className="py-3 px-4">Link Title</th>
                  <th className="py-3 px-4">Destination URL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#343B4B]">
                {topLinks.map((l) => {
                  const clicks = l.click_count ?? (l as any).clickCount ?? 0;
                  const dest = l.destination_url ?? (l as any).destinationUrl;
                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-[#F7F8FA] dark:hover:bg-[#272D3A] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#171923] dark:text-[#F9FAFB]">
                        {l.title}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#626B7A] dark:text-[#A7AFBD] truncate max-w-xs font-mono">
                        {dest}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            l.is_active && !l.is_hidden
                              ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#15803D]/20 dark:text-[#86EFAC]'
                              : 'bg-gray-100 text-[#626B7A] dark:bg-[#272D3A] dark:text-[#A7AFBD]'
                          }`}
                        >
                          {l.is_active && !l.is_hidden ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#4F46E5] dark:text-[#818CF8]">
                        {clicks.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AnalyticsPage;