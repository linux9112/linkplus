import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#343B4B] bg-[#F7F8FA]/60 dark:bg-[#171923]/40">
      <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] dark:bg-[#272D3A] text-[#4F46E5] dark:text-[#6366F1] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="text-base font-semibold text-[#171923] dark:text-[#F9FAFB] mb-1">{title}</h4>
      <p className="text-sm text-[#626B7A] dark:text-[#A7AFBD] max-w-md mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;