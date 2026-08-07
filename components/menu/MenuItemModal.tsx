"use client";

import React from 'react';
import { X, Loader2, ImageIcon } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                หมวดหมู่ *
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
