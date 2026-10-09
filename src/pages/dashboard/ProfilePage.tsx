import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Globe,
  Lock,
  Save,
  Plus,
  Trash2,
  AtSign,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Camera,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { processImageFileToDataUri } from '../../utils/imageUpload';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';

const SOCIAL_PLATFORMS = [
  { id: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourhandle' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { id: 'github', label: 'GitHub', placeholder: 'https://github.com/yourusername' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
  { id: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
  { id: 'email', label: 'Email (mailto:)', placeholder: 'mailto:you@example.com' },
];

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [confirmUsernameChange, setConfirmUsernameChange] = useState(false);
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || (profile as any).displayName || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || (profile as any).avatarUrl || '');
      setIsPublic(profile.is_public ?? (profile as any).isPublic ?? true);
      const socials = profile.social_links || (profile as any).socialLinks || [];
      setSocialLinks(Array.isArray(socials) ? socials : []);
    }
    if (user) {
      setNewUsername(user.username);
    }
  }, [profile, user]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUri = await processImageFileToDataUri(file, 400);
      const res = await api.post<{ avatar_url: string }>('/api/profile/avatar', {
        image_data: dataUri,
      });
      setAvatarUrl(res.avatar_url);
      await refreshUser();
      showToast('Profile photo uploaded and saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload profile photo', 'error');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const cleanedSocials = socialLinks.filter((s) => s.platform && s.url.trim());
      await api.put('/api/profile', {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        is_public: isPublic,
        social_links: cleanedSocials,
      });
      await refreshUser();
      showToast('Profile details saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddSocial = () => {
    setSocialLinks((prev) => [...prev, { platform: 'twitter', url: '' }]);
  };

  const handleRemoveSocial = (idx: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(undefined);

    const cleaned = newUsername.trim();
    if (!cleaned || cleaned === user?.username) {
      showToast('Username is unchanged', 'info');
      return;
    }

    if (!confirmUsernameChange) {
      setUsernameError('Please check the confirmation box before changing your public URL.');
      return;
    }

    setSavingUsername(true);
    try {
      await api.put('/api/profile/username', { username: cleaned });
      await refreshUser();
      setConfirmUsernameChange(false);
      showToast(`Username changed to @${cleaned}!`, 'success');
    } catch (err: any) {
      setUsernameError(err.message || 'Could not update username');
    } finally {
      setSavingUsername(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171923] dark:text-[#F9FAFB]">
          My Profile
        </h1>
        <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
          Manage your public identity, profile photo, bio, social handles, and visibility.
        </p>
      </div>

      {/* Main Profile Details Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <Card title="Profile Identity & Visibility" subtitle="Displayed at the top of your public page">
          <div className="space-y-5">
            {/* Avatar Upload + Preview + URL */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
              <div className="relative group shrink-0">
                <Avatar src={avatarUrl} name={displayName || user?.username} size="xl" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold"
                  title="Upload Profile Photo"
                >
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span>Change</span>
                </button>
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    isLoading={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Upload Photo
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl('')}
                      leftIcon={<X className="w-3.5 h-3.5" />}
                    >
                      Remove
                    </Button>
                  )}
                  <span className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                    JPG, PNG, WebP or GIF (auto-cropped)
                  </span>
                </div>

                <Input
                  label="Or Direct Image URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  helperText="Upload a photo from your device above, or paste an external image link."
                />
              </div>
            </div>

            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name or Brand"
              leftIcon={<User className="w-4 h-4" />}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#171923] dark:text-[#F9FAFB]">
                  Bio
                </label>
                <span className="text-xs text-[#626B7A]">{bio.length}/500</span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short bio about what you do..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-[#F9FAFB] placeholder-[#626B7A] dark:placeholder-[#A7AFBD] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF]"
              />
            </div>

            {/* Public Visibility Toggle */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    isPublic
                      ? 'bg-emerald-100 text-[#15803D] dark:bg-emerald-950/30 dark:text-[#86EFAC]'
                      : 'bg-amber-100 text-[#B45309] dark:bg-amber-950/30 dark:text-[#FCD34D]'
                  }`}
                >
                  {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#171923] dark:text-[#F9FAFB]">
                    {isPublic ? 'Public Profile Enabled' : 'Public Profile Disabled (Private)'}
                  </p>
                  <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                    {isPublic
                      ? `Anyone can visit /${user?.username} without logging in.`
                      : 'Visitors will see a 404 page until you re-enable visibility.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isPublic ? 'bg-[#4F46E5]' : 'bg-[#E5E7EB] dark:bg-[#343B4B]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Social Icons Editor */}
        <Card
          title="Social Handles & Links"
          subtitle="Displayed as icon buttons on your public profile"
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddSocial}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Handle
            </Button>
          }
        >
          {socialLinks.length === 0 ? (
            <p className="text-xs text-[#626B7A] text-center py-4">
              No social icons added yet. Click &ldquo;Add Handle&rdquo; to link Twitter, Instagram, GitHub, etc.
            </p>
          ) : (
            <div className="space-y-3">
              {socialLinks.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <select
                    value={item.platform}
                    onChange={(e) => {
                      const updated = [...socialLinks];
                      updated[idx] = { ...updated[idx], platform: e.target.value };
                      setSocialLinks(updated);
                    }}
                    className="sm:w-44 px-3.5 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-[#F9FAFB]"
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => {
                      const updated = [...socialLinks];
                      updated[idx] = { ...updated[idx], url: e.target.value };
                      setSocialLinks(updated);
                    }}
                    placeholder={
                      SOCIAL_PLATFORMS.find((p) => p.id === item.platform)?.placeholder || 'https://...'
                    }
                    className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-[#F9FAFB] placeholder-[#626B7A]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSocial(idx)}
                    className="p-2.5 rounded-xl text-[#B91C1C] hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 transition-colors"
                    title="Remove handle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#E5E7EB] dark:border-[#343B4B] flex justify-end">
            <Button
              type="submit"
              isLoading={savingProfile}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </Card>
      </form>

      {/* Username Change Card */}
      <Card
        title="Public Username & Handle"
        subtitle="Change your public URL address with real-time uniqueness validation"
      >
        <form onSubmit={handleUsernameSubmit} className="space-y-4">
          <Input
            label="Unique Username"
            value={newUsername}
            onChange={(e) => {
              setNewUsername(e.target.value);
              setUsernameError(undefined);
            }}
            error={usernameError}
            leftIcon={<AtSign className="w-4 h-4" />}
            helperText={`Public URL: ${window.location.origin}/${newUsername.trim().toLowerCase() || 'username'}`}
          />

          <label className="flex items-start gap-2.5 text-xs text-[#626B7A] dark:text-[#A7AFBD] cursor-pointer">
            <input
              type="checkbox"
              checked={confirmUsernameChange}
              onChange={(e) => setConfirmUsernameChange(e.target.checked)}
              className="mt-0.5 rounded border-[#E5E7EB] text-[#4F46E5] focus:ring-[#4F46E5]"
            />
            <span>
              I understand that changing my username changes my profile link (<code className="font-mono text-[#4F46E5]">/{user?.username}</code>).
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-[#626B7A] dark:text-[#A7AFBD]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Reserved system paths (admin, api, dashboard, etc.) are protected.</span>
            </div>
            <Button
              type="submit"
              variant="secondary"
              isLoading={savingUsername}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Update Username
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;