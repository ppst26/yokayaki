"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Minus, Pencil, Trash2, X, Search, Loader2, CheckCircle, UtensilsCrossed, AlertTriangle, ToggleLeft, ToggleRight, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset to page 1 whenever filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, pageSize]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setItems(data as MenuItem[]);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      showMessage('ไม่สามารถดึงข้อมูลเมนูได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Open modal for creating a new item
  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
    setShowFormModal(true);
  };

  // Open modal for editing an existing item
  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      stock: item.stock,
      is_stock_tracked: item.is_stock_tracked,
      is_happy_hour: item.is_happy_hour,
      happy_hour_price: item.happy_hour_price,
      category: item.category,
      image_url: item.image_url || '',
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage('กรุณากรอกชื่อเมนู', 'error');
      return;
    }
    if (formData.price <= 0) {
      showMessage('กรุณากรอกราคาให้ถูกต้อง (มากกว่า 0)', 'error');
      return;
    }

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
        // UPDATE
        const { error } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        showMessage(`แก้ไขเมนู "${payload.name}" สำเร็จ`, 'success');
      } else {
        // INSERT
        const { error } = await supabase
          .from('menu_items')
          .insert(payload);

        if (error) throw error;
        showMessage(`เพิ่มเมนู "${payload.name}" สำเร็จ`, 'success');
      }

      closeFormModal();
      await fetchItems();
    } catch (err: any) {
      console.error('Error saving menu item:', err);
      showMessage('ไม่สามารถบันทึกเมนูได้: ' + (err.message || ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      showMessage(`ลบเมนู "${deleteTarget.name}" สำเร็จ`, 'success');
      setDeleteTarget(null);
      await fetchItems();
    } catch (err: any) {
      console.error('Error deleting menu item:', err);
      showMessage('ไม่สามารถลบเมนูได้: ' + (err.message || ''), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Inline Stock Update — อัปเดตจำนวนสต็อกโดยตรงจากตาราง
  const handleInlineStockUpdate = async (id: number, val: number) => {
    const updatedStock = Math.max(0, val);
    setItems(prev => prev.map(item => item.id === id ? { ...item, stock: updatedStock } : item));
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock: updatedStock })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating stock:', err);
      showMessage('ไม่สามารถบันทึกสต็อกได้', 'error');
      fetchItems();
    }
  };

  // Inline Toggle Stock Tracking — สลับเปิด/ปิดนับสต็อก
  const handleInlineToggleTracking = async (id: number, currentTracked: boolean) => {
    const nextTracked = !currentTracked;
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_stock_tracked: nextTracked } : item));
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_stock_tracked: nextTracked })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling stock tracking:', err);
      showMessage('ไม่สามารถอัปเดตสถานะสต็อกได้', 'error');
      fetchItems();
    }
  };

  // Filtering & Pagination
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ทั้งหมด' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            จัดการเมนูอาหาร (Menu Manager)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">เพิ่ม แก้ไข หรือลบรายการอาหารในระบบ POS</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาเมนู..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 font-semibold"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition active:scale-95 whitespace-nowrap cursor-pointer shadow-sm shadow-red-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเมนูใหม่</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {['ทั้งหมด', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
              filterCategory === cat
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {cat} {cat !== 'ทั้งหมด' && <span className="text-[10px] opacity-80 ml-0.5">({items.filter(i => i.category === cat).length})</span>}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Menu Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold bg-slate-50 dark:bg-slate-800/90">
                  <th className="py-3.5 px-5">เมนู</th>
                  <th className="py-3.5 px-4 text-right">ราคา</th>
                  <th className="py-3.5 px-4 text-center">หมวดหมู่</th>
                  <th className="py-3.5 px-4 text-center">สต็อก</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <UtensilsCrossed className="w-4 h-4 text-slate-400 dark:text-slate-500 stroke-[1.5]" />
                          )}
                        </div>
                        <div>
                          <div>{item.name}</div>
                          {item.is_happy_hour && item.happy_hour_price && (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              ⚡ Happy Hour {item.happy_hour_price} ฿
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-extrabold text-red-600 dark:text-red-400 text-sm">{item.price}</span>
                      <span className="text-slate-400 dark:text-slate-500 text-xs ml-0.5 font-semibold">฿</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
                        {item.category || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Toggle tracking button */}
                        <button
                          onClick={() => handleInlineToggleTracking(item.id, item.is_stock_tracked)}
                          className="focus:outline-none cursor-pointer p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title={item.is_stock_tracked ? 'คลิกเพื่อปิดนับสต็อก' : 'คลิกเพื่อเปิดนับสต็อก'}
                        >
                          {item.is_stock_tracked ? (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
                              <ToggleRight className="w-3.5 h-3.5" />
                              <span>นับสต็อก</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                              <ToggleLeft className="w-3.5 h-3.5" />
                              <span>ไม่จำกัด</span>
                            </div>
                          )}
                        </button>

                        {/* Stock adjust controls */}
                        {item.is_stock_tracked && (
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              onClick={() => handleInlineStockUpdate(item.id, item.stock - 1)}
                              className="p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-90 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.stock}
                              onChange={e => handleInlineStockUpdate(item.id, parseInt(e.target.value, 10) || 0)}
                              className={`w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold focus:outline-none focus:border-red-500 ${item.stock <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}
                            />
                            <button
                              onClick={() => handleInlineStockUpdate(item.id, item.stock + 1)}
                              className="p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-90 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition active:scale-95 cursor-pointer shadow-xs"
                          title="แก้ไข"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition active:scale-95 cursor-pointer shadow-xs"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <UtensilsCrossed className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 dark:text-slate-500 font-medium text-xs">ไม่พบรายการเมนูที่ตรงกับคำค้นหา</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>แสดง</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>รายการ/หน้า</span>
              </div>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span>
                {totalItems > 0
                  ? `แสดง ${startIndex + 1} - ${endIndex} จากทั้งหมด ${totalItems} รายการ`
                  : 'ไม่พบรายการ'}
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg font-bold transition text-xs cursor-pointer ${
                      currentPage === page
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ CREATE/EDIT FORM MODAL ============ */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {editingItem ? <Pencil className="w-4 h-4 text-red-600 dark:text-red-400" /> : <Plus className="w-4 h-4 text-red-600 dark:text-red-400" />}
                <span>{editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</span>
              </h3>
              <button onClick={closeFormModal} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">ชื่อเมนู *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น ราเมงทงคตสึ"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>รูปภาพเมนู (URL รูปภาพ)</span>
                </label>
                <input
                  type="url"
                  value={formData.image_url || ''}
                  onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
                {formData.image_url ? (
                  <div className="mt-2.5 relative w-32 aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={formData.image_url}
                      alt="พรีวิวรูปเมนู"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">ใส่ลิงก์รูปภาพอาหารสำหรับแสดงภาพในหน้า POS และ QR สั่งอาหาร</p>
                )}
              </div>

              {/* Price + Category (2 columns) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">ราคา (บาท) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price || ''}
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer appearance-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="dark:bg-slate-900">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1.5">สต็อกเริ่มต้น</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value, 10) || 0 }))}
                    disabled={!formData.is_stock_tracked}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_stock_tracked: !prev.is_stock_tracked }))}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      formData.is_stock_tracked
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formData.is_stock_tracked ? '✓ นับสต็อก' : '∞ ไม่จำกัด'}
                  </button>
                </div>
              </div>


              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-97 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-red-600/20"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'กำลังบันทึก...' : (editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มเมนู')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">ยืนยันการลบเมนู</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                คุณต้องการลบเมนู <span className="font-bold text-rose-600 dark:text-rose-400">"{deleteTarget.name}"</span> ใช่หรือไม่?
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-medium">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-97 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-rose-600/20"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'กำลังลบ...' : 'ลบเมนูนี้'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

