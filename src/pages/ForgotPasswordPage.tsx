import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { ApiError } from '../types/index';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please provide your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/api/auth/forgot-password', {
        email: cleanEmail,
      });
      setSuccessMessage(
        res.message || 'If that email is registered, a password reset link has been sent.'
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to request password reset. Please try again.');
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
            Reset password
          </h2>
          <p className="mt-1.5 text-sm text-[#626B7A] dark:text-[#A7AFBD]">
            Enter your email to receive recovery instructions.
          </p>
        </div>

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

          {successMessage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#171923] dark:text-white">Check your inbox</h3>
              <p className="text-sm text-[#424B5A] dark:text-[#A7AFBD] leading-relaxed">
                {successMessage}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to sign in
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5"
                >
                  Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#626B7A] dark:text-[#A7AFBD]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] text-sm focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-[#626B7A] dark:text-[#A7AFBD] hover:text-[#171923] dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
