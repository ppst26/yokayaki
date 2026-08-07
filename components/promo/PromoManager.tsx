"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Gift,
  Clock,
  TicketPercent,
} from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_amount?: number;
  discount_percent?: number;
  min_order_amount: number;
  buy_qty?: number;
  free_qty?: number;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  menu_item_id?: number;
  coupon_code?: string;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  percentage: { label: 'ส่วนลดเปอร์เซ็นต์ (%)', desc: 'ลดเป็น % จากยอดรวมบิล หรือเมนูเจาะจง' },
  fixed: { label: 'คูปองส่วนลด', desc: 'ลดจำนวนเงินคงที่เมื่อมียอดขั้นต่ำ' },
  buy_x_get_y: { label: 'ซื้อ X แถม Y', desc: 'ซื้อเมนูที่กำหนดครบ X จาน แถมฟรี Y จาน' },
};

export const PromoManager: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed' | 'buy_x_get_y'>('percentage');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [buyQty, setBuyQty] = useState('');
  const [freeQty, setFreeQty] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [couponCode, setCouponCode] = useState('');

  const showMsg = (text: string, t: 'success' | 'error') => {
    setMessage({ text, type: t });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: pData } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (pData) setPromotions(pData as Promotion[]);

      const { data: mData } = await supabase
        .from('menu_items')
        .select('id, name, price')
        .order('name');

      if (mData) setMenuItems(mData as MenuItem[]);
    } catch (err) {
      console.error('Error fetching data:', err);
      showMsg('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditingPromo(null);
    setName('');
    setType('percentage');
    setDiscountPercent('');
    setDiscountAmount('');
    setMinOrderAmount('0');
    setBuyQty('1');
    setFreeQty('1');
    setMenuItemId('');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setCouponCode('');
    setShowModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingPromo(p);
    setName(p.name);
    setType(p.type);
    setDiscountPercent(p.discount_percent ? String(p.discount_percent) : '');
    setDiscountAmount(p.discount_amount ? String(p.discount_amount) : '');
    setMinOrderAmount(String(p.min_order_amount || 0));
    setBuyQty(p.buy_qty ? String(p.buy_qty) : '1');
    setFreeQty(p.free_qty ? String(p.free_qty) : '1');
    setMenuItemId(p.menu_item_id ? String(p.menu_item_id) : '');
    setStartDate(p.start_date || '');
    setEndDate(p.end_date || '');
    setStartTime(p.start_time || '');
    setEndTime(p.end_time || '');
    setCouponCode(p.coupon_code || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return showMsg('กรุณากรอกชื่อโปรโมชั่น', 'error');

    try {
      setIsSaving(true);
      const payload: any = {
        name: name.trim(),
        type,
        min_order_amount: Number(minOrderAmount) || 0,
        start_date: startDate || null,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        menu_item_id: menuItemId ? Number(menuItemId) : null,
        coupon_code: couponCode.trim() ? couponCode.trim().toUpperCase() : null,
        is_active: true,
      };

      if (type === 'percentage') {
        payload.discount_percent = Number(discountPercent) || 0;
        payload.discount_amount = null;
      } else if (type === 'fixed') {
        payload.discount_amount = Number(discountAmount) || 0;
        payload.discount_percent = null;
      } else if (type === 'buy_x_get_y') {
        payload.buy_qty = Number(buyQty) || 1;
        payload.free_qty = Number(freeQty) || 1;
      }

      if (editingPromo) {
        const { error } = await supabase
          .from('promotions')
          .update(payload)
          .eq('id', editingPromo.id);
        if (error) throw error;
        showMsg(`อัปเดตโปรโมชั่น "${name}" เรียบร้อยแล้ว`, 'success');
      } else {
        const { error } = await supabase.from('promotions').insert([payload]);
        if (error) throw error;
        showMsg(`สร้างโปรโมชั่น "${name}" เรียบร้อยแล้ว`, 'success');
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving promo:', err);
      showMsg('ไม่สามารถบันทึกได้: ' + (err.message || ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (p: Promotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !p.is_active })
        .eq('id', p.id);
      if (error) throw error;
      showMsg(`${p.is_active ? 'ปิด' : 'เปิด'}ใช้งาน "${p.name}" แล้ว`, 'success');
      fetchData();
    } catch (err: any) {
      showMsg('ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('promotions').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showMsg(`ลบโปรโมชั่น "${deleteTarget.name}" แล้ว`, 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      showMsg('ไม่สามารถลบโปรโมชั่นได้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-red-600 dark:text-red-400" />
            จัดการโปรโมชั่น & คูปองส่วนลด
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold mt-0.5">
            กำหนดส่วนลด %, คูปองส่วนลดด่วน, ซื้อแถม, Happy Hour และรหัสคูปอง
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างโปรโมชั่นใหม่</span>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8">
          <Tag className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
            ยังไม่มีโปรโมชั่นในระบบ
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(p => (
            <div
              key={p.id}
              className={`bg-white dark:bg-neutral-900 border rounded-2xl p-5 shadow-sm space-y-3 transition flex flex-col justify-between ${
                p.is_active
                  ? 'border-slate-200/80 dark:border-neutral-800'
                  : 'border-slate-200/40 dark:border-neutral-800/40 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50">
                    {TYPE_LABELS[p.type]?.label || p.type}
                  </span>
                  <button
                    onClick={() => toggleActive(p)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer ${
                      p.is_active
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                    }`}
                  >
                    {p.is_active ? 'เปิดใช้งานอยู่' : 'ปิดอยู่'}
                  </button>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-neutral-100">
                  {p.name}
                </h3>

                <div className="text-xs font-bold text-red-600 dark:text-red-400">
                  {p.type === 'percentage' && `ลด ${p.discount_percent}%`}
                  {p.type === 'fixed' && `ลด ${p.discount_amount} บาท`}
                  {p.type === 'buy_x_get_y' && `ซื้อ ${p.buy_qty} แถม ${p.free_qty}`}
                </div>

                {p.coupon_code && (
                  <p className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-2 py-1 rounded-lg inline-block">
                    รหัสคูปอง: {p.coupon_code}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <button
                  onClick={() => openEdit(p)}
                  className="p-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl transition cursor-pointer"
                  title="แก้ไข"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="p-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer"
                  title="ลบ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100">
                {editingPromo ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                  ชื่อโปรโมชั่น *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                  placeholder="เช่น ลด 10% ฉลองเปิดร้าน"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                  ประเภทโปรโมชั่น *
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {type === 'percentage' && (
                <div>
                  <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                    เปอร์เซ็นต์ส่วนลด (%) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={discountPercent}
                    onChange={e => setDiscountPercent(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                  />
                </div>
              )}

              {type === 'fixed' && (
                <div>
                  <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                    ส่วนลดจำนวนเงิน (บาท) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={discountAmount}
                    onChange={e => setDiscountAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-500 dark:text-neutral-400 mb-1">
                  รหัสคูปอง (Optional)
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="เช่น YOKA50"
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none uppercase"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'บันทึกโปรโมชั่น'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
              ยืนยันการลบโปรโมชั่น
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              คุณต้องการลบโปรโมชั่น <span className="font-bold text-slate-800 dark:text-neutral-200">"{deleteTarget.name}"</span> หรือไม่?
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
                  'ลบโปรโมชั่น'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
