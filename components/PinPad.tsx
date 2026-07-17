"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Delete, Lock } from 'lucide-react';

export const PinPad: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const { loginWithPin, error, isLoading } = useAuth();

  const handleNumberClick = (num: string) => {
    if (isLoading || pin.length >= 6) return;
    
    const nextPin = pin + num;
    setPin(nextPin);
    
    if (nextPin.length === 6) {
      triggerLogin(nextPin);
    }
  };

  const triggerLogin = async (enteredPin: string) => {
    const success = await loginWithPin(enteredPin);
    if (!success) {
      // Shake effect on error
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  const handleBackspace = () => {
    if (isLoading) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLoading) return;
    setPin('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-stone-950 to-black text-white p-4 selection:bg-amber-500/30">
      {/* Background ambient glowing element */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-stone-900/60 backdrop-blur-xl border border-stone-800/80 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-300 hover:border-stone-700/50">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 ring-1 ring-amber-400/30 animate-pulse">
            <Lock className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-orange-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-md">
            YOKAYAKI POS
          </h1>
          <p className="text-stone-400 text-sm mt-2 font-medium tracking-wide">
            กรุณาใส่รหัส PIN 6 หลักเพื่อเข้าใช้งาน
          </p>
        </div>

        {/* PIN Indicators */}
        <div className={`flex justify-center gap-4 mb-8 ${isShaking ? 'animate-bounce' : ''}`} style={isShaking ? { animation: 'shake 0.5s ease-in-out' } : undefined}>
          {[...Array(6)].map((_, i) => {
            const isActive = pin.length > i;
            return (
              <div
                key={i}
                className={`w-5 h-5 rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 scale-110 shadow-[0_0_12px_rgba(245,158,11,0.8)] border-transparent' 
                    : 'bg-stone-950 border border-stone-700/60'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-6 mb-6 flex items-center justify-center">
          {error && (
            <p className="text-red-400 text-sm font-semibold text-center bg-red-950/40 border border-red-900/50 px-4 py-1 rounded-full animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* PinPad Buttons */}
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              disabled={isLoading}
              onClick={() => handleNumberClick(num)}
              className="h-18 text-2xl font-bold bg-stone-900/50 hover:bg-stone-800 border border-stone-800/60 active:scale-95 hover:border-stone-700/80 rounded-2xl transition-all duration-150 flex items-center justify-center shadow-sm text-stone-200 hover:text-white"
            >
              {num}
            </button>
          ))}
          
          {/* Action Buttons */}
          <button
            disabled={isLoading}
            onClick={handleClear}
            className="h-18 text-sm font-bold bg-stone-950 hover:bg-stone-900 border border-stone-900 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-stone-400 hover:text-stone-200"
          >
            ล้าง (C)
          </button>
          
          <button
            disabled={isLoading}
            onClick={() => handleNumberClick('0')}
            className="h-18 text-2xl font-bold bg-stone-900/50 hover:bg-stone-800 border border-stone-800/60 active:scale-95 hover:border-stone-700/80 rounded-2xl transition-all duration-150 flex items-center justify-center text-stone-200 hover:text-white"
          >
            0
          </button>
          
          <button
            disabled={isLoading}
            onClick={handleBackspace}
            className="h-18 bg-stone-950 hover:bg-stone-900 border border-stone-900 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-stone-400 hover:text-stone-200"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center transition-all duration-300">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-amber-500 font-bold text-sm tracking-widest animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
          </div>
        )}
      </div>

      {/* Inline styles for custom shake animation */}
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
