"use client";

import React from 'react';
import { User, Pencil, Plus, Trash2 } from 'lucide-react';
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
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Member info & points summary */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-neutral-100">
                {selectedMember.name}
              </h2>
              <button
                onClick={() => {
                  setEditName(selectedMember.name);
                  setEditPhone(selectedMember.phone_number);
                  setShowEditModal(true);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 transition cursor-pointer"
                title="แก้ไขข้อมูล"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 mt-0.5">
              เบอร์โทร: <span className="font-mono text-slate-800 dark:text-neutral-200">{selectedMember.phone_number}</span> • สมาชิกเมื่อ {formatDate(selectedMember.created_at)}
            </p>
          </div>
        </div>

        {/* Right: Points counter & actions */}
        <div className="flex items-center gap-4 self-end md:self-auto">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl px-5 py-3 text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400 block">
              แต้มคงเหลือ
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {selectedMember.points.toLocaleString()}{' '}
              <span className="text-xs font-bold">แต้ม</span>
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPointsModal(true)}
              className="flex items-center gap-1.5 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ปรับแต้ม</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-3 bg-slate-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-neutral-700 hover:border-rose-200 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl transition active:scale-95 cursor-pointer"
              title="ลบสมาชิก"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
