"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MenuCategoryRow,
  addMenuCategory,
  renameMenuCategory,
  deleteMenuCategory,
  reorderMenuCategories,
  bulkRenameCategoryInMenuItems,
} from '@/lib/menuCategories';
import { useActionFeedback } from '@/context/ActionFeedbackContext';

interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
  categories: MenuCategoryRow[];
  /** เรียกหลังมีการเปลี่ยนแปลง — parent ต้อง refetch */
  onChanged: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  open,
  onClose,
  categories,
  onChanged,
}) => {
  const { showActionFeedback } = useActionFeedback();

  // state สำหรับเพิ่มหมวดใหม่
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // state สำหรับ inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // state สำหรับ delete confirm
  const [deletingCat, setDeletingCat] = useState<MenuCategoryRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // drag reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const newNameRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null) editRef.current?.focus();
  }, [editingId]);

  // ─── เพิ่มหมวดใหม่ ───
  const handleAdd = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setIsAdding(true);
    const { error } = await addMenuCategory(trimmed);
    setIsAdding(false);

    if (error) {
      showActionFeedback({ variant: 'error', title: error });
      return;
    }

    showActionFeedback({ variant: 'success', title: `เพิ่มหมวดหมู่ "${trimmed}" แล้ว` });
    setNewName('');
    newNameRef.current?.focus();
    onChanged();
  }, [newName, onChanged, showActionFeedback]);

  // ─── แก้ไขชื่อ ───
  const startEditing = (cat: MenuCategoryRow) => {
    setEditingId(cat.id);
    setEditValue(cat.name);
  };

  const handleRename = useCallback(async () => {
    if (editingId === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    const oldCat = categories.find(c => c.id === editingId);
    if (!oldCat || oldCat.name === trimmed) {
      setEditingId(null);
      return;
    }

    setIsSaving(true);
    const { error } = await renameMenuCategory(editingId, trimmed);
    if (error) {
      showActionFeedback({ variant: 'error', title: error });
      setIsSaving(false);
      return;
    }

    // อัปเดตชื่อ category ใน menu_items ที่ใช้ชื่อเก่า
    const { error: bulkErr } = await bulkRenameCategoryInMenuItems(oldCat.name, trimmed);
    if (bulkErr) {
      showActionFeedback({ variant: 'error', title: `แก้ชื่อหมวดได้แล้ว แต่อัปเดตเมนูล้มเหลว: ${bulkErr}` });
    } else {
      showActionFeedback({ variant: 'success', title: `เปลี่ยนชื่อเป็น "${trimmed}" แล้ว` });
    }

    setIsSaving(false);
    setEditingId(null);
    onChanged();
  }, [editingId, editValue, categories, onChanged, showActionFeedback]);

  // ─── ลบหมวด ───
  const handleDelete = useCallback(async () => {
    if (!deletingCat) return;

    setIsDeleting(true);
    const { error } = await deleteMenuCategory(deletingCat.id);
    setIsDeleting(false);

    if (error) {
      showActionFeedback({ variant: 'error', title: error });
      return;
    }

    showActionFeedback({ variant: 'success', title: `ลบหมวดหมู่ "${deletingCat.name}" แล้ว` });
    setDeletingCat(null);
    onChanged();
  }, [deletingCat, onChanged, showActionFeedback]);

  // ─── Drag & Drop Reorder ───
  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIndex(idx);
  };

  const handleDrop = useCallback(async () => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    // สร้าง list ใหม่ตามลำดับ
    const ordered = [...categories];
    const [moved] = ordered.splice(dragIndex, 1);
    ordered.splice(overIndex, 0, moved);

    const updates = ordered.map((cat, i) => ({ id: cat.id, sort_order: i + 1 }));

    setIsReordering(true);
    const { error } = await reorderMenuCategories(updates);
    setIsReordering(false);
    setDragIndex(null);
    setOverIndex(null);

    if (error) {
      showActionFeedback({ variant: 'error', title: `จัดลำดับล้มเหลว: ${error}` });
      return;
    }

    onChanged();
  }, [dragIndex, overIndex, categories, onChanged, showActionFeedback]);

  const handleDragEnd = () => {
    if (dragIndex !== null && overIndex !== null) {
      handleDrop();
    } else {
      setDragIndex(null);
      setOverIndex(null);
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop">
        <div className="app-dialog flex w-full max-w-md max-h-[80vh] flex-col overflow-hidden p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
              จัดการหมวดหมู่เมนู
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-sm cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Add New */}
          <div className="flex gap-2 mb-4">
            <input
              ref={newNameRef}
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="ชื่อหมวดหมู่ใหม่..."
              className="flex-1 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || isAdding}
              className="flex items-center gap-1 px-3 py-2 btn-crimson text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>เพิ่ม</span>
            </button>
          </div>

          {/* Category List */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1">
            {isReordering && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-red-500 mr-2" />
                <span className="text-xs text-slate-500 font-semibold">กำลังจัดลำดับ...</span>
              </div>
            )}

            {categories.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-neutral-500 text-xs font-semibold">
                ยังไม่มีหมวดหมู่
              </div>
            ) : (
              categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  draggable={editingId !== cat.id}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all group',
                    dragIndex === idx && 'opacity-40 scale-95',
                    overIndex === idx && dragIndex !== idx && 'border-red-400 bg-red-50/50 dark:bg-red-950/20',
                    dragIndex !== idx && overIndex !== idx && 'border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900',
                  )}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-neutral-600 hover:text-slate-500 dark:hover:text-neutral-400 transition shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Name / Edit */}
                  <div className="flex-1 min-w-0">
                    {editingId === cat.id ? (
                      <input
                        ref={editRef}
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRename();
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={handleRename}
                        className="w-full bg-slate-50 dark:bg-neutral-800 border border-red-400 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:outline-none"
                        disabled={isSaving}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 truncate block">
                        {cat.name}
                      </span>
                    )}
                  </div>

                  {/* Sort badge */}
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-600 tabular-nums shrink-0">
                    #{cat.sort_order}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    {editingId === cat.id ? (
                      <button
                        onClick={handleRename}
                        disabled={isSaving}
                        className="p-1 text-emerald-500 hover:text-emerald-600 cursor-pointer disabled:opacity-50"
                        title="บันทึก"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 cursor-pointer transition"
                          title="แก้ไขชื่อ"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCat(cat)}
                          className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer transition"
                          title="ลบหมวดหมู่"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
              ลากจับ <GripVertical className="inline w-3 h-3 align-text-bottom" /> เพื่อจัดลำดับ · แก้ไขชื่อจะอัปเดตเมนูทั้งหมดที่อยู่ในหมวดนั้นด้วย
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCat && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
              ลบหมวดหมู่
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              ต้องการลบหมวดหมู่ <span className="font-bold text-slate-800 dark:text-neutral-200">"{deletingCat.name}"</span> หรือไม่?
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ เมนูที่อยู่ในหมวดนี้จะไม่ถูกลบ แต่จะกลายเป็นหมวดว่าง
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingCat(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-sm text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-sm text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'ลบหมวดหมู่'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
