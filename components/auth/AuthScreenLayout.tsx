"use client";

import Image from 'next/image';
import type { ReactNode } from 'react';
import { getLogoForTheme, resolveBranding, type BrandingAssets } from '@/lib/branding';

type AuthScreenLayoutProps = {
  children: ReactNode;
  branding?: BrandingAssets | null;
};

export function AuthScreenLayout({ children, branding }: AuthScreenLayoutProps) {
  const assets = resolveBranding(branding);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${assets.loginBackground}')` }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 md:justify-end md:pr-[7%] md:pl-8">
        <div className="w-full max-w-[400px] md:w-[38vw] md:min-w-[340px] md:max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}

type AuthGlassPanelProps = {
  children: ReactNode;
  className?: string;
};

export function AuthGlassPanel({ children, className = '' }: AuthGlassPanelProps) {
  return (
    <div
      className={`relative flex flex-col rounded-[28px] border border-white/20 bg-black/55 px-8 py-8 backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

type AuthBrandHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  branding?: BrandingAssets | null;
  compact?: boolean;
};

export function AuthBrandHeader({ title, subtitle, branding, compact = false }: AuthBrandHeaderProps) {
  return (
    <div className={`flex shrink-0 flex-col items-center text-center ${compact ? 'mb-6' : 'mb-8'}`}>
      <Image
        src={getLogoForTheme('dark', branding)}
        alt="Yo-Yaki Izakaya"
        width={1024}
        height={347}
        priority
        className="h-auto w-full max-w-[300px]"
      />
      {title ? <div className="mt-4 text-2xl font-black tracking-tight text-white">{title}</div> : null}
      {subtitle ? (
        <p className="mt-1.5 text-xs font-medium text-white/60">{subtitle}</p>
      ) : null}
    </div>
  );
}

/** ปุ่ม keypad บน glass panel — ตรง mockup login */
export const authKeypadButtonClass =
  'flex h-[72px] items-center justify-center rounded-2xl border border-white/35 bg-transparent text-2xl font-medium text-white transition-colors hover:bg-white/10 active:scale-[0.97] active:bg-white/15 disabled:pointer-events-none disabled:opacity-40';

export const authKeypadIconButtonClass =
  'flex h-[72px] items-center justify-center rounded-2xl border border-white/35 bg-transparent text-white transition-colors hover:bg-white/10 active:scale-[0.97] active:bg-white/15 disabled:pointer-events-none disabled:opacity-40';

export const authGlassInputClass =
  'h-12 w-full rounded-2xl border border-white/30 bg-white/5 px-4 text-sm font-medium text-white placeholder:text-white/35 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/15';

export const authGlassSubmitClass =
  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 text-sm font-semibold tracking-wide text-white transition-all hover:bg-white/15 active:scale-[0.98] disabled:opacity-50';
