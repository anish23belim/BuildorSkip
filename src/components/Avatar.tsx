'use client';

import { useState, useEffect } from 'react';

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
}

export default function Avatar({ url, name, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if url changes
  useEffect(() => {
    setImgError(false);
  }, [url]);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-14 h-14 text-xl font-bold',
    xxl: 'w-20 h-20 text-3xl font-bold',
  };

  const initial = name ? name[0]?.toUpperCase() : 'U';

  const showImage = url && !imgError;

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold select-none ${
        sizeClasses[size]
      } ${
        showImage ? 'bg-gray-100' : 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white'
      } ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name || 'User Avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
