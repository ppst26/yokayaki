"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CircleX, Clock, Delete, ShieldAlert } from 'lucide-react';
import {
  AuthBrandHeader,
  AuthGlassPanel,
  AuthScreenLayout,
  authKeypadButtonClass,
  authKeypadIconButtonClass,
} from '@/components/auth/AuthScreenLayout';

const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const PinPad: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const { loginWithPin, error, isPinLoading, isLockedOut, remainingLockoutSeconds } = useAuth();

  const handleNumberClick = (num: string) => {
    if (isPinLoading || isLockedOut || pin.length >= 6) return;

    const nextPin = pin + num;
    setPin(nextPin);

    if (nextPin.length === 6) {
      triggerLogin(nextPin);
    }
  };

  const triggerLogin = async (enteredPin: string) => {
    const success = await loginWithPin(enteredPin);
    if (!success) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  const handleBackspace = () => {
    if (isPinLoading || isLockedOut) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isPinLoading || isLockedOut) return;
    setPin('');
  };

  if (isLockedOut) {
    return (
      <AuthScreenLayout>
        <AuthGlassPanel className="items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/40 bg-red-500/10 text-red-300">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <h1 className="mb-1 text-xl font-bold tracking-tight text-white">ระบบถูกล็อคชั่วคราว</h1>
          <p className="mb-6 text-xs font-medium leading-relaxed text-white/60">
            ระบุรหัส PIN ไม่ถูกต้องเกิน 3 ครั้ง เพื่อความปลอดภัย กรุณารอจนกว่าเวลานับถอยหลังจะหมด
          </p>

          <div className="mb-6 inline-flex w-full flex-col items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-300">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>เวลานับถอยหลัง</span>
            </div>
            <div className="font-mono text-4xl font-bold tracking-wider text-red-200">
              {formatCountdown(remainingLockoutSeconds)}
            </div>
          </div>

          <p className="text-[11px] font-medium text-white/45">
            ระบบจะปลดล็อคให้อัตโนมัติเมื่อครบกำหนด 3 นาที
          </p>
        </AuthGlassPanel>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout>
      <AuthGlassPanel>
        <AuthBrandHeader compact />

        <div
          className="mb-6 flex shrink-0 justify-center gap-5"
          style={isShaking ? { animation: 'shake 0.5s ease-in-out' } : undefined}
        >
          {[...Array(6)].map((_, i) => {
            const isActive = pin.length > i;
            return (
              <div
                key={i}
                className={`h-3 w-3 rounded-full border transition-all duration-200 ${
                  isActive ? 'border-white bg-white' : 'border-white/80 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error ? (
          <p className="mb-4 shrink-0 text-center text-xs font-semibold text-red-300 animate-fade-in">{error}</p>
        ) : null}

        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              disabled={isPinLoading}
              onClick={() => handleNumberClick(num)}
              className={`${authKeypadButtonClass} cursor-pointer`}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={isPinLoading}
            onClick={handleClear}
            aria-label="ล้าง PIN"
            className={`${authKeypadIconButtonClass} cursor-pointer`}
          >
            <CircleX className="h-6 w-6 stroke-[1.5]" />
          </button>

          <button
            type="button"
            disabled={isPinLoading}
            onClick={() => handleNumberClick('0')}
            className={`${authKeypadButtonClass} cursor-pointer`}
          >
            0
          </button>

          <button
            type="button"
            disabled={isPinLoading}
            onClick={handleBackspace}
            aria-label="ลบตัวเลข"
            className={`${authKeypadIconButtonClass} cursor-pointer`}
          >
            <Delete className="h-6 w-6 stroke-[1.5]" />
          </button>
        </div>

        {isPinLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] bg-black/70 backdrop-blur-sm">
            <div className="mb-3 h-9 w-9 animate-spin rounded-full border-3 border-white border-t-transparent" />
            <p className="animate-pulse text-xs font-semibold tracking-wider text-white/80">
              กำลังตรวจสอบสิทธิ์...
            </p>
          </div>
        )}
      </AuthGlassPanel>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </AuthScreenLayout>
  );
};
