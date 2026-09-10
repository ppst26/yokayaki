"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export type ActionFeedbackVariant = 'success' | 'error' | 'warning' | 'info';

export type ActionFeedbackOptions = {
  variant?: ActionFeedbackVariant;
  title: string;
  description?: string;
  confirmLabel?: string;
  autoCloseMs?: number;
};

type ActionFeedbackContextValue = {
  showActionFeedback: (options: ActionFeedbackOptions) => void;
};

const ActionFeedbackContext = createContext<ActionFeedbackContextValue | null>(null);

const VARIANT_CONFIG: Record<
  ActionFeedbackVariant,
  {
    icon: React.ReactNode;
    iconWrap: string;
    titleClass: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-9 w-9" />,
    iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    titleClass: 'text-emerald-900 dark:text-emerald-100',
  },
  error: {
    icon: <AlertCircle className="h-9 w-9" />,
    iconWrap: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
    titleClass: 'text-rose-900 dark:text-rose-100',
  },
  warning: {
    icon: <AlertTriangle className="h-9 w-9" />,
    iconWrap: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    titleClass: 'text-amber-900 dark:text-amber-100',
  },
  info: {
    icon: <Info className="h-9 w-9" />,
    iconWrap: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    titleClass: 'text-blue-900 dark:text-blue-100',
  },
};

function ActionFeedbackDialog({
  options,
  onClose,
}: {
  options: ActionFeedbackOptions;
  onClose: () => void;
}) {
  const variant = options.variant ?? 'info';
  const config = VARIANT_CONFIG[variant];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 app-dialog-backdrop animate-in fade-in-50 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-feedback-title"
      onClick={onClose}
    >
      <div
        className="app-dialog w-full max-w-sm p-6 shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${config.iconWrap}`}
        >
          {config.icon}
        </div>

        <div className="space-y-2">
          <h3
            id="action-feedback-title"
            className={`text-base font-black tracking-tight ${config.titleClass}`}
          >
            {options.title}
          </h3>
          {options.description ? (
            <p className="text-xs font-semibold leading-relaxed text-slate-500 dark:text-neutral-400">
              {options.description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-crimson w-full rounded-xl py-2.5 text-sm font-extrabold text-white transition active:scale-[0.98] cursor-pointer"
        >
          {options.confirmLabel ?? 'ตกลง'}
        </button>
      </div>
    </div>
  );
}

export function ActionFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ActionFeedbackOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState(null);
  }, []);

  const showActionFeedback = useCallback(
    (options: ActionFeedbackOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setState(options);

      const autoCloseMs =
        options.autoCloseMs ??
        (options.variant === 'success' || options.variant === 'info' ? 3500 : 0);

      if (autoCloseMs > 0) {
        timerRef.current = setTimeout(close, autoCloseMs);
      }
    },
    [close],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ActionFeedbackContext.Provider value={{ showActionFeedback }}>
      {children}
      {state ? <ActionFeedbackDialog options={state} onClose={close} /> : null}
    </ActionFeedbackContext.Provider>
  );
}

export function useActionFeedback() {
  const ctx = useContext(ActionFeedbackContext);
  if (!ctx) {
    throw new Error('useActionFeedback must be used within ActionFeedbackProvider');
  }
  return ctx;
}
