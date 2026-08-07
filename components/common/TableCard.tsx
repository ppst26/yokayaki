"use client";

import React from 'react';
import { ShoppingBag, Receipt } from 'lucide-react';

export interface Table {
  id: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at?: string;
}

interface TableCardProps {
  table: Table;
  onClick: () => void;
  className?: string;
}

export const TableCard: React.FC<TableCardProps> = ({ table, onClick, className = '' }) => {
  const isOccupied = table.status === 'occupied';

  return (
    <button
      onClick={onClick}
      className={`group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition duration-200 text-left flex flex-col justify-between h-40 sm:h-48 cursor-pointer active:scale-95 overflow-hidden ${
        isOccupied
          ? 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700 text-white shadow-lg shadow-red-500/20'
          : 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
        <span className={`text-lg sm:text-2xl font-black ${isOccupied ? 'text-white' : 'text-slate-900 dark:text-neutral-100'}`}>
          โต๊ะ {table.id}
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider shrink-0 self-start sm:self-auto ${
            isOccupied
              ? 'bg-white/20 backdrop-blur-xs text-white border border-white/30'
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
          }`}
        >
          {isOccupied ? 'มีลูกค้า' : 'ว่าง (Vacant)'}
        </span>
      </div>

      <div className={`flex items-center justify-between pt-2 sm:pt-4 border-t ${
        isOccupied ? 'border-white/20' : 'border-slate-100 dark:border-neutral-800/80'
      }`}>
        <span className={`text-[11px] sm:text-xs font-bold line-clamp-1 ${
          isOccupied ? 'text-red-100' : 'text-slate-500 dark:text-neutral-400'
        }`}>
          {isOccupied ? 'จัดการออเดอร์' : 'เปิดออเดอร์ใหม่'}
        </span>
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition shrink-0 ${
            isOccupied
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 group-hover:bg-red-600 group-hover:text-white'
          }`}
        >
          {isOccupied ? <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </div>
      </div>
    </button>
  );
};
