"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { CustomSelect } from '@/components/ui/select';
import { ImageUploadField } from '@/components/ui/ImageUploadField';

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
  /** เมื่อเพิ่มหมวดใหม่ — parent รวมเข้า list + persist */
  onAddCategory?: (name: string) => void;
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
  onAddCategory,
  handleSave,
  isSaving,
}) => {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  if (!showFormModal) return null;

  const commitNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCategory?.(trimmed);
    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  return createPortal(
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 py-6 app-dialog-backdrop">
      <div className="app-dialog flex w-full max-w-lg max-h-full flex-col overflow-hidden p-6 shadow-xl">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100">
            {editingItem ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่'}
          </h3>
          <button
            onClick={() => setShowFormModal(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-sm cursor-pointer"
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
                searchable
                addNewLabel="+ เพิ่มหมวดหมู่ใหม่..."
                onAddNew={
                  onAddCategory
                    ? () => {
                        setNewCategoryName('');
                        setShowAddCategory(true);
                      }
                    : undefined
                }
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
              รูปภาพเมนูอาหาร (ไม่บังคับ)
            </label>
            <ImageUploadField
              folder="menu"
              value={formData.image_url ?? null}
              onChange={url => setFormData({ ...formData, image_url: url })}
              disabled={isSaving}
            />
          </div>

          <div className="flex shrink-0 gap-3 border-t border-slate-100 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="flex-1 py-3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-sm font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 btn-crimson disabled:opacity-50 text-white rounded-sm font-bold transition shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2"
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
    </div>

    {showAddCategory && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 app-dialog-backdrop">
        <div
          className="app-dialog w-full max-w-sm space-y-4 p-5 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-neutral-100">
              เพิ่มหมวดหมู่ใหม่
            </h4>
            <button
              type="button"
              onClick={() => setShowAddCategory(false)}
              className="cursor-pointer rounded-sm p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            autoFocus
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitNewCategory();
              }
            }}
            placeholder="เช่น ของหวาน, หม้อไฟ"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:border-red-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddCategory(false)}
              className="flex-1 cursor-pointer rounded-sm bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={commitNewCategory}
              disabled={!newCategoryName.trim()}
              className="btn-crimson flex-1 cursor-pointer rounded-sm py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
            >
              เพิ่มหมวดหมู่
            </button>
          </div>
        </div>
      </div>
    )}
    </>,
    document.body,
  );
};
