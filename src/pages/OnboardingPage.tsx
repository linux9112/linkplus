import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Palette, Link2, User, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { processImageFileToDataUri } from '../utils/imageUpload';
import { THEME_PRESETS } from '../components/profile/PublicProfileRenderer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import { useToast } from '../components/ui/Toast';

export const OnboardingPage: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState(profile?.display_name || user?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('default');

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      showToast('Profile photo uploaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfileStep = async () => {
    setSaving(true);
    try {
      await api.put('/api/profile', {
        display_name: displayName.trim() || user?.username,
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        theme_settings: {
          ...(profile?.theme_settings || {}),
          preset: selectedPreset,
        },
      });
      await refreshUser();
      if (step === 1) setStep(2);
      else if (step === 2) setStep(3);
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (linkTitle.trim() && linkUrl.trim()) {
        const normalizedUrl = /^https?:\/\//i.test(linkUrl.trim())
          ? linkUrl.trim()
          : `https://${linkUrl.trim()}`;

        await api.post('/api/links', {
          title: linkTitle.trim(),
          destination_url: normalizedUrl,
        });
      }
      await refreshUser();
      showToast('Welcome to LinkPlus! Your profile is live.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      showToast(err.message || 'Could not add link', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] text-[#171923] dark:text-[#F9FAFB] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <img
              src="/logo.jpg"
              alt="LinkPlus Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-[#E5E7EB] dark:border-[#343B4B]"
            />
            <span className="text-2xl font-bold text-[#171923] dark:text-white">LinkPlus Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171923] dark:text-[#F9FAFB]">
            Let&apos;s customize @{user?.username}
          </h1>
          <div className="flex items-center justify-center gap-2.5 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  step >= s ? 'w-12 bg-[#4F46E5]' : 'w-8 bg-[#E5E7EB] dark:bg-[#343B4B]'
                }`}
              />
            ))}
          </div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-6 sm:p-8 shadow-sm"
        >
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#4F46E5] text-xs font-bold uppercase tracking-wider">
                <User className="w-4 h-4" />
                <span>Step 1 of 3 • Profile Identity</span>
              </div>
              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name or Brand"
              />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
                  Bio (Optional)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell visitors what you build or create..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF]"
                />
              </div>
              <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] flex flex-col sm:flex-row items-center gap-4">
                <Avatar src={avatarUrl} name={displayName || user?.username} size="lg" />
                <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePhotoUpload}
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
                      Upload Profile Photo
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
                  </div>
                  <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                    JPG, PNG, WebP or GIF auto-cropped to square.
                  </p>
                </div>
              </div>

              <Input
                label="Or Avatar Image URL (Optional)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProfileStep}
                  isLoading={saving}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Theme
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#4F46E5] text-xs font-bold uppercase tracking-wider">
                <Palette className="w-4 h-4" />
                <span>Step 2 of 3 • Choose a Theme Preset</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.values(THEME_PRESETS).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedPreset === preset.id
                        ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20 bg-[#EEF2FF] dark:bg-[#4F46E5]/10'
                        : 'border-[#E5E7EB] dark:border-[#343B4B] bg-[#F7F8FA] dark:bg-[#202430] hover:border-[#D1D5DB]'
                    }`}
                  >
                    <div
                      style={{ background: preset.backgroundValue }}
                      className="w-full h-14 rounded-lg mb-2 border border-[#E5E7EB]/40 shadow-inner"
                    />
                    <p className="text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] truncate">{preset.name}</p>
                    <p className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] capitalize">{preset.category}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleSaveProfileStep}
                  isLoading={saving}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to First Link
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleFinish} className="space-y-4">
              <div className="flex items-center gap-2 text-[#4F46E5] text-xs font-bold uppercase tracking-wider">
                <Link2 className="w-4 h-4" />
                <span>Step 3 of 3 • Add Your First Link</span>
              </div>
              <Input
                label="Link Title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="My Portfolio / Website / YouTube"
              />
              <Input
                label="Destination URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
              <div className="flex items-center justify-between pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/dashboard', { replace: true })}
                >
                  Skip for now
                </Button>
                <Button
                  type="submit"
                  isLoading={saving}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Launch My Profile
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingPage;
