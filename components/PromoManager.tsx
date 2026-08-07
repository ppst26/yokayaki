"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X, Loader2, CheckCircle, AlertTriangle, Tag, Percent, Gift, TicketPercent, ToggleLeft, ToggleRight, Clock, Image as ImageIcon } from 'lucide-react';

interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_percent: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  buy_qty: number | null;
  free_qty: number | null;
  min_order_amount: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  menu_item_id: number | null;
  start_time: string | null;
  end_time: string | null;
  image_url: string | null;
}

type PromoType = 'percentage' | 'fixed' | 'buy_x_get_y';

const EMPTY_FORM = {
  name: '',
  type: 'percentage' as PromoType,
  discount_percent: 10,
  discount_amount: 50,
  coupon_code: '',
  buy_qty: 2,
  free_qty: 1,
  min_order_amount: 0,
  is_active: true,
  start_date: '',
  end_date: '',
  menu_item_id: '' as string | number,
  start_time: '',
  end_time: '',
  hasTimeRange: false,
  image_url: '',
};

const TYPE_LABELS: Record<PromoType, { label: string; icon: React.ReactNode; color: string }> = {
  percentage: { label: 'ลดเปอร์เซ็นต์', icon: <Percent className="w-3.5 h-3.5" />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  fixed: { label: 'คูปองลดเงิน', icon: <TicketPercent className="w-3.5 h-3.5" />, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  buy_x_get_y: { label: 'ซื้อ X แถม Y', icon: <Gift className="w-3.5 h-3.5" />, color: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200' },
};


export const PromoManager: React.FC = () => {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPromos(data as Promotion[]);
    } catch (err) {
      console.error('Error fetching promos:', err);
      showMsg('ไม่สามารถดึงข้อมูลโปรโมชั่นได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      if (data) setMenuItems(data);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    }
  };

  useEffect(() => { 
    fetchPromos(); 
    fetchMenuItems();
  }, []);

  const openCreate = () => {
    setEditingPromo(null);
    setFormData({ ...EMPTY_FORM });
    setShowFormModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingPromo(p);
    setFormData({
      name: p.name,
      type: p.type,
      discount_percent: p.discount_percent || 10,
      discount_amount: p.discount_amount || 50,
      coupon_code: p.coupon_code || '',
      buy_qty: p.buy_qty || 2,
      free_qty: p.free_qty || 1,
      min_order_amount: p.min_order_amount || 0,
      is_active: p.is_active,
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      menu_item_id: p.menu_item_id || '',
      start_time: p.start_time || '',
      end_time: p.end_time || '',
      hasTimeRange: !!(p.start_time && p.end_time),
      image_url: p.image_url || '',
    });
    setShowFormModal(true);
  };

  const closeModal = () => {
    setShowFormModal(false);
    setEditingPromo(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { showMsg('กรุณากรอกชื่อโปรโมชั่น', 'error'); return; }

    try {
      setIsSaving(true);
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        type: formData.type,
        min_order_amount: formData.min_order_amount || 0,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        image_url: formData.image_url.trim() || null,
        // Reset all type-specific fields
        discount_percent: null,
        discount_amount: null,
        coupon_code: null,
        buy_qty: null,
        free_qty: null,
        menu_item_id: null,
        start_time: null,
        end_time: null,
      };

      if (formData.type === 'percentage') {
        payload.discount_percent = formData.discount_percent;
        payload.menu_item_id = formData.menu_item_id || null;
        if (formData.hasTimeRange && formData.start_time && formData.end_time) {
          payload.start_time = formData.start_time;
          payload.end_time = formData.end_time;
        }
      } else if (formData.type === 'fixed') {
        payload.discount_amount = formData.discount_amount;
        payload.coupon_code = formData.coupon_code.trim().toUpperCase() || null;
      } else if (formData.type === 'buy_x_get_y') {
        if (!formData.menu_item_id) {
          showMsg('กรุณาเลือกเมนูที่ร่วมรายการสำหรับโปรโมชั่น ซื้อ X แถม Y', 'error');
          return;
        }
        payload.buy_qty = formData.buy_qty;
        payload.free_qty = formData.free_qty;
        payload.menu_item_id = formData.menu_item_id;
      }

      if (editingPromo) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editingPromo.id);
        if (error) throw error;
        showMsg(`แก้ไขโปรโมชั่น "${payload.name}" สำเร็จ`, 'success');
      } else {
        const { error } = await supabase.from('promotions').insert(payload);
        if (error) throw error;
        showMsg(`สร้างโปรโมชั่น "${payload.name}" สำเร็จ`, 'success');
      }

      closeModal();
      await fetchPromos();
    } catch (err: any) {
      console.error('Error saving promo:', err);
      showMsg('ไม่สามารถบันทึกโปรโมชั่นได้: ' + (err.message || ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      const { error } = await supabase.from('promotions').update({ is_active: !promo.is_active }).eq('id', promo.id);
      if (error) throw error;
      setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p));
    } catch (err: any) {
      console.error('Error toggling promo:', err?.message || err);
      showMsg('ไม่สามารถเปลี่ยนสถานะโปรโมชั่นได้: ' + (err?.message || ''), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('promotions').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showMsg(`ลบโปรโมชั่น "${deleteTarget.name}" สำเร็จ`, 'success');
      setDeleteTarget(null);
      await fetchPromos();
    } catch (err: any) {
      console.error('Error deleting promo:', err?.message || err);
      showMsg('ไม่สามารถลบโปรโมชั่นได้: ' + (err?.message || ''), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPromoDescription = (p: Promotion) => {
    if (p.type === 'percentage') {
      const menuName = p.menu_item_id ? (menuItems.find(m => m.id === p.menu_item_id)?.name || 'บางเมนู') : 'ทุกเมนู';
      const timeStr = (p.start_time && p.end_time) ? ` ⏰ ${p.start_time.slice(0,5)}-${p.end_time.slice(0,5)}` : '';
      return `ลด ${p.discount_percent}% (${menuName})${timeStr}`;
    }
    if (p.type === 'fixed') return `ลด ${p.discount_amount} บาท` + (p.coupon_code ? ` (โค้ด: ${p.coupon_code})` : '');
    if (p.type === 'buy_x_get_y') {
      const menuItemName = menuItems.find(m => m.id === p.menu_item_id)?.name || 'บางรายการ';
      return `ซื้อ ${p.buy_qty} แถม ${p.free_qty} (${menuItemName})`;
    }
    return '';
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            จัดการโปรโมชั่น (Promotions)
          </h2>
          <p className="text-slate-500 text-xs font-medium mt-0.5">สร้างส่วนลด คูปอง และโปรโมชั่นพิเศษ เพื่อดึงดูดลูกค้า</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition active:scale-95 whitespace-nowrap cursor-pointer shadow-sm shadow-red-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างโปรโมชั่นใหม่</span>
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Promo List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-24 bg-white border border-slate-200/80 border-dashed rounded-3xl p-6 shadow-xs">
          <Tag className="w-14 h-14 text-slate-300 mx-auto mb-3 stroke-[1.2]" />
          <h3 className="text-base font-extrabold text-slate-700">ยังไม่มีโปรโมชั่น</h3>
          <p className="text-slate-400 text-xs mt-1 font-medium">กดปุ่ม "สร้างโปรโมชั่นใหม่" เพื่อเริ่มต้นสร้างส่วนลดให้ร้านของคุณ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {promos.map(promo => {
            const typeInfo = TYPE_LABELS[promo.type];
            return (
              <div key={promo.id} className={`bg-white border rounded-2xl overflow-hidden flex flex-col justify-between transition shadow-sm ${promo.is_active ? 'border-slate-200/80' : 'border-slate-200 opacity-60'}`}>
                {/* Header Image if available */}
                {promo.image_url && (
                  <div className="w-full h-36 relative bg-slate-100 border-b border-slate-100 overflow-hidden">
                    <img
                      src={promo.image_url}
                      alt={promo.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="p-5 flex flex-col justify-between gap-3 flex-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-extrabold text-slate-900 text-sm">{promo.name}</h3>
                      <div className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${typeInfo.color}`}>
                        {typeInfo.icon}
                        <span>{typeInfo.label}</span>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleActive(promo)}
                      className="cursor-pointer transition active:scale-95"
                      title={promo.is_active ? 'ปิดโปรโมชั่น' : 'เปิดโปรโมชั่น'}
                    >
                      {promo.is_active ? (
                        <ToggleRight className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-300" />
                      )}
                    </button>
                  </div>

                {/* Description */}
                <div className="text-xs text-red-700 font-bold bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
                  {getPromoDescription(promo)}
                </div>

                {/* Conditions */}
                <div className="text-[11px] text-slate-500 font-medium space-y-0.5">
                  {promo.min_order_amount > 0 && <p>ขั้นต่ำ: {promo.min_order_amount} บาท</p>}
                  {promo.start_date && <p>เริ่ม: {new Date(promo.start_date).toLocaleDateString('th-TH')}</p>}
                  {promo.end_date && <p>สิ้นสุด: {new Date(promo.end_date).toLocaleDateString('th-TH')}</p>}
                  {!promo.start_date && !promo.end_date && <p>ไม่จำกัดระยะเวลา</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(promo)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-900 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(promo)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl text-slate-500 hover:text-rose-600 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ CREATE/EDIT MODAL ============ */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {editingPromo ? <Pencil className="w-4 h-4 text-red-600" /> : <Plus className="w-4 h-4 text-red-600" />}
                <span>{editingPromo ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}</span>
              </h3>
              <button onClick={closeModal} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">ชื่อโปรโมชั่น *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder='เช่น "ลดวันศุกร์ 10%"'
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                  <span>รูปภาพโปรโมชั่น (URL รูปภาพ)</span>
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/promo-banner.jpg"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400"
                />
                {formData.image_url ? (
                  <div className="mt-2.5 relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={formData.image_url}
                      alt="พรีวิวรูปภาพโปรโมชั่น"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
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
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">ใส่ลิงก์รูปภาพ (เช่น Unsplash, Imgur) สำหรับแสดงภาพหน้าปกโปรโมชั่น</p>
                )}
              </div>

              {/* Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">ประเภทโปรโมชั่น</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_LABELS) as PromoType[]).map(type => {
                    const info = TYPE_LABELS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          formData.type === type
                            ? info.color + ' shadow-xs font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {info.icon}
                        <span className="text-[10px]">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type-specific fields */}
              {formData.type === 'percentage' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">เปอร์เซ็นต์ส่วนลด (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.discount_percent}
                      onChange={e => setFormData(prev => ({ ...prev, discount_percent: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  {/* Menu item selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">เมนูที่ร่วมรายการ</label>
                    <select
                      value={formData.menu_item_id}
                      onChange={e => setFormData(prev => ({ ...prev, menu_item_id: e.target.value ? parseInt(e.target.value, 10) : '' }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer appearance-none"
                    >
                      <option value="">ทุกเมนูในร้าน</option>
                      {menuItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Happy Hour time range toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs font-bold text-slate-700">กำหนดช่วงเวลา Happy Hour</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, hasTimeRange: !prev.hasTimeRange, start_time: prev.hasTimeRange ? '' : '17:00', end_time: prev.hasTimeRange ? '' : '19:00' }))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          formData.hasTimeRange
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}
                      >
                        {formData.hasTimeRange ? '⏰ เปิดใช้งาน' : 'ปิด'}
                      </button>
                    </div>

                    {formData.hasTimeRange && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">เวลาเริ่ม</label>
                          <input
                            type="time"
                            value={formData.start_time}
                            onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">เวลาสิ้นสุด</label>
                          <input
                            type="time"
                            value={formData.end_time}
                            onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.type === 'fixed' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">จำนวนเงินที่ลด (บาท)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.discount_amount}
                      onChange={e => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">รหัสคูปอง (ถ้ามี)</label>
                    <input
                      type="text"
                      value={formData.coupon_code}
                      onChange={e => setFormData(prev => ({ ...prev, coupon_code: e.target.value }))}
                      placeholder='เช่น "FRIDAY50"'
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 uppercase"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">ถ้าไม่ระบุ ระบบจะใช้ส่วนลดอัตโนมัติโดยไม่ต้องใส่โค้ด</p>
                  </div>
                </>
              )}

              {formData.type === 'buy_x_get_y' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">ซื้อ (จาน)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.buy_qty}
                        onChange={e => setFormData(prev => ({ ...prev, buy_qty: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">แถม (จาน)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.free_qty}
                        onChange={e => setFormData(prev => ({ ...prev, free_qty: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">เลือกเมนูที่ร่วมรายการ *</label>
                    <select
                      value={formData.menu_item_id}
                      onChange={e => setFormData(prev => ({ ...prev, menu_item_id: e.target.value ? parseInt(e.target.value, 10) : '' }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer appearance-none"
                    >
                      <option value="">-- เลือกเมนูอาหาร --</option>
                      {menuItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Min order + date range */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">ยอดสั่งขั้นต่ำ (บาท, 0 = ไม่จำกัด)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={e => setFormData(prev => ({ ...prev, min_order_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">วันที่เริ่ม (ไม่บังคับ)</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1.5">วันที่สิ้นสุด (ไม่บังคับ)</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-700">สถานะโปรโมชั่น</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    formData.is_active
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  {formData.is_active ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={closeModal} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl active:scale-97 transition cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-red-600/20"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{isSaving ? 'กำลังบันทึก...' : (editingPromo ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชั่น')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE MODAL ============ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">ยืนยันการลบโปรโมชั่น</h3>
              <p className="text-slate-600 text-xs">
                คุณต้องการลบโปรโมชั่น <span className="font-bold text-rose-600">"{deleteTarget.name}"</span> ใช่หรือไม่?
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl active:scale-97 transition cursor-pointer">
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-rose-600/20"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'กำลังลบ...' : 'ลบโปรโมชั่น'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

