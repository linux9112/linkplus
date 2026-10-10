import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Lock,
  Save,
  Plus,
  Trash2,
  AtSign,
  Upload,
  Camera,
  X,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  MoveUp,
  MoveDown,
  Image as ImageIcon,
  Pin,
  Wifi,
  Battery,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { processImageFileToDataUri, validateImageFile } from '../../utils/imageUpload';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import ImageCropModal from '../../components/ui/ImageCropModal';
import { useToast } from '../../components/ui/Toast';
import PublicProfileRenderer, {
  THEME_PRESETS,
  SOCIAL_PLATFORMS_META,
  renderLinkIcon,
} from '../../components/profile/PublicProfileRenderer';
import type { Link as LinkItem, Profile } from '../../types/index';

const SOCIAL_OPTIONS = [
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle' },
  { id: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/handle' },
  { id: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/profile' },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username' },
  { id: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/phonenumber' },
  { id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/username' },
  { id: 'website', label: 'Personal Website', placeholder: 'https://yoursite.com' },
  { id: 'email', label: 'Email', placeholder: 'mailto:contact@yoursite.com' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@handle' },
  { id: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
];

const CURATED_FONTS = [
  'Inter',
  'Plus Jakarta Sans',
  'Poppins',
  'Space Grotesk',
  'JetBrains Mono',
  'Georgia',
];

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Active studio tab
  const [activeTab, setActiveTab] = useState<'info' | 'socials' | 'links' | 'appearance'>('info');
  const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Profile fields state
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);

  // Theme & Appearance fields state
  const [preset, setPreset] = useState('default');
  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image' | 'pattern'>('gradient');
  const [backgroundValue, setBackgroundValue] = useState(THEME_PRESETS.default.backgroundValue);
  const [buttonShape, setButtonShape] = useState<'rounded' | 'rounded-lg' | 'rounded-2xl' | 'rounded-full' | 'sharp' | 'brutal'>('rounded-full');
  const [buttonStyle, setButtonStyle] = useState<'solid' | 'glass' | 'outline' | 'brutal' | 'gradient' | 'shadow' | 'minimal'>('glass');
  const [buttonColor, setButtonColor] = useState('');
  const [textColor, setTextColor] = useState('#171923');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [linkSpacing, setLinkSpacing] = useState<'compact' | 'normal' | 'relaxed'>('normal');

  // Links state
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // New Link creation inline state
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');
  const [newLinkLogo, setNewLinkLogo] = useState('');
  const [savingNewLink, setSavingNewLink] = useState(false);

  // Username edit state
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  // Crop Modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSource, setCropImageSource] = useState('');
  const [cropTarget, setCropTarget] = useState<{ type: 'avatar' | 'cover' | 'link'; linkId?: string }>({
    type: 'avatar',
  });

  // Hidden file input references
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const linkLogoInputRef = useRef<HTMLInputElement>(null);
  const targetLinkRef = useRef<string | null>(null);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Load profile data into form state
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || (profile as any).displayName || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || (profile as any).avatarUrl || '');
      setIsPublic(profile.is_public ?? (profile as any).isPublic ?? true);

      const socials = profile.social_links || (profile as any).socialLinks || [];
      setSocialLinks(Array.isArray(socials) ? socials : []);

      const ts: Record<string, any> = profile.theme_settings || (profile as any).themeSettings || {};
      const pKey = String(ts.preset || 'default');
      const pDef = THEME_PRESETS[pKey] || THEME_PRESETS.default;

      setPreset(pKey);
      setCoverUrl(String(ts.cover_url || ''));
      setTagline(String(ts.title_tagline || ''));
      setBackgroundType((ts.background_type as any) || pDef.backgroundType);
      setBackgroundValue(String(ts.background_value || pDef.backgroundValue));
      setButtonShape((ts.button_shape as any) || pDef.buttonShape);
      setButtonStyle((ts.button_style as any) || pDef.buttonStyle);
      setButtonColor(String(ts.button_color || ''));
      setTextColor(String(ts.text_color || pDef.textColor));
      setFontFamily(String(ts.font_family || pDef.fontFamily));
      setLinkSpacing((ts.link_spacing as any) || 'normal');
    }
    if (user) {
      setNewUsername(user.username);
    }
  }, [profile, user]);

  // Load user links
  const fetchLinks = useCallback(async () => {
    try {
      setLoadingLinks(true);
      const res = await api.get<{ links: LinkItem[] }>('/api/links');
      setLinks(res.links || []);
    } catch {
      // silently handle link fetch error
    } finally {
      setLoadingLinks(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Prompt before unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const markDirty = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  // --------------------------------------------------------------------------
  // Image Upload & Crop Handlers
  // --------------------------------------------------------------------------

  const handleAvatarFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file, 5);
      const dataUri = await processImageFileToDataUri(file, 600, 'contain');
      setCropImageSource(dataUri);
      setCropTarget({ type: 'avatar' });
      setCropModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Invalid image file', 'error');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file, 5);
      const dataUri = await processImageFileToDataUri(file, 1200, 'cover');
      setCropImageSource(dataUri);
      setCropTarget({ type: 'cover' });
      setCropModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Invalid banner image', 'error');
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleLinkLogoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetLinkId = targetLinkRef.current;
    try {
      validateImageFile(file, 5);
      // Preserves PNG transparency for logos!
      const dataUri = await processImageFileToDataUri(file, 400, 'contain');
      setCropImageSource(dataUri);
      setCropTarget({ type: 'link', linkId: targetLinkId || undefined });
      setCropModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Invalid logo image', 'error');
    } finally {
      if (linkLogoInputRef.current) linkLogoInputRef.current.value = '';
    }
  };

  const handleCropApplied = async (croppedDataUri: string) => {
    if (cropTarget.type === 'avatar') {
      try {
        const res = await api.post<{ url: string }>('/api/upload/image', {
          image_data: croppedDataUri,
          type: 'avatar',
        });
        setAvatarUrl(res.url);
        markDirty();
        showToast('Profile photo updated!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to save avatar', 'error');
      }
    } else if (cropTarget.type === 'cover') {
      try {
        const res = await api.post<{ url: string }>('/api/upload/image', {
          image_data: croppedDataUri,
          type: 'cover',
        });
        setCoverUrl(res.url);
        markDirty();
        showToast('Cover banner updated!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to save cover', 'error');
      }
    } else if (cropTarget.type === 'link') {
      if (cropTarget.linkId) {
        // Existing link logo upload
        try {
          const res = await api.post<{ url: string }>('/api/upload/image', {
            image_data: croppedDataUri,
            type: 'link',
            link_id: cropTarget.linkId,
          });
          setLinks((prev) =>
            prev.map((l) => (l.id === cropTarget.linkId ? { ...l, thumbnail_url: res.url } : l))
          );
          showToast('Link logo saved!', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to upload link logo', 'error');
        }
      } else {
        // Inline new link logo
        setNewLinkLogo(croppedDataUri);
        showToast('Logo attached to new link!', 'success');
      }
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api.delete('/api/upload/image', { type: 'avatar' });
      setAvatarUrl('');
      markDirty();
      showToast('Profile photo removed', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove profile photo', 'error');
    }
  };

  const handleRemoveCover = async () => {
    try {
      await api.delete('/api/upload/image', { type: 'cover' });
      setCoverUrl('');
      markDirty();
      showToast('Cover photo removed', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove cover photo', 'error');
    }
  };


  const handleRemoveLinkLogo = async (linkId: string) => {
    try {
      await api.delete('/api/upload/image', { link_id: linkId });
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, thumbnail_url: null } : l))
      );
      showToast('Link logo removed. Fallback icon restored.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove link logo', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // Link Management Handlers
  // --------------------------------------------------------------------------

  const handleCreateNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      showToast('Title and destination URL are required.', 'error');
      return;
    }
    setSavingNewLink(true);
    try {
      let finalThumbUrl: string | null = null;
      if (newLinkLogo) {
        if (newLinkLogo.startsWith('data:image/')) {
          const uploadRes = await api.post<{ url: string }>('/api/upload/image', {
            image_data: newLinkLogo,
            type: 'link',
          });
          finalThumbUrl = uploadRes.url;
        } else {
          finalThumbUrl = newLinkLogo;
        }
      }

      const res = await api.post<{ link: LinkItem }>('/api/links', {
        title: newLinkTitle.trim(),
        destination_url: newLinkUrl.trim(),
        description: newLinkDesc.trim() || null,
        thumbnail_url: finalThumbUrl,
        is_active: true,
      });

      setLinks((prev) => [...prev, res.link]);
      setNewLinkTitle('');
      setNewLinkUrl('');
      setNewLinkDesc('');
      setNewLinkLogo('');
      setIsAddingLink(false);
      showToast('New link created with custom logo!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create link', 'error');
    } finally {
      setSavingNewLink(false);
    }
  };

  const handleToggleLinkActive = async (linkId: string, current: boolean) => {
    try {
      const updated = !current;
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, is_active: updated } : l))
      );
      await api.put(`/api/links/${linkId}`, { is_active: updated });
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle visibility', 'error');
      fetchLinks();
    }
  };

  const handleToggleLinkPinned = async (linkId: string, current: boolean) => {
    try {
      const updated = !current;
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, is_pinned: updated } : l))
      );
      await api.put(`/api/links/${linkId}`, { is_pinned: updated });
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle pin', 'error');
      fetchLinks();
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!window.confirm('Are you sure you want to delete this link?')) return;
    try {
      await api.delete(`/api/links/${linkId}`);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      showToast('Link deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete link', 'error');
    }
  };

  const handleMoveLink = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const newLinks = [...links];
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;
    setLinks(newLinks);

    try {
      await api.put('/api/links/reorder', {
        linkIds: newLinks.map((l) => l.id),
      });
    } catch {
      fetchLinks();
    }
  };

  // --------------------------------------------------------------------------
  // Social Media Links Handlers
  // --------------------------------------------------------------------------

  const handleAddSocial = (platformId: string) => {
    if (socialLinks.some((s) => s.platform === platformId)) {
      showToast('Platform is already added.', 'info');
      return;
    }
    setSocialLinks((prev) => [...prev, { platform: platformId, url: '' }]);
    markDirty();
  };

  const handleUpdateSocialUrl = (index: number, url: string) => {
    setSocialLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], url };
      return copy;
    });
    markDirty();
  };

  const handleRemoveSocial = (index: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const handleMoveSocial = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= socialLinks.length) return;
    const copy = [...socialLinks];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setSocialLinks(copy);
    markDirty();
  };

  // --------------------------------------------------------------------------
  // Appearance & Theme Handlers
  // --------------------------------------------------------------------------

  const handleSelectPreset = (presetId: string) => {
    const pDef = THEME_PRESETS[presetId];
    if (!pDef) return;
    setPreset(presetId);
    setBackgroundType(pDef.backgroundType);
    setBackgroundValue(pDef.backgroundValue);
    setButtonShape(pDef.buttonShape);
    setButtonStyle(pDef.buttonStyle);
    setButtonColor('');
    setTextColor(pDef.textColor);
    setFontFamily(pDef.fontFamily);
    markDirty();
  };

  // --------------------------------------------------------------------------
  // Username Change
  // --------------------------------------------------------------------------

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    if (!newUsername.trim()) {
      setUsernameError('Username is required.');
      return;
    }
    if (newUsername.trim() === user?.username) {
      showToast('Username unchanged.', 'info');
      return;
    }

    setSavingUsername(false);
    try {
      setSavingUsername(true);
      await api.put('/api/profile/username', { username: newUsername.trim() });
      await refreshUser();
      showToast('Username successfully updated!', 'success');
    } catch (err: any) {
      setUsernameError(err.message || 'Username unavailable.');
      showToast(err.message || 'Username unavailable', 'error');
    } finally {
      setSavingUsername(false);
    }
  };

  // --------------------------------------------------------------------------
  // Global Save & Publish
  // --------------------------------------------------------------------------

  const handleSaveAndPublish = async () => {
    setSavingGlobal(true);
    try {
      const cleanedSocials = socialLinks.filter((s) => s.platform && s.url.trim());

      await api.put('/api/profile', {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        is_public: isPublic,
        social_links: cleanedSocials,
        theme_settings: {
          preset,
          title_tagline: tagline.trim(),
          cover_url: coverUrl.trim() || undefined,
          background_type: backgroundType,
          background_value: backgroundValue,
          button_shape: buttonShape,
          button_style: buttonStyle,
          button_color: buttonColor || undefined,
          text_color: textColor,
          font_family: fontFamily,
          link_spacing: linkSpacing,
        },
      });

      await refreshUser();
      setHasUnsavedChanges(false);
      showToast('Profile and customization settings published live!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save changes.', 'error');
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleDiscardChanges = () => {
    if (profile) {
      setDisplayName(profile.display_name || (profile as any).displayName || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || (profile as any).avatarUrl || '');
      setIsPublic(profile.is_public ?? (profile as any).isPublic ?? true);
      const socials = profile.social_links || (profile as any).socialLinks || [];
      setSocialLinks(Array.isArray(socials) ? socials : []);

      const ts: Record<string, any> = profile.theme_settings || (profile as any).themeSettings || {};
      const pKey = String(ts.preset || 'default');
      const pDef = THEME_PRESETS[pKey] || THEME_PRESETS.default;

      setPreset(pKey);
      setCoverUrl(String(ts.cover_url || ''));
      setTagline(String(ts.title_tagline || ''));
      setBackgroundType((ts.background_type as any) || pDef.backgroundType);
      setBackgroundValue(String(ts.background_value || pDef.backgroundValue));
      setButtonShape((ts.button_shape as any) || pDef.buttonShape);
      setButtonStyle((ts.button_style as any) || pDef.buttonStyle);
      setButtonColor(String(ts.button_color || ''));
      setTextColor(String(ts.text_color || pDef.textColor));
      setFontFamily(String(ts.font_family || pDef.fontFamily));
      setLinkSpacing((ts.link_spacing as any) || 'normal');
    }
    setHasUnsavedChanges(false);
    showToast('Unsaved changes discarded.', 'info');
  };

  const publicUrl = `${window.location.origin}/${user?.username || 'user'}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedUrl(true);
    showToast('Public profile URL copied!', 'success');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName || user?.username}'s Links`,
          text: `Check out my links on LinkPlus!`,
          url: publicUrl,
        });
      } catch {
        handleCopyUrl();
      }
    } else {
      handleCopyUrl();
    }
  };

  // Build live preview profile object
  const previewProfileData: Profile = {
    id: profile?.id || 'preview',
    display_name: displayName || user?.username || 'Creator',
    bio: bio || null,
    avatar_url: avatarUrl || null,
    is_public: isPublic,
    social_links: socialLinks.filter((s) => s.platform && s.url.trim()),
    theme_settings: {
      preset,
      title_tagline: tagline,
      cover_url: coverUrl || undefined,
      background_type: backgroundType,
      background_value: backgroundValue,
      button_shape: buttonShape,
      button_style: buttonStyle,
      button_color: buttonColor || undefined,
      text_color: textColor,
      font_family: fontFamily,
      link_spacing: linkSpacing,
    },
  };

  // Active public visible links for the preview
  const previewLinks = links.filter((l) => l.is_active && !l.is_hidden);

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs for Uploads */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarFilePicked}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleCoverFilePicked}
      />
      <input
        ref={linkLogoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleLinkLogoPicked}
      />

      {/* Crop & Adjustment Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        imageSrc={cropImageSource}
        title={
          cropTarget.type === 'avatar'
            ? 'Crop Profile Picture'
            : cropTarget.type === 'cover'
            ? 'Crop Cover Banner'
            : 'Crop & Align Link Logo'
        }
        isCircular={cropTarget.type === 'avatar'}
        onApply={handleCropApplied}
      />

      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB] dark:border-[#343B4B]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-[#171923] dark:text-[#F9FAFB]">
              Profile Customization Studio
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isPublic
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950/50 text-[#B45309] dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isPublic ? 'Public Page' : 'Private Page'}
            </span>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
            Customize your public presence, upload independent link logos, arrange social channels, and preview live.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            leftIcon={copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedUrl ? 'Copied URL' : 'Copy URL'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareProfile}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/${user?.username}`, '_blank')}
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            View Live
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAndPublish}
            isLoading={savingGlobal}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Publish Live
          </Button>
        </div>
      </div>

      {/* Mobile Switcher (Editor vs Live Preview) */}
      <div className="xl:hidden flex items-center justify-between p-1.5 bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B]">
        <button
          type="button"
          onClick={() => setMobileViewMode('editor')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            mobileViewMode === 'editor'
              ? 'bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB] shadow-sm border border-[#E5E7EB] dark:border-[#343B4B]'
              : 'text-[#626B7A] dark:text-[#A7AFBD]'
          }`}
        >
          Editing Studio
        </button>
        <button
          type="button"
          onClick={() => setMobileViewMode('preview')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            mobileViewMode === 'preview'
              ? 'bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB] shadow-sm border border-[#E5E7EB] dark:border-[#343B4B]'
              : 'text-[#626B7A] dark:text-[#A7AFBD]'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-indigo-500" />
          Live Preview
        </button>
      </div>

      {/* Main Studio Grid (Left: Editor, Right: Live Preview) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: Editing Controls (hidden on mobile when previewing) */}
        {/* ================================================================= */}
        <div
          className={`xl:col-span-7 space-y-6 ${
            mobileViewMode === 'preview' ? 'hidden xl:block' : 'block'
          }`}
        >
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-[#E5E7EB] dark:border-[#343B4B] overflow-x-auto pb-px">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'info'
                  ? 'border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8]'
                  : 'border-transparent text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
              }`}
            >
              1. Profile Info & Photos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'links'
                  ? 'border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8]'
                  : 'border-transparent text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
              }`}
            >
              2. Links & Individual Logos
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                {links.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('socials')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'socials'
                  ? 'border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8]'
                  : 'border-transparent text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
              }`}
            >
              3. Social Channels
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'appearance'
                  ? 'border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8]'
                  : 'border-transparent text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB]'
              }`}
            >
              4. Themes & Design
            </button>
          </div>

          {/* TAB 1: Profile Information & Images */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Profile Images Card */}
              <Card>
                <div className="p-5 sm:p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Profile Photo & Cover Banner
                    </h2>
                    <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                      Upload your personal portrait and optional branded cover banner.
                    </p>
                  </div>

                  {/* Avatar upload section */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
                    <div className="relative group shrink-0">
                      <Avatar src={avatarUrl} name={displayName || 'Creator'} size="xl" />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        title="Change Photo"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1.5">
                      <div className="font-semibold text-xs sm:text-sm text-[#171923] dark:text-[#F9FAFB]">
                        Avatar Photo
                      </div>
                      <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                        PNG, JPG, or WebP up to 5 MB. Center-cropped square with transparency preserved.
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => avatarInputRef.current?.click()}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        {avatarUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cover banner section */}
                  <div className="space-y-3 p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-[#171923] dark:text-[#F9FAFB]">
                          Cover Banner Image (Optional)
                        </div>
                        <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                          Wide horizontal banner displayed at the top of your public page.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => coverInputRef.current?.click()}
                          leftIcon={<ImageIcon className="w-3.5 h-3.5" />}
                        >
                          {coverUrl ? 'Change Banner' : 'Upload Banner'}
                        </Button>
                        {coverUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCover}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    {coverUrl && (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-[#343B4B]">
                        <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Bio & Details Card */}
              <Card>
                <div className="p-5 sm:p-6 space-y-4">
                  <h2 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                    Profile Details
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Display Name"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        markDirty();
                      }}
                      placeholder="e.g. Dindayal"
                    />

                    <Input
                      label="Tagline / Professional Title"
                      value={tagline}
                      onChange={(e) => {
                        setTagline(e.target.value);
                        markDirty();
                      }}
                      placeholder="e.g. Student • Creator • Dreamer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] mb-1.5">
                      Short Biography
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value);
                        markDirty();
                      }}
                      rows={3}
                      maxLength={500}
                      placeholder="Tell visitors who you are and what you create..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] placeholder-[#626B7A] dark:placeholder-[#A7AFBD]"
                    />
                    <div className="flex justify-end text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-1">
                      {bio.length}/500 characters
                    </div>
                  </div>

                  {/* Public Visibility Toggle */}
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#171923] dark:text-[#F9FAFB]">
                        Public Visibility
                      </div>
                      <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                        Allow anyone with your link to view your public profile.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => {
                          setIsPublic(e.target.checked);
                          markDirty();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#E5E7EB] dark:bg-[#343B4B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F46E5]" />
                    </label>
                  </div>
                </div>
              </Card>

              {/* Unique Username Card */}
              <Card>
                <form onSubmit={handleUpdateUsername} className="p-5 sm:p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Your Public Handle & Username
                    </h2>
                    <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                      Your unique URL will immediately update to reflect changes.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1 w-full">
                      <Input
                        label="Username"
                        leftIcon={<AtSign className="w-4 h-4 text-[#626B7A] dark:text-[#A7AFBD]" />}
                        value={newUsername}
                        onChange={(e) => {
                          setNewUsername(e.target.value);
                          setUsernameError(null);
                        }}
                        error={usernameError || undefined}
                        placeholder="yourname"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={savingUsername}
                      disabled={newUsername.trim() === user?.username || !newUsername.trim()}
                    >
                      Update Username
                    </Button>
                  </div>

                  <div className="p-3 bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] text-xs text-[#626B7A] dark:text-[#A7AFBD] flex items-center justify-between">
                    <span className="font-mono truncate">
                      {window.location.origin}/{newUsername || user?.username}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0 ml-2"
                    >
                      Copy Link
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* TAB 2: Links & Mandatory Individual Logo Upload */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              {/* Header with "+ Add New Link" action */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                    Individual Link Logos & Content
                  </h2>
                  <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                    Upload an independent logo for every link. Logos preserve transparency and contain cleanly.
                  </p>
                </div>
                {!isAddingLink && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddingLink(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Link
                  </Button>
                )}
              </div>

              {/* Inline Link Creator */}
              {isAddingLink && (
                <Card>
                  <form onSubmit={handleCreateNewLink} className="p-5 space-y-4 border-2 border-indigo-500/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#171923] dark:text-[#F9FAFB] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        Create New Link
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddingLink(false)}
                        className="text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Link Title *"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        placeholder="e.g. My YouTube Channel"
                        required
                      />
                      <Input
                        label="Destination URL *"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://..."
                        required
                      />
                    </div>

                    <Input
                      label="Optional Description"
                      value={newLinkDesc}
                      onChange={(e) => setNewLinkDesc(e.target.value)}
                      placeholder="e.g. Subscribe for weekly coding tutorials"
                    />

                    {/* Logo upload control for new link */}
                    <div className="p-3 bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-center overflow-hidden shrink-0">
                          {newLinkLogo ? (
                            <img src={newLinkLogo} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            renderLinkIcon('globe', newLinkTitle, newLinkUrl)
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#171923] dark:text-[#F9FAFB]">
                            Link Logo / Thumbnail
                          </div>
                          <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                            PNG (transparency supported), JPG, or WebP up to 5 MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            targetLinkRef.current = null;
                            linkLogoInputRef.current?.click();
                          }}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          {newLinkLogo ? 'Replace' : 'Upload Logo'}
                        </Button>
                        {newLinkLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewLinkLogo('')}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingLink(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={savingNewLink}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Save New Link
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* List of existing links with logo upload on each */}
              {loadingLinks ? (
                <div className="text-center py-10 text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                  Loading your links...
                </div>
              ) : links.length === 0 ? (
                <Card>
                  <div className="p-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] flex items-center justify-center mx-auto">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-[#171923] dark:text-[#F9FAFB]">
                      No Links Created Yet
                    </h3>
                    <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] max-w-sm mx-auto">
                      Add your first destination link and give it an independent logo or custom thumbnail.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddingLink(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create First Link
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {links.map((link, index) => {
                    const thumb = link.thumbnail_url;
                    return (
                      <Card key={link.id}>
                        <div className="p-4 sm:p-5 space-y-3.5">
                          {/* Top Row: Reorder & Status Header */}
                          <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#343B4B] pb-2.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveLink(index, 'up')}
                                className="p-1 rounded text-[#626B7A] dark:text-[#A7AFBD] hover:bg-slate-100 dark:hover:bg-[#272D3A] disabled:opacity-30"
                                title="Move Up"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === links.length - 1}
                                onClick={() => handleMoveLink(index, 'down')}
                                className="p-1 rounded text-[#626B7A] dark:text-[#A7AFBD] hover:bg-slate-100 dark:hover:bg-[#272D3A] disabled:opacity-30"
                                title="Move Down"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] ml-1">
                                #{index + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleLinkPinned(link.id, link.is_pinned)}
                                className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                                  link.is_pinned
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] border-indigo-200'
                                    : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD]'
                                }`}
                                title="Pin to top"
                              >
                                <Pin className="w-3 h-3" />
                                <span className="hidden sm:inline">Pin</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleLinkActive(link.id, link.is_active)}
                                className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                                  link.is_active
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200'
                                    : 'bg-slate-100 dark:bg-[#171923] text-slate-500 border-slate-300'
                                }`}
                                title="Toggle Visibility"
                              >
                                {link.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                <span className="hidden sm:inline">{link.is_active ? 'Active' : 'Hidden'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(link.id)}
                                className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                title="Delete link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Link Main Row: Logo Preview + Upload Controls */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B]">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Logo Container (44x44, contained without distortion) */}
                              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-1">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={link.title}
                                    className="w-full h-full object-contain rounded-lg"
                                  />
                                ) : (
                                  <div className="w-full h-full">
                                    {renderLinkIcon(link.icon, link.title, link.destination_url)}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs sm:text-sm text-[#171923] dark:text-[#F9FAFB] truncate">
                                  {link.title}
                                </div>
                                <div className="text-xs text-indigo-600 dark:text-indigo-400 truncate hover:underline font-mono">
                                  {link.destination_url}
                                </div>
                                {link.description && (
                                  <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] truncate mt-0.5">
                                    {link.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Logo Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  targetLinkRef.current = link.id;
                                  linkLogoInputRef.current?.click();
                                }}
                                leftIcon={<Upload className="w-3.5 h-3.5" />}
                              >
                                {thumb ? 'Replace Logo' : 'Upload Logo'}
                              </Button>
                              {thumb && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveLinkLogo(link.id)}
                                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Social Media Links */}
          {activeTab === 'socials' && (
            <div className="space-y-6">
              <Card>
                <div className="p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                        Social Media Channels
                      </h2>
                      <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                        Add official branded icons matching YouTube, Instagram, X, GitHub, and more.
                      </p>
                    </div>

                    {/* Add Platform Select Dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddSocial(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="text-xs px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                      >
                        <option value="" disabled>
                          + Add Social Platform...
                        </option>
                        {SOCIAL_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* List of active socials */}
                  {socialLinks.length === 0 ? (
                    <div className="p-8 text-center bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                      No social links added yet. Select a platform above to connect your profile.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {socialLinks.map((item, idx) => {
                        const meta = SOCIAL_PLATFORMS_META[item.platform.toLowerCase()];
                        const opt = SOCIAL_OPTIONS.find((o) => o.id === item.platform);
                        return (
                          <div
                            key={`${item.platform}-${idx}`}
                            className="flex items-center gap-3 p-3 bg-[#F7F8FA] dark:bg-[#171923] rounded-xl border border-[#E5E7EB] dark:border-[#343B4B]"
                          >
                            {/* Branded Icon Badge */}
                            <div
                              style={{
                                background: meta?.bg || '#4F46E5',
                                color: meta?.color || '#FFFFFF',
                              }}
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            >
                              {meta ? meta.icon({}) : <Globe className="w-4 h-4" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB] mb-1">
                                {meta?.label || item.platform}
                              </div>
                              <input
                                type="url"
                                value={item.url}
                                onChange={(e) => handleUpdateSocialUrl(idx, e.target.value)}
                                placeholder={opt?.placeholder || 'https://...'}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                              />
                            </div>

                            {/* Reorder and Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveSocial(idx, 'up')}
                                className="p-1 text-[#626B7A] dark:text-[#A7AFBD] hover:bg-slate-200 dark:hover:bg-[#272D3A] rounded disabled:opacity-30"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === socialLinks.length - 1}
                                onClick={() => handleMoveSocial(idx, 'down')}
                                className="p-1 text-[#626B7A] dark:text-[#A7AFBD] hover:bg-slate-200 dark:hover:bg-[#272D3A] rounded disabled:opacity-30"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSocial(idx)}
                                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded ml-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: Themes & Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Presets Grid */}
              <Card>
                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                      Curated Theme Presets
                    </h2>
                    <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                      Select a professionally calibrated color system designed for high readability.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.values(THEME_PRESETS).map((pDef) => (
                      <button
                        key={pDef.id}
                        type="button"
                        onClick={() => handleSelectPreset(pDef.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          preset === pDef.id
                            ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/40 bg-indigo-50/20'
                            : 'border-[#E5E7EB] dark:border-[#343B4B] hover:border-indigo-400'
                        }`}
                      >
                        <div
                          style={{ background: pDef.backgroundValue }}
                          className="w-full h-10 rounded-lg mb-2 border border-white/20 shadow-inner"
                        />
                        <div className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                          {pDef.name}
                        </div>
                        <div className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] capitalize">
                          {pDef.category} theme
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Typography & Shapes */}
              <Card>
                <div className="p-5 sm:p-6 space-y-4">
                  <h2 className="text-base font-bold text-[#171923] dark:text-[#F9FAFB]">
                    Button Shapes & Typography
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] mb-1.5">
                        Button Shape
                      </label>
                      <select
                        value={buttonShape}
                        onChange={(e) => {
                          setButtonShape(e.target.value as any);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB]"
                      >
                        <option value="rounded-full">Pill / Rounded Full</option>
                        <option value="rounded-lg">Rounded Corners (Modern)</option>
                        <option value="sharp">Sharp / Square</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] mb-1.5">
                        Font Family
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => {
                          setFontFamily(e.target.value);
                          markDirty();
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] text-[#171923] dark:text-[#F9FAFB]"
                      >
                        {CURATED_FONTS.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] mb-1.5">
                      Link Spacing
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['compact', 'normal', 'relaxed'] as const).map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => {
                            setLinkSpacing(sp);
                            markDirty();
                          }}
                          className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${
                            linkSpacing === sp
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] border-indigo-400'
                              : 'border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD]'
                          }`}
                        >
                          {sp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 bg-white/95 dark:bg-[#202430]/95 backdrop-blur-md rounded-2xl border border-[#E5E7EB] dark:border-[#343B4B] shadow-xl">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  hasUnsavedChanges ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span className="text-xs font-semibold text-[#171923] dark:text-[#F9FAFB]">
                {hasUnsavedChanges ? 'You have unsaved changes' : 'All changes published'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button variant="ghost" size="sm" onClick={handleDiscardChanges}>
                  Discard
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAndPublish}
                isLoading={savingGlobal}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save & Publish
              </Button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: Real-Time Live Preview Frame                        */}
        {/* ================================================================= */}
        <div
          className={`xl:col-span-5 sticky top-20 ${
            mobileViewMode === 'editor' ? 'hidden xl:block' : 'block'
          }`}
        >
          {/* Preview Controls Bar */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-[#202430] rounded-2xl border border-[#E5E7EB] dark:border-[#343B4B] shadow-sm mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                Live Public Preview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-md ${
                    previewDevice === 'mobile'
                      ? 'bg-white dark:bg-[#202430] text-indigo-600 shadow-sm'
                      : 'text-[#626B7A] dark:text-[#A7AFBD]'
                  }`}
                  title="Phone Preview"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-md ${
                    previewDevice === 'desktop'
                      ? 'bg-white dark:bg-[#202430] text-indigo-600 shadow-sm'
                      : 'text-[#626B7A] dark:text-[#A7AFBD]'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/${user?.username}`, '_blank')}
                className="text-xs text-[#626B7A] dark:text-[#A7AFBD]"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Device Mockup Shell */}
          <div className="flex justify-center w-full">
            {previewDevice === 'mobile' ? (
              /* Realistic Smartphone Shell */
              <div className="relative w-full max-w-[340px] sm:max-w-[360px] h-[700px] bg-slate-900 rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-800 border-4 border-slate-700/80 flex flex-col overflow-hidden">
                {/* Phone Status Bar */}
                <div className="relative z-20 flex items-center justify-between px-6 pt-3 pb-1 text-white text-[11px] font-semibold tracking-tight">
                  <span>9:41</span>
                  {/* Dynamic Island Notch */}
                  <div className="w-24 h-4 bg-black rounded-full mx-auto" />
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Inner Screen displaying live PublicProfileRenderer */}
                <div className="relative z-10 flex-1 overflow-y-auto rounded-[36px] bg-white scrollbar-none shadow-inner">
                  <PublicProfileRenderer
                    username={user?.username || 'user'}
                    profile={previewProfileData}
                    links={previewLinks}
                    isPreview={true}
                  />
                </div>

                {/* Bottom Home Indicator Bar */}
                <div className="relative z-20 pt-2 pb-1 flex justify-center">
                  <div className="w-28 h-1 bg-white/40 rounded-full" />
                </div>
              </div>
            ) : (
              /* Desktop Frame */
              <div className="w-full h-[700px] rounded-2xl border border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#171923] shadow-xl flex flex-col overflow-hidden">
                <div className="px-4 py-2 bg-[#F7F8FA] dark:bg-[#202430] border-b border-[#E5E7EB] dark:border-[#343B4B] flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 max-w-xs mx-auto px-3 py-0.5 rounded-md bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] text-[10px] text-center text-[#626B7A] dark:text-[#A7AFBD] truncate font-mono">
                    linkplus.app/{user?.username}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PublicProfileRenderer
                    username={user?.username || 'user'}
                    profile={previewProfileData}
                    links={previewLinks}
                    isPreview={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;