"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { CustomSelect } from '@/components/ui/select';

const UNIT_SUGGESTIONS = ['จาน', 'ชิ้น', 'แก้ว', 'ขวด', 'ถ้วย', 'ชุด', 'อัน', 'กก.', 'ลิตร'];

interface MenuItem {
  id: number;
  name: string;
  unit: string;
  price: number;
  stock: number;
  is_stock_tracked: boolean;
  is_happy_hour: boolean;
  happy_hour_price: number | null;
  category: string;
  image_url?: string | null;
}

interface MenuItemModalProps {
  showFormModal: boolean;
  setShowFormModal: (val: boolean) => void;
  editingItem: MenuItem | null;
  formData: Omit<MenuItem, 'id'>;
  setFormData: React.Dispatch<React.SetStateAction<Omit<MenuItem, 'id'>>>;
  categories: string[];
  handleSave: (e: React.FormEvent) => void;
  isSaving: boolean;
}

/** Combobox — พิมพ์เองได้ + เลือกจาก suggestion list */
const UnitCombobox: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // sync when parent changes (e.g. switching between edit items)
  useEffect(() => { setInputVal(value); }, [value]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = UNIT_SUGGESTIONS.filter(
    u => u.toLowerCase().includes(inputVal.toLowerCase())
  );

  const commit = (val: string) => {
    const trimmed = val.trim() || 'จาน';
    setInputVal(trimmed);
    onChange(trimmed);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl overflow-hidden focus-within:border-red-500 transition">
        <input
          type="text"
          value={inputVal}
          onChange={e => {
            setInputVal(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // slight delay so click on option registers first
            setTimeout(() => commit(inputVal), 150);
          }}
          placeholder="เช่น จาน, แก้ว, ชิ้น"
          className="flex-1 bg-transparent px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(v => !v)}
          className="px-2 text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 transition"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden">
          {filtered.map(u => (
            <li
              key={u}
              onMouseDown={(e) => { e.preventDefault(); commit(u); }}
              className={`px-4 py-2.5 text-xs font-semibold cursor-pointer transition
                ${u === value
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  : 'text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-700'
                }`}
            >
              {u}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  showFormModal,
  setShowFormModal,
  editingItem,
  formData,
  setFormData,
  categories,
  handleSave,
  isSaving,
}) => {
  if (!showFormModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100">
            {editingItem ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่'}
          </h3>
          <button
            onClick={() => setShowFormModal(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
          {/* ชื่อเมนู + หน่วย */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                ชื่อเมนูอาหาร *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                placeholder="เช่น ยาคินิคุเนื้อวัว"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                หน่วย *
              </label>
              <UnitCombobox
                value={formData.unit}
                onChange={val => setFormData({ ...formData, unit: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                หมวดหมู่ *
              </label>
              <CustomSelect
                value={formData.category}
                onChange={val => setFormData({ ...formData, category: val })}
                options={categories}
                placeholder="เลือกหมวดหมู่"
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                ราคาปกติ (บาท) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                จำนวนสต็อก
              </label>
              <input
                type="number"
                min={0}
                value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_stock_tracked}
                  onChange={e =>
                    setFormData({ ...formData, is_stock_tracked: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-slate-700 dark:text-neutral-200">
                  ติดตามสต็อก (หักอัตโนมัติเมื่อสั่ง)
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_happy_hour}
                onChange={e =>
                  setFormData({
                    ...formData,
                    is_happy_hour: e.target.checked,
                    happy_hour_price: e.target.checked ? formData.happy_hour_price : null,
                  })
                }
                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-slate-800 dark:text-neutral-100 font-bold">
                เปิดราคา Happy Hour (17:00–19:00)
              </span>
            </label>

            {formData.is_happy_hour && (
              <div>
                <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                  ราคา Happy Hour (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formData.happy_hour_price ?? ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      happy_hour_price: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="w-full bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-500 dark:text-neutral-400 mb-1">
              URL รูปภาพเมนูอาหาร (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.image_url || ''}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="flex-1 py-3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'บันทึกข้อมูล'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
