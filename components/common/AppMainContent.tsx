"use client";

import type { ReactNode } from 'react';

type AppMainContentProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function AppMainContent({ children, className = '', innerClassName = '' }: AppMainContentProps) {
  return (
    <main className={`app-main relative z-0 min-w-0 flex-1 ${className}`}>
      <div className="app-main__canvas min-h-full">
        <div className={`app-main__inner relative z-10 ${innerClassName}`}>{children}</div>
      </div>
    </main>
  );
}
