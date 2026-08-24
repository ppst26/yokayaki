"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Receipt, AlertTriangle, UserPlus, X } from 'lucide-react';
import { OrderSummaryCard } from './OrderSummaryCard';
import { CRMMemberCard } from './CRMMemberCard';
import { CouponInputCard } from './CouponInputCard';
import { PaymentCard } from './PaymentCard';
import { PromptPayQRModal } from './PromptPayQRModal';
import { ReceiptPrintView } from './ReceiptPrintView';

interface CheckoutScreenProps {
  tableId: number;
  onBack: () => void;
}

interface OrderedItem {
  id: number;
  quantity: number;
  unit_price: number;
  status: string;
  notes?: string;
  created_at: string;
  menu_items: { id: number; name: string };
}

interface LoyaltyMember {
  phone_number: string;
  name: string;
  points: number;
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
}

interface FreeItemDetail {
  name: string;
  qty: number;
}

interface AppliedPromo {
  promo: Promotion;
  discountValue: number;
  freeItems?: FreeItemDetail[];
}

// ผลลัพธ์ที่ complete_checkout คำนวณและบันทึกจริง (A5)
// ใบเสร็จต้องพิมพ์จากค่าชุดนี้ ไม่ใช่จากที่หน้าจอคิดไว้
interface CheckoutResult {
  status: 'ok' | 'already_completed' | 'not_found';
  payment_id: number | null;
  subtotal: number;
  promo_discount: number;
  points_redeemed: number;
  discount_amount: number;
  net_amount: number;
  points_earned: number;
  cash_amount: number;
  promptpay_amount: number;
  change_amount: number;
  payment_method: string | null;
  applied_promos: {
    promotion_id: number;
    promotion_name: string;
    promotion_type: Promotion['type'];
    discount_value: number;
    free_items: FreeItemDetail[] | null;
  }[] | null;
}

// PromptPay EMVCo Payload Generator Helper
function generatePromptPayQR(targetId: string, amount: number): string {
  let target = targetId.replace(/[^0-9]/g, '');
  if (target.length === 10 && target.startsWith('0')) {
    target = '0066' + target.substring(1);
  }
  const targetTag = target.length === 13 ? '02' : '01';
  const subField04 = `0016A000000677010111${targetTag}${target.length.toString().padStart(2, '0')}${target}`;
  const field29 = `29${subField04.length.toString().padStart(2, '0')}${subField04}`;
  const amtStr = amount.toFixed(2);
  const field54 = `54${amtStr.length.toString().padStart(2, '0')}${amtStr}`;

  let raw = `000201010212${field29}5303764${field54}5802TH5908YOKAYAKI6304`;

  function crc16Hex(str: string): string {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  return raw + crc16Hex(raw);
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ tableId, onBack }) => {
  const { employee } = useAuth();

  // Order Data
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Loyalty
  const [phoneInput, setPhoneInput] = useState('');
  const [member, setMember] = useState<LoyaltyMember | null>(null);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Quick Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Payment
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  // Promotions
  const [allPromos, setAllPromos] = useState<Promotion[]>([]);
  const [appliedPromos, setAppliedPromos] = useState<AppliedPromo[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplied, setCouponApplied] = useState<Promotion | null>(null);

  // Computed values
  const activeItems = orderedItems.filter(i => i.status !== 'voided');
  const pendingItemsCount = orderedItems.filter(i => i.status === 'pending').length;
  const subtotal = activeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const promoDiscount = appliedPromos.reduce((s, ap) => s + ap.discountValue, 0);
  const loyaltyDiscount = pointsToRedeem;
  const discount = promoDiscount + loyaltyDiscount;
  const netAmount = Math.max(0, subtotal - discount);
  const cashNum = parseFloat(cashReceived) || 0;
  const transferAmount = Math.max(0, netAmount - cashNum);
  const changeAmount = cashNum > netAmount ? cashNum - netAmount : 0;
  // 1 แต้ม = 10 บาท (ยืนยันแล้ว — ปิดข้อขัดแย้ง L1 ที่โค้ดเดิมใช้ /25 แต่เอกสารบอก /10)
  // ตัวเลขนี้ใช้แสดงผลอย่างเดียว ของจริงคำนวณใน complete_checkout
  const pointsEarned = Math.floor(netAmount / 10);

  // เดิม fallback เป็น '0899999999' เงียบๆ = ลูกค้าโอนเงินเข้าเบอร์ของคนอื่นโดยไม่มีใครรู้ (A7.8)
  // ตอนนี้ถ้าไม่ได้ตั้งค่า จะปิดช่องทาง PromptPay ไปเลยและบอกให้ไปตั้งค่า
  const promptPayId = (process.env.NEXT_PUBLIC_PROMPTPAY_ID || '').replace(/[^0-9]/g, '');
  const promptPayReady = promptPayId.length === 10 || promptPayId.length === 13;

  useEffect(() => {
    fetchOrderData();
    fetchPromotions();
  }, [tableId]);

  // ฟังเฉพาะรายการของบิลใบนี้ ไม่ใช่ order_items ทั้งร้าน (A7.9)
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`realtime:checkout_order_${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` },
        () => {
          fetchOrderData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [orderId]);

  useEffect(() => {
    if (subtotal > 0 && allPromos.length > 0) {
      autoApplyPromotions();
    }
  }, [subtotal, allPromos, couponApplied, orderedItems]);

  const fetchPromotions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (data) {
        const validPromos = (data as Promotion[]).filter(p => {
          if (p.start_date && p.start_date > today) return false;
          if (p.end_date && p.end_date < today) return false;
          return true;
        });
        setAllPromos(validPromos);
      }
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
  };

  const autoApplyPromotions = () => {
    const applied: AppliedPromo[] = [];

    for (const promo of allPromos) {
      if (promo.type === 'fixed' && promo.coupon_code) {
        if (couponApplied?.id === promo.id) {
          if (promo.min_order_amount > 0 && subtotal < promo.min_order_amount) continue;
          applied.push({ promo, discountValue: promo.discount_amount || 0 });
        }
        continue;
      }

      if (promo.min_order_amount > 0 && subtotal < promo.min_order_amount) continue;

      if (promo.type === 'percentage' && promo.discount_percent) {
        if (!promo.menu_item_id && !promo.start_time && !promo.end_time) {
          const val = Math.round((subtotal * promo.discount_percent) / 100);
          applied.push({ promo, discountValue: val });
        } else {
          let totalDiscount = 0;
          for (const item of activeItems) {
            if (promo.menu_item_id && item.menu_items?.id !== promo.menu_item_id) continue;
            if (promo.start_time && promo.end_time) {
              const orderTime = new Date(item.created_at);
              const hh = orderTime.getHours().toString().padStart(2, '0');
              const mm = orderTime.getMinutes().toString().padStart(2, '0');
              const itemTimeStr = `${hh}:${mm}`;
              if (
                itemTimeStr < promo.start_time.slice(0, 5) ||
                itemTimeStr >= promo.end_time.slice(0, 5)
              )
                continue;
            }
            totalDiscount += Math.round(
              (item.quantity * item.unit_price * promo.discount_percent) / 100
            );
          }
          if (totalDiscount > 0) {
            applied.push({ promo, discountValue: totalDiscount });
          }
        }
      } else if (promo.type === 'fixed' && !promo.coupon_code) {
        applied.push({ promo, discountValue: promo.discount_amount || 0 });
      } else if (promo.type === 'buy_x_get_y' && promo.buy_qty && promo.free_qty) {
        let totalFreeValue = 0;
        const freeItemsList: FreeItemDetail[] = [];
        const menuGroups: Record<string, { qty: number; price: number; id: number }> = {};

        for (const item of activeItems) {
          const name = item.menu_items?.name || '';
          const menuId = item.menu_items?.id;
          if (!menuGroups[name]) menuGroups[name] = { qty: 0, price: item.unit_price, id: menuId };
          menuGroups[name].qty += item.quantity;
        }

        for (const [menuName, group] of Object.entries(menuGroups)) {
          if (promo.menu_item_id && group.id !== promo.menu_item_id) continue;
          const setSize = promo.buy_qty + promo.free_qty;
          const freeSets = Math.floor(group.qty / setSize);
          const freeQtyForThisMenu = freeSets * promo.free_qty;

          if (freeQtyForThisMenu > 0) {
            totalFreeValue += freeQtyForThisMenu * group.price;
            freeItemsList.push({ name: menuName, qty: freeQtyForThisMenu });
          }
        }

        if (totalFreeValue > 0) {
          applied.push({ promo, discountValue: totalFreeValue, freeItems: freeItemsList });
        }
      }
    }

    setAppliedPromos(applied);
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('กรุณากรอกรหัสคูปอง');
      return;
    }

    const found = allPromos.find(p => p.coupon_code?.toUpperCase() === code);
    if (!found) {
      setCouponError('ไม่พบรหัสคูปองนี้ หรือหมดอายุแล้ว');
      return;
    }
    if (found.min_order_amount > 0 && subtotal < found.min_order_amount) {
      setCouponError(`ยอดสั่งขั้นต่ำ ${found.min_order_amount} บาท`);
      return;
    }
    setCouponError(null);
    setCouponApplied(found);
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponInput('');
    setCouponError(null);
  };

  const fetchOrderData = async () => {
    try {
      setIsLoading(true);
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .maybeSingle();

      if (!orderData) {
        setErrorMsg('ไม่พบรายการออเดอร์สำหรับโต๊ะนี้');
        return;
      }

      setOrderId(orderData.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, status, notes, created_at, menu_items(id, name)')
        .eq('order_id', orderData.id)
        .order('id', { ascending: true });

      if (items) setOrderedItems(items as unknown as OrderedItem[]);
    } catch (err) {
      console.error('Error fetching order:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const searchMember = async () => {
    if (phoneInput.length !== 10) return;
    try {
      setIsSearchingMember(true);
      setShowRegister(false);
      setMember(null);

      const { data, error } = await supabase
        .from('loyalty_members')
        .select('*')
        .eq('phone_number', phoneInput)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setMember(data as LoyaltyMember);
      } else {
        setShowRegister(true);
      }
    } catch (err) {
      console.error('Error searching member:', err);
    } finally {
      setIsSearchingMember(false);
    }
  };

  const registerMember = async () => {
    if (!registerName.trim() || phoneInput.length !== 10) return;
    try {
      const { data, error } = await supabase
        .from('loyalty_members')
        .insert([{ phone_number: phoneInput, name: registerName.trim(), points: 0 }])
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setMember(data as LoyaltyMember);
        setShowRegister(false);
      }
    } catch (err: any) {
      alert('ไม่สามารถสมัครสมาชิกได้: ' + (err.message || ''));
    }
  };

  const handleOpenAddMemberModal = () => {
    setNewMemberPhone(phoneInput || '');
    setNewMemberName('');
    setShowAddMemberModal(true);
  };

  const handleQuickSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newMemberPhone.replace(/\D/g, '');
    const cleanName = newMemberName.trim();
    if (cleanPhone.length !== 10 || !cleanName) return;

    try {
      setIsSubmittingMember(true);
      const { data: existingMember } = await supabase
        .from('loyalty_members')
        .select('*')
        .eq('phone_number', cleanPhone)
        .maybeSingle();

      if (existingMember) {
        setMember(existingMember as LoyaltyMember);
        setPhoneInput(cleanPhone);
        setShowAddMemberModal(false);
        alert(`เบอร์โทรศัพท์นี้เป็นสมาชิกอยู่แล้ว ระบบได้เลือกสมาชิกคุณ (${existingMember.name}) ให้เรียบร้อยครับ`);
        return;
      }

      const { data: created, error } = await supabase
        .from('loyalty_members')
        .insert([{ phone_number: cleanPhone, name: cleanName, points: 0 }])
        .select('*')
        .single();

      if (error) throw error;

      if (created) {
        setMember(created as LoyaltyMember);
        setPhoneInput(cleanPhone);
        setShowAddMemberModal(false);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + (err?.message || ''));
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const processPayment = async () => {
    if (!orderId || netAmount <= 0) return;
    if (pendingItemsCount > 0) {
      alert(`ไม่สามารถชำระเงินได้ เนื่องจากยังมีออเดอร์ในครัวที่ยังไม่ได้เสิร์ฟ ${pendingItemsCount} รายการ`);
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      // ส่งแค่ "เจตนา" — ยอดเงิน ส่วนลด และแต้ม คำนวณใน DB ทั้งหมด (A5)
      // วิธีชำระ/ยอดแยกเงินสด-โอน ก็มาจาก DB เช่นกัน จึงไม่ส่งไปแล้ว
      const { data, error } = await supabase.rpc('complete_checkout', {
        p_order_id: orderId,
        p_cash_received: cashNum,
        p_coupon_code: couponApplied?.coupon_code || null,
        p_phone_number: member?.phone_number || null,
        p_points_redeem: pointsToRedeem,
      });

      if (error) throw error;

      const result = (Array.isArray(data) ? data[0] : data) as CheckoutResult | undefined;

      if (!result || result.status === 'not_found') {
        setErrorMsg('ไม่พบออเดอร์นี้ในระบบ — กรุณารีเฟรชแล้วลองใหม่');
        return;
      }

      setCheckoutResult(result);

      // บิลนี้ถูกปิดไปแล้ว (ดับเบิลคลิก / เน็ตช้าแล้ว retry) — แสดงใบเดิม ไม่เก็บเงินซ้ำ (A6)
      if (result.status === 'already_completed') {
        alert('บิลนี้ถูกปิดไปแล้ว ระบบแสดงใบเสร็จของรายการเดิม ไม่ได้บันทึกซ้ำ');
        setShowReceipt(true);
        return;
      }

      // ยอดที่ DB คำนวณได้ไม่ตรงกับที่หน้าจอแสดง = เก็บเงินไปผิดจำนวน ต้องบอกทันที
      if (Math.abs(Number(result.net_amount) - netAmount) > 0.01) {
        alert(
          'ยอดที่ระบบบันทึกจริงคือ ' +
            Number(result.net_amount).toLocaleString() +
            ' บาท (หน้าจอแสดง ' +
            netAmount.toLocaleString() +
            ' บาท) — ใบเสร็จจะพิมพ์ตามยอดที่บันทึกจริง กรุณาตรวจสอบเงินที่รับมา'
        );
      }

      setShowReceipt(true);
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการชำระเงิน: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  if (showReceipt) {
    // ใบเสร็จพิมพ์จากตัวเลขที่ DB บันทึกจริงเสมอ (A5) — ค่าที่หน้าจอคิดไว้เป็นแค่ fallback
    const r = checkoutResult;
    const receiptPromos: AppliedPromo[] = r
      ? (r.applied_promos ?? []).map(ap => ({
          promo:
            allPromos.find(x => x.id === ap.promotion_id) ??
            ({
              id: ap.promotion_id,
              name: ap.promotion_name,
              type: ap.promotion_type,
              min_order_amount: 0,
              is_active: true,
            } as Promotion),
          discountValue: Number(ap.discount_value),
          freeItems: ap.free_items ?? undefined,
        }))
      : appliedPromos;

    return (
      <ReceiptPrintView
        orderId={orderId}
        tableId={tableId}
        now={new Date()}
        employeeName={employee?.name}
        activeItems={activeItems}
        subtotal={r ? Number(r.subtotal) : subtotal}
        appliedPromos={receiptPromos}
        loyaltyDiscount={r ? r.points_redeemed : loyaltyDiscount}
        netAmount={r ? Number(r.net_amount) : netAmount}
        cashNum={r ? Number(r.cash_amount) : cashNum}
        transferAmount={r ? Number(r.promptpay_amount) : transferAmount}
        changeAmount={r ? Number(r.change_amount) : changeAmount}
        member={member}
        pointsToRedeem={r ? r.points_redeemed : pointsToRedeem}
        pointsEarned={r ? r.points_earned : pointsEarned}
        onBack={onBack}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans pb-80 lg:pb-8">
      <div className="w-full">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition active:scale-95 text-slate-700 dark:text-neutral-200 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-[50%]">
            <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <span>ชำระเงิน</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold mt-0.5">
              ประจำ <span className="text-red-600 dark:text-red-400 font-bold">โต๊ะ {tableId}</span> • ออเดอร์ #{orderId}
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>{errorMsg}</span>
          </div>
        )}

        {pendingItemsCount > 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">
                ยังไม่สามารถชำระเงินได้: มีออเดอร์ในครัวที่ยังไม่ได้เสิร์ฟ ({pendingItemsCount} รายการ)
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5 font-normal">
                กรุณาให้พนักงานครัวกดเสิร์ฟอาหารในหน้าจอครัวให้ครบก่อนทำการเช็คบิล
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Order Summary */}
          <OrderSummaryCard
            activeItems={activeItems}
            subtotal={subtotal}
            appliedPromos={appliedPromos}
            loyaltyDiscount={loyaltyDiscount}
            netAmount={netAmount}
            pointsEarned={pointsEarned}
            member={member}
            cashNum={cashNum}
            transferAmount={transferAmount}
          />

          {/* RIGHT: Payment Controls */}
          <div className="space-y-5">
            <CRMMemberCard
              phoneInput={phoneInput}
              setPhoneInput={setPhoneInput}
              member={member}
              isSearchingMember={isSearchingMember}
              searchMember={searchMember}
              pointsToRedeem={pointsToRedeem}
              setPointsToRedeem={setPointsToRedeem}
              showRegister={showRegister}
              registerName={registerName}
              setRegisterName={setRegisterName}
              registerMember={registerMember}
              subtotal={subtotal}
              onOpenAddMember={handleOpenAddMemberModal}
            />

            <CouponInputCard
              couponApplied={couponApplied}
              couponInput={couponInput}
              setCouponInput={setCouponInput}
              couponError={couponError}
              setCouponError={setCouponError}
              applyCoupon={applyCoupon}
              removeCoupon={removeCoupon}
            />

            <PaymentCard
              cashReceived={cashReceived}
              setCashReceived={setCashReceived}
              cashNum={cashNum}
              changeAmount={changeAmount}
              transferAmount={transferAmount}
              netAmount={netAmount}
              pendingItemsCount={pendingItemsCount}
              setShowQrModal={setShowQrModal}
              promptPayReady={promptPayReady}
              processPayment={processPayment}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </div>

      {/* Quick Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">สมัครสมาชิกใหม่ (Quick Register)</h3>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-neutral-400">จะได้รับแต้มสะสมจากบิลนี้ทันทีเมื่อชำระเงิน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSubmitMember} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-neutral-300">
                  เบอร์โทรศัพท์ (10 หลัก) <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="08X-XXX-XXXX"
                  value={newMemberPhone}
                  onChange={e => setNewMemberPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-neutral-300">
                  ชื่อลูกค้า / ชื่อเล่น <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ระบุชื่อลูกค้า..."
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-red-500"
                />
              </div>

              {pointsEarned > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3 flex items-center gap-2">
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-black">🎁 สมาชิกใหม่นี้จะได้รับ +{pointsEarned} แต้ม ทันทีจากบิลนี้</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer border-none"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={newMemberPhone.length !== 10 || !newMemberName.trim() || isSubmittingMember}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-red-600/25 disabled:opacity-50 transition active:scale-95 cursor-pointer border-none"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingMember ? 'กำลังบันทึก...' : 'สมัครสมาชิก & สะสมแต้มบิลนี้'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PromptPayQRModal
        showQrModal={showQrModal && promptPayReady}
        setShowQrModal={setShowQrModal}
        transferAmount={transferAmount}
        promptPayId={promptPayId}
        generatePromptPayQR={generatePromptPayQR}
      />
    </div>
  );
};
