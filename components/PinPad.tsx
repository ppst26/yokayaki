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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-slate-800 p-4 font-sans relative">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-md shadow-red-600/20 mb-4 text-white">
            <Lock className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            YOKAYAKI <span className="text-red-600">POS</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-semibold">
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
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isActive 
                    ? 'bg-red-600 scale-110 shadow-xs' 
                    : 'bg-slate-100 border border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-6 mb-6 flex items-center justify-center">
          {error && (
            <p className="text-rose-600 text-xs font-bold text-center bg-rose-50 border border-rose-200 px-4 py-1 rounded-full animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* PinPad Buttons */}
        <div className="grid grid-cols-3 gap-3.5 max-w-sm mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              disabled={isLoading}
              onClick={() => handleNumberClick(num)}
              className="h-16 text-xl font-extrabold bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-300 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center shadow-xs text-slate-800 cursor-pointer"
            >
              {num}
            </button>
          ))}
          
          {/* Action Buttons */}
          <button
            disabled={isLoading}
            onClick={handleClear}
            className="h-16 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            ล้าง (C)
          </button>
          
          <button
            disabled={isLoading}
            onClick={() => handleNumberClick('0')}
            className="h-16 text-xl font-extrabold bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-300 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-slate-800 cursor-pointer"
          >
            0
          </button>
          
          <button
            disabled={isLoading}
            onClick={handleBackspace}
            className="h-16 bg-slate-100 hover:bg-slate-200 border border-slate-200 active:scale-95 rounded-2xl transition-all duration-150 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center transition-all duration-300">
            <div className="w-9 h-9 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-red-600 font-extrabold text-xs tracking-wider animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
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

