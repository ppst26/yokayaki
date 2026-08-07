"use client";

import React from 'react';
import { Search, UserPlus } from 'lucide-react';

interface LoyaltyMember {
  phone_number: string;
  name: string;
  points: number;
}

interface CRMMemberCardProps {
  phoneInput: string;
  setPhoneInput: (val: string) => void;
  member: LoyaltyMember | null;
  isSearchingMember: boolean;
  searchMember: () => void;
  pointsToRedeem: number;
  setPointsToRedeem: (val: number) => void;
  showRegister: boolean;
  registerName: string;
  setRegisterName: (val: string) => void;
  registerMember: () => void;
  subtotal: number;
}

export const CRMMemberCard: React.FC<CRMMemberCardProps> = ({
  phoneInput,
  setPhoneInput,
  member,
  isSearchingMember,
  searchMember,
  pointsToRedeem,
  setPointsToRedeem,
  showRegister,
  registerName,
  setRegisterName,
  registerMember,
  subtotal,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-3">
        สมาชิกสะสมแต้ม (CRM)
      </h3>
      <div className="flex gap-2">
        <input
          type="tel"
          maxLength={10}
          placeholder="เบอร์โทรศัพท์ 10 หลัก"
          value={phoneInput}
          onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
          className="flex-1 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-neutral-100 placeholder:text-slate-400 focus:border-red-500 focus:outline-none transition font-semibold"
        />
        <button
          onClick={searchMember}
          disabled={phoneInput.length !== 10 || isSearchingMember}
          className="px-4 py-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 disabled:opacity-50 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-slate-700 dark:text-neutral-200 transition active:scale-95 cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {member && (
        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
          <p className="text-emerald-800 dark:text-emerald-300 text-xs font-bold">
            สมาชิก: {member.name}
          </p>
          <p className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
            แต้มคงเหลือ: <span className="font-extrabold">{member.points} แต้ม</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs text-slate-600 dark:text-neutral-300 font-semibold">
              ใช้แต้ม:
            </label>
            <input
              type="number"
              min={0}
              max={Math.min(member.points, subtotal)}
              value={pointsToRedeem}
              onChange={e =>
                setPointsToRedeem(
                  Math.min(Number(e.target.value) || 0, member.points, subtotal)
                )
              }
              className="w-24 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg px-3 py-1 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 dark:text-neutral-400">
              (1 แต้ม = 1 บาท)
            </span>
          </div>
        </div>
      )}

      {showRegister && !member && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl">
          <p className="text-blue-800 dark:text-blue-300 text-xs font-semibold mb-2">
            ไม่พบสมาชิก สมัครใหม่?
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ชื่อลูกค้า"
              value={registerName}
              onChange={e => setRegisterName(e.target.value)}
              className="flex-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-100 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={registerMember}
              disabled={!registerName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-lg text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              สมัคร
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
