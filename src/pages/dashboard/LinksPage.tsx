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
  Upload,
  Loader2,
  Palette,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { validateImageFile, processImageFileToDataUri } from '../../utils/imageUpload';
import {
  getContrastRatio,
  isValidHexColor,
  autoContrastColor,
  LINK_COLOR_PRESETS,
} from '../../utils/contrast';
export { LINK_COLOR_PRESETS };
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
  background_color: string;
  text_color: string;
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
  background_color: '',
  text_color: '',
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

  const themeSettings = (profile?.theme_settings as Record<string, any>) || {};
  const fallbackThemeBg = (themeSettings.button_color as string) || (themeSettings.cardBg as string) || '#202430';
  const fallbackThemeText = (themeSettings.button_text_color as string) || (themeSettings.cardText as string) || '#FFFFFF';
  const fallbackShape = (themeSettings.button_shape as string) || 'rounded-xl';

  const getShapeClass = (shape?: string) => {
    if (shape === 'rounded-full') return 'rounded-full';
    if (shape === 'sharp') return 'rounded-none';
    if (shape === 'rounded-2xl') return 'rounded-2xl';
    return 'rounded-xl';
  };

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
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const effectiveBg = form.background_color && isValidHexColor(form.background_color)
    ? form.background_color
    : fallbackThemeBg;
  const effectiveText = form.text_color && isValidHexColor(form.text_color)
    ? form.text_color
    : fallbackThemeText;
  const contrastInfo = getContrastRatio(effectiveText, effectiveBg);

  const activePreset = (() => {
    if (!form.background_color && !form.text_color) return 'default';
    const match = LINK_COLOR_PRESETS.find(
      (p) =>
        p.id !== 'default' &&
        p.id !== 'custom' &&
        p.bg.toLowerCase() === form.background_color.toLowerCase() &&
        p.text.toLowerCase() === form.text_color.toLowerCase()
    );
    return match ? match.id : 'custom';
  })();

  const handleApplyPreset = (presetId: string) => {
    if (presetId === 'default') {
      setForm((prev) => ({ ...prev, background_color: '', text_color: '' }));
      return;
    }
    if (presetId === 'custom') {
      if (!form.background_color && !form.text_color) {
        setForm((prev) => ({ ...prev, background_color: '#4F46E5', text_color: '#FFFFFF' }));
      }
      return;
    }
    const found = LINK_COLOR_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setForm((prev) => ({ ...prev, background_color: found.bg, text_color: found.text }));
    }
  };

  const handleAutoContrast = () => {
    const chosenBg = form.background_color.trim() || fallbackThemeBg;
    const bestText = autoContrastColor(chosenBg);
    setForm((prev) => ({ ...prev, text_color: bestText }));
    showToast(`Auto contrast text color set to ${bestText}`, 'info');
  };


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
      background_color: link.background_color || (link as any).backgroundColor || '',
      text_color: link.text_color || (link as any).textColor || '',
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

    if (form.background_color.trim() && !isValidHexColor(form.background_color.trim())) {
      setFormError('Background color must be a valid hex color code (e.g. #4F46E5)');
      return;
    }
    if (form.text_color.trim() && !isValidHexColor(form.text_color.trim())) {
      setFormError('Text color must be a valid hex color code (e.g. #FFFFFF)');
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
      background_color: form.background_color.trim() || null,
      text_color: form.text_color.trim() || null,
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
                      : 'border-[#E5E7EB] dark:border-[#343B4B] hover:border-[#626B7A]'
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

                    {/* Icon or Custom Logo */}
                    <div className="w-11 h-11 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-center overflow-hidden shrink-0 mt-0.5 shadow-sm p-1">
                      {link.thumbnail_url ? (
                        <img
                          src={link.thumbnail_url}
                          alt={link.title}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        renderLinkIcon(link.icon, link.title, dest)
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-[#171923] dark:text-[#F9FAFB] truncate">
                          {link.title}
                        </h3>
                        {link.is_pinned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1] border border-[#4F46E5]/20">
                            Pinned
                          </span>
                        )}
                        {link.is_featured && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                            Featured
                          </span>
                        )}
                        {link.is_hidden && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-[#B45309] dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
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
                          className="text-xs text-[#626B7A] hover:text-[#4F46E5] dark:text-[#A7AFBD] dark:hover:text-[#6366F1] truncate max-w-md flex items-center gap-1"
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
                            <span className="inline-flex items-center gap-1 text-[#B45309] dark:text-amber-400">
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
                                ? 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1]'
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
                                ? 'bg-amber-50 text-[#B45309] dark:bg-amber-950/30 dark:text-amber-300'
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
                            className="p-1.5 rounded-lg text-[#626B7A] hover:bg-red-50 hover:text-[#B91C1C] dark:hover:bg-red-950/30 dark:hover:text-red-400"
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
                        link.is_active ? 'bg-[#15803D]' : 'bg-[#E5E7EB] dark:bg-[#343B4B]'
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
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
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

          {/* Custom Logo Upload */}
          <div className="p-3 bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-center overflow-hidden shrink-0 p-1 shadow-sm">
                {form.thumbnail_url ? (
                  <img src={form.thumbnail_url} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  renderLinkIcon(form.icon, form.title, form.destination_url)
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-[#171923] dark:text-[#F9FAFB]">
                  Custom Link Logo
                </div>
                <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                  PNG, JPG, or WebP up to 5 MB. Preserves transparent background.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label
                className={`cursor-pointer px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] hover:border-[#4F46E5] inline-flex items-center gap-1.5 shadow-sm transition-opacity ${
                  uploadingLogo ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {uploadingLogo ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span>
                  {uploadingLogo
                    ? 'Uploading...'
                    : form.thumbnail_url
                    ? 'Replace'
                    : 'Upload Logo'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingLogo(true);
                    try {
                      validateImageFile(file, 5);
                      const dataUri = await processImageFileToDataUri(file, 400, 'contain');
                      const res = await api.post<{ url: string }>('/api/upload/image', {
                        image_data: dataUri,
                        type: 'link',
                        link_id: editingLink?.id,
                      });
                      setForm((prev) => ({ ...prev, thumbnail_url: res.url }));
                      showToast('Logo uploaded and saved!', 'success');
                    } catch (err: any) {
                      showToast(err.message || 'Failed to upload logo', 'error');
                    } finally {
                      setUploadingLogo(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              {form.thumbnail_url && !uploadingLogo && (
                <button
                  type="button"
                  onClick={async () => {
                    if (editingLink?.id) {
                      try {
                        await api.delete('/api/upload/image', { link_id: editingLink.id });
                      } catch {
                        // ignore
                      }
                    }
                    setForm((prev) => ({ ...prev, thumbnail_url: '' }));
                    showToast('Logo cleared', 'info');
                  }}
                  className="px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

          </div>

          {/* Link Appearance */}
          <div className="p-4 bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171923] dark:text-[#F9FAFB]">
                  Link Appearance
                </h3>
              </div>
              {(form.background_color || form.text_color) && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, background_color: '', text_color: '' }))}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset to Theme Default</span>
                </button>
              )}
            </div>

            {/* Live Link Button Preview */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] shadow-inner space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Live Link Preview
                </span>
                <div className="flex items-center gap-2">
                  {form.background_color || form.text_color ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Per-Link Custom Colors
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Profile Theme Default
                    </span>
                  )}
                </div>
              </div>

              {/* Realistic Button Simulation */}
              <div
                style={{
                  backgroundColor: effectiveBg,
                  color: effectiveText,
                  borderColor: 'rgba(255, 255, 255, 0.18)',
                }}
                className={`w-full py-3 px-4 border shadow-sm flex items-center justify-between transition-all duration-200 ${getShapeClass(
                  fallbackShape
                )}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {form.thumbnail_url ? (
                    <div className="w-8 h-8 rounded-lg bg-white/10 dark:bg-black/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/20 p-0.5">
                      <img
                        src={form.thumbnail_url}
                        alt="Logo"
                        className="w-full h-full object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                      {renderLinkIcon(form.icon, form.title, form.destination_url)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 text-left">
                    <span
                      className="font-semibold text-sm truncate block"
                      style={{ color: effectiveText }}
                    >
                      {form.title.trim() || 'Link Title Preview'}
                    </span>
                    {form.description.trim() && (
                      <p
                        className="text-xs opacity-75 truncate mt-0.5"
                        style={{ color: effectiveText }}
                      >
                        {form.description}
                      </p>
                    )}
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 opacity-70 shrink-0 ml-2" style={{ color: effectiveText }} />
              </div>

              {/* Contrast Indicator / Warning */}
              <div className="pt-0.5">
                {contrastInfo.ratio >= 4.5 ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      High Contrast: {contrastInfo.ratio}:1 (WCAG {contrastInfo.score} passed)
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate">
                        Low contrast ({contrastInfo.ratio}:1) — text may be difficult to read.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoContrast}
                      className="px-2.5 py-1 rounded bg-amber-200/90 dark:bg-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-100 hover:bg-amber-300 transition-colors shrink-0"
                    >
                      Auto Contrast
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {LINK_COLOR_PRESETS.map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] dark:bg-[#1E1B4B] dark:border-[#6366F1] dark:text-[#818CF8] ring-1 ring-[#4F46E5]'
                          : 'bg-white dark:bg-[#202430] border-[#E5E7EB] dark:border-[#343B4B] text-[#424B5A] dark:text-[#A7AFBD] hover:bg-slate-50 dark:hover:bg-[#272D3A]'
                      }`}
                    >
                      {preset.bg ? (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-xs"
                          style={{ backgroundColor: preset.bg }}
                        />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-400 shrink-0" />
                      )}
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Pickers: Background & Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Background Color */}
              <div className="p-3 bg-white dark:bg-[#202430] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] flex items-center gap-1.5">
                    <span>Background Color</span>
                    {form.background_color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                        style={{ backgroundColor: form.background_color }}
                      />
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, background_color: '' }))}
                    className={`text-[11px] transition-colors ${
                      !form.background_color
                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline'
                    }`}
                  >
                    {!form.background_color ? '✓ Theme Default' : 'Use Theme Default'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-[#343B4B] shrink-0 shadow-xs cursor-pointer">
                    <input
                      type="color"
                      value={
                        form.background_color && isValidHexColor(form.background_color)
                          ? form.background_color.slice(0, 7)
                          : fallbackThemeBg.startsWith('#')
                          ? fallbackThemeBg.slice(0, 7)
                          : '#202430'
                      }
                      onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                      className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 p-0"
                      title="Select background color"
                    />
                    <div
                      className="w-full h-full pointer-events-none"
                      style={{ backgroundColor: form.background_color || fallbackThemeBg }}
                    />
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.background_color}
                      onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                      placeholder={fallbackThemeBg.startsWith('#') ? fallbackThemeBg : '#4F46E5'}
                      maxLength={9}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#171923] text-xs font-mono text-[#171923] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Hex color or clear to inherit the profile theme color.
                </p>
              </div>

              {/* Text Color */}
              <div className="p-3 bg-white dark:bg-[#202430] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] flex items-center gap-1.5">
                    <span>Text Color</span>
                    {form.text_color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                        style={{ backgroundColor: form.text_color }}
                      />
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoContrast}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    title="Automatically pick readable high-contrast text color"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto Contrast</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-[#343B4B] shrink-0 shadow-xs cursor-pointer">
                    <input
                      type="color"
                      value={
                        form.text_color && isValidHexColor(form.text_color)
                          ? form.text_color.slice(0, 7)
                          : fallbackThemeText.startsWith('#')
                          ? fallbackThemeText.slice(0, 7)
                          : '#FFFFFF'
                      }
                      onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                      className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 p-0"
                      title="Select text color"
                    />
                    <div
                      className="w-full h-full pointer-events-none"
                      style={{ backgroundColor: form.text_color || fallbackThemeText }}
                    />
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.text_color}
                      onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                      placeholder={fallbackThemeText.startsWith('#') ? fallbackThemeText : '#FFFFFF'}
                      maxLength={9}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#171923] text-xs font-mono text-[#171923] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Hex color code</span>
                  {form.text_color && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, text_color: '' }))}
                      className="hover:underline text-slate-400"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-2">
              Fallback Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm({ ...form, icon: ic })}
                  className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs capitalize transition-all ${
                    form.icon === ic
                      ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5] dark:bg-[#1E1B4B] dark:border-[#6366F1] dark:text-[#818CF8]'
                      : 'bg-white dark:bg-[#171923] border-[#E5E7EB] dark:border-[#343B4B] text-[#424B5A] dark:text-[#A7AFBD] hover:bg-slate-50 dark:hover:bg-[#272D3A]'
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
            <label className="flex items-center gap-2 text-xs text-[#424B5A] dark:text-[#D1D5DB] cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                className="rounded border-[#E5E7EB] dark:border-[#343B4B] text-[#4F46E5] focus:ring-[#4F46E5]"
              />
              <span>Pin to top of profile</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#424B5A] dark:text-[#D1D5DB] cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="rounded border-[#E5E7EB] dark:border-[#343B4B] text-[#4F46E5] focus:ring-[#4F46E5]"
              />
              <span>Featured highlight border</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#424B5A] dark:text-[#D1D5DB] cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_hidden}
                onChange={(e) => setForm({ ...form, is_hidden: e.target.checked })}
                className="rounded border-[#E5E7EB] dark:border-[#343B4B] text-[#4F46E5] focus:ring-[#4F46E5]"
              />
              <span>Hide temporarily without deleting</span>
            </label>
          </div>

          {/* Advanced Link Options Accordion */}
          <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] hover:underline"
            >
              {showAdvanced
                ? '− Hide Advanced Options (Scheduling, Categories, Media Embeds, UTM)'
                : '+ Show Advanced Options (Scheduling, Categories, Media Embeds, UTM)'}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 bg-[#F7F8FA] dark:bg-[#171923] p-4 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B]">
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

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB] dark:border-[#343B4B]">
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