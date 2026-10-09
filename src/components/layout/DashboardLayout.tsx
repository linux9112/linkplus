import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User as UserIcon,
  Link2,
  QrCode,
  BarChart3,
  Palette,
  Settings,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import DatabaseSetupBanner from '../ui/DatabaseSetupBanner';
import { useToast } from '../ui/Toast';

export const DashboardLayout: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const profileUrl = `${window.location.origin}/${user?.username || ''}`;
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard/links', label: 'My Links', icon: Link2 },
    { to: '/dashboard/profile', label: 'My Profile', icon: UserIcon },
    { to: '/dashboard/qr', label: 'QR Code', icon: QrCode },
    { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/dashboard/appearance', label: 'Appearance', icon: Palette },
    { to: '/dashboard/settings', label: 'Account Settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ to: '/dashboard/admin', label: 'Admin Panel', icon: ShieldAlert });
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showToast('Public profile URL copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Failed to copy URL', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = profile?.display_name || (profile as any)?.displayName || user?.username || 'Creator';
  const avatarUrl = profile?.avatar_url ?? (profile as any)?.avatarUrl ?? null;

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] text-[#171923] dark:text-[#F9FAFB] flex flex-col">
      <DatabaseSetupBanner />

      <div className="flex-1 flex">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-[#202430] border-r border-[#E5E7EB] dark:border-[#343B4B] shrink-0 sticky top-0 h-screen">
          {/* Brand Logo Header */}
          <div className="px-6 py-5 border-b border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="LinkPlus Logo"
                className="w-8 h-8 rounded-lg object-cover shadow-sm border border-[#E5E7EB] dark:border-[#343B4B]"
              />
              <span className="text-xl font-bold tracking-tight text-[#171923] dark:text-[#F9FAFB]">
                LinkPlus
              </span>
            </Link>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1] border border-[#4F46E5]/20">
                Admin
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold dark:bg-[#272D3A] dark:text-[#6366F1]'
                        : 'text-[#626B7A] hover:text-[#171923] hover:bg-slate-50 dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB] dark:hover:bg-[#272D3A]/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom User Card */}
          <div className="p-4 border-t border-[#E5E7EB] dark:border-[#343B4B] bg-slate-50/50 dark:bg-[#171923]/40">
            <div className="flex items-center gap-3 mb-3">
              <Avatar src={avatarUrl} name={displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#171923] dark:text-[#F9FAFB] truncate">{displayName}</p>
                <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] truncate">@{user?.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#626B7A] hover:text-[#B91C1C] dark:text-[#A7AFBD] dark:hover:text-[#EF4444] bg-white dark:bg-[#202430] hover:bg-red-50 dark:hover:bg-red-950/20 border border-[#E5E7EB] dark:border-[#343B4B] hover:border-[#B91C1C]/30 transition-colors shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#202430]/90 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#343B4B] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-[#272D3A] text-[#171923] dark:text-[#F9FAFB] hover:bg-slate-200"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/" className="lg:hidden flex items-center gap-2">
                <img
                  src="/logo.jpg"
                  alt="LinkPlus Logo"
                  className="w-8 h-8 rounded-lg object-cover border border-[#E5E7EB] dark:border-[#343B4B]"
                />
                <span className="font-bold text-[#171923] dark:text-[#F9FAFB]">LinkPlus</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2 bg-[#F1F3F7] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3.5 py-1.5 text-xs">
                <span className="text-[#626B7A] dark:text-[#A7AFBD]">Your Link:</span>
                <a
                  href={`/${user?.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-medium text-[#4F46E5] dark:text-[#6366F1] hover:underline truncate max-w-[240px]"
                >
                  {profileUrl}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#272D3A] hover:bg-slate-50 dark:hover:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] text-xs font-medium text-[#171923] dark:text-[#F9FAFB] shadow-sm transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
              <a
                href={`/${user?.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-medium text-white shadow-sm transition-colors"
              >
                <span>View Public Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </header>

          {/* Mobile Drawer Navigation */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-72 max-w-full bg-white dark:bg-[#202430] border-r border-[#E5E7EB] dark:border-[#343B4B] h-full flex flex-col z-10 shadow-elevated">
                <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/logo.jpg"
                      alt="LinkPlus Logo"
                      className="w-8 h-8 rounded-lg object-cover border border-[#E5E7EB] dark:border-[#343B4B]"
                    />
                    <span className="font-bold text-[#171923] dark:text-[#F9FAFB]">LinkPlus</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-[#626B7A] hover:text-[#171923] dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                            isActive
                              ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold dark:bg-[#272D3A] dark:text-[#6366F1]'
                              : 'text-[#626B7A] hover:text-[#171923] hover:bg-slate-50 dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB] dark:hover:bg-[#272D3A]'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-[#E5E7EB] dark:border-[#343B4B]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-[#B91C1C] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Page Outlet */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;