import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-sm focus:ring-[#4F46E5] focus:ring-offset-white dark:focus:ring-offset-[#171923]',
    secondary:
      'bg-white dark:bg-[#202430] hover:bg-slate-50 dark:hover:bg-[#272D3A] text-[#171923] dark:text-[#F9FAFB] border border-[#E5E7EB] dark:border-[#343B4B] shadow-sm focus:ring-[#4F46E5]',
    outline:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-[#272D3A] text-[#424B5A] dark:text-[#A7AFBD] border border-[#E5E7EB] dark:border-[#343B4B] focus:ring-[#4F46E5]',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-[#272D3A] text-[#626B7A] hover:text-[#171923] dark:text-[#A7AFBD] dark:hover:text-[#F9FAFB] focus:ring-[#4F46E5]',
    danger:
      'bg-[#B91C1C] hover:bg-red-800 text-white shadow-sm focus:ring-[#B91C1C]',
  };

  const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;