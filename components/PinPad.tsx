"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export const PinPad: React.FC = () => {
  const [pin, setPin] = useState('');
  const { loginWithPin, error } = useAuth();

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 6) {
        loginWithPin(nextPin).then((success) => {
          if (!success) setPin('');
        });
      }
    }
  };

  const handleClear = () => setPin('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-center mb-6">Yokayaki POS</h2>
        <div className="flex justify-center gap-3 mb-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border border-neutral-700 ${
                pin.length > i ? 'bg-amber-500' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="h-16 text-2xl font-bold bg-neutral-800 hover:bg-neutral-700 rounded-xl transition"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 text-lg font-medium bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-400"
          >
            Clear
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="h-16 text-2xl font-bold bg-neutral-800 hover:bg-neutral-700 rounded-xl"
          >
            0
          </button>
        </div>
      </div>
    </div>
  );
};
