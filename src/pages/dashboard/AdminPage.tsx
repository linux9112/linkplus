import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Link2,
  Flag,
  FileText,
  Settings,
  Search,
  Ban,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { api } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

export const AdminPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'links' | 'audit' | 'settings'>('users');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfiles: 0,
    totalLinks: 0,
    totalEvents: 0,
    pendingReports: 0,
    suspendedUsers: 0,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [allLinks, setAllLinks] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState({
    allow_registrations: true,
    maintenance_mode: false,
    default_theme: 'default',
  });

  const fetchAdminData = async () => {
    try {
      const [ovRes, usersRes, repRes, linksRes, auditRes, setRes] = await Promise.all([
        api.get('/api/admin/overview'),
        api.get('/api/admin/users', { params: userSearch ? { q: userSearch } : undefined }),
        api.get('/api/admin/reports'),
        api.get('/api/admin/links'),
        api.get('/api/admin/audit-logs'),
        api.get('/api/admin/platform-settings'),
      ]);

      if (ovRes.stats) setStats(ovRes.stats);
      setUsers(usersRes.users || []);
      setReports(repRes.reports || []);
      setAllLinks(linksRes.links || []);
      setAuditLogs(auditRes.logs || auditRes.audit_logs || []);
      if (setRes.settings) {
        setPlatformSettings((prev) => ({ ...prev, ...setRes.settings }));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [userSearch]);

  const handleSuspendUser = async (userId: string, username: string) => {
    try {
      await api.post(`/api/admin/users/${userId}/suspend`, {
        reason: 'Suspended by administrator via Admin Panel',
      });
      showToast(`Suspended @${username} and revoked active sessions.`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Could not suspend user', 'error');
    }
  };

  const handleReactivateUser = async (userId: string, username: string) => {
    try {
      await api.post(`/api/admin/users/${userId}/reactivate`);
      showToast(`Reactivated @${username}`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Could not reactivate user', 'error');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.delete(`/api/admin/links/${linkId}`);
      showToast('Malicious/abusive link removed and logged.', 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete link', 'error');
    }
  };

  const handleResolveReport = async (
    reportId: string,
    opts: { removeLink?: boolean; suspendUser?: boolean; status?: string }
  ) => {
    try {
      await api.put(`/api/admin/reports/${reportId}`, {
        status: opts.status || 'resolved',
        removeLink: opts.removeLink,
        suspendUser: opts.suspendUser,
        resolutionNotes: 'Processed via Admin Dashboard',
      });
      showToast('Moderation report resolved!', 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve report', 'error');
    }
  };

  const handleSavePlatformSettings = async () => {
    try {
      await api.put('/api/admin/platform-settings', platformSettings);
      showToast('Platform settings saved!', 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save platform settings', 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading Admin Dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB] flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-[#4F46E5] dark:text-[#6366F1]" />
            <span>Platform Administration & Moderation</span>
          </h1>
          <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
            Protected admin console • All operations logged to{' '}
            <code className="text-[#4F46E5] dark:text-[#818CF8] bg-[#EEF2FF] dark:bg-[#4F46E5]/10 px-1.5 py-0.5 rounded font-mono text-xs">
              admin_audit_logs
            </code>
          </p>
        </div>
      </div>

      {/* Platform KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-[#4F46E5]' },
          { label: 'Public Profiles', value: stats.totalProfiles, icon: CheckCircle2, color: 'text-[#15803D]' },
          { label: 'Total Links', value: stats.totalLinks, icon: Link2, color: 'text-[#4F46E5]' },
          { label: 'Analytics Events', value: stats.totalEvents, icon: Activity, color: 'text-[#4F46E5]' },
          { label: 'Pending Reports', value: stats.pendingReports, icon: Flag, color: 'text-[#B45309]' },
          { label: 'Suspended Users', value: stats.suspendedUsers, icon: Ban, color: 'text-[#B91C1C]' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-[#626B7A] dark:text-[#A7AFBD] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">{item.label}</span>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <p className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB] tracking-tight">
                {item.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E5E7EB] dark:border-[#343B4B] pb-3">
        {[
          { id: 'users', label: 'Users & Accounts', icon: Users },
          { id: 'reports', label: `Moderation Reports (${stats.pendingReports})`, icon: Flag },
          { id: 'links', label: 'Link Moderation', icon: Link2 },
          { id: 'audit', label: 'Audit Log', icon: FileText },
          { id: 'settings', label: 'Platform Settings', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                activeTab === t.id
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'bg-white dark:bg-[#202430] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white border border-[#E5E7EB] dark:border-[#343B4B]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Users & Accounts */}
      {activeTab === 'users' && (
        <Card
          title="Registered Users"
          subtitle="Search by username or email, view status, and suspend or reactivate accounts"
        >
          <div className="mb-4 max-w-md">
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by username or email..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#343B4B] text-xs font-semibold uppercase text-[#626B7A] dark:text-[#A7AFBD]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#343B4B]">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-[#F7F8FA] dark:hover:bg-[#272D3A] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#171923] dark:text-[#F9FAFB]">@{u.username}</div>
                      <a
                        href={`/${u.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#4F46E5] dark:text-[#818CF8] hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-[#626B7A] dark:text-[#A7AFBD] text-xs font-mono">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#4F46E5]/20 dark:text-[#818CF8]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.status === 'active'
                            ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#15803D]/20 dark:text-[#86EFAC]'
                            : 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#B91C1C]/20 dark:text-[#FCA5A5]'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.role !== 'admin' && (
                        <>
                          {u.status === 'active' ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleSuspendUser(u.id, u.username)}
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleReactivateUser(u.id, u.username)}
                            >
                              Reactivate
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Moderation Reports */}
      {activeTab === 'reports' && (
        <Card title="Reported Profiles & Links" subtitle="Review visitor moderation reports">
          {reports.length === 0 ? (
            <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] py-8 text-center">
              No moderation reports submitted.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'pending'
                            ? 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#FCD34D]'
                            : 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#15803D]/20 dark:text-[#86EFAC]'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-sm font-bold text-[#171923] dark:text-[#F9FAFB]">{r.reason}</span>
                    </div>
                    <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-1">
                      Reported User: <strong className="text-[#171923] dark:text-white">@{r.reportedUser?.username}</strong>
                      {r.reportedLink && ` • Link: "${r.reportedLink.title}"`}
                    </p>
                    {r.details && (
                      <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-1 bg-white dark:bg-[#202430] p-2 rounded-lg border border-[#E5E7EB] dark:border-[#343B4B]">
                        {r.details}
                      </p>
                    )}
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResolveReport(r.id, { status: 'dismissed' })}
                      >
                        Dismiss
                      </Button>
                      {r.reportedLinkId && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleResolveReport(r.id, { removeLink: true })}
                        >
                          Delete Link & Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleResolveReport(r.id, { suspendUser: true })}
                      >
                        Suspend User
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Link Moderation */}
      {activeTab === 'links' && (
        <Card title="Platform Links Moderation" subtitle="Inspect and remove abusive or malicious links">
          <div className="space-y-2.5">
            {allLinks.map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#171923] dark:text-[#F9FAFB] truncate">
                    {l.title}{' '}
                    <span className="text-xs font-normal text-[#4F46E5] dark:text-[#818CF8]">
                      (@{l.user?.username})
                    </span>
                  </p>
                  <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] truncate font-mono mt-0.5">{l.destinationUrl}</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteLink(l.id)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Remove Link
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Audit Log */}
      {activeTab === 'audit' && (
        <Card title="Admin Moderation Audit Log" subtitle="Immutable trail of administrative actions">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] py-8 text-center">
              No administrative actions logged yet.
            </p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#F7F8FA] dark:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-[#4F46E5] dark:text-[#818CF8] uppercase">
                      {log.action}
                    </span>
                    <span className="text-[#626B7A] dark:text-[#A7AFBD] ml-2">
                      Target: {log.target_type} ({log.target_id})
                    </span>
                  </div>
                  <span className="text-[#626B7A] dark:text-[#A7AFBD]">
                    {new Date(log.created_at || log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: Platform Settings */}
      {activeTab === 'settings' && (
        <Card title="Configurable Platform Settings" subtitle="Stored in MySQL platform_settings table">
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-[#171923] dark:text-[#F9FAFB]">Allow New User Registrations</p>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">Enable public 3-field account signup</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(platformSettings.allow_registrations)}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    allow_registrations: e.target.checked,
                  })
                }
                className="rounded border-[#E5E7EB] dark:border-[#343B4B] text-[#4F46E5] focus:ring-[#EEF2FF] dark:focus:ring-[#272D3A] w-5 h-5 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-[#171923] dark:text-[#F9FAFB]">Maintenance Mode</p>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">Display maintenance notice on public routes</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(platformSettings.maintenance_mode)}
                onChange={(e) =>
                  setPlatformSettings({
                    ...platformSettings,
                    maintenance_mode: e.target.checked,
                  })
                }
                className="rounded border-[#E5E7EB] dark:border-[#343B4B] text-[#4F46E5] focus:ring-[#EEF2FF] dark:focus:ring-[#272D3A] w-5 h-5 cursor-pointer"
              />
            </label>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePlatformSettings}>Save Platform Settings</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminPage;