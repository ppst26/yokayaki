"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock } from 'lucide-react';
import {
  AuthBrandHeader,
  AuthGlassPanel,
  AuthScreenLayout,
  authGlassInputClass,
  authGlassSubmitClass,
} from '@/components/auth/AuthScreenLayout';

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
    <AuthScreenLayout>
      <AuthGlassPanel className="min-h-0 justify-center">
        <AuthBrandHeader subtitle="เข้าสู่ระบบองค์กรก่อนใช้ PIN พนักงาน" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="org-email" className="mb-1.5 block text-xs font-semibold text-white/70">
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
              className={authGlassInputClass}
              placeholder="owner@example.com"
            />
          </div>

          <div>
            <label htmlFor="org-password" className="mb-1.5 block text-xs font-semibold text-white/70">
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
              className={authGlassInputClass}
              placeholder="••••••••"
            />
          </div>

          <div className="flex h-6 items-center justify-center">
            {orgError ? (
              <p className="animate-fade-in text-center text-xs font-semibold text-red-300">{orgError}</p>
            ) : null}
          </div>

          <button type="submit" disabled={isOrgLoading} className={authGlassSubmitClass}>
            <Lock className="h-4 w-4" />
            เข้าสู่ระบบองค์กร
          </button>
        </form>

        {isOrgLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[28px] bg-black/70 backdrop-blur-sm">
            <div className="mb-3 h-9 w-9 animate-spin rounded-full border-3 border-white border-t-transparent" />
            <p className="animate-pulse text-xs font-semibold tracking-wider text-white/80">
              กำลังตรวจสอบบัญชี...
            </p>
          </div>
        )}
      </AuthGlassPanel>
    </AuthScreenLayout>
  );
};
