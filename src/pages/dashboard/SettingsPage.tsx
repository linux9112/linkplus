import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  KeyRound,
  LogOut,
  User,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in both your current and new passwords.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171923] dark:text-[#F9FAFB]">
          Account Settings
        </h1>
        <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] mt-1">
          Manage your account credentials, password security, and active session.
        </p>
      </div>

      {/* Account Overview Card - Clean & Verified */}
      <Card title="Account Overview" subtitle="Server-side authenticated profile status">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD] uppercase tracking-wider">
                <User className="w-3.5 h-3.5" />
                <span>Username</span>
              </div>
              <p className="text-base font-bold text-[#171923] dark:text-[#F9FAFB] mt-1">@{user?.username}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#626B7A] dark:text-[#A7AFBD] uppercase tracking-wider">
                <Mail className="w-3.5 h-3.5" />
                <span>Email Address</span>
              </div>
              <p className="text-base font-bold text-[#171923] dark:text-[#F9FAFB] mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-[#15803D] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#171923] dark:text-[#F9FAFB]">
                  Account Status: Active & Verified
                </p>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                  Your account is fully verified. Full access to links, QR Studio, and analytics is unlocked.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#15803D] text-white">
              Verified
            </span>
          </div>
        </div>
      </Card>

      {/* Change Password Card */}
      <Card
        title="Change Password"
        subtitle="Hashed with 12-round bcrypt before storing in MySQL"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-[#B91C1C] dark:text-red-300">
              {passwordError}
            </div>
          )}

          <Input
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="password"
              label="New Password (Min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<KeyRound className="w-4 h-4" />}
            />
            <Input
              type="password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<KeyRound className="w-4 h-4" />}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              isLoading={changingPassword}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Session Security Card */}
      <Card title="Session Security" subtitle="Protected by HTTP-only SameSite cookies">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] max-w-xl leading-relaxed">
            Your session token is stored strictly in an <code className="font-mono text-[#4F46E5] dark:text-[#6366F1]">HttpOnly</code> cookie and verified against the MySQL <code className="font-mono text-[#4F46E5] dark:text-[#6366F1]">sessions</code> table. No credentials or auth tokens are stored in <code className="font-mono text-[#4F46E5] dark:text-[#6366F1]">localStorage</code>.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => logout()}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;