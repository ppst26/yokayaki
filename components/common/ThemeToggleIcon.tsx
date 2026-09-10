"use client";

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Theme } from '@/lib/theme';

interface ThemeToggleIconProps {
  /** ธีมปัจจุบัน — ไอคอนที่โชว์คือ "ธีมปลายทาง" (light → โชว์ Moon) */
  theme: Theme;
  /** คลาสกำหนดขนาดกล่อง เช่น "w-4 h-4" */
  className?: string;
}

/** ไอคอนสลับธีม — Sun/Moon ซ้อนกัน หมุนเข้า/ออกแทนการสลับแบบกระตุก */
export const ThemeToggleIcon: React.FC<ThemeToggleIconProps> = ({ theme, className }) => (
  <span className={cn('theme-icon-swap', className)} aria-hidden="true">
    <Moon className={cn('theme-icon', theme === 'light' && 'theme-icon--active')} />
    <Sun className={cn('theme-icon', theme === 'dark' && 'theme-icon--active')} />
  </span>
);
