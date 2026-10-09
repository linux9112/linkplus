import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/index';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  // Strictly three user-facing form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      errors.username = 'Username is required';
    } else if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      errors.username = 'Username must be 3-30 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      errors.username = 'Only letters, numbers, hyphens, and underscores allowed';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Strictly 3 fields sent to auth service
      await signup(username.trim(), email.trim(), password);
      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.field === 'username') {
          setFieldErrors((prev) => ({ ...prev, username: err.message }));
        } else if (err.field === 'email') {
          setFieldErrors((prev) => ({ ...prev, email: err.message }));
        } else if (err.field === 'password') {
          setFieldErrors((prev) => ({ ...prev, password: err.message }));
        } else {
          // If error is a network or CORS connectivity issue, display a clean, user-friendly message
          const isCorsOrNetworkError =
            err.status === 0 ||
            (err.message &&
              (err.message.includes('CORS') ||
                err.message.includes('Failed to fetch') ||
                err.message.includes('Network') ||
                err.message.includes('not allowed by CORS')));

          if (isCorsOrNetworkError) {
            setGeneralError(
              'Unable to connect to the authentication service. Please check your network connection or try again shortly.'
            );
          } else {
            setGeneralError(err.message);
          }
        }
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
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
            Create your account
          </h2>
          <p className="mt-1.5 text-sm text-[#626B7A] dark:text-[#A7AFBD]">
            Set up your unified bio-link and QR Studio in seconds.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl p-6 sm:p-8 shadow-sm">
          {generalError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Field 1: Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#626B7A] dark:text-[#A7AFBD]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  placeholder="yourname"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border ${
                    fieldErrors.username
                      ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-2 focus:ring-[#FEF2F2]'
                      : 'border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF]'
                  } rounded-xl text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] text-sm focus:outline-none transition-colors`}
                />
              </div>
              {fieldErrors.username ? (
                <p className="mt-1.5 text-xs text-[#B91C1C] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.username}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[#626B7A] dark:text-[#A7AFBD]">
                  Your profile URL: linkplus.app/{username.trim().toLowerCase() || 'yourname'}
                </p>
              )}
            </div>

            {/* Field 2: Email address */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5"
              >
                Email address
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
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="alex@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border ${
                    fieldErrors.email
                      ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-2 focus:ring-[#FEF2F2]'
                      : 'border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF]'
                  } rounded-xl text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] text-sm focus:outline-none transition-colors`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-[#B91C1C] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Field 3: Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#626B7A] dark:text-[#A7AFBD] mb-1.5"
              >
                Password
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
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••••••"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171923] border ${
                    fieldErrors.password
                      ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-2 focus:ring-[#FEF2F2]'
                      : 'border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF]'
                  } rounded-xl text-[#171923] dark:text-white placeholder-[#626B7A] dark:placeholder-[#A7AFBD] text-sm focus:outline-none transition-colors`}
                />
              </div>
              {fieldErrors.password ? (
                <p className="mt-1.5 text-xs text-[#B91C1C] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[#626B7A] dark:text-[#A7AFBD]">At least 8 characters</p>
              )}
            </div>

            {/* Benefits Highlight */}
            <div className="pt-1">
              <div className="flex items-center gap-2 text-xs text-[#424B5A] dark:text-[#A7AFBD]">
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                <span>Instant profile with high-res QR Studio</span>
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
                  Creating your account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 text-center text-sm text-[#626B7A] dark:text-[#A7AFBD]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
