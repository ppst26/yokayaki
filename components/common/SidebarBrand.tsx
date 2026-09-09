"use client";

import Image from 'next/image';
import { getLogoForTheme } from '@/lib/branding';

type SidebarBrandProps = {
  size?: 'sm' | 'md' | 'compact';
  showSubtitle?: boolean;
  theme: 'light' | 'dark';
};

export function SidebarBrand({ size = 'md', showSubtitle = false, theme }: SidebarBrandProps) {
  const logoSrc = getLogoForTheme(theme);

  if (size === 'compact') {
    return (
      <div className="flex justify-center">
        <Image
          src={logoSrc}
          alt="Yo-Yaki Izakaya"
          width={40}
          height={40}
          priority
          className="h-10 w-10 rounded-lg object-contain"
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Image
        src={logoSrc}
        alt="Yo-Yaki Izakaya"
        width={1024}
        height={347}
        priority
        className={`h-auto rounded-xl ${size === 'sm' ? 'max-w-[148px]' : 'w-full'}`}
      />
      {showSubtitle ? (
        <p
          className={`font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 ${
            size === 'sm' ? 'mt-1 text-[9px]' : 'mt-2 text-[10px] md:text-xs'
          }`}
        >
          MANAGEMENT SYSTEM
        </p>
      ) : null}
    </div>
  );
}
