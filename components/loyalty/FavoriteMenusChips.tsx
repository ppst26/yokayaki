"use client";

import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import type { FavoriteMenu } from './memberProfileTypes';

interface FavoriteMenusChipsProps {
  menus: FavoriteMenu[];
  loading?: boolean;
}

export const FavoriteMenusChips: React.FC<FavoriteMenusChipsProps> = ({
  menus,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="h-9 bg-white/60 dark:bg-neutral-900/60 rounded-xl animate-pulse" />
    );
  }

  if (menus.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-neutral-500 font-semibold">
        ยังไม่มีข้อมูลเมนูโปรด
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
        <UtensilsCrossed className="w-3.5 h-3.5" />
        เมนูโปรด
      </span>
      {menus.map(menu => (
        <span
          key={menu.menu_item_id}
          className="badge-pill bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900/50"
        >
          {menu.name}
          <span className="ml-1 opacity-70">×{menu.total_quantity}</span>
        </span>
      ))}
    </div>
  );
};
