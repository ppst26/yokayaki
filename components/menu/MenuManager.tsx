"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  Minus,
  Pencil,
  Trash2,
  X,
  Search,
  CheckCircle,
  UtensilsCrossed,
  AlertTriangle,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CustomSelect } from '@/components/ui/select';
import { TablePagination } from '@/components/ui/pagination';
import { MenuItemModal } from './MenuItemModal';

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

const CATEGORIES = ['ย่าง', 'เส้น', 'ซาซิมิ', 'ของทอด', 'ของหวาน', 'หม้อไฟ', 'เครื่องดื่ม', 'อื่นๆ'];

const EMPTY_FORM: Omit<MenuItem, 'id'> = {
  name: '',
  price: 0,
  stock: 20,
  is_stock_tracked: true,
  is_happy_hour: false,
  happy_hour_price: null,
  category: 'ย่าง',
  image_url: '',
};

export const MenuManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ทั้งหมด');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, pageSize]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setItems((data || []) as MenuItem[]);
    } catch (err: any) {
      console.error('Error fetching menu items:', err);
      showMessage('ไม่สามารถดึงข้อมูลเมนูอาหารได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStockUpdate = async (item: MenuItem, deltaOrVal: number, isAbsolute = false) => {
    const newStock = Math.max(0, isAbsolute ? deltaOrVal : item.stock + deltaOrVal);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: newStock } : i));

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock: newStock })
        .eq('id', item.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating stock:', err);
      showMessage('ไม่สามารถอัปเดตจำนวนคงเหลือได้', 'error');
      fetchMenuItems();
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setShowFormModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      stock: item.stock,
      is_stock_tracked: item.is_stock_tracked,
      is_happy_hour: item.is_happy_hour,
      happy_hour_price: item.happy_hour_price,
      category: item.category || 'ย่าง',
      image_url: item.image_url || '',
    });
    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        price: formData.price,
        stock: formData.stock,
        is_stock_tracked: formData.is_stock_tracked,
        is_happy_hour: formData.is_happy_hour,
        happy_hour_price: formData.is_happy_hour ? formData.happy_hour_price : null,
        category: formData.category,
        image_url: formData.image_url?.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showMessage(`แก้ไขเมนู "${payload.name}" เรียบร้อยแล้ว`, 'success');
      } else {
        const { error } = await supabase.from('menu_items').insert([payload]);
        if (error) throw error;
        showMessage(`เพิ่มเมนูใหม่ "${payload.name}" เรียบร้อยแล้ว`, 'success');
      }

      setShowFormModal(false);
      fetchMenuItems();
    } catch (err: any) {
      console.error('Error saving menu item:', err);
      showMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      showMessage(`ลบเมนู "${deleteTarget.name}" เรียบร้อยแล้ว`, 'success');
      setDeleteTarget(null);
      fetchMenuItems();
    } catch (err: any) {
      console.error('Error deleting menu item:', err);
      showMessage('ไม่สามารถลบเมนูได้ เนื่องจากมีออเดอร์ผูกกับเมนูนี้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'ทั้งหมด' || i.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-red-600 dark:text-red-400" />
            จัดการรายการอาหาร (Menu Manager)
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold mt-0.5">
            เพิ่ม แก้ไข ลบเมนู กำหนดราคา รูปภาพ และหมวดหมู่สินค้า
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มเมนูอาหารใหม่</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['ทั้งหมด', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                filterCategory === cat
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/25 border-none'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border-none'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl px-3.5 py-2 shadow-xs w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อเมนู..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs font-semibold text-slate-800 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Menu Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
            ไม่พบรายการอาหารที่ตรงกับเงื่อนไข
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table containerClassName="-mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full rounded-sm">
            <TableHeader>
              <TableRow>
                <TableHead>รูปภาพ</TableHead>
                <TableHead>ชื่อเมนู</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead className="text-center">จำนวนสต็อกคงเหลือ</TableHead>
                <TableHead className="text-right">ราคาปกติ</TableHead>
                <TableHead className="text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded-xl border-none"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-extrabold text-zinc-900 dark:text-zinc-100">{item.name}</TableCell>
                  <TableCell>
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                      {item.category || 'ทั่วไป'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleQuickStockUpdate(item, -1)}
                        disabled={item.stock <= 0}
                        className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition cursor-pointer border-none shadow-none"
                        title="ลดจำนวน 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={item.stock}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 0) {
                            handleQuickStockUpdate(item, val, true);
                          }
                        }}
                        className="w-14 text-center bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-lg py-1 text-zinc-900 dark:text-zinc-100 border-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                      <button
                        onClick={() => handleQuickStockUpdate(item, 1)}
                        className="p-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition cursor-pointer border-none shadow-none"
                        title="เพิ่มจำนวน 1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-red-600 dark:text-red-400 text-sm">
                    {item.price.toLocaleString()} ฿
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl transition cursor-pointer border-none shadow-none"
                        title="แก้ไข"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer border-none shadow-none"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Form Modal */}
      <MenuItemModal
        showFormModal={showFormModal}
        setShowFormModal={setShowFormModal}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        categories={CATEGORIES}
        handleSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
              ยืนยันการลบเมนูอาหาร
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              คุณต้องการลบเมนู <span className="font-bold text-slate-800 dark:text-neutral-200">"{deleteTarget.name}"</span> หรือไม่?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'ลบเมนู'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
