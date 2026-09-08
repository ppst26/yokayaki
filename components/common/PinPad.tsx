"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { CircleX, Clock, Delete, ShieldAlert } from 'lucide-react';
import { AuthGlassPanel, AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { getLogoForTheme } from '@/lib/branding';

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
      <AuthScreenLayout panel="pinpad">
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
    <AuthScreenLayout panel="pinpad">
      <div className="auth-card pinpad relative">
        <Image
          src={getLogoForTheme('dark')}
          alt="Yo-Yaki Izakaya"
          width={1024}
          height={347}
          priority
          className="pinpad__logo"
        />

        <div className={`pinpad__dots${isShaking ? ' is-shaking' : ''}`}>
          {[...Array(6)].map((_, i) => (
            <span key={i} className={pin.length > i ? 'is-filled' : undefined} />
          ))}
        </div>

        {error ? <p className="pinpad__error">{error}</p> : null}

        <div className="pinpad__keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              disabled={isPinLoading}
              onClick={() => handleNumberClick(num)}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={isPinLoading}
            onClick={handleClear}
            aria-label="ล้าง PIN"
          >
            <CircleX aria-hidden />
          </button>

          <button
            type="button"
            disabled={isPinLoading}
            onClick={() => handleNumberClick('0')}
          >
            0
          </button>

          <button
            type="button"
            disabled={isPinLoading}
            onClick={handleBackspace}
            aria-label="ลบตัวเลข"
          >
            <Delete aria-hidden />
          </button>
        </div>

        {isPinLoading && (
          <div className="pinpad__loading">
            <div className="pinpad__loading-spinner" />
            <p className="pinpad__loading-text">กำลังตรวจสอบสิทธิ์...</p>
          </div>
        )}
      </div>
    </AuthScreenLayout>
  );
};
