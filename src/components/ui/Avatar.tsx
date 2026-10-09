import React, { useState } from 'react';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  const initials = name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        loading="lazy"
        className={`${sizeMap[size]} rounded-full object-cover border border-[#E5E7EB] dark:border-[#343B4B] shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#272D3A] dark:text-[#6366F1] font-semibold flex items-center justify-center border border-[#E5E7EB] dark:border-[#343B4B] shadow-sm select-none ${className}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;