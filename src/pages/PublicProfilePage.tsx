import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, QrCode, Flag, Sparkles, ArrowLeft, Copy, Check } from 'lucide-react';
import { api } from '../api/client';
import type { Profile, Link as LinkItem } from '../types/index';
import PublicProfileRenderer from '../components/profile/PublicProfileRenderer';
import StyledQrCanvas from '../components/qr/StyledQrCanvas';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profileUser, setProfileUser] = useState<{ username: string }>({ username: username || '' });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or misleading link');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!username) return;
    let active = true;
    setLoading(true);
    setNotFound(false);

    const searchParams = new URLSearchParams(window.location.search);
    const refParam = searchParams.get('ref');

    api
      .get(`/api/public/${encodeURIComponent(username)}`, {
        params: refParam ? { ref: refParam } : undefined,
      })
      .then((res) => {
        if (!active) return;
        setProfileUser(res.user || { username });
        setProfile(res.profile);
        setLinks(res.links || []);

        // Update document title & Open Graph meta tags dynamically
        const displayName = res.profile?.display_name || res.profile?.displayName || username;
        document.title = `${displayName} (@${res.user?.username || username}) | LinkPlus`;
      })
      .catch(() => {
        if (!active) return;
        setNotFound(true);
        document.title = 'Profile Not Found | LinkPlus';
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [username]);

  const publicUrl = `${window.location.origin}/${profileUser.username || username}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || username} on LinkPlus`,
          text: profile?.bio || `Check out @${username}'s links`,
          url: publicUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    showToast('Profile URL copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setSubmittingReport(true);
    try {
      await api.post(`/api/public/${encodeURIComponent(username)}/report`, {
        reason: reportReason,
        details: reportDetails,
      });
      showToast('Report submitted to our moderation team.', 'success');
      setReportModalOpen(false);
      setReportDetails('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading profile..." />;
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] text-[#171923] dark:text-[#F9FAFB] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center text-[#4F46E5] mb-5 shadow-sm">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#171923] dark:text-[#F9FAFB] mb-2">Profile Not Found</h1>
        <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] max-w-md mb-8">
          The profile <span className="text-[#171923] dark:text-white font-mono font-semibold">@{username}</span> does not exist, has been set to private, or is currently unavailable.
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] hover:bg-[#F7F8FA] text-sm font-semibold text-[#171923] dark:text-white flex items-center gap-2 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            to={`/signup?username=${encodeURIComponent(username || '')}`}
            className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-sm font-semibold text-white shadow-sm transition-colors"
          >
            Claim @{username}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Floating Share & QR Action Buttons */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setQrModalOpen(true)}
          className="p-2.5 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/80 text-[#171923] dark:text-white backdrop-blur-md border border-[#E5E7EB] dark:border-white/15 shadow-sm transition-transform hover:scale-105 cursor-pointer"
          title="View QR Code"
          aria-label="View QR Code"
        >
          <QrCode className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/80 text-[#171923] dark:text-white backdrop-blur-md border border-[#E5E7EB] dark:border-white/15 shadow-sm transition-transform hover:scale-105 cursor-pointer"
          title="Share Profile"
          aria-label="Share Profile"
        >
          {copied ? <Check className="w-4 h-4 text-[#15803D]" /> : <Share2 className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />}
        </button>
      </div>

      <PublicProfileRenderer
        username={profileUser.username || username || ''}
        profile={profile}
        links={links}
        onReportClick={() => setReportModalOpen(true)}
      />

      {/* Visitor QR Code Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={`Scan @${profileUser.username}'s QR Code`}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <StyledQrCanvas
            url={`${publicUrl}?ref=qr`}
            foregroundColor="#171923"
            backgroundColor="#ffffff"
            dotStyle="rounded"
            cornerStyle="rounded"
            size={260}
          />
          <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] font-mono break-all">{publicUrl}</p>
          <Button
            variant="secondary"
            onClick={handleShare}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            Copy Profile Link
          </Button>
        </div>
      </Modal>

      {/* Report Profile/Link Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Profile or Link"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-white focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="Spam or misleading link">Spam or misleading link</option>
              <option value="Malware or phishing URL">Malware or phishing URL</option>
              <option value="Impersonation">Impersonation</option>
              <option value="Abusive or harmful content">Abusive or harmful content</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5">
              Additional Details
            </label>
            <textarea
              rows={3}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Provide any context or the specific link title..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl text-sm text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setReportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={submittingReport}
              leftIcon={<Flag className="w-4 h-4" />}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PublicProfilePage;