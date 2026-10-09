import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ label?: string; fullScreen?: boolean }> = ({
  label = 'Loading...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#626B7A] dark:text-[#A7AFBD]">
      <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5] dark:text-[#6366F1]" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#171923] flex items-center justify-center">{content}</div>;
  }

  return content;
};

export default LoadingSpinner;