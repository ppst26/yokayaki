"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Delete, Lock, Clock, ShieldAlert } from 'lucide-react';

const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const PinPad: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const { loginWithPin, error, isLoading, isLockedOut, remainingLockoutSeconds } = useAuth();

  const handleNumberClick = (num: string) => {
    if (isLoading || isLockedOut || pin.length >= 6) return;

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
    if (isLoading || isLockedOut) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLoading || isLockedOut) return;
    setPin('');
  };

  if (isLockedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 p-4 font-sans relative">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 rounded-3xl p-8 shadow-xl relative z-10 text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-center shadow-md mx-auto mb-4 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-black text-slate-900 dark:text-neutral-100 mb-1 tracking-tight">
            ระบบถูกล็อคชั่วคราว
          </h1>
          <p className="text-slate-500 dark:text-neutral-400 text-xs font-semibold mb-6 leading-relaxed">
            ระบุรหัส PIN ไม่ถูกต้องเกิน 3 ครั้ง เพื่อความปลอดภัย กรุณารอจนกว่าเวลานับถอยหลังจะหมด
          </p>

          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 mb-6 inline-flex flex-col items-center justify-center w-full shadow-inner">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>เวลานับถอยหลัง</span>
            </div>
            <div className="text-4xl font-black font-mono text-red-600 dark:text-red-400 tracking-wider">
              {formatCountdown(remainingLockoutSeconds)}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
            ระบบจะปลดล็อคให้อัตโนมัติเมื่อครบกำหนด 3 นาที
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 p-4 font-sans relative">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8 shadow-xl relative z-10">
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-md shadow-red-600/20 mb-4 text-white">
            <Lock className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-neutral-100">
            YOKAYAKI <span className="text-red-600">POS</span>
          </h1>
          <p className="text-slate-500 dark:text-neutral-400 text-xs mt-1.5 font-semibold">
            กรุณาใส่รหัส PIN 6 หลักเพื่อเข้าใช้งาน
          </p>
        </div>

        {/* PIN Indicators */}
        <div
          className={`flex justify-center gap-4 mb-8 ${isShaking ? 'animate-bounce' : ''}`}
          style={isShaking ? { animation: 'shake 0.5s ease-in-out' } : undefined}
        >
          {[...Array(6)].map((_, i) => {
            const isActive = pin.length > i;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-red-600 scale-110 shadow-xs'
                    : 'bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-6 mb-6 flex items-center justify-center">
          {error && (
            <p className="text-rose-600 dark:text-rose-400 text-xs font-bold text-center bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-4 py-1 rounded-full animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* PinPad Buttons */}
        <div className="grid grid-cols-3 gap-3.5 max-w-sm mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              disabled={isLoading}
              onClick={() => handleNumberClick(num)}
              className="h-16 text-xl font-extrabold bg-slate-50 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-neutral-700 hover:border-red-300 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center shadow-xs text-slate-800 dark:text-neutral-100 cursor-pointer"
            >
              {num}
            </button>
          ))}

          <button
            disabled={isLoading}
            onClick={handleClear}
            className="h-16 text-xs font-bold bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-slate-600 dark:text-neutral-300 cursor-pointer"
          >
            ล้าง (C)
          </button>

          <button
            disabled={isLoading}
            onClick={() => handleNumberClick('0')}
            className="h-16 text-xl font-extrabold bg-slate-50 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-neutral-700 hover:border-red-300 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-slate-800 dark:text-neutral-100 cursor-pointer"
          >
            0
          </button>

          <button
            disabled={isLoading}
            onClick={handleBackspace}
            className="h-16 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-slate-600 dark:text-neutral-300 cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center transition-all duration-300">
            <div className="w-9 h-9 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-red-600 dark:text-red-400 font-extrabold text-xs tracking-wider animate-pulse">
              กำลังตรวจสอบสิทธิ์...
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};
