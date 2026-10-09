import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#171923] dark:text-[#F9FAFB] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#626B7A] dark:text-[#A7AFBD]">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full ${leftIcon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 bg-white dark:bg-[#171923] border ${
            error
              ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-[#B91C1C]/10'
              : 'border-[#E5E7EB] dark:border-[#343B4B] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] dark:focus:ring-[#272D3A]'
          } rounded-xl text-[#171923] dark:text-[#F9FAFB] placeholder-[#626B7A] dark:placeholder-[#A7AFBD] text-sm focus:outline-none transition-colors ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-[#B91C1C] flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-[#626B7A] dark:text-[#A7AFBD]">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;