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
import { Card } from '@/components/ui/card';
import { CustomSelect } from '@/components/ui/select';

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

  const [promoCategory, setPromoCategory] = useState<'discount' | 'coupon' | 'buy_x_get_y'>('discount');
  const [discountUnit, setDiscountUnit] = useState<'percent' | 'amount'>('percent');
  const [isHappyHour, setIsHappyHour] = useState(false);

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
    setPromoCategory('discount');
    setDiscountUnit('percent');
    setIsHappyHour(false);
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

    if (p.coupon_code) {
      setPromoCategory('coupon');
    } else if (p.type === 'buy_x_get_y') {
      setPromoCategory('buy_x_get_y');
    } else {
      setPromoCategory('discount');
    }

    setDiscountUnit(p.discount_percent ? 'percent' : 'amount');
    setIsHappyHour(!!(p.start_time || p.end_time));

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

    if (promoCategory === 'coupon' && !couponCode.trim()) {
      return showMsg('กรุณากรอกรหัสคูปอง', 'error');
    }

    if (promoCategory === 'buy_x_get_y' && !menuItemId) {
      return showMsg('กรุณาเลือกเมนูที่จัดโปรโมชั่น ซื้อ - แถม', 'error');
    }

    let finalType: 'percentage' | 'fixed' | 'buy_x_get_y' = 'percentage';
    if (promoCategory === 'buy_x_get_y') {
      finalType = 'buy_x_get_y';
    } else {
      finalType = discountUnit === 'percent' ? 'percentage' : 'fixed';
    }

    try {
      setIsSaving(true);
      const payload: any = {
        name: name.trim(),
        type: finalType,
        min_order_amount: Number(minOrderAmount) || 0,
        start_date: startDate || null,
        end_date: endDate || null,
        start_time: isHappyHour ? (startTime || null) : null,
        end_time: isHappyHour ? (endTime || null) : null,
        menu_item_id: menuItemId ? Number(menuItemId) : null,
        coupon_code: promoCategory === 'coupon' && couponCode.trim() ? couponCode.trim().toUpperCase() : null,
        is_active: editingPromo ? editingPromo.is_active : true,
      };

      if (finalType === 'percentage') {
        payload.discount_percent = Number(discountPercent) || 0;
        payload.discount_amount = null;
      } else if (finalType === 'fixed') {
        payload.discount_amount = Number(discountAmount) || 0;
        payload.discount_percent = null;
      } else if (finalType === 'buy_x_get_y') {
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
          <p className="text-caption mt-0.5">
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
          {promotions.map(p => {
            const targetMenu = menuItems.find(m => m.id === p.menu_item_id);

            return (
              <Card
                key={p.id}
                className={`p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  p.is_active ? '' : 'opacity-65 grayscale-[20%]'
                }`}
              >
                {/* Upper Section */}
                <div className="space-y-3">
                  {/* Category Badge & Active Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-badge ${
                        p.type === 'percentage'
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40'
                          : p.type === 'fixed'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                          : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40'
                      }`}
                    >
                      {p.type === 'percentage' && <TicketPercent className="w-3.5 h-3.5" />}
                      {p.type === 'fixed' && <Tag className="w-3.5 h-3.5" />}
                      {p.type === 'buy_x_get_y' && <Gift className="w-3.5 h-3.5" />}
                      <span>{TYPE_LABELS[p.type]?.label || p.type}</span>
                    </span>

                    <button
                      onClick={() => toggleActive(p)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-badge transition cursor-pointer ${
                        p.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border border-slate-200/60 dark:border-neutral-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{p.is_active ? 'เปิดใช้งานอยู่' : 'ปิดอยู่'}</span>
                    </button>
                  </div>

                  {/* Promo Name */}
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-neutral-100 leading-snug">
                    {p.name}
                  </h3>

                  {/* Badges / Value / Info */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {/* Main Value Tag */}
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-red-600 text-white shadow-xs">
                      {p.type === 'percentage' && `ลด ${p.discount_percent}%`}
                      {p.type === 'fixed' && `ลด ฿${p.discount_amount}`}
                      {p.type === 'buy_x_get_y' && `ซื้อ ${p.buy_qty} แถม ${p.free_qty}`}
                    </span>

                    {/* Min Order Condition */}
                    {p.min_order_amount > 0 && (
                      <span className="inline-flex items-center text-[11px] font-bold text-slate-600 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 border border-slate-200/60 dark:border-neutral-700 px-2 py-0.5 rounded-md">
                        ขั้นต่ำ ฿{p.min_order_amount.toLocaleString()}
                      </span>
                    )}

                    {/* Coupon Code Badge */}
                    {p.coupon_code && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-700 dark:text-neutral-200 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-2 py-0.5 rounded-md">
                        รหัส: <span className="text-red-600 dark:text-red-400 font-extrabold">{p.coupon_code}</span>
                      </span>
                    )}

                    {/* Specific Menu Item */}
                    {targetMenu && (
                      <span className="inline-flex items-center text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2 py-0.5 rounded-md">
                        เฉพาะ {targetMenu.name}
                      </span>
                    )}
                  </div>

                  {/* Happy Hour / Date range if present */}
                  {(p.start_time || p.end_time) && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-neutral-400 pt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Happy Hour: {p.start_time || '00:00'} - {p.end_time || '23:59'} น.
                      </span>
                    </div>
                  )}
                </div>

                {/* Middle Action Bar (Above the Line) */}
                <div className="flex items-center justify-end pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                      title="แก้ไข"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Divider Line & Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-neutral-500">
                  <span>สร้างเมื่อ {new Date(p.created_at).toLocaleDateString('th-TH')}</span>
                  <span>ID: #{p.id}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100">
                  {editingPromo ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-neutral-500 font-semibold">
                  เลือกประเภทและกำหนดเงื่อนไขโปรโมชั่น
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              {/* Category Selector: Grid 3 */}
              <div>
                <label className="block text-slate-600 dark:text-neutral-300 mb-2 font-extrabold">
                  ประเภทโปรโมชั่น *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Option 1: Discount */}
                  <button
                    type="button"
                    onClick={() => setPromoCategory('discount')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      promoCategory === 'discount'
                        ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-500/20'
                        : 'bg-slate-50 dark:bg-neutral-800/60 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <TicketPercent className="w-5 h-5" />
                    <span className="font-extrabold text-xs">ส่วนลด</span>
                  </button>

                  {/* Option 2: Coupon */}
                  <button
                    type="button"
                    onClick={() => setPromoCategory('coupon')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      promoCategory === 'coupon'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 dark:bg-neutral-800/60 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Tag className="w-5 h-5" />
                    <span className="font-extrabold text-xs">คูปอง</span>
                  </button>

                  {/* Option 3: Buy X Get Y */}
                  <button
                    type="button"
                    onClick={() => setPromoCategory('buy_x_get_y')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      promoCategory === 'buy_x_get_y'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-neutral-800/60 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Gift className="w-5 h-5" />
                    <span className="font-extrabold text-xs">ซื้อ - แถม</span>
                  </button>
                </div>
              </div>

              {/* Promo Name */}
              <div>
                <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                  ชื่อโปรโมชั่น *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                  placeholder={
                    promoCategory === 'discount'
                      ? 'เช่น ลด 20% ฉลองเปิดร้าน'
                      : promoCategory === 'coupon'
                      ? 'เช่น โค้ดลด 50 บาทประจำเดือน'
                      : 'เช่น ซื้อยากิโทริ 2 แถม 1'
                  }
                />
              </div>

              {/* Category 1 & 2: Discount & Coupon Unit Selector */}
              {(promoCategory === 'discount' || promoCategory === 'coupon') && (
                <div className="space-y-3">
                  {/* Unit Segmented Control */}
                  <div>
                    <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                      รูปแบบส่วนลด *
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setDiscountUnit('percent')}
                        className={`py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
                          discountUnit === 'percent'
                            ? 'bg-white dark:bg-neutral-700 text-red-600 dark:text-red-400 shadow-xs'
                            : 'text-slate-500 dark:text-neutral-400'
                        }`}
                      >
                        เปอร์เซ็นต์ (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountUnit('amount')}
                        className={`py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
                          discountUnit === 'amount'
                            ? 'bg-white dark:bg-neutral-700 text-red-600 dark:text-red-400 shadow-xs'
                            : 'text-slate-500 dark:text-neutral-400'
                        }`}
                      >
                        จำนวนเงิน (บาท)
                      </button>
                    </div>
                  </div>

                  {/* Discount Value Input */}
                  {discountUnit === 'percent' ? (
                    <div>
                      <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                        เปอร์เซ็นต์ส่วนลด (%) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={discountPercent}
                        onChange={e => setDiscountPercent(e.target.value)}
                        placeholder="เช่น 20"
                        className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                        ส่วนลดจำนวนเงิน (บาท) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={discountAmount}
                        onChange={e => setDiscountAmount(e.target.value)}
                        placeholder="เช่น 50"
                        className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Coupon Code specific field */}
                  {promoCategory === 'coupon' && (
                    <div>
                      <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                        รหัสคูปอง *
                      </label>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="เช่น YOKA50"
                        className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 tracking-wider focus:border-red-500 focus:outline-none uppercase"
                      />
                    </div>
                  )}

                  {/* Min order amount */}
                  <div>
                    <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                      ยอดสั่งซื้อขั้นต่ำ (บาท)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={minOrderAmount}
                      onChange={e => setMinOrderAmount(e.target.value)}
                      placeholder="0 (ไม่มีขั้นต่ำ)"
                      className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  {/* Target Menu Item (Optional) */}
                  <div>
                    <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                      เมนูที่ร่วมรายการ ( Optional )
                    </label>
                    <CustomSelect
                      value={menuItemId}
                      onChange={val => setMenuItemId(val)}
                      options={[
                        { label: 'ทุกเมนูในร้าน (ทั้งบิล)', value: '' },
                        ...menuItems.map(m => ({ label: `${m.name} (฿${m.price})`, value: String(m.id) }))
                      ]}
                      placeholder="ทุกเมนูในร้าน (ทั้งบิล)"
                      searchable={true}
                    />
                  </div>
                </div>
              )}

              {/* Category 3: Buy X Get Y */}
              {promoCategory === 'buy_x_get_y' && (
                <div className="space-y-3">
                  {/* Select Target Menu Item (Required) */}
                  <div>
                    <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                      เลือกเมนูที่จัดโปรโมชั่น *
                    </label>
                    <CustomSelect
                      value={menuItemId}
                      onChange={val => setMenuItemId(val)}
                      options={[
                        { label: '-- เลือกเมนูอาหาร / เครื่องดื่ม --', value: '' },
                        ...menuItems.map(m => ({ label: `${m.name} (฿${m.price})`, value: String(m.id) }))
                      ]}
                      placeholder="-- เลือกเมนูอาหาร / เครื่องดื่ม --"
                      searchable={true}
                    />
                  </div>

                  {/* Buy Qty & Free Qty */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                        จำนวนซื้อ (X) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={buyQty}
                        onChange={e => setBuyQty(e.target.value)}
                        placeholder="1"
                        className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                        จำนวนแถมฟรี (Y) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={freeQty}
                        onChange={e => setFreeQty(e.target.value)}
                        placeholder="1"
                        className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Happy Hour Toggle & Time inputs (Supported for Discount & Buy X Get Y) */}
              {(promoCategory === 'discount' || promoCategory === 'buy_x_get_y') && (
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="block text-xs font-extrabold text-slate-800 dark:text-neutral-200">
                          กำหนดช่วงเวลา (Happy Hour)
                        </span>
                        <span className="block text-[10px] font-medium text-slate-400 dark:text-neutral-500">
                          ให้โปรโมชั่นมีผลเฉพาะช่วงเวลาที่กำหนด
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsHappyHour(!isHappyHour)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isHappyHour ? 'bg-amber-500' : 'bg-slate-200 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isHappyHour ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {isHappyHour && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                          เวลาเริ่มต้น
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                          เวลาสิ้นสุด
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-800 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
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
