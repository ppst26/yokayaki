"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, Lock } from 'lucide-react';

export const OrgLoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginWithOrg, orgError, isOrgLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOrgLoading) return;
    await loginWithOrg(email.trim(), password);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 p-4 font-sans relative">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8 shadow-xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-md shadow-red-600/20 mb-4 text-white">
            <Building2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-neutral-100">
            YOKAYAKI <span className="text-red-600">POS</span>
          </h1>
          <p className="text-slate-500 dark:text-neutral-400 text-xs mt-1.5 font-semibold text-center">
            เข้าสู่ระบบองค์กรก่อนใช้ PIN พนักงาน
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="org-email" className="block text-xs font-bold text-slate-600 dark:text-neutral-400 mb-1.5">
              อีเมล
            </label>
            <input
              id="org-email"
              type="email"
              autoComplete="email"
              required
              disabled={isOrgLoading}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400"
              placeholder="owner@example.com"
            />
          </div>

          <div>
            <label htmlFor="org-password" className="block text-xs font-bold text-slate-600 dark:text-neutral-400 mb-1.5">
              รหัสผ่าน
            </label>
            <input
              id="org-password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isOrgLoading}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400"
              placeholder="••••••••"
            />
          </div>

          <div className="h-6 flex items-center justify-center">
            {orgError && (
              <p className="text-rose-600 dark:text-rose-400 text-xs font-bold text-center bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-4 py-1 rounded-full animate-fade-in">
                {orgError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isOrgLoading}
            className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm tracking-wide shadow-md shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Lock className="w-4 h-4" />
            เข้าสู่ระบบองค์กร
          </button>
        </form>

        {isOrgLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center transition-all duration-300">
            <div className="w-9 h-9 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-red-600 dark:text-red-400 font-extrabold text-xs tracking-wider animate-pulse">
              กำลังตรวจสอบบัญชี...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
