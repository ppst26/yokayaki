"use client";

import React from 'react';
import { Sparkles, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type MinimalAlertVariant = 'promotion' | 'warning' | 'error' | 'info' | 'success';

interface MinimalAlertProps {
  variant?: MinimalAlertVariant;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const VARIANT_CONFIGS: Record<
  MinimalAlertVariant,
  {
    bgClass: string;
    borderClass: string;
    textClass: string;
    defaultIcon: React.ReactNode;
  }
> = {
  promotion: {
    bgClass: 'bg-red-50/70 dark:bg-red-950/25',
    borderClass: 'border-red-200/80 dark:border-red-900/50',
    textClass: 'text-red-700 dark:text-red-300',
    defaultIcon: <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />,
  },
  warning: {
    bgClass: 'bg-amber-50/70 dark:bg-amber-950/25',
    borderClass: 'border-amber-200/80 dark:border-amber-900/50',
    textClass: 'text-amber-800 dark:text-amber-300',
    defaultIcon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
  },
  error: {
    bgClass: 'bg-rose-50/70 dark:bg-rose-950/25',
    borderClass: 'border-rose-200/80 dark:border-rose-900/50',
    textClass: 'text-rose-700 dark:text-rose-300',
    defaultIcon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
  },
  info: {
    bgClass: 'bg-blue-50/70 dark:bg-blue-950/25',
    borderClass: 'border-blue-200/80 dark:border-blue-900/50',
    textClass: 'text-blue-700 dark:text-blue-300',
    defaultIcon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
  },
  success: {
    bgClass: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    borderClass: 'border-emerald-200/80 dark:border-emerald-900/50',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    defaultIcon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  },
};

export const MinimalAlert: React.FC<MinimalAlertProps> = ({
  variant = 'info',
  icon,
  title,
  description,
  badge,
  onClose,
  className = '',
}) => {
  const config = VARIANT_CONFIGS[variant];

  return (
    <div
      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${config.bgClass} ${config.borderClass} ${config.textClass} text-xs transition-all ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon ?? config.defaultIcon}
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-bold">{title}</span>
          {description && (
            <span className="font-normal opacity-90 truncate max-w-full">
              — {description}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          typeof badge === 'string' ? (
            <span className="px-2 py-0.5 rounded-md bg-red-600 dark:bg-red-500 text-white text-[10px] font-black tracking-wide shadow-xs">
              {badge}
            </span>
          ) : (
            badge
          )
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition cursor-pointer"
            aria-label="ปิดแจ้งเตือน"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
