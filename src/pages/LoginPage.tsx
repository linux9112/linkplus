import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/index';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grab redirect destination if provided in location state
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setError('Please provide your username or email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanIdentifier, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#171923] dark:text-[#F9FAFB]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sm:mx-auto sm:w-full sm:max-w-md px-4"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <img
              src="/logo.jpg"
              alt="LinkPlus Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-[#E5E7EB] dark:border-[#343B4B] group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-bold tracking-tight text-[#171923] dark:text-white">
              LinkPlus
            </span>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171923] dark:text-[#F9FAFB]">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-[#626B7A] dark:text-[#A7AFBD]">
            Sign in to manage your profile links and QR Studio.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-6 sm:p-8 shadow-sm">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Identifier */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5"
              >
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@example.com or username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl text-[#171923] dark:text-white placeholder-[#9CA3AF] text-sm focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD]"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl text-[#171923] dark:text-white placeholder-[#9CA3AF] text-sm focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 text-center text-sm text-[#626B7A] dark:text-[#A7AFBD]">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
