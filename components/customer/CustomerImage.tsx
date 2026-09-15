'use client';

import React, { useState, useEffect } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface CustomerImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  isSoldOut?: boolean;
}

export function CustomerImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallbackIcon,
  isSoldOut = false,
}: CustomerImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset states if src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-600 ${containerClassName}`}
      >
        {fallbackIcon || (
          <UtensilsCrossed className="h-8 w-8 opacity-30 text-neutral-500" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-neutral-800/80 ${containerClassName}`}>
      {/* Skeleton Shimmer Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 animate-pulse bg-neutral-800">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-neutral-700/20 to-transparent" />
        </div>
      )}

      {/* Actual Image with Lazy Loading & Smooth Fade-in */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${isSoldOut ? 'grayscale-[30%] opacity-45' : ''} ${className}`}
      />
    </div>
  );
}
