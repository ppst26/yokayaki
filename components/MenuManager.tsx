"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Minus, Pencil, Trash2, X, Search, Loader2, CheckCircle, UtensilsCrossed, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_stock_tracked: boolean;
  is_happy_hour: boolean;
  happy_hour_price: number | null;
  category: string;
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
};

export const MenuManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ทั้งหมด');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, stock, is_stock_tracked, is_happy_hour, happy_hour_price, category')
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

  // Filtering
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ทั้งหมด' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
            จัดการเมนูอาหาร (Menu Manager)
          </h2>
          <p className="text-stone-400 text-xs mt-1">เพิ่ม แก้ไข หรือลบรายการอาหารในระบบ POS</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาเมนู..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-xl text-xs font-extrabold transition active:scale-95 whitespace-nowrap cursor-pointer shadow-md shadow-amber-500/10"
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
              filterCategory === cat
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-stone-900/40 border-stone-850 text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            {cat} {cat !== 'ทั้งหมด' && <span className="text-[10px] text-stone-500 ml-0.5">({items.filter(i => i.category === cat).length})</span>}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
            : 'bg-red-950/20 border-red-900/40 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Menu Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/80">
                  <th className="py-3.5 px-5">เมนู</th>
                  <th className="py-3.5 px-4 text-right">ราคา</th>
                  <th className="py-3.5 px-4 text-center">หมวดหมู่</th>
                  <th className="py-3.5 px-4 text-center">สต็อก</th>
                  <th className="py-3.5 px-4 text-center">Happy Hour</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-sm">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-stone-900/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-stone-200">{item.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-amber-500">{item.price}</span>
                      <span className="text-stone-500 text-xs ml-0.5">฿</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-400 rounded-md">
                        {item.category || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Toggle tracking button */}
                        <button
                          onClick={() => handleInlineToggleTracking(item.id, item.is_stock_tracked)}
                          className="focus:outline-none cursor-pointer p-1 rounded-md hover:bg-stone-800 transition"
                          title={item.is_stock_tracked ? 'คลิกเพื่อปิดนับสต็อก' : 'คลิกเพื่อเปิดนับสต็อก'}
                        >
                          {item.is_stock_tracked ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded">
                              <ToggleRight className="w-3 h-3" />
                              <span>นับสต็อก</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-stone-500 bg-stone-950 border border-stone-850 px-2 py-0.5 rounded">
                              <ToggleLeft className="w-3 h-3" />
                              <span>ไม่จำกัด</span>
                            </div>
                          )}
                        </button>

                        {/* Stock adjust controls */}
                        {item.is_stock_tracked && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <button
                              onClick={() => handleInlineStockUpdate(item.id, item.stock - 1)}
                              className="p-1 bg-stone-800 border border-stone-750 rounded hover:bg-stone-700 text-stone-300 transition active:scale-90 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.stock}
                              onChange={e => handleInlineStockUpdate(item.id, parseInt(e.target.value, 10) || 0)}
                              className={`w-12 text-center py-0.5 bg-stone-950 border border-stone-850 rounded text-xs font-bold focus:outline-none focus:border-amber-500/50 ${item.stock <= 3 ? 'text-red-400' : 'text-white'}`}
                            />
                            <button
                              onClick={() => handleInlineStockUpdate(item.id, item.stock + 1)}
                              className="p-1 bg-stone-800 border border-stone-750 rounded hover:bg-stone-700 text-stone-300 transition active:scale-90 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.is_happy_hour ? (
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-950/30 border border-yellow-900/30 px-2 py-0.5 rounded-md">
                          {item.happy_hour_price}฿
                        </span>
                      ) : (
                        <span className="text-stone-600 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition active:scale-95 cursor-pointer"
                          title="แก้ไข"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 bg-stone-800 hover:bg-red-950/40 border border-stone-700 hover:border-red-900/40 rounded-lg text-stone-400 hover:text-red-400 transition active:scale-95 cursor-pointer"
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
                    <td colSpan={6} className="py-16 text-center">
                      <UtensilsCrossed className="w-10 h-10 text-stone-700 mx-auto mb-3" />
                      <p className="text-stone-500 font-medium text-xs">ไม่พบรายการเมนูที่ตรงกับคำค้นหา</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total count */}
          <div className="px-5 py-3 bg-stone-900/50 border-t border-stone-850 text-xs text-stone-500 font-medium">
            แสดง {filteredItems.length} จาก {items.length} รายการ
          </div>
        </div>
      )}

      {/* ============ CREATE/EDIT FORM MODAL ============ */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-amber-500 flex items-center gap-2">
                {editingItem ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</span>
              </h3>
              <button onClick={closeFormModal} className="p-1.5 bg-stone-950 hover:bg-stone-800 rounded-full text-stone-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ชื่อเมนู *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น ราเมงทงคตสึ"
                  className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600"
                />
              </div>

              {/* Price + Category (2 columns) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ราคา (บาท) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price || ''}
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 cursor-pointer appearance-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">สต็อกเริ่มต้น</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value, 10) || 0 }))}
                    disabled={!formData.is_stock_tracked}
                    className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_stock_tracked: !prev.is_stock_tracked }))}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      formData.is_stock_tracked
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                        : 'bg-stone-950 border-stone-850 text-stone-500'
                    }`}
                  >
                    {formData.is_stock_tracked ? '✓ นับสต็อก' : '∞ ไม่จำกัด'}
                  </button>
                </div>
              </div>

              {/* Happy Hour */}
              <div className="p-4 bg-stone-950/60 border border-stone-850 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-stone-500 tracking-wider uppercase">Happy Hour</label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_happy_hour: !prev.is_happy_hour }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      formData.is_happy_hour
                        ? 'bg-yellow-950/30 border-yellow-900/40 text-yellow-400'
                        : 'bg-stone-900 border-stone-800 text-stone-500'
                    }`}
                  >
                    {formData.is_happy_hour ? '🍻 เปิดใช้งาน' : 'ปิด'}
                  </button>
                </div>
                {formData.is_happy_hour && (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ราคา Happy Hour (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.happy_hour_price || ''}
                      onChange={e => setFormData(prev => ({ ...prev, happy_hour_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="ราคาช่วง Happy Hour"
                      className="w-full bg-stone-900 border border-stone-850 focus:border-yellow-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-yellow-300 placeholder-stone-600"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-stone-850">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-xs font-bold transition active:scale-97 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-400 text-black text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-stone-900 border border-red-900/30 rounded-3xl p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-950/30 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-base font-black text-white mb-1">ยืนยันการลบเมนู</h3>
              <p className="text-stone-400 text-xs">
                คุณต้องการลบเมนู <span className="font-bold text-red-400">"{deleteTarget.name}"</span> ใช่หรือไม่?
              </p>
              <p className="text-stone-500 text-[10px] mt-1">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-xs font-bold transition active:scale-97 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer"
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
