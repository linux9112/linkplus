import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  QrCode,
  BarChart3,
  Palette,
  ShieldCheck,
  ArrowRight,
  Layers,
  Globe,
  CheckCircle2,
  Database,
  Lock,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DatabaseSetupBanner from '../components/ui/DatabaseSetupBanner';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [claimName, setClaimName] = useState('');

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/signup${claimName.trim() ? `?username=${encodeURIComponent(claimName.trim())}` : ''}`);
  };

  const features = [
    {
      icon: Layers,
      title: 'Advanced Link Management',
      description:
        'Drag-and-drop reordering, pinned highlights, scheduled links, categories, UTM tags, and embedded rich media.',
    },
    {
      icon: QrCode,
      title: 'Scannable QR Code Studio',
      description:
        'Generate real Level-H QR codes verified with jsQR. Customize corner finders, gradients, center logos, and export print-ready PNG and SVG.',
    },
    {
      icon: Palette,
      title: 'Commercial SaaS Themes',
      description:
        'Select from curated light, dark, and editorial themes or craft custom fonts, button shapes, and color schemes with live draft preview.',
    },
    {
      icon: BarChart3,
      title: 'Privacy-First Analytics',
      description:
        'Track profile views, link clicks, CTR, referrers, and device categories directly in MySQL with bot filtering and zero raw IP retention.',
    },
    {
      icon: Lock,
      title: 'Hardened Security',
      description:
        'Fast 3-field signup, bcrypt password hashing, secure session management, SSRF validation, rate limiting, and tenant data isolation.',
    },
    {
      icon: Database,
      title: '100% Dedicated MySQL',
      description:
        'Powered directly by your normalized 11-table MySQL database and Prisma ORM — with no third-party vendor lock-in.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] text-[#171923] dark:text-[#F9FAFB] flex flex-col">
      <DatabaseSetupBanner />

      {/* Top Navigation */}
      <header className="border-b border-[#E5E7EB] dark:border-[#343B4B] bg-white/80 dark:bg-[#202430]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="LinkPlus Logo"
              className="w-9 h-9 rounded-xl object-cover shadow-sm border border-[#E5E7EB] dark:border-[#343B4B]"
            />
            <span className="text-xl font-bold tracking-tight text-[#171923] dark:text-white">
              LinkPlus
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={`/${user?.username}`}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white"
                >
                  @{user?.username}
                </Link>
                <Link
                  to="/dashboard"
                  className="px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-12 pb-20 lg:pt-20 lg:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF2FF] border border-[#E0E7FF] text-[#4F46E5] text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>The Bio-Link & Scannable QR Studio Platform</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#171923] dark:text-[#F9FAFB] leading-[1.12]"
          >
            One link to grow your entire{' '}
            <span className="text-[#4F46E5]">digital audience</span>.
          </motion.h1>

          <p className="mt-5 text-base sm:text-lg text-[#424B5A] dark:text-[#A7AFBD] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Create a high-converting public profile, manage scheduled links, design scannable QR codes with real-time verification, and retain 100% of your audience analytics in your dedicated MySQL database.
          </p>

          {/* Interactive Claim Bar */}
          <form
            onSubmit={handleClaimSubmit}
            className="mt-8 max-w-lg mx-auto lg:mx-0 flex flex-col sm:flex-row gap-2.5 p-1.5 bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl shadow-sm focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#EEF2FF]"
          >
            <div className="flex-1 flex items-center px-3 py-2">
              <span className="text-[#626B7A] dark:text-[#A7AFBD] text-sm font-mono select-none">
                linkplus.app/
              </span>
              <input
                type="text"
                value={claimName}
                onChange={(e) => setClaimName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder="yourname"
                className="bg-transparent text-[#171923] dark:text-white text-sm font-semibold focus:outline-none w-full ml-0.5"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              <span>Claim Your URL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Feature Highlights */}
          <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#626B7A] dark:text-[#A7AFBD]">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
              3-field instant signup
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
              High-res PNG & SVG QR Studio
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
              Privacy-first MySQL analytics
            </span>
          </div>
        </div>

        {/* Interactive Phone Mockup Showcase */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[340px] rounded-[42px] p-3 bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] shadow-xl"
          >
            <div className="rounded-[32px] overflow-hidden bg-[#F7F8FA] dark:bg-[#171923] p-6 text-center border border-[#E5E7EB] dark:border-[#343B4B]">
              <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-[#EEF2FF] border-2 border-white shadow-sm flex items-center justify-center text-xl font-bold text-[#4F46E5]">
                LP
              </div>
              <h3 className="text-base font-bold text-[#171923] dark:text-white">Aria Vance</h3>
              <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">
                @ariavance • Product Designer & Creator
              </p>

              <div className="mt-5 space-y-2.5 text-left">
                {[
                  { title: '2026 Design System Kit', badge: 'Featured' },
                  { title: 'Watch My Studio Tour on YouTube', badge: 'Video' },
                  { title: 'Book a 1:1 Architecture Session', badge: null },
                  { title: 'GitHub Open-Source Repositories', badge: null },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between gap-2 text-xs shadow-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                      <span className="font-semibold text-[#171923] dark:text-white truncate">
                        {item.title}
                      </span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#EEF2FF] text-[#4F46E5] font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-3.5 border-t border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between text-[11px] text-[#626B7A] dark:text-[#A7AFBD]">
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#4F46E5]" />
                  Mobile-Optimized
                </span>
                <span className="inline-flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-[#15803D]" />
                  Verified QR Ready
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-16 border-t border-[#E5E7EB] dark:border-[#343B4B]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#171923] dark:text-[#F9FAFB]">
            Engineered as a Complete SaaS Platform
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#424B5A] dark:text-[#A7AFBD]">
            Every feature is backed by your normalized MySQL schema, server-side validation, and real-time analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] hover:border-[#4F46E5]/40 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] dark:bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#171923] dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#424B5A] dark:text-[#A7AFBD] leading-relaxed">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E5E7EB] dark:border-[#343B4B] bg-white dark:bg-[#202430] py-8 px-4 sm:px-8 text-xs text-[#626B7A] dark:text-[#A7AFBD]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="LinkPlus Logo" className="w-5 h-5 rounded-md object-cover" />
            <span className="font-semibold text-[#171923] dark:text-white">LinkPlus Platform</span>
            <span>— Powered by React, Express, TypeScript & MySQL</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-[#171923] dark:hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/signup" className="hover:text-[#171923] dark:hover:text-white transition-colors">
              Sign Up
            </Link>
            <Link to="/dashboard" className="hover:text-[#171923] dark:hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;