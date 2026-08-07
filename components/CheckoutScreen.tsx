"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CreditCard, Banknote, Search, UserPlus, Receipt, Printer, X, Tag, TicketPercent, Coins, AlertTriangle } from 'lucide-react';
import QRCode from 'react-qr-code';

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

interface CheckoutScreenProps {
  tableId: number;
  onBack: () => void;
}

// PromptPay EMVCo QR Generator
function generatePromptPayQR(promptPayId: string, amount: number): string {
  const formatField = (id: string, value: string) => id + String(value.length).padStart(2, '0') + value;
  
  const isPhoneNumber = promptPayId.length <= 10;
  let aid: string;
  if (isPhoneNumber) {
    // Convert Thai phone to international: 0899999999 -> 0066899999999
    aid = '0066' + promptPayId.substring(1);
  } else {
    aid = promptPayId; // Tax ID
  }
  
  const merchantAccountInfo = formatField('00', 'A000000677010111') + formatField(isPhoneNumber ? '01' : '02', aid);
  
  let payload = '';
  payload += formatField('00', '01');                          // Payload Format Indicator
  payload += formatField('01', '12');                          // Point of Initiation (12 = dynamic)
  payload += formatField('29', merchantAccountInfo);           // Merchant Account Info
  payload += formatField('53', '764');                         // Currency (THB)
  payload += formatField('54', amount.toFixed(2));             // Amount
  payload += formatField('58', 'TH');                          // Country Code
  payload += '6304';                                           // CRC placeholder

  // CRC-16/CCITT-FALSE
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }
  
  return payload + crc.toString(16).toUpperCase().padStart(4, '0');
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

  // Payment
  const [cashReceived, setCashReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay' | 'mixed'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Promotions
  const [allPromos, setAllPromos] = useState<Promotion[]>([]);
  const [appliedPromos, setAppliedPromos] = useState<AppliedPromo[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplied, setCouponApplied] = useState<Promotion | null>(null);

  // Computed values
  const activeItems = orderedItems.filter(i => i.status !== 'voided');
  const pendingItemsCount = orderedItems.filter(i => i.status === 'pending').length;
  const subtotal = activeItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const promoDiscount = appliedPromos.reduce((s, ap) => s + ap.discountValue, 0);
  const loyaltyDiscount = pointsToRedeem; // 1 point = 1 baht
  const discount = promoDiscount + loyaltyDiscount;
  const netAmount = Math.max(0, subtotal - discount);
  const cashNum = parseFloat(cashReceived) || 0;
  const transferAmount = Math.max(0, netAmount - cashNum);
  const changeAmount = cashNum > netAmount ? cashNum - netAmount : 0;
  const pointsEarned = Math.floor(netAmount / 25); // 25 baht = 1 point

  const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || '0899999999';

  useEffect(() => {
    fetchOrderData();
    fetchPromotions();

    const channel = supabase
      .channel(`realtime:checkout_order_items_${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchOrderData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tableId]);

  // Re-calculate promos when subtotal or items change
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
        // Filter by date range
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
      // Skip coupon-code promos unless explicitly applied
      if (promo.type === 'fixed' && promo.coupon_code) {
        if (couponApplied?.id === promo.id) {
          // Coupon was manually applied
          if (promo.min_order_amount > 0 && subtotal < promo.min_order_amount) continue;
          applied.push({ promo, discountValue: promo.discount_amount || 0 });
        }
        continue;
      }

      // Check min order
      if (promo.min_order_amount > 0 && subtotal < promo.min_order_amount) continue;

      if (promo.type === 'percentage' && promo.discount_percent) {
        // Check if this promo has menu/time constraints
        if (!promo.menu_item_id && !promo.start_time && !promo.end_time) {
          // Simple: discount whole subtotal
          const val = Math.round(subtotal * promo.discount_percent / 100);
          applied.push({ promo, discountValue: val });
        } else {
          // Per-item: check menu_item_id and/or time range against each item's created_at
          let totalDiscount = 0;
          for (const item of activeItems) {
            // Filter by menu
            if (promo.menu_item_id && item.menu_items?.id !== promo.menu_item_id) continue;
            // Filter by Happy Hour time range
            if (promo.start_time && promo.end_time) {
              const orderTime = new Date(item.created_at);
              const hh = orderTime.getHours().toString().padStart(2, '0');
              const mm = orderTime.getMinutes().toString().padStart(2, '0');
              const itemTimeStr = `${hh}:${mm}`;
              if (itemTimeStr < promo.start_time.slice(0, 5) || itemTimeStr >= promo.end_time.slice(0, 5)) continue;
            }
            totalDiscount += Math.round(item.quantity * item.unit_price * promo.discount_percent / 100);
          }
          if (totalDiscount > 0) {
            applied.push({ promo, discountValue: totalDiscount });
          }
        }
      } else if (promo.type === 'fixed' && !promo.coupon_code) {
        // Auto-apply fixed discount (no coupon code required)
        applied.push({ promo, discountValue: promo.discount_amount || 0 });
      } else if (promo.type === 'buy_x_get_y' && promo.buy_qty && promo.free_qty) {
        // Count free items: for each menu, every (buy+free) items give free_qty free
        let totalFreeValue = 0;
        const freeItemsList: FreeItemDetail[] = [];
        
        // Group items by menu name to calculate buy-X-get-Y
        const menuGroups: Record<string, { qty: number; price: number; id: number }> = {};
        for (const item of activeItems) {
          const name = item.menu_items?.name || '';
          const menuId = item.menu_items?.id;
          if (!menuGroups[name]) menuGroups[name] = { qty: 0, price: item.unit_price, id: menuId };
          menuGroups[name].qty += item.quantity;
        }
        
        for (const [menuName, group] of Object.entries(menuGroups)) {
          // If a specific menu_item_id is set, only apply to that menu item
          if (promo.menu_item_id && group.id !== promo.menu_item_id) {
            continue;
          }
          
          const setSize = promo.buy_qty + promo.free_qty;
          const freeSets = Math.floor(group.qty / setSize);
          const freeQtyForThisMenu = freeSets * promo.free_qty;
          
          if (freeQtyForThisMenu > 0) {
            totalFreeValue += freeQtyForThisMenu * group.price;
            freeItemsList.push({
              name: menuName,
              qty: freeQtyForThisMenu
            });
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
    if (!code) { setCouponError('กรุณากรอกรหัสคูปอง'); return; }

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
        .insert({ phone_number: phoneInput, name: registerName.trim(), points: 0 })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setMember(data as LoyaltyMember);
        setShowRegister(false);
        setRegisterName('');
      }
    } catch (err) {
      console.error('Error registering member:', err);
    }
  };

  const processPayment = async () => {
    if (!orderId) return;
    try {
      setIsProcessing(true);
      setErrorMsg(null);

      let method = paymentMethod;
      if (cashNum > 0 && transferAmount > 0) method = 'mixed';
      else if (cashNum >= netAmount) method = 'cash';
      else method = 'promptpay';

      // Build promotion payload for sales history tracking
      const promoPayload = appliedPromos.map(ap => ({
        promotion_id: ap.promo.id,
        promotion_name: ap.promo.name,
        promotion_type: ap.promo.type,
        discount_value: ap.discountValue,
        free_items: ap.freeItems || null,
      }));

      const { data: success, error } = await supabase.rpc('complete_checkout', {
        p_order_id: orderId,
        p_payment_method: method,
        p_subtotal: subtotal,
        p_discount_amount: discount,
        p_net_amount: netAmount,
        p_points_earned: pointsEarned,
        p_points_redeemed: pointsToRedeem,
        p_phone_number: member?.phone_number || null,
        p_applied_promos: promoPayload,
      });

      if (error) throw error;
      if (success) {
        setShowReceipt(true);
      } else {
        setErrorMsg('ไม่สามารถบันทึกการชำระเงินได้');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการชำระเงิน: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Receipt print
  if (showReceipt) {
    const now = new Date();
    return (
      <div className="min-h-screen bg-gray-100 text-slate-800 flex flex-col items-center justify-center p-6">
        {/* Print-only receipt */}
        <div id="receipt" className="bg-white text-black w-[320px] p-6 rounded-2xl shadow-xl border border-slate-200 font-mono text-xs print:shadow-none print:rounded-none print:w-[80mm] print:border-none">
          <div className="text-center mb-3">
            <h2 className="text-lg font-black tracking-wider">YOKAYAKI IZAKAYA</h2>
            <p className="text-[10px] text-gray-500">(3-4 Tables Setup)</p>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-[11px] space-y-0.5">
            <p>บิลเลขที่: ORD-{orderId}</p>
            <p>โต๊ะที่: Table {tableId}</p>
            <p>วันที่: {now.toLocaleDateString('th-TH')} เวลา: {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
            <p>พนักงาน: {employee?.name}</p>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          {activeItems.map(item => (
            <div key={item.id} className="py-0.5">
              <div className="flex justify-between text-[11px]">
                <span>- {item.menu_items?.name} x{item.quantity}</span>
                <span>{(item.quantity * item.unit_price).toLocaleString()}</span>
              </div>
              {item.notes && (
                <div className="text-[10px] text-gray-500 pl-3">
                  *{item.notes}
                </div>
              )}
            </div>
          ))}
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between text-[11px]"><span>ยอดรวม:</span><span>{subtotal.toLocaleString()} บาท</span></div>
          {appliedPromos.map(ap => (
            <div key={ap.promo.id} className="text-red-600">
              <div className="flex justify-between text-[11px]">
                <span>โปรโม: {ap.promo.name}</span><span>-{ap.discountValue.toLocaleString()} บาท</span>
              </div>
              {ap.freeItems && ap.freeItems.map((fi, idx) => (
                <div key={idx} className="text-[10px] pl-3 text-gray-500">
                  └ ฟรี: {fi.name} x{fi.qty}
                </div>
              ))}
            </div>
          ))}
          {loyaltyDiscount > 0 && <div className="flex justify-between text-[11px] text-red-600"><span>ส่วนลดแต้ม:</span><span>-{loyaltyDiscount.toLocaleString()} บาท</span></div>}
          <div className="flex justify-between font-bold text-sm mt-1"><span>รวมทั้งสิ้น:</span><span>{netAmount.toLocaleString()} บาท</span></div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <p className="text-[10px]">ชำระโดย:</p>
          {cashNum > 0 && <p className="text-[10px]">  * เงินสด: {cashNum.toLocaleString()} บาท</p>}
          {transferAmount > 0 && cashNum < netAmount && <p className="text-[10px]">  * โอนพร้อมเพย์: {transferAmount.toLocaleString()} บาท</p>}
          {changeAmount > 0 && <p className="text-[10px]">  * เงินทอน: {changeAmount.toLocaleString()} บาท</p>}
          {member && (
            <>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="text-[10px]">สมาชิก: {member.name} ({member.phone_number})</p>
              {pointsToRedeem > 0 && <p className="text-[10px]">แต้มที่ใช้: {pointsToRedeem} แต้ม</p>}
              <p className="text-[10px]">แต้มสะสมรอบนี้: +{pointsEarned} แต้ม</p>
            </>
          )}
          <div className="border-t border-dashed border-gray-400 my-2" />
          <p className="text-center text-[10px] text-gray-500">ขอบคุณที่ใช้บริการค่ะ!</p>
        </div>

        {/* Action Buttons (hidden in print) */}
        <div className="flex gap-3 mt-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 active:scale-95 transition shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ใบเสร็จ
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 shadow-xs px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            กลับหน้าผังโต๊ะ
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full text-slate-800 font-sans pb-64 lg:pb-8">
      <div className="w-full">
        {/* Header */}
        <header className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition active:scale-95 text-slate-700 shadow-xs">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-red-600" />
              ชำระเงิน / เช็คบิล
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">ประจำ <span className="text-red-600 font-bold">โต๊ะ {tableId}</span> • ออเดอร์ #{orderId}</p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>{errorMsg}</span>
          </div>
        )}

        {pendingItemsCount > 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">ยังไม่สามารถชำระเงินได้: มีออเดอร์ในครัวที่ยังไม่ได้เสิร์ฟ ({pendingItemsCount} รายการ)</p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5 font-normal">กรุณาให้พนักงานครัวกดเสิร์ฟอาหารในหน้าจอครัวให้ครบก่อนทำการเช็คบิล</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Order Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-slate-900 mb-4 pb-2 border-b border-slate-100">สรุปรายการอาหาร</h2>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {activeItems.map(item => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">{item.menu_items?.name}</span>
                      <span className="text-slate-500 ml-2 font-semibold">x{item.quantity}</span>
                    </div>
                    <span className="font-extrabold text-red-600">{(item.quantity * item.unit_price).toLocaleString()} ฿</span>
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-amber-700 font-semibold">
                      โน้ต: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">ยอดรวม ({activeItems.reduce((s, i) => s + i.quantity, 0)} ชิ้น)</span>
                <span className="text-slate-800 font-bold">{subtotal.toLocaleString()} บาท</span>
              </div>
              {appliedPromos.map(ap => (
                <div key={ap.promo.id} className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-red-600 font-semibold flex items-center gap-1"><Tag className="w-3 h-3" />{ap.promo.name}</span>
                    <span className="text-red-600 font-extrabold">-{ap.discountValue.toLocaleString()} บาท</span>
                  </div>
                  {ap.freeItems && ap.freeItems.map((fi, idx) => (
                    <div key={idx} className="text-[11px] text-slate-500 pl-4 font-semibold">
                      • ฟรี: {fi.name} x{fi.qty}
                    </div>
                  ))}
                </div>
              ))}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-600">ส่วนลดแต้มสมาชิก</span>
                  <span className="text-emerald-600 font-extrabold">-{loyaltyDiscount.toLocaleString()} บาท</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg pt-3 border-t border-slate-100">
                <span className="font-extrabold text-slate-900">ยอดสุทธิรวม</span>
                <span className="font-black text-2xl text-red-600">{netAmount.toLocaleString()} บาท</span>
              </div>

              {/* Points Earned Display */}
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex justify-between items-center bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Coins className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">แต้มที่จะได้รับจากบิลนี้</span>
                    {member ? (
                      <span className="text-[11px] text-emerald-600 font-semibold block">สะสมให้: {member.name} ({member.phone_number})</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium block">*ระบุสมาชิก CRM เพื่อสะสมแต้ม</span>
                    )}
                  </div>
                </div>
                <span className="font-black text-base text-amber-600">+{pointsEarned.toLocaleString()} แต้ม</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Payment Controls */}
          <div className="space-y-5">
            {/* Loyalty Member Lookup */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">สมาชิกสะสมแต้ม (CRM)</h3>
              <div className="flex gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="เบอร์โทรศัพท์ 10 หลัก"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:outline-none transition font-semibold"
                />
                <button
                  onClick={searchMember}
                  disabled={phoneInput.length !== 10 || isSearchingMember}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition active:scale-95"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {member && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-emerald-800 text-xs font-bold">สมาชิก: {member.name}</p>
                  <p className="text-emerald-700 text-[11px] mt-0.5">แต้มคงเหลือ: <span className="font-extrabold">{member.points} แต้ม</span></p>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-xs text-slate-600 font-semibold">ใช้แต้ม:</label>
                    <input
                      type="number"
                      min={0}
                      max={Math.min(member.points, subtotal)}
                      value={pointsToRedeem}
                      onChange={e => setPointsToRedeem(Math.min(Number(e.target.value) || 0, member.points, subtotal))}
                      className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-800 focus:border-red-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400">(1 แต้ม = 1 บาท)</span>
                  </div>
                </div>
              )}

              {showRegister && !member && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-blue-800 text-xs font-semibold mb-2">ไม่พบสมาชิก สมัครใหม่?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ชื่อลูกค้า"
                      value={registerName}
                      onChange={e => setRegisterName(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={registerMember}
                      disabled={!registerName.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-lg text-xs font-bold transition active:scale-95 shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      สมัคร
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Coupon Code */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <TicketPercent className="w-4 h-4 text-red-600" />
                คูปองส่วนลด
              </h3>
              {couponApplied ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-red-700 text-xs font-bold">{couponApplied.name}</p>
                    <p className="text-red-600/80 text-[11px]">โค้ด: {couponApplied.coupon_code} • ลด {couponApplied.discount_amount} บาท</p>
                  </div>
                  <button onClick={removeCoupon} className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder='รหัสคูปอง เช่น "YOKA50"'
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:border-red-500 focus:outline-none transition uppercase"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={!couponInput.trim()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-xs"
                    >
                      ใช้คูปอง
                    </button>
                  </div>
                  {couponError && <p className="text-rose-600 text-xs mt-2 font-medium">{couponError}</p>}
                </>
              )}
            </div>

            {/* Combined Single Payment & Action Card (Sticky at bottom on mobile) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:static bg-white dark:bg-neutral-900 border-t lg:border border-slate-200/90 dark:border-neutral-800 p-5 rounded-t-3xl lg:rounded-2xl shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.15)] lg:shadow-sm space-y-4">
              {/* Cash Input */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-2 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  เงินสดรับ
                </h3>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-2xl font-black text-slate-900 dark:text-neutral-100 text-right focus:border-emerald-500 focus:outline-none transition"
                />

                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setCashReceived(prev => String((parseFloat(prev) || 0) + amt))}
                      className="flex-1 py-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-slate-700 dark:text-neutral-200 transition active:scale-95 cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                  <button onClick={() => setCashReceived(String(netAmount))} className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 transition active:scale-95 cursor-pointer">
                    เต็มจำนวน
                  </button>
                  {cashNum > 0 && (
                    <button
                      onClick={() => setCashReceived('')}
                      className="px-2.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 transition active:scale-95 cursor-pointer"
                      title="ล้างยอดเงินสด"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                {/* Change calculation */}
                {cashNum > 0 && changeAmount > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex justify-between items-center">
                    <span className="text-emerald-800 dark:text-emerald-300 text-xs font-bold">เงินทอน</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-lg">{changeAmount.toLocaleString()} บาท</span>
                  </div>
                )}

                {/* Transfer remaining */}
                {cashNum > 0 && cashNum < netAmount && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl flex justify-between items-center">
                    <span className="text-blue-800 dark:text-blue-300 text-xs font-bold">ยอดค้างชำระ (โอน)</span>
                    <span className="text-blue-700 dark:text-blue-400 font-black text-lg">{transferAmount.toLocaleString()} บาท</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-neutral-800">
                {/* Generate PromptPay QR */}
                {(cashNum < netAmount) && netAmount > 0 && (
                  <button
                    onClick={() => setShowQrModal(true)}
                    disabled={pendingItemsCount > 0}
                    className="w-full py-3 bg-slate-800 dark:bg-neutral-800 hover:bg-slate-900 dark:hover:bg-neutral-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition active:scale-98 flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed border border-slate-700 dark:border-neutral-700"
                  >
                    <CreditCard className="w-4 h-4" />
                    สร้าง QR พร้อมเพย์ ({transferAmount.toLocaleString()} บาท)
                  </button>
                )}

                {/* Confirm Payment */}
                <button
                  onClick={processPayment}
                  disabled={isProcessing || netAmount <= 0 || pendingItemsCount > 0}
                  className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition active:scale-98 flex items-center justify-center gap-2 shadow-md ${
                    pendingItemsCount > 0
                      ? 'bg-slate-300 dark:bg-neutral-800 text-slate-500 dark:text-neutral-500 border border-slate-200 dark:border-neutral-700 cursor-not-allowed shadow-none'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-neutral-800 text-white shadow-red-600/20 cursor-pointer'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : pendingItemsCount > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>ยังชำระเงินไม่ได้ (ค้างครัว {pendingItemsCount} รายการ)</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-5 h-5" />
                      <span>ยืนยันรับชำระเงิน ({netAmount.toLocaleString()} บาท)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PromptPay QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-xl relative text-center">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-900 mb-1">PromptPay QR</h3>
            <p className="text-slate-500 text-xs mb-5 font-medium">สแกนเพื่อชำระเงิน {transferAmount.toLocaleString()} บาท</p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block">
              <QRCode value={generatePromptPayQR(promptPayId, transferAmount)} size={200} level="H" />
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-4 font-semibold">Yokayaki Izakaya • PromptPay</p>
          </div>
        </div>
      )}
    </div>
  );
};

