import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#202430] border border-[#E5E7EB] dark:border-[#343B4B] rounded-2xl shadow-card transition-shadow ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="px-5 sm:px-6 py-4 border-b border-[#E5E7EB] dark:border-[#343B4B] flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-base font-semibold text-[#171923] dark:text-[#F9FAFB]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#626B7A] dark:text-[#A7AFBD] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
};

export default Card;