import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  QrCode,
  BarChart3,
  Smartphone,
  ChevronRight,
  Youtube,
  Instagram,
  Github,
  Twitter,
  Mail,
  BookOpen,
  FolderGit2,
  CheckCircle2,
  X,
  ShieldCheck,
  Layers,
  Palette,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DatabaseSetupBanner from '../components/ui/DatabaseSetupBanner';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col relative overflow-x-hidden font-sans">
      <DatabaseSetupBanner />

      {/* Ambient background soft glow effects matching screenshot */}
      <div className="absolute top-12 right-12 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-72 right-1/4 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-36 left-12 w-[300px] h-[300px] bg-purple-50/50 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.jpg"
              alt="LinkPlus Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-slate-200 group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              LinkPlus
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#templates"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Templates
            </a>
            <a
              href="#resources"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Resources
            </a>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to={`/${user?.username}`}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900"
                >
                  @{user?.username}
                </Link>
                <Link
                  to="/dashboard"
                  className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-10 pb-20 lg:pt-16 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-7 text-left">
            {/* Pill Tag */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF2FF] border border-[#E0E7FF] text-[#4F46E5] text-xs sm:text-sm font-bold mb-6 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#4F46E5] fill-[#4F46E5]/20" />
              <span>Your All-in-One Link in Bio</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl sm:text-6xl lg:text-[68px] font-black tracking-tight text-slate-900 leading-[1.12]"
            >
              Share Everything That{' '}
              <span className="text-[#4F46E5] relative inline-block">
                Matters
                <span className="absolute left-0 bottom-1 w-full h-1.5 bg-[#4F46E5]/20 rounded-full" />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed"
            >
              Create a beautiful link in bio page, share your content, grow your audience, and
              track performance — all in one place with LinkPlus.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/signup"
                className="px-7 py-3.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Get Started Free
              </Link>
              <button
                type="button"
                onClick={() => setDemoModalOpen(true)}
                className="px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-base shadow-sm transition-all hover:border-slate-300 active:scale-[0.98] cursor-pointer"
              >
                See Demo
              </button>
            </motion.div>

            {/* 4 Feature Highlights directly underneath buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-6"
            >
              <div className="flex flex-col items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#4F46E5]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  Beautiful Profiles
                </span>
              </div>

              <div className="flex flex-col items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#4F46E5]">
                  <QrCode className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  QR Code Generator
                </span>
              </div>

              <div className="flex flex-col items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#4F46E5]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  Detailed Analytics
                </span>
              </div>

              <div className="flex flex-col items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[#4F46E5]">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  Easy to Use
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: High-Fidelity Smartphone Mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative w-full max-w-[340px] sm:max-w-[360px]"
            >
              {/* Soft decorative shadow circle */}
              <div className="absolute inset-0 bg-indigo-300/30 rounded-[56px] blur-2xl transform scale-95 translate-y-6 -z-10" />

              {/* Smartphone Outer Shell */}
              <div className="rounded-[50px] p-3.5 bg-slate-900 border-[8px] border-slate-900 shadow-2xl relative">
                {/* Speaker & Camera Pill Notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-800 mr-2" />
                  <div className="w-10 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Smartphone Screen Inner */}
                <div className="rounded-[40px] overflow-hidden bg-gradient-to-b from-[#FAF5FF] via-white to-[#F0F7FF] px-5 pt-12 pb-7 text-center border border-white/60 shadow-inner">
                  {/* Creator Photo Avatar */}
                  <div className="relative mx-auto w-20 h-20 mb-3">
                    <img
                      src="/avatar.png"
                      alt="Dindayal"
                      className="w-20 h-20 rounded-full object-cover object-[center_35%] border-3 border-white shadow-md mx-auto"
                    />
                  </div>

                  {/* Profile Name & Bio */}
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">@dindayal</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Student • Creator • Dreamer
                  </p>

                  {/* Social Icon Pills */}
                  <div className="flex items-center justify-center gap-2.5 mt-4">
                    <a
                      href="#social"
                      onClick={(e) => e.preventDefault()}
                      className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-red-600 hover:scale-110 transition-transform"
                      aria-label="YouTube"
                    >
                      <Youtube className="w-4 h-4 fill-red-600 text-red-600" />
                    </a>
                    <a
                      href="#social"
                      onClick={(e) => e.preventDefault()}
                      className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-pink-600 hover:scale-110 transition-transform"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                    <a
                      href="#social"
                      onClick={(e) => e.preventDefault()}
                      className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 hover:scale-110 transition-transform"
                      aria-label="Twitter / X"
                    >
                      <Twitter className="w-4 h-4 fill-slate-900" />
                    </a>
                    <a
                      href="#social"
                      onClick={(e) => e.preventDefault()}
                      className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 hover:scale-110 transition-transform"
                      aria-label="GitHub"
                    >
                      <Github className="w-4 h-4 fill-slate-900" />
                    </a>
                  </div>

                  {/* Clean Links Stack matching user screenshot */}
                  <div className="mt-5 space-y-2.5 text-left">
                    {/* Link 1: YouTube */}
                    <div className="p-2.5 pr-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md flex items-center justify-between gap-3 transition-all hover:scale-[1.01] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-red-500/20">
                          <Youtube className="w-5 h-5 fill-white" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-800">
                          My YouTube Channel
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {/* Link 2: My Projects */}
                    <div className="p-2.5 pr-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md flex items-center justify-between gap-3 transition-all hover:scale-[1.01] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/20">
                          <FolderGit2 className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-800">
                          My Projects
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {/* Link 3: Study Notes */}
                    <div className="p-2.5 pr-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md flex items-center justify-between gap-3 transition-all hover:scale-[1.01] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/20">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-800">
                          Study Notes
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {/* Link 4: Contact Me */}
                    <div className="p-2.5 pr-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md flex items-center justify-between gap-3 transition-all hover:scale-[1.01] cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-purple-500/20">
                          <Mail className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-800">
                          Contact Me
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>

                  {/* Bottom subtle indicator */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Powered by LinkPlus</span>
                    <span className="inline-flex items-center gap-1 text-[#4F46E5]">
                      <QrCode className="w-3 h-3" />
                      Scan Ready
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Anchor Section */}
      <section id="features" className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-20 border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[#4F46E5] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Built for Modern Creators</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything you need in one creator hub
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            From scheduled links to real-time analytics and custom high-resolution QR codes, LinkPlus gives you complete control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Layers,
              title: 'Dynamic Link Management',
              desc: 'Drag-and-drop reordering, scheduled drops, pinned highlights, click tracking, and custom badge labels.',
            },
            {
              icon: QrCode,
              title: 'Print-Ready QR Studio',
              desc: 'Real Level-H scannable QR codes verified with jsQR. Export high-res PNG & SVG with customizable dots and colors.',
            },
            {
              icon: Palette,
              title: 'Curated Theme Presets',
              desc: 'Select from clean Light, Dark, Neo-Brutalist, and Aurora themes with live draft preview before publishing.',
            },
            {
              icon: BarChart3,
              title: 'Privacy-First Analytics',
              desc: 'Track profile views, link clicks, CTR, referrers, and device categories directly in MySQL with zero raw IP retention.',
            },
            {
              icon: ShieldCheck,
              title: 'Self-Hosted Data Security',
              desc: 'Backed by dedicated MySQL tables, bcrypt password hashing, and HttpOnly session cookies — you own your data.',
            },
            {
              icon: Smartphone,
              title: '100% Mobile Optimized',
              desc: 'Fluid responsive layout looks stunning across smartphones, tablets, and desktop displays with instant load speeds.',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#4F46E5]/40 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing / Free Forever Section */}
      <section id="pricing" className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-20 border-t border-slate-200">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Simple, Transparent Access
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Everything you need to launch and grow your bio-link presence is included.
          </p>
        </div>

        <div className="max-w-md mx-auto bg-white border-2 border-[#4F46E5] rounded-3xl p-8 shadow-xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4F46E5] text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-sm">
            Creator Edition
          </div>
          <div className="text-center pb-6 border-b border-slate-100">
            <h3 className="text-2xl font-black text-slate-900">100% Free</h3>
            <p className="text-xs text-slate-500 mt-1">Full-featured self-hosted MySQL platform</p>
          </div>
          <ul className="py-6 space-y-3.5 text-sm text-slate-700">
            {[
              'Unlimited links & drag-and-drop reordering',
              'High-resolution scannable QR Studio (PNG & SVG)',
              'Privacy-conscious visitor analytics & CTR tracking',
              'Custom themes, fonts, and button shapes',
              'Device photo upload & direct MySQL storage',
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/signup"
            className="w-full block text-center py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-md shadow-indigo-500/25 transition-all"
          >
            Claim Your Free Profile
          </Link>
        </div>
      </section>

      {/* Templates Preview Section */}
      <section id="templates" className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-20 border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Every Personality
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Choose from clean minimalist, gradient, neo-brutalist, and high-contrast themes.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Minimal Daylight', bg: '#F8FAFC', text: '#1E293B', btn: '#4F46E5' },
            { name: 'Aurora Glass', bg: '#0F172A', text: '#F8FAFC', btn: '#6366F1' },
            { name: 'Ocean Breeze', bg: '#F0F9FF', text: '#0369A1', btn: '#0284C7' },
            { name: 'Sunset Glow', bg: '#FFF7ED', text: '#C2410C', btn: '#EA580C' },
          ].map((t, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center"
            >
              <div
                style={{ backgroundColor: t.bg }}
                className="w-full h-24 rounded-xl mb-3 border border-slate-100 flex flex-col items-center justify-center gap-1.5 shadow-inner"
              >
                <div
                  style={{ backgroundColor: t.btn }}
                  className="w-16 h-3 rounded-full shadow-sm"
                />
                <div
                  style={{ backgroundColor: t.btn }}
                  className="w-20 h-3 rounded-full opacity-70"
                />
              </div>
              <p className="text-xs font-bold text-slate-800">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / Resources */}
      <footer id="resources" className="mt-auto border-t border-slate-200 bg-white py-10 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="LinkPlus Logo" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-bold text-slate-900">LinkPlus</span>
            <span>— The Modern Bio-Link & QR Studio Platform</span>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link to="/login" className="hover:text-slate-900 transition-colors">
              Login
            </Link>
            <Link to="/signup" className="hover:text-slate-900 transition-colors">
              Sign Up
            </Link>
            <Link to="/dashboard" className="hover:text-slate-900 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>

      {/* Interactive Demo Modal */}
      <AnimatePresence>
        {demoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative"
            >
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F46E5]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Live Demo Profile</h3>
                  <p className="text-xs text-slate-500">Preview what your visitors will experience</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center my-4">
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  Ready to test a real public profile with tracked redirects & QR code?
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Link
                    to="/signup"
                    onClick={() => setDemoModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-md transition-all"
                  >
                    Create Your Profile in 30 Seconds
                  </Link>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDemoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;