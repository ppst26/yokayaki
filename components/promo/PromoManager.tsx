"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Gift,
  Clock,
  TicketPercent,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CustomSelect } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { deleteOldImage } from '@/lib/deleteOldImage';
import { useActionFeedback } from '@/context/ActionFeedbackContext';
import {
  type WinbackPromoDraft,
  formatWinbackNote,
} from '@/lib/winbackPromo';
import {
  type PromoTargetSegment,
  PROMO_SEGMENT_OPTIONS,
  getPromoSegmentMeta,
  parsePromoTargetSegment,
} from '@/lib/promoSegments';

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
  image_url?: string | null;
  target_segment?: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  percentage: { label: 'ส่วนลดเปอร์เซ็นต์ (%)', desc: 'ลดเป็น % จากยอดรวมบิล หรือเมนูเจาะจง' },
  fixed: { label: 'คูปองส่วนลด', desc: 'ลดจำนวนเงินคงที่เมื่อมียอดขั้นต่ำ' },
  buy_x_get_y: { label: 'ซื้อ X แถม Y', desc: 'ซื้อเมนูที่กำหนดครบ X จาน แถมฟรี Y จาน' },
};

interface PromoManagerProps {
  winbackDraft?: WinbackPromoDraft | null;
  onWinbackDraftConsumed?: () => void;
}

export const PromoManager: React.FC<PromoManagerProps> = ({
  winbackDraft = null,
  onWinbackDraftConsumed,
}) => {
  const { showActionFeedback } = useActionFeedback();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [targetSegment, setTargetSegment] = useState<PromoTargetSegment>('all');
  const [winbackNote, setWinbackNote] = useState<string | null>(null);

  const showMsg = (text: string, t: 'success' | 'error') => {
    showActionFeedback({ variant: t, title: text });
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
    setWinbackNote(null);
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
    setImageUrl(null);
    setTargetSegment('all');
    setPreviousImageUrl(null);
    setShowModal(true);
  };

  const applyWinbackDraft = (draft: WinbackPromoDraft) => {
    setEditingPromo(null);
    setName(draft.name);
    setPromoCategory('coupon');
    setDiscountUnit(draft.discountUnit);
    setIsHappyHour(false);
    setType(draft.discountUnit === 'percent' ? 'percentage' : 'fixed');
    setDiscountPercent(String(draft.discountPercent));
    setDiscountAmount(String(draft.discountAmount));
    setMinOrderAmount(String(draft.minOrderAmount));
    setBuyQty('1');
    setFreeQty('1');
    setMenuItemId('');
    setStartDate('');
    setEndDate(draft.endDate);
    setStartTime('');
    setEndTime('');
    setCouponCode(draft.couponCode);
    setTargetSegment(draft.targetSegment);
    setImageUrl(null);
    setPreviousImageUrl(null);
    setWinbackNote(formatWinbackNote(draft));
    setShowModal(true);
    showMsg('เติมฟอร์ม Win-back แล้ว — ตรวจสอบแล้วกดบันทึก', 'success');
  };

  useEffect(() => {
    if (!winbackDraft) return;
    applyWinbackDraft(winbackDraft);
    onWinbackDraftConsumed?.();
  }, [winbackDraft]);

  const openEdit = (p: Promotion) => {
    setWinbackNote(null);
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
    setTargetSegment(parsePromoTargetSegment(p.target_segment) ?? 'all');
    setImageUrl(p.image_url ?? null);
    setPreviousImageUrl(p.image_url ?? null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setWinbackNote(null);
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
        target_segment: targetSegment === 'all' ? null : targetSegment,
        image_url: imageUrl,
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

      const nextUrl = payload.image_url;
      if (previousImageUrl && previousImageUrl !== nextUrl) {
        await deleteOldImage(previousImageUrl);
      }

      setShowModal(false);
      setWinbackNote(null);
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

      const deletedImageUrl = deleteTarget.image_url;
      if (deletedImageUrl) {
        await deleteOldImage(deletedImageUrl);
      }

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
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-[var(--space-section)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Tag className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>โปรโมชั่น</span>
          </h1>
          <p className="text-caption mt-0.5">
            กำหนดส่วนลด คูปอง
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 btn-crimson text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างโปรโมชั่นใหม่</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 app-dialog p-8">
          <Tag className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
            ยังไม่มีโปรโมชั่นในระบบ
          </p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(var(--grid-cols-cards), 1fr)',
            gap: 'var(--grid-gap)',
          }}
        >
          {promotions.map(p => {
            const targetMenu = menuItems.find(m => m.id === p.menu_item_id);

            return (
              <Card
                key={p.id}
                className={`overflow-hidden rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col ${
                  p.is_active ? '' : 'opacity-65 grayscale-[20%]'
                }`}
              >
                {/* Banner + overlay badges */}
                <div className="relative h-40 w-full shrink-0 bg-slate-100 dark:bg-neutral-800">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-neutral-800 dark:to-neutral-900">
                      <Tag className="size-10 text-slate-300 dark:text-neutral-600" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-badge backdrop-blur-sm ${
                        p.type === 'percentage'
                          ? 'bg-rose-50/90 text-rose-600 border border-rose-100/80 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-900/40'
                          : p.type === 'fixed'
                          ? 'bg-amber-50/90 text-amber-600 border border-amber-100/80 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-900/40'
                          : 'bg-indigo-50/90 text-indigo-600 border border-indigo-100/80 dark:bg-indigo-950/80 dark:text-indigo-400 dark:border-indigo-900/40'
                      }`}
                    >
                      {p.type === 'percentage' && <TicketPercent className="size-3.5" />}
                      {p.type === 'fixed' && <Tag className="size-3.5" />}
                      {p.type === 'buy_x_get_y' && <Gift className="size-3.5" />}
                      <span>{TYPE_LABELS[p.type]?.label || p.type}</span>
                    </span>

                    <button
                      onClick={() => toggleActive(p)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-badge backdrop-blur-sm transition cursor-pointer ${
                        p.is_active
                          ? 'bg-emerald-50/90 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60'
                          : 'bg-slate-100/90 text-slate-400 border border-slate-200/60 dark:bg-neutral-800/90 dark:text-neutral-500 dark:border-neutral-700'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          p.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{p.is_active ? 'เปิดใช้งานอยู่' : 'ปิดอยู่'}</span>
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-neutral-100 leading-snug">
                    {p.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-xs font-black text-white shadow-xs">
                      {p.type === 'percentage' && `ลด ${p.discount_percent}%`}
                      {p.type === 'fixed' && `ลด ฿${p.discount_amount}`}
                      {p.type === 'buy_x_get_y' && `ซื้อ ${p.buy_qty} แถม ${p.free_qty}`}
                    </span>

                    {p.min_order_amount > 0 && (
                      <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        ขั้นต่ำ ฿{p.min_order_amount.toLocaleString()}
                      </span>
                    )}

                    {p.coupon_code && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        รหัส: <span className="font-extrabold text-red-600 dark:text-red-400">{p.coupon_code}</span>
                      </span>
                    )}

                    {p.target_segment && parsePromoTargetSegment(p.target_segment) && (
                      <span className="inline-flex items-center rounded-md border border-violet-200/80 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
                        กลุ่ม: {getPromoSegmentMeta(parsePromoTargetSegment(p.target_segment)).label}
                      </span>
                    )}

                    {targetMenu && (
                      <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
                        เฉพาะ {targetMenu.name}
                      </span>
                    )}

                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer active:scale-95"
                        title="แก้ไข"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer active:scale-95"
                        title="ลบ"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {(p.start_time || p.end_time) && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                      <Clock className="size-3.5 text-slate-400" />
                      <span>
                        Happy Hour: {p.start_time || '00:00'} - {p.end_time || '23:59'} น.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-400 dark:border-neutral-800 dark:text-neutral-500">
                    <span>สร้างเมื่อ {new Date(p.created_at).toLocaleDateString('th-TH')}</span>
                    <span>ID: #{p.id}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal — portal หลีก overflow-hidden ของ main + เว้น bottom nav (pb-24) */}
      {showModal &&
        createPortal(
        <div
          className="fixed inset-0 z-[60] flex flex-col px-3 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:flex-row sm:items-center sm:justify-center sm:p-4 sm:pb-4 app-dialog-backdrop"
        >
          <div className="app-dialog flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl shadow-xl sm:flex-none sm:max-h-[min(90dvh,40rem)] sm:max-w-lg">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-3 pt-4 dark:border-neutral-800 sm:px-6 sm:pt-5">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-black text-slate-900 dark:text-neutral-100 sm:text-lg">
                  {editingPromo ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-semibold sm:text-xs">
                  เลือกประเภทและกำหนดเงื่อนไขโปรโมชั่น
                </p>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-neutral-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 text-xs font-semibold sm:px-6">
            {winbackNote && (
              <div className="p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-900/50 text-violet-800 dark:text-violet-200 rounded-xl text-xs font-semibold flex items-start gap-2">
                <TicketPercent className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{winbackNote}</span>
              </div>
            )}

            <div className="space-y-4">
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

              {/* ช่วงวันที่ + รูปภาพ (L3) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                    วันเริ่มโปร
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="วันเริ่มโปร..."
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                    วันสิ้นสุดโปร
                  </label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="วันสิ้นสุดโปร..."
                    minDate={startDate || undefined}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                  รูปภาพโปรโมชั่น (Optional)
                </label>
                <ImageUploadField
                  folder="promo"
                  value={imageUrl}
                  onChange={setImageUrl}
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

                  <div>
                    <label className="block text-slate-600 dark:text-neutral-300 mb-1 font-bold">
                      กลุ่มเป้าหมาย (G6)
                    </label>
                    <CustomSelect
                      value={targetSegment}
                      onChange={v => setTargetSegment(v as PromoTargetSegment)}
                      options={PROMO_SEGMENT_OPTIONS.map(o => ({
                        value: o.value,
                        label: o.label,
                      }))}
                    />
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1 font-semibold">
                      {getPromoSegmentMeta(targetSegment).description}
                      {promoCategory === 'coupon' && targetSegment !== 'all'
                        ? ' — ต้องระบุเบอร์สมาชิกตอนชำระเงิน'
                        : ''}
                    </p>
                  </div>

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

            </div>
            </div>

            {/* Footer — คงที่ด้านล่าง ไม่เลื่อนตามฟอร์ม */}
            <div className="flex shrink-0 gap-2 border-t border-slate-100 px-4 py-3 dark:border-neutral-800 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold text-white btn-crimson shadow-md shadow-red-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'บันทึกโปรโมชั่น'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
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
