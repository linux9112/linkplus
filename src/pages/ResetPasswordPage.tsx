import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { ApiError } from '../types/index';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing or invalid password reset token. Please request a new link.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post<{ message: string }>('/api/auth/reset-password', {
        token,
        password,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reset password. The link may have expired.');
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
            Choose new password
          </h2>
          <p className="mt-1.5 text-sm text-[#626B7A] dark:text-[#A7AFBD]">
            Create a secure password to regain access to your account.
          </p>
        </div>

        <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-6 sm:p-8 shadow-sm">
          {!token && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
              <div>
                <span>No reset token provided. Please request a new password reset link.</span>
                <div className="mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-[#4F46E5] underline font-medium hover:text-[#4338CA]"
                  >
                    Go to forgot password page
                  </Link>
                </div>
              </div>
            </div>
          )}

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

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#171923] dark:text-white">Password Updated!</h3>
              <p className="text-sm text-[#424B5A] dark:text-[#A7AFBD]">
                Your password has been changed successfully. Redirecting you to sign in...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                >
                  Click here if not redirected automatically
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#626B7A] dark:text-[#A7AFBD]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] text-sm focus:outline-none transition-colors"
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#626B7A] dark:text-[#A7AFBD]">Minimum 8 characters</p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#626B7A] dark:text-[#A7AFBD]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] text-sm focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white transition-colors"
                >
                  Return to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
