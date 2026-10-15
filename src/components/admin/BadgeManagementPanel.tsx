import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Search,
  Plus,
  RotateCcw,
  AlertTriangle,
  X,
  Check,
  Edit3,
  Trash2,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Info,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { renderBadgeIcon } from '../profile/PublicProfileRenderer';
import type { BadgeType, UserBadge } from '../../types/index';

const AVAILABLE_ICONS = [
  { id: 'CheckCircle2', label: 'Check Circle (Verified)' },
  { id: 'ShieldCheck', label: 'Shield Check (Trusted)' },
  { id: 'Sparkles', label: 'Sparkles (Creator)' },
  { id: 'Flame', label: 'Flame (Featured)' },
  { id: 'Heart', label: 'Heart (Supporter)' },
  { id: 'Award', label: 'Award Trophy (Top)' },
  { id: 'Handshake', label: 'Handshake (Partner)' },
  { id: 'Star', label: 'Star (Highlight)' },
];

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#059669', // Emerald Green
  '#7C3AED', // Purple
  '#D97706', // Amber / Orange
  '#E11D48', // Rose / Red
  '#CA8A04', // Yellow / Gold
  '#4F46E5', // Indigo
  '#0D9488', // Teal
  '#0284C7', // Sky Blue
  '#475569', // Slate
];

interface UserWithBadges {
  id: string;
  username: string;
  email: string;
  status: string;
  profile?: {
    display_name?: string;
    displayName?: string;
    avatar_url?: string | null;
    avatarUrl?: string | null;
  } | null;
  badges: Array<UserBadge & {
    badge_type: BadgeType;
    awarded_by_username?: string;
  }>;
}

export const BadgeManagementPanel: React.FC = () => {
  const { showToast } = useToast();

  // Subtabs within Badge Management
  const [subTab, setSubTab] = useState<'users' | 'config' | 'history'>('users');

  // Overview KPIs
  const [stats, setStats] = useState({
    total_badges: 0,
    total_awarded: 0,
    total_verified: 0,
    total_trusted: 0,
    active_assignments: 0,
    revoked_assignments: 0,
    expired_assignments: 0,
  });
  const [recentAwards, setRecentAwards] = useState<any[]>([]);

  // Badge Types List
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loadingBadgeTypes, setLoadingBadgeTypes] = useState(false);

  // User Badge Search & Filter
  const [users, setUsers] = useState<UserWithBadges[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [filterBadgeType, setFilterBadgeType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modals state: Award Badge
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [awardTargetUser, setAwardTargetUser] = useState<UserWithBadges | null>(null);
  const [selectedBadgeTypeIds, setSelectedBadgeTypeIds] = useState<string[]>([]);
  const [awardExpiryDate, setAwardExpiryDate] = useState('');
  const [awardInternalNote, setAwardInternalNote] = useState('');
  const [awarding, setAwarding] = useState(false);

  // Modals state: Revoke Badge
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTargetBadge, setRevokeTargetBadge] = useState<{
    userBadgeId: string;
    username: string;
    badgeName: string;
  } | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Modals state: Edit User Badge
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetBadge, setEditTargetBadge] = useState<{
    id: string;
    username: string;
    badgeName: string;
    expiresAt: string;
    internalNote: string;
  } | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editInternalNote, setEditInternalNote] = useState('');
  const [updatingBadge, setUpdatingBadge] = useState(false);

  // Modals state: Configure Badge Type (Create / Edit)
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<BadgeType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    public_label: '',
    description: '',
    icon: 'CheckCircle2',
    color: '#2563EB',
    is_active: true,
  });
  const [savingType, setSavingType] = useState(false);

  // Audit History state
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get<{ stats: any; recent_awards?: any[]; recentlyAwarded?: any[] }>('/api/admin/badges/overview');
      if (res.stats) {
        setStats({
          total_badges: res.stats.total_badges ?? res.stats.totalBadgesAwarded ?? 0,
          total_awarded: res.stats.total_awarded ?? res.stats.totalBadgesAwarded ?? 0,
          total_verified: res.stats.total_verified ?? res.stats.totalVerifiedUsers ?? 0,
          total_trusted: res.stats.total_trusted ?? res.stats.totalTrustedUsers ?? 0,
          active_assignments: res.stats.active_assignments ?? res.stats.totalBadgesAwarded ?? 0,
          revoked_assignments: res.stats.revoked_assignments ?? 0,
          expired_assignments: res.stats.expired_assignments ?? 0,
        });
      }
      if (res.recent_awards || res.recentlyAwarded) {
        setRecentAwards(res.recent_awards || res.recentlyAwarded || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch badge overview', 'error');
    }
  }, [showToast]);

  const fetchBadgeTypes = useCallback(async () => {
    try {
      setLoadingBadgeTypes(true);
      const res = await api.get<{ badge_types: BadgeType[] }>('/api/admin/badges/types');
      setBadgeTypes(res.badge_types || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch badge types', 'error');
    } finally {
      setLoadingBadgeTypes(false);
    }
  }, [showToast]);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoadingUsers(true);
      const res = await api.get<{
        users: UserWithBadges[];
        total: number;
        page: number;
        totalPages: number;
      }>('/api/admin/badges/users', {
        params: {
          q: userQuery || undefined,
          badge_type_id: filterBadgeType !== 'all' ? filterBadgeType : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          page,
          limit: 10,
        },
      });
      setUsers(res.users || []);
      setTotalUsers(res.total || 0);
      setCurrentPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch users list', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [userQuery, filterBadgeType, filterStatus, showToast]);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setLoadingHistory(true);
      const res = await api.get<{
        history: any[];
        total: number;
        page: number;
        totalPages: number;
      }>('/api/admin/badges/history', {
        params: {
          q: historyQuery || undefined,
          page,
          limit: 15,
        },
      });
      setHistory(res.history || []);
      setHistoryTotal(res.total || 0);
      setHistoryPage(res.page || 1);
      setHistoryTotalPages(res.totalPages || 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to load badge audit history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [historyQuery, showToast]);

  useEffect(() => {
    fetchOverview();
    fetchBadgeTypes();
  }, [fetchOverview, fetchBadgeTypes]);

  useEffect(() => {
    if (subTab === 'users') {
      fetchUsers(1);
    } else if (subTab === 'config') {
      fetchBadgeTypes();
    } else if (subTab === 'history') {
      fetchHistory(1);
    }
  }, [subTab, fetchUsers, fetchBadgeTypes, fetchHistory]);

  // Handle Search Trigger with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (subTab === 'users') fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [userQuery, filterBadgeType, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (subTab === 'history') fetchHistory(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [historyQuery]);

  // --------------------------------------------------------------------------
  // Award Badge Handlers
  // --------------------------------------------------------------------------

  const openAwardModal = (user: UserWithBadges) => {
    setAwardTargetUser(user);
    setSelectedBadgeTypeIds([]);
    setAwardExpiryDate('');
    setAwardInternalNote('');
    setAwardModalOpen(true);
  };

  const handleToggleBadgeTypeSelection = (typeId: string) => {
    setSelectedBadgeTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const handleAwardBadges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardTargetUser) return;
    if (selectedBadgeTypeIds.length === 0) {
      showToast('Please select at least one badge type to award.', 'error');
      return;
    }

    setAwarding(true);
    try {
      const res = await api.post<{ message: string; results?: any[] }>('/api/admin/badges/award', {
        user_id: awardTargetUser.id,
        badge_type_ids: selectedBadgeTypeIds,
        expires_at: awardExpiryDate ? new Date(awardExpiryDate).toISOString() : null,
        internal_note: awardInternalNote.trim() || null,
      });

      showToast(res.message || `Badge awarded to @${awardTargetUser.username}!`, 'success');
      setAwardModalOpen(false);
      fetchUsers(currentPage);
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to award badge.', 'error');
    } finally {
      setAwarding(false);
    }
  };

  // --------------------------------------------------------------------------
  // Revoke Badge Handlers
  // --------------------------------------------------------------------------

  const openRevokeModal = (userBadgeId: string, username: string, badgeName: string) => {
    setRevokeTargetBadge({ userBadgeId, username, badgeName });
    setRevokeReason('');
    setRevokeModalOpen(true);
  };

  const handleRevokeBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeTargetBadge) return;

    setRevoking(true);
    try {
      await api.post('/api/admin/badges/revoke', {
        user_badge_id: revokeTargetBadge.userBadgeId,
        reason: revokeReason.trim() || 'Revoked by administrator',
      });

      showToast(`Revoked ${revokeTargetBadge.badgeName} from @${revokeTargetBadge.username}`, 'success');
      setRevokeModalOpen(false);
      fetchUsers(currentPage);
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke badge.', 'error');
    } finally {
      setRevoking(false);
    }
  };

  // --------------------------------------------------------------------------
  // Restore Expired / Revoked Badge Handlers
  // --------------------------------------------------------------------------

  const handleRestoreBadge = async (userBadgeId: string, username: string, badgeName: string) => {
    if (!window.confirm(`Restore active status for ${badgeName} on @${username}?`)) return;

    try {
      await api.post('/api/admin/badges/restore', {
        user_badge_id: userBadgeId,
      });
      showToast(`Restored active badge ${badgeName} for @${username}!`, 'success');
      fetchUsers(currentPage);
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore badge.', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // Edit User Badge Note & Expiry Handlers
  // --------------------------------------------------------------------------

  const openEditModal = (badge: any, username: string) => {
    setEditTargetBadge({
      id: badge.id,
      username,
      badgeName: badge.badge_type?.name || badge.badge_type?.public_label || 'Badge',
      expiresAt: badge.expires_at || badge.expiresAt || '',
      internalNote: badge.internal_note || badge.internalNote || '',
    });
    setEditExpiryDate(
      badge.expires_at || badge.expiresAt
        ? new Date(badge.expires_at || badge.expiresAt).toISOString().split('T')[0]
        : ''
    );
    setEditInternalNote(badge.internal_note || badge.internalNote || '');
    setEditModalOpen(true);
  };

  const handleUpdateUserBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetBadge) return;

    setUpdatingBadge(true);
    try {
      await api.put(`/api/admin/badges/${editTargetBadge.id}`, {
        expires_at: editExpiryDate ? new Date(editExpiryDate).toISOString() : null,
        internal_note: editInternalNote.trim() || null,
      });

      showToast(`Updated badge assignment for @${editTargetBadge.username}`, 'success');
      setEditModalOpen(false);
      fetchUsers(currentPage);
    } catch (err: any) {
      showToast(err.message || 'Failed to update badge assignment.', 'error');
    } finally {
      setUpdatingBadge(false);
    }
  };

  // --------------------------------------------------------------------------
  // Badge Type Configuration Handlers (Requirement 7)
  // --------------------------------------------------------------------------

  const openCreateTypeModal = () => {
    setEditingType(null);
    setTypeForm({
      name: '',
      public_label: '',
      description: '',
      icon: 'CheckCircle2',
      color: '#2563EB',
      is_active: true,
    });
    setConfigModalOpen(true);
  };

  const openEditTypeModal = (type: BadgeType) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      public_label: type.public_label || (type as any).publicLabel || type.name,
      description: type.description,
      icon: type.icon,
      color: type.color,
      is_active: type.is_active ?? (type as any).isActive ?? true,
    });
    setConfigModalOpen(true);
  };

  const handleSaveBadgeType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name.trim() || !typeForm.public_label.trim() || !typeForm.description.trim()) {
      showToast('Name, public label, and description are required.', 'error');
      return;
    }

    setSavingType(true);
    try {
      if (editingType) {
        await api.put(`/api/admin/badges/types/${editingType.id}`, typeForm);
        showToast(`Badge type "${typeForm.name}" updated successfully!`, 'success');
      } else {
        await api.post('/api/admin/badges/types', typeForm);
        showToast(`New badge type "${typeForm.name}" created!`, 'success');
      }
      setConfigModalOpen(false);
      fetchBadgeTypes();
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save badge type.', 'error');
    } finally {
      setSavingType(false);
    }
  };

  const handleToggleBadgeTypeActive = async (type: BadgeType) => {
    const newActive = !(type.is_active ?? (type as any).isActive ?? true);
    try {
      await api.put(`/api/admin/badges/types/${type.id}`, {
        is_active: newActive,
      });
      showToast(`Badge "${type.name}" is now ${newActive ? 'active' : 'inactive'}`, 'success');
      fetchBadgeTypes();
    } catch (err: any) {
      showToast(err.message || 'Failed to update badge status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#626B7A] dark:text-[#A7AFBD] mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Badges Awarded</span>
            <Award className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <p className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB] tracking-tight">
            {stats.total_awarded.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-1">
            {stats.active_assignments} currently active assignments
          </p>
        </div>

        <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#626B7A] dark:text-[#A7AFBD] mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Verified Users</span>
            <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
          </div>
          <p className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB] tracking-tight">
            {stats.total_verified.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-1">
            Hold identity verification check
          </p>
        </div>

        <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#626B7A] dark:text-[#A7AFBD] mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Trusted Users</span>
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
          </div>
          <p className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB] tracking-tight">
            {stats.total_trusted.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-1">
            Account trust & authenticity criteria
          </p>
        </div>

        <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#626B7A] dark:text-[#A7AFBD] mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Badge Types</span>
            <Shield className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <p className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB] tracking-tight">
            {badgeTypes.length}
          </p>
          <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-1">
            {badgeTypes.filter((t) => t.is_active ?? (t as any).isActive).length} active badge configurations
          </p>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#343B4B] pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              subTab === 'users'
                ? 'bg-[#4F46E5] text-white shadow-sm'
                : 'bg-white dark:bg-[#202430] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white border border-[#E5E7EB] dark:border-[#343B4B]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>User Badge Assignments</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('config')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              subTab === 'config'
                ? 'bg-[#4F46E5] text-white shadow-sm'
                : 'bg-white dark:bg-[#202430] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white border border-[#E5E7EB] dark:border-[#343B4B]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Badge Configurations ({badgeTypes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              subTab === 'history'
                ? 'bg-[#4F46E5] text-white shadow-sm'
                : 'bg-white dark:bg-[#202430] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white border border-[#E5E7EB] dark:border-[#343B4B]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Award Audit History</span>
          </button>
        </div>

        {subTab === 'config' && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateTypeModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Badge Type
          </Button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SUBTAB 1: User Badge Assignments                                      */}
      {/* ===================================================================== */}
      {subTab === 'users' && (
        <div className="space-y-6">
          <Card
            title="User Badge Directory"
            subtitle="Search users, view assigned badges, award recognition badges, or revoke with audit reasons"
          >
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#626B7A] dark:text-[#A7AFBD]" />
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by username, email, or display name..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs sm:text-sm text-[#171923] dark:text-white placeholder-[#626B7A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterBadgeType}
                  onChange={(e) => setFilterBadgeType(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="all">All Badge Types</option>
                  {badgeTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="all">All Statuses</option>
                  <option value="has_badge">Has Badges</option>
                  <option value="no_badge">No Badges</option>
                  <option value="active">Active Badges Only</option>
                  <option value="revoked">Revoked Badges</option>
                  <option value="expired">Expired Badges</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setUserQuery('');
                    setFilterBadgeType('all');
                    setFilterStatus('all');
                  }}
                  className="p-2 text-[#626B7A] hover:text-[#171923] dark:hover:text-white transition-colors"
                  title="Reset filters"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Users Table */}
            {loadingUsers ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner label="Searching users & badges..." />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[#F7F8FA] dark:bg-[#171923] rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#343B4B]">
                <Shield className="w-10 h-10 text-[#626B7A] mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-bold text-[#171923] dark:text-white mb-1">No users found</h4>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                  Try adjusting your search query or filter settings.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD]">
                      <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">User</th>
                      <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Account Status</th>
                      <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Assigned Badges</th>
                      <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#343B4B]">
                    {users.map((u) => {
                      const dName = u.profile?.display_name || u.profile?.displayName || u.username;
                      const aUrl = u.profile?.avatar_url || u.profile?.avatarUrl;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1E2230]/60 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <Avatar src={aUrl} name={dName} size="md" />
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-[#171923] dark:text-white text-xs">
                                  <span>{dName}</span>
                                  <a
                                    href={`/${u.username}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#626B7A] hover:text-[#4F46E5] inline-flex items-center"
                                    title="View public profile"
                                  >
                                    <ExternalLink className="w-3 h-3 ml-0.5" />
                                  </a>
                                </div>
                                <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] font-mono">
                                  @{u.username} • {u.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.status === 'active'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            {u.badges && u.badges.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                {u.badges.map((b) => {
                                  const color = b.badge_type?.color || '#4F46E5';
                                  const label = b.badge_type?.public_label || b.badge_type?.name || 'Badge';
                                  const isRevoked = b.status === 'revoked';
                                  const isExpired = b.status === 'expired';

                                  return (
                                    <div
                                      key={b.id}
                                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border text-[11px] font-medium shadow-2xs group relative"
                                      style={{
                                        backgroundColor: `${color}15`,
                                        borderColor: isRevoked ? '#DC2626' : isExpired ? '#9CA3AF' : `${color}40`,
                                        color: isRevoked ? '#DC2626' : isExpired ? '#6B7280' : color,
                                      }}
                                    >
                                      {renderBadgeIcon(b.badge_type?.icon || 'award', 'w-3 h-3 flex-shrink-0')}
                                      <span className={isRevoked ? 'line-through opacity-75' : ''}>{label}</span>

                                      {isRevoked && (
                                        <span className="text-[9px] px-1 bg-red-100 dark:bg-red-950 text-red-600 rounded">
                                          Revoked
                                        </span>
                                      )}
                                      {isExpired && (
                                        <span className="text-[9px] px-1 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded">
                                          Expired
                                        </span>
                                      )}

                                      {/* Action Menu for this specific badge */}
                                      <div className="flex items-center gap-0.5 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(b, u.username)}
                                          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                          title={`Edit note/expiry for ${label}`}
                                        >
                                          <Edit3 className="w-2.5 h-2.5" />
                                        </button>

                                        {b.status === 'active' ? (
                                          <button
                                            type="button"
                                            onClick={() => openRevokeModal(b.id, u.username, label)}
                                            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-950/80 text-red-600 transition-colors"
                                            title={`Revoke ${label}`}
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleRestoreBadge(b.id, u.username, label)}
                                            className="p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-emerald-600 transition-colors"
                                            title={`Restore ${label} to active`}
                                          >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[#626B7A] dark:text-[#A7AFBD] text-[11px] italic">
                                None assigned
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAwardModal(u)}
                              leftIcon={<Award className="w-3.5 h-3.5 text-[#4F46E5]" />}
                            >
                              Award Badge
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#343B4B] pt-4 mt-4">
                <span className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                  Showing page <strong className="text-[#171923] dark:text-white">{currentPage}</strong> of{' '}
                  <strong className="text-[#171923] dark:text-white">{totalPages}</strong> ({totalUsers} total users)
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => fetchUsers(currentPage - 1)}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => fetchUsers(currentPage + 1)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Recently Awarded Badges Card */}
          {recentAwards && recentAwards.length > 0 && (
            <Card title="Recently Awarded Badges" subtitle="Recent administrative awards across the platform">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD]">
                      <th className="py-2.5 px-3 font-semibold text-[11px]">User</th>
                      <th className="py-2.5 px-3 font-semibold text-[11px]">Badge</th>
                      <th className="py-2.5 px-3 font-semibold text-[11px]">Awarded By</th>
                      <th className="py-2.5 px-3 font-semibold text-[11px]">Awarded Date</th>
                      <th className="py-2.5 px-3 font-semibold text-[11px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#343B4B]">
                    {recentAwards.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1E2230]/60">
                        <td className="py-2.5 px-3 font-semibold text-[#171923] dark:text-white">
                          @{item.user?.username}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                            style={{
                              backgroundColor: `${item.badge_type?.color || '#4F46E5'}15`,
                              borderColor: `${item.badge_type?.color || '#4F46E5'}40`,
                              color: item.badge_type?.color || '#4F46E5',
                            }}
                          >
                            {renderBadgeIcon(item.badge_type?.icon || 'award', 'w-3 h-3')}
                            <span>{item.badge_type?.public_label || item.badge_type?.name}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#626B7A] dark:text-[#A7AFBD]">
                          @{item.awarded_by_username || 'super_admin'}
                        </td>
                        <td className="py-2.5 px-3 text-[#626B7A] dark:text-[#A7AFBD]">
                          {item.awarded_at ? new Date(item.awarded_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.status === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB 2: Badge Configurations (Requirement 7)                        */}
      {/* ===================================================================== */}
      {subTab === 'config' && (
        <Card
          title="Badge Type Directory & Metadata"
          subtitle="Configure public labels, descriptions, brand colors, icons, and live preview of public profile badges"
        >
          {loadingBadgeTypes ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner label="Loading badge types..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badgeTypes.map((type) => {
                const color = type.color || '#4F46E5';
                const isActive = type.is_active ?? (type as any).isActive ?? true;

                return (
                  <div
                    key={type.id}
                    className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: color }}
                    />

                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{
                            backgroundColor: `${color}18`,
                            color: color,
                            border: `1.5px solid ${color}35`,
                          }}
                        >
                          {renderBadgeIcon(type.icon, 'w-6 h-6')}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleBadgeTypeActive(type)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                              isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}
                          >
                            {isActive ? 'Active' : 'Disabled'}
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-[#171923] dark:text-[#F9FAFB] flex items-center gap-1.5">
                        <span>{type.name}</span>
                        {type.public_label !== type.name && (
                          <span className="text-[10px] font-normal text-[#626B7A] dark:text-[#A7AFBD]">
                            ({type.public_label})
                          </span>
                        )}
                      </h3>

                      <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-1.5 leading-relaxed line-clamp-3">
                        {type.description}
                      </p>

                      {/* Public Profile Badge Preview */}
                      <div className="mt-4 p-2.5 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] block mb-1">
                          Public Profile Preview:
                        </span>
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs"
                          style={{
                            backgroundColor: `${color}1A`,
                            borderColor: `${color}4D`,
                            color: color,
                          }}
                        >
                          {renderBadgeIcon(type.icon, 'w-3 h-3')}
                          <span>{type.public_label || type.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between text-xs">
                      <span className="text-[#626B7A] dark:text-[#A7AFBD] text-[11px]">
                        <strong>{type.active_users_count || 0}</strong> active accounts
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditTypeModal(type)}
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      >
                        Edit Design
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB 3: Award Audit History Log                                     */}
      {/* ===================================================================== */}
      {subTab === 'history' && (
        <Card
          title="Badge Audit & Award History"
          subtitle="Immutable audit trail of all badge awards, revocations, and restorations with administrator notes"
        >
          <div className="mb-4 max-w-md">
            <Input
              placeholder="Search history by username or note..."
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {loadingHistory ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner label="Loading audit trail..." />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 px-4 bg-[#F7F8FA] dark:bg-[#171923] rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#343B4B]">
              <FileText className="w-8 h-8 text-[#626B7A] mx-auto mb-2 opacity-50" />
              <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">No badge audit entries recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD]">
                    <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Target User</th>
                    <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Badge</th>
                    <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Action</th>
                    <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Admin</th>
                    <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Timestamp</th>
                    <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px]">Admin Reason / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#343B4B]">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1E2230]/60">
                      <td className="py-3 px-3 font-bold text-[#171923] dark:text-white">
                        @{h.username}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${h.badge_color || '#4F46E5'}15`,
                            borderColor: `${h.badge_color || '#4F46E5'}40`,
                            color: h.badge_color || '#4F46E5',
                          }}
                        >
                          {renderBadgeIcon(h.badge_icon || 'award', 'w-3 h-3')}
                          <span>{h.badge_name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            h.action === 'award'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : h.action === 'revoke'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : h.action === 'restore'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {h.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#4F46E5] dark:text-[#818CF8]">
                        @{h.performed_by_username || 'super_admin'}
                      </td>
                      <td className="py-3 px-3 text-[#626B7A] dark:text-[#A7AFBD]">
                        {new Date(h.performed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-[#626B7A] dark:text-[#A7AFBD] italic max-w-xs truncate">
                        {h.note_or_reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E5E7EB] dark:border-[#343B4B] pt-4 mt-4">
              <span className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                Page {historyPage} of {historyTotalPages} ({historyTotal} actions)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage <= 1}
                  onClick={() => fetchHistory(historyPage - 1)}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => fetchHistory(historyPage + 1)}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: Award Badge to User (Single or Multiple Badges)              */}
      {/* ===================================================================== */}
      <Modal
        isOpen={awardModalOpen}
        onClose={() => setAwardModalOpen(false)}
        title={`Award Recognition Badge to @${awardTargetUser?.username}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAwardBadges} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center gap-3">
            <Avatar
              src={awardTargetUser?.profile?.avatar_url || awardTargetUser?.profile?.avatarUrl}
              name={awardTargetUser?.profile?.display_name || awardTargetUser?.username || 'User'}
              size="md"
            />
            <div>
              <p className="text-xs font-bold text-[#171923] dark:text-white">
                {awardTargetUser?.profile?.display_name || awardTargetUser?.username}
              </p>
              <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] font-mono">
                @{awardTargetUser?.username} • {awardTargetUser?.email}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2">
              Select One or Multiple Badge Types *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl">
              {badgeTypes
                .filter((t) => t.is_active ?? (t as any).isActive)
                .map((type) => {
                  const isChecked = selectedBadgeTypeIds.includes(type.id);
                  const alreadyAwarded = awardTargetUser?.badges?.some(
                    (b) => (b.badge_type_id === type.id || (b as any).badgeTypeId === type.id) && b.status === 'active'
                  );

                  return (
                    <button
                      key={type.id}
                      type="button"
                      disabled={alreadyAwarded}
                      onClick={() => handleToggleBadgeTypeSelection(type.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        alreadyAwarded
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900 border-gray-200'
                          : isChecked
                          ? 'border-[#4F46E5] bg-indigo-50/80 dark:bg-indigo-950/40 shadow-xs'
                          : 'border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: `${type.color}20`,
                          color: type.color,
                        }}
                      >
                        {renderBadgeIcon(type.icon, 'w-4 h-4')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#171923] dark:text-white truncate">
                            {type.name}
                          </p>
                          {alreadyAwarded ? (
                            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1 rounded">
                              Assigned
                            </span>
                          ) : isChecked ? (
                            <Check className="w-3.5 h-3.5 text-[#4F46E5]" />
                          ) : null}
                        </div>
                        <p className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] line-clamp-1">
                          {type.public_label}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                Optional Expiry Date
              </label>
              <input
                type="date"
                value={awardExpiryDate}
                onChange={(e) => setAwardExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
              />
              <span className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] mt-1 block">
                Leave blank for permanent / non-expiring badge.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                Internal Administrative Note
              </label>
              <textarea
                rows={2}
                value={awardInternalNote}
                onChange={(e) => setAwardInternalNote(e.target.value)}
                placeholder="Reason or verification ticket reference (private to Super Admins)..."
                className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white placeholder-[#626B7A] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Once awarded, the badge will automatically appear immediately on @{awardTargetUser?.username}'s public profile. Internal administrative notes are never visible to the public.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B]">
            <Button type="button" variant="ghost" onClick={() => setAwardModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={awarding}
              disabled={selectedBadgeTypeIds.length === 0}
              leftIcon={<Award className="w-4 h-4" />}
            >
              Award {selectedBadgeTypeIds.length > 1 ? `${selectedBadgeTypeIds.length} Badges` : 'Badge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: Revoke Badge Modal                                           */}
      {/* ===================================================================== */}
      <Modal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        title="Revoke Badge"
      >
        <form onSubmit={handleRevokeBadge} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">
                Revoking {revokeTargetBadge?.badgeName} from @{revokeTargetBadge?.username}
              </p>
              <p className="mt-0.5 opacity-90">
                This badge will immediately disappear from the user's public profile. The revocation and your reason will be recorded in the audit log.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
              Revocation Reason (Optional note for audit log)
            </label>
            <textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Account failed verification re-audit, impersonation detected, or creator requested removal..."
              className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white placeholder-[#626B7A] focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B]">
            <Button type="button" variant="ghost" onClick={() => setRevokeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={revoking}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Revocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: Edit User Badge Note & Expiry                                */}
      {/* ===================================================================== */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit ${editTargetBadge?.badgeName} for @${editTargetBadge?.username}`}
      >
        <form onSubmit={handleUpdateUserBadge} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
              Expiry Date
            </label>
            <input
              type="date"
              value={editExpiryDate}
              onChange={(e) => setEditExpiryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
            />
            <span className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] mt-1 block">
              Leave blank for no expiration date.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
              Internal Administrative Note
            </label>
            <textarea
              rows={3}
              value={editInternalNote}
              onChange={(e) => setEditInternalNote(e.target.value)}
              placeholder="Internal record, reason or notes (never exposed publicly)..."
              className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white placeholder-[#626B7A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B]">
            <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updatingBadge}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 4: Configure Badge Metadata (Requirement 7)                     */}
      {/* ===================================================================== */}
      <Modal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title={editingType ? `Configure Badge: ${editingType.name}` : 'Create New Badge Type'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveBadgeType} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1">
                Internal Name *
              </label>
              <input
                type="text"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="e.g. Official Creator"
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1">
                Public Profile Label *
              </label>
              <input
                type="text"
                value={typeForm.public_label}
                onChange={(e) => setTypeForm({ ...typeForm, public_label: e.target.value })}
                placeholder="e.g. Official Creator"
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1">
              Short Description / Meaning *
            </label>
            <textarea
              rows={2}
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              placeholder="What this badge represents to visitors..."
              required
              className="w-full px-3 py-2 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-xs text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
              Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => setTypeForm({ ...typeForm, icon: ic.id })}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    typeForm.icon === ic.id
                      ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5]'
                      : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A]'
                  }`}
                >
                  {renderBadgeIcon(ic.id, 'w-5 h-5')}
                  <span className="text-[10px] font-medium truncate w-full text-center">
                    {ic.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
              Badge Brand Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setTypeForm({ ...typeForm, color: hex })}
                  style={{ backgroundColor: hex }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    typeForm.color === hex ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'
                  }`}
                />
              ))}
              <input
                type="color"
                value={typeForm.color}
                onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer border border-[#E5E7EB]"
                title="Custom color picker"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_toggle"
              checked={typeForm.is_active}
              onChange={(e) => setTypeForm({ ...typeForm, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-[#4F46E5] focus:ring-indigo-500"
            />
            <label htmlFor="is_active_toggle" className="text-xs font-semibold text-[#171923] dark:text-white cursor-pointer">
              Active (eligible for Super Admins to award to users)
            </label>
          </div>

          {/* Live Preview on Light & Dark */}
          <div className="p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] block">
              Live Appearance Preview
            </span>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white border rounded-xl flex-1 text-center shadow-xs">
                <span className="text-[10px] text-gray-400 block mb-1">Light Profile</span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: `${typeForm.color}1A`,
                    borderColor: `${typeForm.color}4D`,
                    color: typeForm.color,
                  }}
                >
                  {renderBadgeIcon(typeForm.icon, 'w-3.5 h-3.5')}
                  <span>{typeForm.public_label || typeForm.name || 'Preview'}</span>
                </span>
              </div>

              <div className="p-2.5 bg-[#0F172A] border border-white/10 rounded-xl flex-1 text-center shadow-xs">
                <span className="text-[10px] text-gray-400 block mb-1">Dark Profile</span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: `${typeForm.color}25`,
                    borderColor: `${typeForm.color}60`,
                    color: typeForm.color,
                  }}
                >
                  {renderBadgeIcon(typeForm.icon, 'w-3.5 h-3.5')}
                  <span>{typeForm.public_label || typeForm.name || 'Preview'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B]">
            <Button type="button" variant="ghost" onClick={() => setConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingType}>
              {editingType ? 'Save Badge Metadata' : 'Create Badge Type'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BadgeManagementPanel;
