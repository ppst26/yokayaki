"use client";

import type { ReactNode } from 'react';

type AppMainContentProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** ยืด canvas/inner ให้สูงเท่า viewport ของ main (หน้า POS ที่ต้อง h-full) */
  fillHeight?: boolean;
};

export function AppMainContent({
  children,
  className = '',
  innerClassName = '',
  fillHeight = false,
}: AppMainContentProps) {
  return (
    <main
      className={`app-main relative z-0 min-w-0 flex-1 ${
        fillHeight ? 'flex min-h-0 flex-col' : ''
      } ${className}`}
    >
      <div
        className={`app-main__canvas ${
          fillHeight ? 'flex min-h-0 flex-1 flex-col' : 'min-h-full'
        }`}
      >
        <div
          className={`app-main__inner relative z-10 ${
            fillHeight ? 'flex min-h-0 flex-1 flex-col' : ''
          } ${innerClassName}`}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
