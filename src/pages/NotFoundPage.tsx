import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] text-[#171923] dark:text-[#F9FAFB] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center text-[#4F46E5] mb-6 shadow-sm">
        <Compass className="w-8 h-8" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] mb-2">Error 404</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#171923] dark:text-[#F9FAFB] mb-3">Page Not Found</h1>
      <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] max-w-md mb-8">
        The page you are looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Go Home</span>
        </Link>
        <Link
          to="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] hover:bg-[#F7F8FA] text-[#171923] dark:text-[#F9FAFB] text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;