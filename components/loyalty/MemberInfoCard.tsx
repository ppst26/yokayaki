"use client";

import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LoyaltyMember {
  phone_number: string;
  name: string;
  points: number;
  created_at: string;
}

interface MemberInfoCardProps {
  selectedMember: LoyaltyMember;
  setShowEditModal: (val: boolean) => void;
  setEditName: (val: string) => void;
  setEditPhone: (val: string) => void;
  setShowPointsModal: (val: boolean) => void;
  setShowDeleteModal: (val: boolean) => void;
  formatDate: (dateStr: string) => string;
}

export const MemberInfoCard: React.FC<MemberInfoCardProps> = ({
  selectedMember,
  setShowEditModal,
  setEditName,
  setEditPhone,
  setShowPointsModal,
  setShowDeleteModal,
  formatDate,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 rounded-2xl p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Member info */}
        <div className="space-y-1.5 flex flex-col justify-start">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-neutral-100 tracking-tight">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">คุณลูกค้า</span>
            {selectedMember.name}
          </h2>

          <div className="flex flex-col items-start space-y-0.5">
            <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
              เบอร์โทร: <span className="font-mono text-base md:text-lg font-black text-slate-900 dark:text-neutral-100 ml-1">{selectedMember.phone_number}</span>
            </p>
            <p className="text-xs font-medium text-slate-400 dark:text-neutral-500">
              สมาชิกเมื่อ {formatDate(selectedMember.created_at)}
            </p>
          </div>
        </div>

        {/* Right: Points counter & actions */}
        <div className="flex items-center gap-3.5 self-end md:self-auto">
          {/* Points display before Edit button */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl px-4 py-2 text-center">
            <span className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400">
              {selectedMember.points.toLocaleString()}{' '}
              <span className="text-sm font-bold text-amber-700 dark:text-amber-500">แต้ม</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* ปุ่มแก้ไข */}
            <button
              onClick={() => {
                setEditName(selectedMember.name);
                setEditPhone(selectedMember.phone_number);
                setShowEditModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl text-sm font-extrabold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>แก้ไข</span>
            </button>

            {/* ปุ่มปรับแต้ม */}
            <button
              onClick={() => setShowPointsModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-extrabold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer border-none"
            >
              <Plus className="w-4 h-4" />
              <span>ปรับแต้ม</span>
            </button>

            {/* ปุ่มลบ */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-extrabold transition active:scale-95 cursor-pointer"
              title="ลบสมาชิก"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
