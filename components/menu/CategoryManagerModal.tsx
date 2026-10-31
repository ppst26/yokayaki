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
  Save,
  Folder,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MenuCategoryRow,
  CategoryTreeItem,
  buildCategoryTree,
  saveCategoryHierarchy,
  addMenuCategory,
  renameMenuCategory,
  deleteMenuCategory,
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

interface DragStateMain {
  type: 'main';
  index: number;
  id: number;
}

interface DragStateSub {
  type: 'sub';
  sourceParentId: number;
  sourceSubIndex: number;
  id: number;
}

type DragState = DragStateMain | DragStateSub | null;

interface DropTargetMain {
  type: 'main';
  index: number;
}

interface DropTargetSub {
  type: 'sub';
  parentId: number;
  subIndex: number;
}

interface DropTargetSubZone {
  type: 'sub_zone';
  parentId: number;
}

type DropTarget = DropTargetMain | DropTargetSub | DropTargetSubZone | null;

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  open,
  onClose,
  categories,
  onChanged,
}) => {
  const { showActionFeedback } = useActionFeedback();

  // ─── Tree & Dirty State ───
  const [tree, setTree] = useState<CategoryTreeItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [isSavingHierarchy, setIsSavingHierarchy] = useState(false);

  // ─── Add Main Category ───
  const [newMainName, setNewMainName] = useState('');
  const [isAddingMain, setIsAddingMain] = useState(false);
  const newMainInputRef = useRef<HTMLInputElement>(null);

  // ─── Add Sub Category ───
  const [addingSubParentId, setAddingSubParentId] = useState<number | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const newSubInputRef = useRef<HTMLInputElement>(null);

  // ─── Inline Edit ───
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ─── Delete Confirmation ───
  const [deletingItem, setDeletingItem] = useState<{
    id: number;
    name: string;
    isMain: boolean;
    childCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Drag & Drop State ───
  const dragItemRef = useRef<DragState>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  // Sync tree with incoming categories when opening or when categories change (if clean)
  const prevCategoriesRef = useRef(categories);
  useEffect(() => {
    if (open) {
      if (!isDirty || prevCategoriesRef.current !== categories) {
        setTree(buildCategoryTree(categories));
        setIsDirty(false);
        setShowUnsavedPrompt(false);
      }
    } else {
      setIsDirty(false);
      setShowUnsavedPrompt(false);
      setEditingId(null);
      setAddingSubParentId(null);
    }
    prevCategoriesRef.current = categories;
  }, [open, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (addingSubParentId !== null) newSubInputRef.current?.focus();
  }, [addingSubParentId]);

  // ─── เพิ่มกลุ่มหลัก (parent_id = null) ───
  const handleAddMain = useCallback(async () => {
    const trimmed = newMainName.trim();
    if (!trimmed) return;

    setIsAddingMain(true);
    const { data, error } = await addMenuCategory(trimmed, null);
    setIsAddingMain(false);

    if (error) {
      showActionFeedback({ variant: 'error', title: error });
      return;
    }

    if (data) {
      const newItem: CategoryTreeItem = {
        id: data.id,
        name: data.name,
        sort_order: tree.length + 1,
        parent_id: null,
        children: [],
      };
      setTree(prev => [...prev, newItem]);
    }

    showActionFeedback({ variant: 'success', title: `เพิ่มกลุ่มหลัก "${trimmed}" แล้ว` });
    setNewMainName('');
    newMainInputRef.current?.focus();
    onChanged();
  }, [newMainName, tree.length, onChanged, showActionFeedback]);

  // ─── เพิ่มหมวดย่อย (parent_id = parentId) ───
  const handleAddSub = useCallback(
    async (parentId: number) => {
      const trimmed = newSubName.trim();
      if (!trimmed) return;

      setIsAddingSub(true);
      const { data, error } = await addMenuCategory(trimmed, parentId);
      setIsAddingSub(false);

      if (error) {
        showActionFeedback({ variant: 'error', title: error });
        return;
      }

      if (data) {
        const newItem: CategoryTreeItem = {
          id: data.id,
          name: data.name,
          sort_order: (tree.find(m => m.id === parentId)?.children.length ?? 0) + 1,
          parent_id: parentId,
          children: [],
        };
        setTree(prev =>
          prev.map(m => (m.id === parentId ? { ...m, children: [...m.children, newItem] } : m)),
        );
      }

      showActionFeedback({ variant: 'success', title: `เพิ่มหมวดย่อย "${trimmed}" แล้ว` });
      setNewSubName('');
      setAddingSubParentId(null);
      onChanged();
    },
    [newSubName, tree, onChanged, showActionFeedback],
  );

  // ─── แก้ไขชื่อ (Inline Rename) ───
  const startEditing = (id: number, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleRename = useCallback(async () => {
    if (editingId === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    // หาชื่อเดิมใน tree
    let oldName = '';
    for (const m of tree) {
      if (m.id === editingId) {
        oldName = m.name;
        break;
      }
      const c = m.children.find(ch => ch.id === editingId);
      if (c) {
        oldName = c.name;
        break;
      }
    }

    if (!oldName || oldName === trimmed) {
      setEditingId(null);
      return;
    }

    setIsSavingRename(true);
    const { error } = await renameMenuCategory(editingId, trimmed);
    if (error) {
      showActionFeedback({ variant: 'error', title: error });
      setIsSavingRename(false);
      return;
    }

    // อัปเดต category ใน menu_items ที่ใช้ชื่อเดิม
    const { error: bulkErr } = await bulkRenameCategoryInMenuItems(oldName, trimmed);
    if (bulkErr) {
      showActionFeedback({
        variant: 'error',
        title: `แก้ชื่อหมวดได้แล้ว แต่อัปเดตเมนูล้มเหลว: ${bulkErr}`,
      });
    } else {
      showActionFeedback({ variant: 'success', title: `เปลี่ยนชื่อเป็น "${trimmed}" แล้ว` });
    }

    setTree(prev =>
      prev.map(m => {
        if (m.id === editingId) {
          return { ...m, name: trimmed };
        }
        return {
          ...m,
          children: m.children.map(c => (c.id === editingId ? { ...c, name: trimmed } : c)),
        };
      }),
    );

    setIsSavingRename(false);
    setEditingId(null);
    onChanged();
  }, [editingId, editValue, tree, onChanged, showActionFeedback]);

  // ─── ลบหมวดหมู่ ───
  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    const { error } = await deleteMenuCategory(deletingItem.id);
    setIsDeleting(false);

    if (error) {
      showActionFeedback({ variant: 'error', title: error });
      return;
    }

    showActionFeedback({ variant: 'success', title: `ลบ "${deletingItem.name}" แล้ว` });

    setTree(prev => {
      if (deletingItem.isMain) {
        const target = prev.find(m => m.id === deletingItem.id);
        const promotedChildren: CategoryTreeItem[] = (target?.children ?? []).map(c => ({
          ...c,
          parent_id: null,
        }));
        const remaining = prev.filter(m => m.id !== deletingItem.id);
        return [...remaining, ...promotedChildren];
      } else {
        return prev.map(m => ({
          ...m,
          children: m.children.filter(c => c.id !== deletingItem.id),
        }));
      }
    });

    setDeletingItem(null);
    onChanged();
  }, [deletingItem, onChanged, showActionFeedback]);

  // ─── Drag & Drop Handlers ───
  const handleMainDragStart = (e: React.DragEvent, index: number, id: number) => {
    const item: DragStateMain = { type: 'main', index, id };
    dragItemRef.current = item;
    setDragState(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `main:${id}`);
  };

  const handleMainDragOver = (e: React.DragEvent, index: number) => {
    if (dragItemRef.current?.type !== 'main') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget?.type !== 'main' || dropTarget.index !== index) {
      setDropTarget({ type: 'main', index });
    }
  };

  const handleMainDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragItemRef.current?.type !== 'main') return;
    const sourceIndex = dragItemRef.current.index;
    if (sourceIndex === targetIndex) {
      setDragState(null);
      setDropTarget(null);
      dragItemRef.current = null;
      return;
    }

    setTree(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });

    setIsDirty(true);
    setDragState(null);
    setDropTarget(null);
    dragItemRef.current = null;
  };

  const handleSubDragStart = (
    e: React.DragEvent,
    sourceParentId: number,
    sourceSubIndex: number,
    id: number,
  ) => {
    e.stopPropagation();
    const item: DragStateSub = {
      type: 'sub',
      sourceParentId,
      sourceSubIndex,
      id,
    };
    dragItemRef.current = item;
    setDragState(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `sub:${id}`);
  };

  const handleSubItemDragOver = (
    e: React.DragEvent,
    parentId: number,
    subIndex: number,
  ) => {
    if (dragItemRef.current?.type !== 'sub') return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (
      dropTarget?.type !== 'sub' ||
      dropTarget.parentId !== parentId ||
      dropTarget.subIndex !== subIndex
    ) {
      setDropTarget({ type: 'sub', parentId, subIndex });
    }
  };

  const handleSubItemDrop = (
    e: React.DragEvent,
    targetParentId: number,
    targetSubIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItemRef.current?.type !== 'sub') return;

    const { sourceParentId, sourceSubIndex } = dragItemRef.current;
    if (sourceParentId === targetParentId && sourceSubIndex === targetSubIndex) {
      setDragState(null);
      setDropTarget(null);
      dragItemRef.current = null;
      return;
    }

    setTree(prev => {
      const updated = prev.map(m => ({ ...m, children: [...m.children] }));
      const sourceMain = updated.find(m => m.id === sourceParentId);
      const targetMain = updated.find(m => m.id === targetParentId);
      if (!sourceMain || !targetMain) return prev;

      const [moved] = sourceMain.children.splice(sourceSubIndex, 1);
      moved.parent_id = targetParentId;
      targetMain.children.splice(targetSubIndex, 0, moved);
      return updated;
    });

    setIsDirty(true);
    setDragState(null);
    setDropTarget(null);
    dragItemRef.current = null;
  };

  const handleSubZoneDragOver = (e: React.DragEvent, parentId: number) => {
    if (dragItemRef.current?.type !== 'sub') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget?.type !== 'sub_zone' || dropTarget.parentId !== parentId) {
      setDropTarget({ type: 'sub_zone', parentId });
    }
  };

  const handleSubZoneDrop = (e: React.DragEvent, targetParentId: number) => {
    e.preventDefault();
    if (dragItemRef.current?.type !== 'sub') return;

    const { sourceParentId, sourceSubIndex } = dragItemRef.current;
    setTree(prev => {
      const updated = prev.map(m => ({ ...m, children: [...m.children] }));
      const sourceMain = updated.find(m => m.id === sourceParentId);
      const targetMain = updated.find(m => m.id === targetParentId);
      if (!sourceMain || !targetMain) return prev;

      if (sourceParentId === targetParentId) {
        return prev;
      }

      const [moved] = sourceMain.children.splice(sourceSubIndex, 1);
      moved.parent_id = targetParentId;
      targetMain.children.push(moved);
      return updated;
    });

    setIsDirty(true);
    setDragState(null);
    setDropTarget(null);
    dragItemRef.current = null;
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropTarget(null);
    dragItemRef.current = null;
  };

  // ─── Save Hierarchy ───
  const handleSaveHierarchy = async () => {
    const updates: Array<{ id: number; parent_id: number | null; sort_order: number }> = [];

    tree.forEach((mainCat, mainIdx) => {
      updates.push({
        id: mainCat.id,
        parent_id: null,
        sort_order: mainIdx + 1,
      });

      mainCat.children.forEach((subCat, subIdx) => {
        updates.push({
          id: subCat.id,
          parent_id: mainCat.id,
          sort_order: subIdx + 1,
        });
      });
    });

    setIsSavingHierarchy(true);
    const { error } = await saveCategoryHierarchy(updates);
    setIsSavingHierarchy(false);

    if (error) {
      showActionFeedback({ variant: 'error', title: `บันทึกการจัดกลุ่มล้มเหลว: ${error}` });
      return;
    }

    showActionFeedback({ variant: 'success', title: 'บันทึกการจัดกลุ่มหมวดหมู่เรียบร้อยแล้ว' });
    setIsDirty(false);
    onChanged();
  };

  // ─── Close Protection ───
  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  };

  const handleDiscardAndClose = () => {
    setShowUnsavedPrompt(false);
    setIsDirty(false);
    setTree(buildCategoryTree(categories));
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop"
        onClick={e => {
          if (e.target === e.currentTarget) handleRequestClose();
        }}
      >
        <div className="app-dialog flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden p-6 shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
                    จัดการหมวดหมู่เมนู (2 ระดับ)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300">
                    2-Tier
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
                  ลากจัดลำดับกลุ่มหลัก และจัดหมวดย่อยสำหรับเมนูและโปรโมชั่น
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Add New Main Category Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                ref={newMainInputRef}
                type="text"
                value={newMainName}
                onChange={e => setNewMainName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMain();
                  }
                }}
                placeholder="ชื่อกลุ่มหลักใหม่ (เช่น อาหาร, เครื่องดื่ม, ของหวาน)..."
                className="w-full bg-slate-50 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none transition"
              />
            </div>
            <button
              onClick={handleAddMain}
              disabled={!newMainName.trim() || isAddingMain}
              className="flex items-center gap-1.5 px-4 py-2.5 btn-crimson text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isAddingMain ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>+ เพิ่มกลุ่มหลัก</span>
            </button>
          </div>

          {/* Category Tree Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3.5">
            {tree.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500 text-xs font-semibold">
                ยังไม่มีกลุ่มหลัก — เริ่มต้นด้วยการเพิ่มกลุ่มหลักด้านบน
              </div>
            ) : (
              tree.map((mainCat, mainIdx) => {
                const isMainDragging =
                  dragState?.type === 'main' && dragState.index === mainIdx;
                const isMainDropTarget =
                  dropTarget?.type === 'main' && dropTarget.index === mainIdx;
                const isSubZoneTarget =
                  dropTarget?.type === 'sub_zone' && dropTarget.parentId === mainCat.id;

                return (
                  <div
                    key={mainCat.id}
                    draggable={
                      editingId !== mainCat.id && addingSubParentId !== mainCat.id
                    }
                    onDragStart={e => handleMainDragStart(e, mainIdx, mainCat.id)}
                    onDragOver={e => handleMainDragOver(e, mainIdx)}
                    onDrop={e => handleMainDrop(e, mainIdx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'border rounded-2xl bg-white dark:bg-neutral-900 transition-all shadow-xs overflow-hidden',
                      isMainDragging && 'opacity-40 scale-[0.99] border-dashed border-red-400',
                      isMainDropTarget &&
                        dragState?.type === 'main' &&
                        'border-red-500 ring-2 ring-red-400/30 bg-red-50/10',
                      !isMainDragging &&
                        !isMainDropTarget &&
                        'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700',
                    )}
                  >
                    {/* Main Category Header Row */}
                    <div className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-neutral-850/60 border-b border-slate-100 dark:border-neutral-800">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                        {/* Drag Handle */}
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-neutral-600 hover:text-slate-600 dark:hover:text-neutral-300 transition shrink-0"
                          title="ลากเพื่อจัดลำดับกลุ่มหลัก"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Icon */}
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                          <Folder className="w-3.5 h-3.5" />
                        </div>

                        {/* Main Category Name / Edit */}
                        <div className="flex-1 min-w-0">
                          {editingId === mainCat.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                ref={editInputRef}
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
                                className="w-full bg-white dark:bg-neutral-800 border border-red-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-neutral-100 focus:outline-none"
                                disabled={isSavingRename}
                              />
                              <button
                                onClick={handleRename}
                                disabled={isSavingRename}
                                className="p-1 text-emerald-500 hover:text-emerald-600 cursor-pointer disabled:opacity-50 shrink-0"
                                title="บันทึก"
                              >
                                {isSavingRename ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-800 dark:text-neutral-100 truncate">
                                {mainCat.name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                                กลุ่มหลัก
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-neutral-500">
                                ({mainCat.children.length} หมวดย่อย)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {editingId !== mainCat.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingSubParentId(mainCat.id);
                                setNewSubName('');
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              title="เพิ่มหมวดย่อยในกลุ่มนี้"
                            >
                              <Plus className="w-3 h-3" />
                              <span>หมวดย่อย</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditing(mainCat.id, mainCat.name)}
                              className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="แก้ไขชื่อกลุ่มหลัก"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeletingItem({
                                  id: mainCat.id,
                                  name: mainCat.name,
                                  isMain: true,
                                  childCount: mainCat.children.length,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                              title="ลบกลุ่มหลัก"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Sub Category Dropzone & Children */}
                    <div
                      onDragOver={e => handleSubZoneDragOver(e, mainCat.id)}
                      onDrop={e => handleSubZoneDrop(e, mainCat.id)}
                      className={cn(
                        'p-3 space-y-2 transition-all min-h-[58px]',
                        isSubZoneTarget &&
                          dragState?.type === 'sub' &&
                          'bg-red-50/40 dark:bg-red-950/20 ring-1 ring-inset ring-red-300 dark:ring-red-800',
                        !isSubZoneTarget && 'bg-slate-50/30 dark:bg-neutral-950/30',
                      )}
                    >
                      {mainCat.children.length === 0 && addingSubParentId !== mainCat.id ? (
                        <div
                          className={cn(
                            'border border-dashed rounded-xl py-3 px-4 text-center transition-all',
                            isSubZoneTarget && dragState?.type === 'sub'
                              ? 'border-red-400 bg-red-50/60 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-bold'
                              : 'border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500',
                          )}
                        >
                          <span className="text-[11px] font-medium">
                            {isSubZoneTarget && dragState?.type === 'sub'
                              ? 'ปล่อยเพื่อย้ายหมวดย่อยมาที่กลุ่มนี้'
                              : 'ไม่มีหมวดย่อย — ลากหมวดย่อยมาวางที่นี่ หรือกด "+ หมวดย่อย"'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {mainCat.children.map((subCat, subIdx) => {
                            const isSubDragging =
                              dragState?.type === 'sub' &&
                              dragState.sourceParentId === mainCat.id &&
                              dragState.sourceSubIndex === subIdx;
                            const isSubDropTarget =
                              dropTarget?.type === 'sub' &&
                              dropTarget.parentId === mainCat.id &&
                              dropTarget.subIndex === subIdx;

                            return (
                              <div
                                key={subCat.id}
                                draggable={editingId !== subCat.id}
                                onDragStart={e =>
                                  handleSubDragStart(e, mainCat.id, subIdx, subCat.id)
                                }
                                onDragOver={e => handleSubItemDragOver(e, mainCat.id, subIdx)}
                                onDrop={e => handleSubItemDrop(e, mainCat.id, subIdx)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  'flex items-center justify-between px-3 py-2 rounded-xl border transition-all group',
                                  isSubDragging &&
                                    'opacity-40 scale-95 border-dashed border-red-400',
                                  isSubDropTarget &&
                                    dragState?.type === 'sub' &&
                                    'border-red-500 bg-red-50/60 dark:bg-red-950/40 ring-1 ring-red-400',
                                  !isSubDragging &&
                                    !isSubDropTarget &&
                                    'border-slate-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-850 hover:border-slate-300 dark:hover:border-neutral-600',
                                )}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                  {/* Sub Drag Handle */}
                                  <div
                                    className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-neutral-600 hover:text-slate-500 dark:hover:text-neutral-400 transition shrink-0"
                                    title="ลากเพื่อจัดลำดับหรือย้ายกลุ่ม"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>

                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-neutral-600 shrink-0" />

                                  {/* Sub Name / Edit */}
                                  <div className="flex-1 min-w-0">
                                    {editingId === subCat.id ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          ref={editInputRef}
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
                                          className="w-full bg-slate-50 dark:bg-neutral-800 border border-red-400 rounded-lg px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:outline-none"
                                          disabled={isSavingRename}
                                        />
                                        <button
                                          onClick={handleRename}
                                          disabled={isSavingRename}
                                          className="p-1 text-emerald-500 hover:text-emerald-600 cursor-pointer disabled:opacity-50 shrink-0"
                                          title="บันทึก"
                                        >
                                          {isSavingRename ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Check className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate block">
                                        {subCat.name}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Sub Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                  {editingId !== subCat.id && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEditing(subCat.id, subCat.name)}
                                        className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-md transition cursor-pointer"
                                        title="แก้ไขชื่อหมวดย่อย"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeletingItem({
                                            id: subCat.id,
                                            name: subCat.name,
                                            isMain: false,
                                            childCount: 0,
                                          })
                                        }
                                        className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-md transition cursor-pointer"
                                        title="ลบหมวดย่อย"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline Add Sub Category Input */}
                      {addingSubParentId === mainCat.id && (
                        <div className="flex gap-2 items-center bg-white dark:bg-neutral-850 p-2 rounded-xl border border-red-300 dark:border-red-800 shadow-sm">
                          <input
                            ref={newSubInputRef}
                            type="text"
                            value={newSubName}
                            onChange={e => setNewSubName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSub(mainCat.id);
                              }
                              if (e.key === 'Escape') {
                                setAddingSubParentId(null);
                                setNewSubName('');
                              }
                            }}
                            placeholder={`ชื่อหมวดย่อยใหม่ใน "${mainCat.name}"...`}
                            className="flex-1 bg-transparent px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSub(mainCat.id)}
                            disabled={!newSubName.trim() || isAddingSub}
                            className="flex items-center gap-1 px-3 py-1 btn-crimson text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isAddingSub ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            <span>เพิ่ม</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingSubParentId(null);
                              setNewSubName('');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-md transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Actions & Unsaved Banner */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-3">
            {isDirty && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="flex-1">
                  ⚠️ มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก — กด &quot;บันทึกการจัดกลุ่ม&quot;
                  เพื่ออัปเดตระบบ
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
                ลาก <GripVertical className="inline w-3 h-3 align-text-bottom" />{' '}
                เพื่อจัดลำดับหรือย้ายหมวดย่อยข้ามกลุ่มหลัก
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveHierarchy}
                  disabled={!isDirty || isSavingHierarchy}
                  className="flex items-center gap-1.5 px-4 py-2 btn-crimson text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSavingHierarchy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>💾 บันทึกการจัดกลุ่ม</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4 text-center rounded-2xl">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full w-fit mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
                มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold mt-1">
                คุณได้จัดลำดับหรือย้ายหมวดหมู่ แต่ยังไม่ได้กดบันทึก หากปิดหน้านี้
                การเปลี่ยนแปลงจะหายไป
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnsavedPrompt(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                กลับไปแก้ไข
              </button>
              <button
                type="button"
                onClick={handleDiscardAndClose}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer"
              >
                ละทิ้งและปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4 text-center rounded-2xl">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full w-fit mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
                {deletingItem.isMain ? 'ลบกลุ่มหลัก' : 'ลบหมวดย่อย'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold mt-1">
                ต้องการลบ {deletingItem.isMain ? 'กลุ่มหลัก' : 'หมวดย่อย'}{' '}
                <span className="font-bold text-slate-800 dark:text-neutral-200">
                  &quot;{deletingItem.name}&quot;
                </span>{' '}
                หรือไม่?
              </p>
            </div>

            {deletingItem.isMain && deletingItem.childCount > 0 ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ กลุ่มหลักนี้มี {deletingItem.childCount} หมวดย่อย — เมื่อลบแล้ว
                หมวดย่อยเหล่านี้จะถูกยกขึ้นเป็นกลุ่มหลักอิสระ และเมนูจะไม่สูญหาย
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ เมนูที่อยู่ในหมวดนี้จะไม่ถูกลบ แต่จะกลายเป็นหมวดว่าง
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
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
