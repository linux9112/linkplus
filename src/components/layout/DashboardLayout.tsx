import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  Bell,
  ChevronRight,
  Crown,
  Menu,
  X,
  Command,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import DatabaseSetupBanner from '../ui/DatabaseSetupBanner';
import { useToast } from '../ui/Toast';
import ThemeToggle from '../ui/ThemeToggle';
import { api } from '../../api/client';
import type { Link as LinkItem } from '../../types/index';

export const DashboardLayout: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [userLinks, setUserLinks] = useState<LinkItem[]>([]);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch user links for search palette
  useEffect(() => {
    api
      .get<{ links: LinkItem[] }>('/api/links')
      .then((res) => setUserLinks(res.links || []))
      .catch(() => {});
  }, []);

  // Shortcut key listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Click outside listener for notifications popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleLogout = async () => {
    await logout();
    showToast('Signed out successfully', 'info');
    navigate('/login');
  };

  const displayName = profile?.display_name || (profile as any)?.displayName || user?.username || 'Creator';
  const avatarUrl = profile?.avatar_url || (profile as any)?.avatarUrl || (profile?.theme_settings as any)?.avatar_data_url || null;

  // Filter items in quick search palette
  const filteredNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredLinks = userLinks.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.destination_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] text-[#171923] dark:text-[#F9FAFB] flex flex-col font-sans">
      <DatabaseSetupBanner />

      {/* Quick Search / Command Palette Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-[#202430] rounded-2xl border border-[#E5E7EB] dark:border-[#343B4B] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center px-4 py-3.5 border-b border-[#E5E7EB] dark:border-[#343B4B] gap-3">
              <Search className="w-5 h-5 text-[#626B7A] dark:text-[#A7AFBD] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dashboard sections or links..."
                className="w-full bg-transparent text-sm text-[#171923] dark:text-[#F9FAFB] placeholder-[#626B7A] dark:placeholder-[#A7AFBD] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs px-2 py-1 rounded bg-[#F7F8FA] dark:bg-[#171923] text-[#626B7A] dark:text-[#A7AFBD] border border-[#E5E7EB] dark:border-[#343B4B]"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] px-3 py-1">
                Dashboard Navigation
              </div>
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(item.to);
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left text-[#171923] dark:text-[#F9FAFB] hover:bg-[#EEF2FF] dark:hover:bg-[#272D3A] hover:text-[#4F46E5] transition-colors"
                  >
                    <Icon className="w-4 h-4 text-indigo-500" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {filteredLinks.length > 0 && (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] px-3 py-1 pt-2">
                    Your Links ({filteredLinks.length})
                  </div>
                  {filteredLinks.slice(0, 5).map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => {
                        navigate('/dashboard/links');
                        setSearchOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left text-[#171923] dark:text-[#F9FAFB] hover:bg-[#EEF2FF] dark:hover:bg-[#272D3A] transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold">{link.title}</span>
                        <span className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] block truncate">
                          {link.destination_url}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                        {link.click_count || 0} clicks
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pro Upgrade Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#202430] rounded-3xl border border-[#E5E7EB] dark:border-[#343B4B] shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] flex items-center justify-center mx-auto shadow-sm">
              <Crown className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#171923] dark:text-[#F9FAFB]">
              Upgrade to LinkPlus Pro
            </h3>
            <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] leading-relaxed">
              Unlock custom verified domains, unlimited link routing, real-time visitor geolocations, and priority SVG QR code styling.
            </p>
            <div className="p-3 bg-[#F7F8FA] dark:bg-[#171923] rounded-2xl text-xs text-left space-y-1.5 border border-[#E5E7EB] dark:border-[#343B4B]">
              <div className="flex items-center gap-2 text-[#15803D]">
                <span>✓</span> Unlimited link items & custom categories
              </div>
              <div className="flex items-center gap-2 text-[#15803D]">
                <span>✓</span> High-resolution QR Studio exports (SVG & PNG)
              </div>
              <div className="flex items-center gap-2 text-[#15803D]">
                <span>✓</span> Complete privacy-conscious visitor analytics
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#626B7A] hover:bg-slate-100 dark:hover:bg-[#272D3A]"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalOpen(false);
                  navigate('/dashboard/settings');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm"
              >
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* =============================================================== */}
        {/* DESKTOP SIDEBAR: Clean White / Dark Elevated Navigation         */}
        {/* =============================================================== */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-[#202430] border-r border-[#E5E7EB] dark:border-[#343B4B] shrink-0 sticky top-0 h-screen">
          {/* Logo Header */}
          <div className="px-6 py-5 border-b border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#3B82F6] flex items-center justify-center text-white shadow-sm">
                <span className="font-extrabold text-sm tracking-tight">LP</span>
              </div>
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
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8] shadow-sm'
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

          {/* Sidebar Pro Upgrade Box (Matching Screenshot Free Plan Card) */}
          <div className="p-3 mx-3 mb-2 rounded-2xl bg-[#F0F4FF] dark:bg-[#272D3A] border border-[#E0E7FF] dark:border-[#343B4B] shadow-sm">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-[#4F46E5] dark:text-[#818CF8] flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                  Free Plan
                </div>
                <div className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                  Upgrade for more features
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-colors text-center"
            >
              Upgrade Now
            </button>
          </div>

          {/* User Account Footer & Logout */}
          <div className="p-3 border-t border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430]">
            <Link
              to="/dashboard/profile"
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#272D3A] transition-colors mb-1.5"
            >
              <Avatar src={avatarUrl} name={displayName} size="sm" />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB] truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] truncate">
                  @{user?.username}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#626B7A] dark:text-[#A7AFBD]" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#626B7A] hover:text-[#B91C1C] dark:text-[#A7AFBD] dark:hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/20 border border-[#E5E7EB] dark:border-[#343B4B] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* =============================================================== */}
        {/* MAIN CONTENT AREA: Slim Topbar + Responsive Outlet              */}
        {/* =============================================================== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navigation Bar (Matching Screenshot Slim Topbar) */}
          <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#202430]/95 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#343B4B] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
            {/* Left: Mobile Toggle + Search Field */}
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-[#272D3A] text-[#171923] dark:text-[#F9FAFB] hover:bg-slate-200"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link to="/" className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4F46E5] to-[#3B82F6] flex items-center justify-center text-white font-bold text-xs">
                  LP
                </div>
                <span className="font-bold text-[#171923] dark:text-[#F9FAFB]">LinkPlus</span>
              </Link>

              {/* Functional Search Bar */}
              <div
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2.5 w-full bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] rounded-xl px-3.5 py-2 text-xs text-[#626B7A] dark:text-[#A7AFBD] cursor-pointer hover:border-[#4F46E5] transition-all"
              >
                <Search className="w-4 h-4 text-[#626B7A] dark:text-[#A7AFBD]" />
                <span className="flex-1 truncate">Search links, analytics, settings...</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD] flex items-center gap-1 shadow-2xs">
                  <Command className="w-2.5 h-2.5" />
                  K
                </span>
              </div>
            </div>

            {/* Right: Actions Toolbar & Profile Preview */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Primary "View Public Profile" button */}
              <a
                href={`/${user?.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View Public Profile</span>
              </a>

              {/* Theme Toggle Button */}
              <ThemeToggle size="md" />

              {/* Notifications Bell Dropdown */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="relative p-2 rounded-xl bg-white dark:bg-[#272D3A] border border-[#E5E7EB] dark:border-[#343B4B] text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-[#F9FAFB] shadow-sm transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#202430]" />
                </button>

                {/* Notifications Popover */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#202430] rounded-2xl border border-[#E5E7EB] dark:border-[#343B4B] shadow-2xl p-4 z-40 text-left animate-in fade-in duration-100">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#343B4B]">
                      <span className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB]">
                        Notifications
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        All Systems Normal
                      </span>
                    </div>
                    <div className="py-2 space-y-2 text-xs">
                      <div className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
                        <p className="font-semibold text-[#171923] dark:text-[#F9FAFB]">
                          Welcome to LinkPlus
                        </p>
                        <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                          Your profile is live at {profileUrl}.
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B]">
                        <p className="font-semibold text-[#171923] dark:text-[#F9FAFB]">
                          Real-Time Analytics Active
                        </p>
                        <p className="text-[11px] text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                          Daily visits and tracked link clicks are live.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Identity Header Pill */}
              <Link
                to="/dashboard/profile"
                className="flex items-center gap-2 pl-1 hover:opacity-80 transition-opacity"
              >
                <Avatar src={avatarUrl} name={displayName} size="sm" />
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-[#171923] dark:text-[#F9FAFB] leading-none">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-[#626B7A] dark:text-[#A7AFBD] leading-tight mt-0.5">
                    @{user?.username}
                  </div>
                </div>
              </Link>
            </div>
          </header>

          {/* Mobile Drawer Navigation */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-72 max-w-full bg-white dark:bg-[#202430] border-r border-[#E5E7EB] dark:border-[#343B4B] h-full flex flex-col z-10 shadow-2xl">
                <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4F46E5] to-[#3B82F6] flex items-center justify-center text-white font-bold text-xs">
                      LP
                    </div>
                    <span className="font-bold text-[#171923] dark:text-[#F9FAFB]">LinkPlus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle size="sm" />
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1.5 rounded-lg text-[#626B7A] hover:text-[#171923] dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
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
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold ${
                            isActive
                              ? 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#818CF8]'
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
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#B91C1C] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Dashboard Pages Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;