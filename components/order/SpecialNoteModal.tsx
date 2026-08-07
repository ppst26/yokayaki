"use client";

import React from 'react';
import { X } from 'lucide-react';

interface SpecialNoteModalProps {
  noteEditTarget: { index: number; notes: string } | null;
  setNoteEditTarget: React.Dispatch<React.SetStateAction<{ index: number; notes: string } | null>>;
  saveNotes: () => void;
}

export const SpecialNoteModal: React.FC<SpecialNoteModalProps> = ({
  noteEditTarget,
  setNoteEditTarget,
  saveNotes,
}) => {
  if (!noteEditTarget) return null;

  const quickNotes = [
    'เผ็ดน้อย',
    'ไม่ใส่ผัก',
    'แยกน้ำจิ้ม',
    'หวานน้อย',
    'กรอบๆ',
    'สุกมากๆ',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-neutral-100">
            ระบุโน้ตพิเศษ
          </h3>
          <button
            onClick={() => setNoteEditTarget(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          rows={3}
          value={noteEditTarget.notes}
          onChange={e => setNoteEditTarget({ ...noteEditTarget, notes: e.target.value })}
          placeholder="เช่น เผ็ดน้อย, ไม่ใส่หอมใหญ่..."
          className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-xs text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none transition"
        />

        <div>
          <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 block mb-2">
            ตัวเลือกด่วน:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickNotes.map(qn => (
              <button
                key={qn}
                type="button"
                onClick={() =>
                  setNoteEditTarget(prev =>
                    prev
                      ? {
                          ...prev,
                          notes: prev.notes ? `${prev.notes}, ${qn}` : qn,
                        }
                      : null
                  )
                }
                className="px-2.5 py-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-neutral-300 transition active:scale-95 cursor-pointer"
              >
                +{qn}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setNoteEditTarget(null)}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={saveNotes}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20"
          >
            บันทึกโน้ต
          </button>
        </div>
      </div>
    </div>
  );
};
