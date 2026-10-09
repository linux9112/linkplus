import React, { useState, useEffect } from 'react';
import {
  Plus,
  GripVertical,
  Pin,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit3,
  Search,
  Calendar,
  ExternalLink,
  Layers,
  Check,
  MousePointerClick,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { Link as LinkItem } from '../../types/index';
import PublicProfileRenderer, { renderLinkIcon } from '../../components/profile/PublicProfileRenderer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

const ICON_OPTIONS = [
  'globe',
  'github',
  'twitter',
  'instagram',
  'linkedin',
  'youtube',
  'music',
  'shop',
  'blog',
  'code',
  'star',
  'heart',
  'calendar',
  'mail',
];

interface LinkFormState {
  title: string;
  destination_url: string;
  description: string;
  icon: string;
  thumbnail_url: string;
  category: string;
  custom_label: string;
  is_featured: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  scheduled_start: string;
  scheduled_end: string;
  media_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

const initialFormState: LinkFormState = {
  title: '',
  destination_url: '',
  description: '',
  icon: 'globe',
  thumbnail_url: '',
  category: '',
  custom_label: '',
  is_featured: false,
  is_pinned: false,
  is_hidden: false,
  scheduled_start: '',
  scheduled_end: '',
  media_url: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
};

export const LinksPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden' | 'pinned'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [form, setForm] = useState<LinkFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      const res = await api.get<{ links: LinkItem[] }>('/api/links');
      setLinks(res.links || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load links', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const openAddModal = () => {
    setEditingLink(null);
    setForm(initialFormState);
    setFormError(null);
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const openEditModal = (link: LinkItem) => {
    setEditingLink(link);
    const utm = link.utm_params || (link as any).utmParams || {};
    const startStr = link.scheduled_start || (link as any).scheduledStart;
    const endStr = link.scheduled_end || (link as any).scheduledEnd;
    setForm({
      title: link.title || '',
      destination_url: link.destination_url || (link as any).destinationUrl || '',
      description: link.description || '',
      icon: link.icon || 'globe',
      thumbnail_url: link.thumbnail_url || (link as any).thumbnailUrl || '',
      category: link.category || '',
      custom_label: link.custom_label || (link as any).customLabel || '',
      is_featured: Boolean(link.is_featured ?? (link as any).isFeatured),
      is_pinned: Boolean(link.is_pinned ?? (link as any).isPinned),
      is_hidden: Boolean(link.is_hidden ?? (link as any).isHidden),
      scheduled_start: startStr ? new Date(startStr).toISOString().slice(0, 16) : '',
      scheduled_end: endStr ? new Date(endStr).toISOString().slice(0, 16) : '',
      media_url: link.media_url || (link as any).mediaUrl || '',
      utm_source: utm.utm_source || '',
      utm_medium: utm.utm_medium || '',
      utm_campaign: utm.utm_campaign || '',
    });
    setFormError(null);
    setShowAdvanced(
      Boolean(
        link.category ||
          link.custom_label ||
          link.thumbnail_url ||
          startStr ||
          endStr ||
          utm.utm_source
      )
    );
    setModalOpen(true);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError('Link title is required');
      return;
    }
    if (!form.destination_url.trim()) {
      setFormError('Destination URL is required');
      return;
    }

    const normalizedUrl = /^https?:\/\//i.test(form.destination_url.trim())
      ? form.destination_url.trim()
      : `https://${form.destination_url.trim()}`;

    const utmParams: Record<string, string> = {};
    if (form.utm_source.trim()) utmParams.utm_source = form.utm_source.trim();
    if (form.utm_medium.trim()) utmParams.utm_medium = form.utm_medium.trim();
    if (form.utm_campaign.trim()) utmParams.utm_campaign = form.utm_campaign.trim();

    const payload = {
      title: form.title.trim(),
      destination_url: normalizedUrl,
      description: form.description.trim() || null,
      icon: form.icon || 'globe',
      thumbnail_url: form.thumbnail_url.trim() || null,
      category: form.category.trim() || null,
      custom_label: form.custom_label.trim() || null,
      is_featured: form.is_featured,
      is_pinned: form.is_pinned,
      is_hidden: form.is_hidden,
      media_url: form.media_url.trim() || null,
      utm_params: Object.keys(utmParams).length > 0 ? utmParams : null,
      scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : null,
    };

    setSubmitting(true);
    try {
      if (editingLink) {
        await api.put(`/api/links/${editingLink.id}`, payload);
        showToast('Link updated successfully!', 'success');
      } else {
        await api.post('/api/links', payload);
        showToast('Link added to your profile!', 'success');
      }
      setModalOpen(false);
      await fetchLinks();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (link: LinkItem) => {
    try {
      await api.put(`/api/links/${link.id}/toggle`);
      await fetchLinks();
      showToast(link.is_active ? 'Link disabled' : 'Link enabled', 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not update link', 'error');
    }
  };

  const handleTogglePin = async (link: LinkItem) => {
    try {
      await api.put(`/api/links/${link.id}/pin`);
      await fetchLinks();
      showToast(link.is_pinned ? 'Link unpinned' : 'Link pinned to top!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not pin link', 'error');
    }
  };

  const handleToggleHide = async (link: LinkItem) => {
    try {
      await api.put(`/api/links/${link.id}/hide`);
      await fetchLinks();
      showToast(link.is_hidden ? 'Link unhidden on profile' : 'Link hidden from public profile', 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not toggle hidden state', 'error');
    }
  };

  const handleDuplicate = async (link: LinkItem) => {
    try {
      await api.post(`/api/links/${link.id}/duplicate`);
      await fetchLinks();
      showToast('Link duplicated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not duplicate link', 'error');
    }
  };

  const handleDelete = async (link: LinkItem) => {
    try {
      await api.delete(`/api/links/${link.id}`);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      showToast('Link deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not delete link', 'error');
    }
  };

  const handleCopyDestination = async (link: LinkItem) => {
    const dest = link.destination_url || (link as any).destinationUrl;
    await navigator.clipboard.writeText(dest);
    setCopiedId(link.id);
    showToast('Destination URL copied!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Drag and Drop Reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...links];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);
    setDraggedIndex(index);
    setLinks(updated);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    try {
      const payload = links.map((l, idx) => ({ id: l.id, position: idx }));
      await api.put('/api/links/reorder', { items: payload, linkIds: links.map((l) => l.id) });
      showToast('Link order saved!', 'success');
    } catch {
      showToast('Failed to save link order', 'error');
      fetchLinks();
    }
  };

  const filteredLinks = links.filter((l) => {
    const matchesSearch =
      !searchQuery.trim() ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.destination_url || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return l.is_active && !l.is_hidden;
    if (statusFilter === 'hidden') return l.is_hidden || !l.is_active;
    if (statusFilter === 'pinned') return l.is_pinned;
    return true;
  });

  const visiblePreviewLinks = links.filter((l) => l.is_active && !l.is_hidden);

  if (loading) {
    return <LoadingSpinner label="Loading your links..." />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Left Column: Link Manager */}
      <div className="xl:col-span-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171923] dark:text-[#F9FAFB]">
              Links Manager
            </h1>
            <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
              Drag and drop to reorder, pin highlights, schedule launches, or configure UTM tracking.
            </p>
          </div>
          <Button onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
            Add New Link
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search links by title, URL, or category..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-1 bg-[#F1F3F7] dark:bg-[#171923] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B]">
            {(['all', 'active', 'pinned', 'hidden'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB] shadow-sm'
                    : 'text-[#626B7A] hover:text-[#171923] dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Links List */}
        {filteredLinks.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-6 h-6" />}
            title={links.length === 0 ? 'Your profile has no links yet' : 'No links match your filter'}
            description={
              links.length === 0
                ? 'Click "Add New Link" to publish your first destination link with click tracking.'
                : 'Try clearing your search query or switching filter tabs.'
            }
            action={
              links.length === 0 ? (
                <Button onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
                  Add Your First Link
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link, index) => {
              const dest = link.destination_url || (link as any).destinationUrl;
              const clicks = link.click_count ?? (link as any).clickCount ?? 0;
              const startStr = link.scheduled_start || (link as any).scheduledStart;
              const endStr = link.scheduled_end || (link as any).scheduledEnd;

              return (
                <div
                  key={link.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white dark:bg-[#202430] border rounded-2xl p-4 shadow-card transition-all ${
                    link.is_pinned
                      ? 'border-[#4F46E5] dark:border-[#6366F1]'
                      : 'border-[#E5E7EB] dark:border-[#343B4B] hover:border-slate-300'
                  } ${!link.is_active || link.is_hidden ? 'opacity-65' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div
                      className="mt-2 cursor-grab active:cursor-grabbing text-[#626B7A] hover:text-[#171923] dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB]"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1] flex items-center justify-center shrink-0 mt-0.5">
                      {renderLinkIcon(link.icon)}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-[#171923] dark:text-[#F9FAFB] truncate">
                          {link.title}
                        </h3>
                        {link.is_pinned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#EEF2FF] text-[#4F46E5] border border-[#4F46E5]/20">
                            Pinned
                          </span>
                        )}
                        {link.is_featured && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                            Featured
                          </span>
                        )}
                        {link.is_hidden && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-[#B45309] border border-amber-200">
                            Hidden
                          </span>
                        )}
                        {link.category && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F3F7] dark:bg-[#272D3A] text-[#626B7A] dark:text-[#A7AFBD]">
                            {link.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={dest}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#626B7A] hover:text-[#4F46E5] truncate max-w-md flex items-center gap-1"
                        >
                          <span className="truncate">{dest}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      {link.description && (
                        <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-1 line-clamp-1">{link.description}</p>
                      )}

                      {/* Meta & Actions Row */}
                      <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#4F46E5] dark:text-[#6366F1]">
                            <MousePointerClick className="w-3.5 h-3.5" />
                            {clicks.toLocaleString()} {clicks === 1 ? 'click' : 'clicks'}
                          </span>
                          {(startStr || endStr) && (
                            <span className="inline-flex items-center gap-1 text-[#B45309]">
                              <Calendar className="w-3.5 h-3.5" />
                              Scheduled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePin(link)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              link.is_pinned
                                ? 'bg-[#EEF2FF] text-[#4F46E5]'
                                : 'text-[#626B7A] hover:bg-slate-100 dark:hover:bg-[#272D3A]'
                            }`}
                            title={link.is_pinned ? 'Unpin link' : 'Pin link to top'}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleHide(link)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              link.is_hidden
                                ? 'bg-amber-50 text-[#B45309]'
                                : 'text-[#626B7A] hover:bg-slate-100 dark:hover:bg-[#272D3A]'
                            }`}
                            title={link.is_hidden ? 'Unhide link' : 'Hide link without deleting'}
                          >
                            {link.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleCopyDestination(link)}
                            className="p-1.5 rounded-lg text-[#626B7A] hover:bg-slate-100 dark:hover:bg-[#272D3A]"
                            title="Copy destination URL"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-4 h-4 text-[#15803D]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDuplicate(link)}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-[#626B7A] hover:bg-slate-100 dark:hover:bg-[#272D3A]"
                            title="Duplicate link"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => openEditModal(link)}
                            className="p-1.5 rounded-lg text-[#626B7A] hover:bg-slate-100 dark:hover:bg-[#272D3A]"
                            title="Edit link"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(link)}
                            className="p-1.5 rounded-lg text-[#626B7A] hover:bg-red-50 hover:text-[#B91C1C]"
                            title="Delete link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Active Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={link.is_active}
                      onClick={() => handleToggleActive(link)}
                      title={link.is_active ? 'Disable link' : 'Enable link'}
                      className={`mt-1 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        link.is_active ? 'bg-[#15803D]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          link.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Live Mobile Preview */}
      <div className="xl:col-span-5 xl:sticky xl:top-24 flex flex-col items-center">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD]">
          <span>Live Mobile Preview</span>
        </div>
        <div className="w-full max-w-[340px] rounded-[42px] p-3 bg-white dark:bg-[#202430] border-4 border-[#E5E7EB] dark:border-[#343B4B] shadow-panel">
          <div className="rounded-[32px] overflow-hidden max-h-[640px] overflow-y-auto border border-[#E5E7EB] dark:border-[#343B4B]">
            {profile && (
              <PublicProfileRenderer
                username={user?.username || 'creator'}
                profile={profile}
                links={visiblePreviewLinks}
                isPreview
              />
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Link Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLink ? 'Edit Link' : 'Add New Link'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveLink} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Link Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="My Latest Project"
              required
            />
            <Input
              label="Destination URL *"
              value={form.destination_url}
              onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
              placeholder="https://example.com"
              required
            />
          </div>

          <Input
            label="Description (Optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief subtitle displayed under the link title"
          />

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm({ ...form, icon: ic })}
                  className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs capitalize transition-all ${
                    form.icon === ic
                      ? 'bg-indigo-600/25 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {renderLinkIcon(ic)}
                  <span>{ic}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Flags */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600"
              />
              <span>Pin to top of profile</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600"
              />
              <span>Featured highlight border</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_hidden}
                onChange={(e) => setForm({ ...form, is_hidden: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600"
              />
              <span>Hide temporarily without deleting</span>
            </label>
          </div>

          {/* Advanced Link Options Accordion */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {showAdvanced
                ? '− Hide Advanced Options (Scheduling, Categories, Media Embeds, UTM)'
                : '+ Show Advanced Options (Scheduling, Categories, Media Embeds, UTM)'}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Category / Group"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Featured Work, Courses, Social"
                  />
                  <Input
                    label="Custom Badge Label"
                    value={form.custom_label}
                    onChange={(e) => setForm({ ...form, custom_label: e.target.value })}
                    placeholder="e.g. NEW, 50% OFF, LIVE"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Thumbnail Image URL"
                    value={form.thumbnail_url}
                    onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                  />
                  <Input
                    label="YouTube Video Embed URL"
                    value={form.media_url}
                    onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="datetime-local"
                    label="Scheduled Start (Server-Enforced)"
                    value={form.scheduled_start}
                    onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
                  />
                  <Input
                    type="datetime-local"
                    label="Scheduled Expiration (Server-Enforced)"
                    value={form.scheduled_end}
                    onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="UTM Source"
                    value={form.utm_source}
                    onChange={(e) => setForm({ ...form, utm_source: e.target.value })}
                    placeholder="linkpulse"
                  />
                  <Input
                    label="UTM Medium"
                    value={form.utm_medium}
                    onChange={(e) => setForm({ ...form, utm_medium: e.target.value })}
                    placeholder="bio"
                  />
                  <Input
                    label="UTM Campaign"
                    value={form.utm_campaign}
                    onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
                    placeholder="spring_launch"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingLink ? 'Save Link Changes' : 'Create Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LinksPage;