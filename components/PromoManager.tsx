"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X, Loader2, CheckCircle, AlertTriangle, Tag, Percent, Gift, TicketPercent, ToggleLeft, ToggleRight } from 'lucide-react';

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
};

const TYPE_LABELS: Record<PromoType, { label: string; icon: React.ReactNode; color: string }> = {
  percentage: { label: 'ลดเปอร์เซ็นต์', icon: <Percent className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' },
  fixed: { label: 'คูปองลดเงิน', icon: <TicketPercent className="w-3.5 h-3.5" />, color: 'text-sky-400 bg-sky-950/20 border-sky-900/30' },
  buy_x_get_y: { label: 'ซื้อ X แถม Y', icon: <Gift className="w-3.5 h-3.5" />, color: 'text-fuchsia-400 bg-fuchsia-950/20 border-fuchsia-900/30' },
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
        // Reset all type-specific fields
        discount_percent: null,
        discount_amount: null,
        coupon_code: null,
        buy_qty: null,
        free_qty: null,
        menu_item_id: null,
      };

      if (formData.type === 'percentage') {
        payload.discount_percent = formData.discount_percent;
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
    } catch (err) {
      console.error('Error toggling promo:', err);
      showMsg('ไม่สามารถเปลี่ยนสถานะโปรโมชั่นได้', 'error');
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
      console.error('Error deleting promo:', err);
      showMsg('ไม่สามารถลบโปรโมชั่นได้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPromoDescription = (p: Promotion) => {
    if (p.type === 'percentage') return `ลด ${p.discount_percent}%`;
    if (p.type === 'fixed') return `ลด ${p.discount_amount} บาท` + (p.coupon_code ? ` (โค้ด: ${p.coupon_code})` : '');
    if (p.type === 'buy_x_get_y') {
      const menuItemName = menuItems.find(m => m.id === p.menu_item_id)?.name || 'บางรายการ';
      return `ซื้อ ${p.buy_qty} แถม ${p.free_qty} (${menuItemName})`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
            จัดการโปรโมชั่น (Promotions)
          </h2>
          <p className="text-stone-400 text-xs mt-1">สร้างส่วนลด คูปอง และโปรโมชั่นพิเศษ เพื่อดึงดูดลูกค้า</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-xl text-xs font-extrabold transition active:scale-95 whitespace-nowrap cursor-pointer shadow-md shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างโปรโมชั่นใหม่</span>
        </button>
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

      {/* Promo List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-24 bg-stone-900/20 border border-stone-850/80 border-dashed rounded-3xl">
          <Tag className="w-14 h-14 text-stone-700 mx-auto mb-3 stroke-[1.2]" />
          <h3 className="text-lg font-bold text-stone-400">ยังไม่มีโปรโมชั่น</h3>
          <p className="text-stone-500 text-xs mt-1">กดปุ่ม "สร้างโปรโมชั่นใหม่" เพื่อเริ่มต้นสร้างส่วนลดให้ร้านของคุณ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {promos.map(promo => {
            const typeInfo = TYPE_LABELS[promo.type];
            return (
              <div key={promo.id} className={`bg-stone-900/30 border rounded-2xl p-5 flex flex-col gap-3 transition ${promo.is_active ? 'border-stone-800' : 'border-stone-900 opacity-50'}`}>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-stone-100 text-sm">{promo.name}</h3>
                    <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.color}`}>
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
                      <ToggleRight className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-stone-600" />
                    )}
                  </button>
                </div>

                {/* Description */}
                <div className="text-xs text-amber-500/90 font-bold bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-xl">
                  {getPromoDescription(promo)}
                </div>

                {/* Conditions */}
                <div className="text-[10px] text-stone-500 space-y-0.5">
                  {promo.min_order_amount > 0 && <p>ขั้นต่ำ: {promo.min_order_amount} บาท</p>}
                  {promo.start_date && <p>เริ่ม: {new Date(promo.start_date).toLocaleDateString('th-TH')}</p>}
                  {promo.end_date && <p>สิ้นสุด: {new Date(promo.end_date).toLocaleDateString('th-TH')}</p>}
                  {!promo.start_date && !promo.end_date && <p>ไม่จำกัดระยะเวลา</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-stone-850/60">
                  <button
                    onClick={() => openEdit(promo)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 hover:text-amber-400 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(promo)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-stone-950 hover:bg-red-950/20 border border-stone-850 hover:border-red-900/30 rounded-xl text-stone-400 hover:text-red-400 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ CREATE/EDIT MODAL ============ */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-amber-500 flex items-center gap-2">
                {editingPromo ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingPromo ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}</span>
              </h3>
              <button onClick={closeModal} className="p-1.5 bg-stone-950 hover:bg-stone-800 rounded-full text-stone-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ชื่อโปรโมชั่น *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder='เช่น "ลดวันศุกร์ 10%"'
                  className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600"
                />
              </div>

              {/* Type Selector */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ประเภทโปรโมชั่น</label>
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
                            ? info.color + ' shadow-md'
                            : 'bg-stone-950 border-stone-850 text-stone-500 hover:text-stone-300'
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
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">เปอร์เซ็นต์ส่วนลด (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discount_percent}
                    onChange={e => setFormData(prev => ({ ...prev, discount_percent: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                  />
                </div>
              )}

              {formData.type === 'fixed' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">จำนวนเงินที่ลด (บาท)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.discount_amount}
                      onChange={e => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">รหัสคูปอง (ถ้ามี)</label>
                    <input
                      type="text"
                      value={formData.coupon_code}
                      onChange={e => setFormData(prev => ({ ...prev, coupon_code: e.target.value }))}
                      placeholder='เช่น "FRIDAY50"'
                      className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 uppercase"
                    />
                    <p className="text-[10px] text-stone-600 mt-1">ถ้าไม่ระบุ ระบบจะใช้ส่วนลดอัตโนมัติโดยไม่ต้องใส่โค้ด</p>
                  </div>
                </>
              )}

              {formData.type === 'buy_x_get_y' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ซื้อ (จาน)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.buy_qty}
                        onChange={e => setFormData(prev => ({ ...prev, buy_qty: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">แถม (จาน)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.free_qty}
                        onChange={e => setFormData(prev => ({ ...prev, free_qty: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">เลือกเมนูที่ร่วมรายการ *</label>
                    <select
                      value={formData.menu_item_id}
                      onChange={e => setFormData(prev => ({ ...prev, menu_item_id: e.target.value ? parseInt(e.target.value, 10) : '' }))}
                      className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 cursor-pointer appearance-none"
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
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ยอดสั่งขั้นต่ำ (บาท, 0 = ไม่จำกัด)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={e => setFormData(prev => ({ ...prev, min_order_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">วันที่เริ่ม (ไม่บังคับ)</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">วันที่สิ้นสุด (ไม่บังคับ)</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-stone-950/60 border border-stone-850 rounded-xl">
                <span className="text-xs font-bold text-stone-400">สถานะโปรโมชั่น</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    formData.is_active
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                      : 'bg-stone-900 border-stone-800 text-stone-500'
                  }`}
                >
                  {formData.is_active ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-stone-850">
                <button onClick={closeModal} className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-xs font-bold transition active:scale-97 cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-400 text-black text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-stone-900 border border-red-900/30 rounded-3xl p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-950/30 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-base font-black text-white mb-1">ยืนยันการลบโปรโมชั่น</h3>
              <p className="text-stone-400 text-xs">
                คุณต้องการลบโปรโมชั่น <span className="font-bold text-red-400">"{deleteTarget.name}"</span> ใช่หรือไม่?
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-xs font-bold transition active:scale-97 cursor-pointer">
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer"
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
