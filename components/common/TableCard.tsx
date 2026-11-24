"use client";

import React from 'react';
import { ShoppingBag, Receipt, BellRing, Armchair, Users } from 'lucide-react';
import { getTableMeta } from '@/lib/floorLayout';

export interface Table {
  id: string;
  table_number: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at?: string;
}

interface TableCardProps {
  table: Table;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onClick,
  className = '',
  style,
  compact = false,
}) => {
  const isOccupied = table.status === 'occupied';
  const isCheckingOut = table.status === 'checking_out';
  const meta = getTableMeta(table.table_number);

  // Card Background & Ring Styling
  const getCardStyle = () => {
    if (isCheckingOut) {
      return 'bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-600/40 animate-pulse ring-4 ring-red-400/50 border-transparent';
    }
    if (isOccupied) {
      return 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 border-transparent';
    }
    if (meta.isBar) {
      return 'app-card text-slate-900 dark:text-neutral-100 border-amber-900/10 dark:border-amber-500/20 hover:border-amber-500/40 dark:hover:border-amber-400/30';
    }
    return 'app-card text-slate-900 dark:text-neutral-100 hover:border-slate-300 dark:hover:border-white/15';
  };

  // Status Indicator (Dot + Label)
  const renderStatus = () => {
    if (isCheckingOut) {
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-xs sm:text-sm font-semibold text-white">
            เรียกเช็คบิล
          </span>
        </div>
      );
    }
    if (isOccupied) {
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-white shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-white">
            มีลูกค้า
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
        <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          ว่าง
        </span>
      </div>
    );
  };

  // Action Footer Text & Icon
  const getActionInfo = () => {
    if (isCheckingOut) {
      return {
        label: 'เช็คบิล / ชำระเงิน',
        labelColor: 'text-red-100 font-medium',
        icon: <BellRing className="w-5 h-5 text-white/90 animate-bounce" />,
      };
    }
    if (isOccupied) {
      return {
        label: 'จัดการออเดอร์',
        labelColor: 'text-amber-100 font-medium',
        icon: <Receipt className="w-5 h-5 text-white/90" />,
      };
    }
    return {
      label: 'เปิดออเดอร์ใหม่',
      labelColor: 'text-slate-500 dark:text-neutral-400 font-normal',
      icon: (
        <ShoppingBag className="w-5 h-5 text-slate-400 dark:text-neutral-400 group-hover:text-slate-600 dark:group-hover:text-neutral-200 transition-colors" />
      ),
    };
  };

  const actionInfo = getActionInfo();

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        className={`group relative p-3 sm:p-3.5 rounded-2xl transition-all duration-200 text-left flex flex-col justify-between h-20 sm:h-24 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus-visible:outline-none overflow-hidden ${getCardStyle()} ${className}`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {meta.isBar ? (
              <Armchair className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
            ) : (
              <Users className="w-4 h-4 shrink-0 text-slate-400 dark:text-neutral-400" />
            )}
            <span
              className={`text-sm sm:text-base font-bold tracking-tight truncate ${
                isOccupied || isCheckingOut
                  ? 'text-white'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {meta.label}
            </span>
          </div>
          {renderStatus()}
        </div>

        <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
          <span className={`line-clamp-1 ${actionInfo.labelColor}`}>
            {actionInfo.label}
          </span>
          <span
            className={`font-medium shrink-0 ${
              isOccupied || isCheckingOut
                ? 'text-white/80'
                : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            {meta.capacityLabel}
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`group relative p-4 sm:p-5 rounded-[24px] transition-all duration-200 text-left flex flex-col justify-between h-32 sm:h-36 cursor-pointer active:scale-[0.98] outline-none focus:outline-none focus-visible:outline-none overflow-hidden ${getCardStyle()} ${className}`}
    >
      {/* Top Row: Table Name + Capacity + Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
              isOccupied || isCheckingOut
                ? 'text-white'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {meta.label}
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              isOccupied || isCheckingOut
                ? 'bg-black/20 text-white/90'
                : meta.isBar
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
            }`}
          >
            {meta.capacityLabel}
          </span>
        </div>
        {renderStatus()}
      </div>

      {/* Bottom Row: Action Prompt + Clean Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs sm:text-sm line-clamp-1 ${actionInfo.labelColor}`}>
          {actionInfo.label}
        </span>
        <div className="shrink-0 flex items-center justify-center">
          {actionInfo.icon}
        </div>
      </div>
    </button>
  );
};
