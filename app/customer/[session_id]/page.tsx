"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  ChefHat, 
  AlertCircle, 
  RefreshCw, 
  ClipboardList, 
  X,
  Home,
  UtensilsCrossed,
  Tag,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  BellRing
} from 'lucide-react';
import { menuItemSalePrice } from '@/lib/menuPrice';
import { PLATFORM_BRANDING } from '@/lib/branding';

interface OrderedItem {
  id: number;
  quantity: number;
  unit_price: number;
  status: string;
  notes?: string;
  menu_items: { name: string };
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string | null;
  is_happy_hour?: boolean;
  happy_hour_price?: number | null;
}

interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_percent: number | null;
  discount_amount: number | null;
  min_order_amount: number;
  is_active: boolean;
  image_url: string | null;
  start_time: string | null;
  end_time: string | null;
}

type CustomerTab = 'home' | 'order' | 'ordered' | 'promotions';

/** ถี่พอให้ลูกค้ารู้สึกว่าอัปเดตทันที แต่เบากว่าการเปิด realtime channel ให้ทุกโต๊ะทั้งร้าน */
const POLL_INTERVAL_MS = 5000;

export default function CustomerOrderPortal() {
  const params = useParams();
  const sessionId = params.session_id as string;

  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [noteEditTarget, setNoteEditTarget] = useState<{ index: number; notes: string } | null>(null);

  const [tableStatus, setTableStatus] = useState<'vacant' | 'occupied' | 'checking_out'>('occupied');
  const [isCheckoutCompleted, setIsCheckoutCompleted] = useState(false);
  const [showCheckBillConfirm, setShowCheckBillConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // =============================================================
  // ข้อมูลทั้งหมดของหน้านี้มาจาก /api/customer/[session_id]/state ทางเดียว
  //
  // เดิมหน้านี้ถือ anon key แล้ว query 5 ตารางตรงๆ พร้อมเปิด realtime 5 ช่อง
  // = ลูกค้าที่สแกน QR ได้สิทธิ์ระดับเดียวกับเครื่อง POS ทั้งร้าน (A1)
  //
  // ตอนนี้หน้าลูกค้าไม่มี credential ใดๆ อยู่ใน bundle เลย
  // session UUID ใน URL คือสิทธิ์ทั้งหมดที่มี และ server เป็นคน scope ให้เหลือ
  // เฉพาะโต๊ะของเซสชันนี้ · realtime ถูกแทนด้วยการ poll ทุก 5 วินาที
  // =============================================================

  const isFirstLoadRef = useRef(true);
  const prevTableStatusRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/customer/${sessionId}/state`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? 'โหลดข้อมูลไม่สำเร็จ');

      if (!data.sessionActive) {
        // เปิดครั้งแรกแล้วเซสชันใช้ไม่ได้ = QR ผิดหรือหมดอายุ
        // เคยใช้ได้แล้วเพิ่งหยุด = พนักงานปิดบิลไปแล้ว
        if (isFirstLoadRef.current) setSessionValid(false);
        else setIsCheckoutCompleted(true);
        return;
      }

      setErrorMsg(null);
      setSessionValid(true);
      setTableId(data.tableId);
      setTableNumber(data.tableNumber ?? null);
      setMenuItems((data.menuItems ?? []) as MenuItem[]);
      setPromotions((data.promotions ?? []) as Promotion[]);
      setOrderedItems((data.orderedItems ?? []) as OrderedItem[]);

      const nextStatus = data.tableStatus as 'vacant' | 'occupied' | 'checking_out';
      setTableStatus(nextStatus);

      // โต๊ะเปลี่ยนเป็นว่าง = ปิดบิลเรียบร้อย (เดิมจับจาก realtime UPDATE event)
      if (!isFirstLoadRef.current && prevTableStatusRef.current !== 'vacant' && nextStatus === 'vacant') {
        setIsCheckoutCompleted(true);
      }
      prevTableStatusRef.current = nextStatus;
    } catch (err) {
      console.error('Error loading portal:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดระบบสั่งอาหาร');
    } finally {
      isFirstLoadRef.current = false;
      setIsLoading(false);
    }
  }, [sessionId]);

  // ชื่อเดิมที่ JSX ยังเรียกอยู่ — ตอนนี้ทั้งคู่หมายถึง "ดึงสถานะรอบใหม่"
  const verifySessionAndFetchData = refresh;
  const fetchOrderedItems = useCallback(async () => { await refresh(); }, [refresh]);

  useEffect(() => {
    if (!sessionId) return;
    // จบงานแล้วก็ไม่ต้อง poll ต่อ
    if (isCheckoutCompleted || sessionValid === false) return;

    refresh();

    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [sessionId, refresh, isCheckoutCompleted, sessionValid]);


  const addToCart = (item: MenuItem, notes?: string) => {
    const salePrice = menuItemSalePrice(item);
    setCart(prev => {
      const itemNotes = notes || '';
      const existing = prev.find(i => i.id === item.id && (i.notes || '') === itemNotes);
      const totalQtyInCart = prev.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0);

      if (existing) {
        if (totalQtyInCart >= item.stock) return prev;
        return prev.map(i => (i.id === item.id && (i.notes || '') === itemNotes) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (totalQtyInCart >= item.stock) return prev;
      if (item.stock === 0) return prev;
      return [...prev, { ...item, price: salePrice, quantity: 1, notes: itemNotes }];
    });
  };

  const removeFromCart = (itemId: number, notes?: string) => {
    setCart(prev => {
      if (notes !== undefined) {
        return prev.map(i => (i.id === itemId && (i.notes || '') === notes) ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      }
      
      const indexWithEmptyNotes = prev.findIndex(i => i.id === itemId && !i.notes);
      if (indexWithEmptyNotes !== -1) {
        return prev.map((i, idx) => idx === indexWithEmptyNotes ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      }
      
      const indexAny = prev.findIndex(i => i.id === itemId);
      if (indexAny !== -1) {
        return prev.map((i, idx) => idx === indexAny ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      }
      
      return prev;
    });
  };

  const updateCartItemNotes = (index: number, newNotes: string) => {
    setCart(prev => {
      const target = prev[index];
      if (!target) return prev;
      
      const otherIndex = prev.findIndex((item, i) => i !== index && item.id === target.id && (item.notes || '') === newNotes);
      if (otherIndex !== -1) {
        return prev.map((item, i) => {
          if (i === otherIndex) {
            return { ...item, quantity: item.quantity + target.quantity };
          }
          return item;
        }).filter((_, i) => i !== index);
      }
      
      return prev.map((item, i) => i === index ? { ...item, notes: newNotes } : item);
    });
  };

  const getCartQuantity = (itemId: number) => {
    return cart.filter(i => i.id === itemId).reduce((sum, i) => sum + i.quantity, 0);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleRequestCheckBill = async () => {
    if (!tableId) return;
    try {
      setIsUpdatingStatus(true);

      // แก้ A7.3: เดิมหน้านี้ UPDATE ตาราง tables ตรงๆ ด้วย anon key
      // = ใครมี URL ก็พลิกสถานะโต๊ะไหนก็ได้ทั้งร้าน
      const res = await fetch(`/api/customer/${sessionId}/check-bill`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? 'เรียกเช็คบิลไม่สำเร็จ');

      if (!data.orderActive) {
        setIsCheckoutCompleted(true);
        setShowCheckBillConfirm(false);
        return;
      }

      setTableStatus('checking_out');
      setShowCheckBillConfirm(false);
    } catch (err) {
      console.error('Error requesting check bill:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการเรียกเช็คบิล');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelCheckBill = async () => {
    if (!tableId) return;
    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`/api/customer/${sessionId}/check-bill`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'ยกเลิกการเรียกเช็คบิลไม่สำเร็จ');
      }
      setTableStatus('occupied');
    } catch (err) {
      console.error('Error cancelling check bill:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const confirmOrder = async () => {
    if (cart.length === 0) return;
    
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // ส่งตะกร้าไปทีเดียว และ "ไม่ส่งราคา" — ราคามาจาก menu_items ฝั่ง server เท่านั้น
      // (เดิม loop ยิง RPC จากเบราว์เซอร์พร้อมส่ง p_unit_price ที่ลูกค้าแก้ได้)
      const res = await fetch(`/api/customer/${sessionId}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            menuItemId: item.id,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setCart([]);
        await refresh();
        setActiveTab('ordered');
        alert('ส่งรายการสั่งซื้อเข้าครัวสำเร็จ!');
      } else {
        setErrorMsg(data?.error ?? 'ไม่สามารถส่งออเดอร์ได้');
        await refresh();
      }
    } catch (err: any) {
      console.error('Error confirming order:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการทำรายการออเดอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Promo short description
  const getPromoShortDesc = (promo: Promotion) => {
    if (promo.type === 'percentage') {
      return `รับส่วนลด ${promo.discount_percent}% เมื่อทานครบ ฿${promo.min_order_amount.toLocaleString()}`;
    }
    if (promo.type === 'fixed') {
      return `ส่วนลดพิเศษ ฿${promo.discount_amount} เมื่อสั่งอาหารครบ ฿${promo.min_order_amount.toLocaleString()}`;
    }
    if (promo.type === 'buy_x_get_y') {
      return `โปรโมชั่นพิเศษ ซื้อ 2 แถม 1 (เฉพาะเมนูที่ร่วมรายการ)`;
    }
    return 'โปรโมชั่นพิเศษสำหรับลูกค้า Yokayaki';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
        <p className="mt-4 animate-pulse text-sm font-bold text-neutral-300">กำลังดาวน์โหลดเมนู Yokayaki...</p>
      </div>
    );
  }

  // Render Thank You / Checkout Completed Screen (Light Theme)
  // Only shown when checkout happens via realtime while customer is actively using the page
  if (isCheckoutCompleted) {
    return (
      <div className="flex min-h-screen animate-fade-in flex-col items-center justify-center bg-neutral-950 p-6 text-center font-sans">
        <div className="app-dialog relative flex w-full max-w-sm flex-col items-center space-y-4 overflow-hidden p-8">
          {/* Top Decorative Banner */}
          <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500" />
          
          <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1 pt-1">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black tracking-wide uppercase">
              ชำระเงินเรียบร้อยแล้ว
            </span>
            <h1 className="pt-2 text-2xl font-black tracking-tight text-neutral-100">
              ขอบคุณที่ใช้บริการ!
            </h1>
            <p className="text-xs font-semibold text-neutral-400">
              Yokayaki Izakaya • โต๊ะ {tableNumber ?? ''}
            </p>
          </div>

        <div className="app-card app-card--compact w-full space-y-2 p-4 text-left text-xs font-medium leading-relaxed text-neutral-300">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 font-bold text-neutral-100">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span>ทางร้านได้รับการชำระเงินเรียบร้อยแล้ว</span>
            </div>
            <p className="pt-1 text-[11px] leading-relaxed text-neutral-400">
              ขอบพระคุณลูกค้าที่มาร่วมรับประทานอาหารกับ Yokayaki ครับ หวังว่าจะได้รับความไว้วางใจและมีโอกาสให้บริการท่านอีกครั้งครับ 🙏
            </p>
          </div>

          <div className="w-full pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full cursor-pointer rounded-xl app-surface-inset py-3 text-xs font-bold text-neutral-200 transition hover:opacity-90"
            >
              รีเฟรช / สแกนโต๊ะใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Invalid Session (Light Theme)
  if (sessionValid === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6 text-center">
        <div className="app-card flex w-full max-w-sm flex-col items-center p-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-rose-900/50 bg-rose-950/40 text-rose-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-xl font-black text-neutral-100">QR Code หมดอายุหรือไม่ถูกต้อง</h1>
          <p className="mb-6 text-xs leading-relaxed text-neutral-400">กรุณาสแกนใหม่อีกครั้ง หรือแจ้งพนักงานประจำร้านเพื่อสร้าง QR Code สั่งอาหารชุดใหม่ครับ</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 btn-crimson text-white rounded-xl font-bold text-xs shadow-xs transition"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = orderedItems.filter(i => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-neutral-950 pb-36 font-sans text-neutral-100">
      
      {/* Sticky Top Header */}
      <header className="app-surface-bar sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 shadow-xs backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={PLATFORM_BRANDING.logo}
            alt="Yo-Yaki Izakaya"
            width={160}
            height={54}
            priority
            className="h-9 w-auto"
          />
          <p className="whitespace-nowrap text-xs font-bold text-neutral-400 md:text-sm">
            ประจำ <span className="text-sm font-black text-red-400 md:text-base">โต๊ะ {tableNumber ?? ''}</span>
          </p>
        </div>
        <button 
          onClick={verifySessionAndFetchData} 
          className="app-surface-inset cursor-pointer rounded-xl p-2 text-neutral-400 transition hover:text-neutral-100 active:scale-95"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      {/* Error Message Toast */}
      {errorMsg && (
        <div className="mx-4 mt-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="max-w-md mx-auto p-4">
        
        {/* TAB 1: 🏠 หน้าหลัก (Home View) */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            {/* Table Welcome Banner */}
            <div className="bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  ยินดีต้อนรับสู่ Yokayaki
                </span>
                <h2 className="text-2xl font-black tracking-tight mb-1">สั่งอาหาร โต๊ะ {tableNumber ?? ''}</h2>
                <p className="text-white/80 text-xs font-medium leading-relaxed">
                  เลือกเมนูที่ชอบและส่งสั่งครัวได้ทันทีจากมือถือของคุณ
                </p>

                <button
                  onClick={() => setActiveTab('order')}
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 app-card app-card--compact px-5 py-2.5 text-xs font-extrabold text-red-400 transition active:scale-95"
                >
                  <span>เริ่มเลือกสั่งอาหาร</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <ChefHat className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
            </div>

            {/* Active Order Summary Status */}
            {orderedItems.length > 0 && (
              <div className="app-card app-card--compact flex items-center justify-between p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-100">รายการสั่งอาหารของคุณ</h3>
                    <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">
                      {pendingCount > 0 ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          กำลังปรุงในครัว {pendingCount} รายการ
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold">เสิร์ฟครบทุกรายการแล้ว</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('ordered')}
                  className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  ดูสถานะ
                </button>
              </div>
            )}

            {/* Active Promotions Carousel Preview */}
            {promotions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-red-600" />
                    <span>โปรโมชั่นแนะนำ</span>
                  </h3>
                  <button 
                    onClick={() => setActiveTab('promotions')} 
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    ดูทั้งหมด
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {promotions.slice(0, 3).map(promo => (
                    <div 
                      key={promo.id} 
                      onClick={() => setActiveTab('promotions')}
                      className="app-card app-card--compact min-w-[210px] max-w-[230px] shrink-0 cursor-pointer p-3 shadow-xs transition hover:opacity-95 flex flex-col justify-between"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-800/80 relative mb-2.5 shrink-0 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                          <Tag className="w-10 h-10 opacity-30 text-red-500" />
                        </div>
                        {promo.image_url && (
                          <img 
                            src={promo.image_url} 
                            alt={promo.name} 
                            className="w-full h-full object-cover relative z-1"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        )}
                        <span className="absolute top-2 left-2 z-2 px-2 py-0.5 bg-red-600/95 text-white rounded-md text-[10px] font-black shadow-xs">
                          {promo.type === 'percentage' ? `ลด ${promo.discount_percent}%` : promo.type === 'fixed' ? `ลด ฿${promo.discount_amount}` : 'ซื้อ 2 แถม 1'}
                        </span>
                        {promo.start_time && (
                          <span className="absolute bottom-2 left-2 z-2 px-1.5 py-0.5 bg-black/75 backdrop-blur-xs text-[9px] text-neutral-200 font-semibold rounded-md flex items-center gap-1 shadow-xs">
                            <Clock className="w-2.5 h-2.5" />
                            {promo.start_time.substring(0, 5)} - {promo.end_time?.substring(0, 5)}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-neutral-100 truncate">{promo.name}</h4>
                        <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                          {getPromoShortDesc(promo)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 🍱 สั่งอาหาร (Order Food View) */}
        {activeTab === 'order' && (
          <div className="space-y-4 animate-fade-in">
            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {['ทั้งหมด', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`badge-pill px-4 py-2 text-xs font-bold ${
                    selectedCategory === cat ? 'badge-active' : 'badge-inactive'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {menuItems
                .filter(item => selectedCategory === 'ทั้งหมด' || item.category === selectedCategory)
                .map(item => {
                  const qty = getCartQuantity(item.id);
                  const isSoldOut = item.stock <= 0;
                  const isLowStock = item.stock > 0 && item.stock <= 3;

                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col justify-between gap-2.5 p-3 transition-all shadow-xs ${
                        isSoldOut ? 'rounded-2xl border-2 border-rose-200 bg-rose-50/80 opacity-95' : 'app-card app-card--compact'
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        {item.image_url && (
                          <div className="w-full aspect-square rounded-xl overflow-hidden bg-neutral-800 border border-neutral-800 relative">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            {isSoldOut ? (
                              <span className="absolute top-2 right-2 text-[9px] font-black tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md shadow-xs">SOLD OUT</span>
                            ) : isLowStock ? (
                              <span className="absolute top-2 right-2 text-[9px] font-bold tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-xs">เหลือ {item.stock} จาน</span>
                            ) : null}
                          </div>
                        )}
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="text-h3 text-neutral-100 line-clamp-2">{item.name}</h3>
                            {!item.image_url && (
                              isSoldOut ? (
                                <span className="text-micro bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded shrink-0">SOLD OUT</span>
                              ) : isLowStock ? (
                                <span className="text-micro bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">เหลือ {item.stock}</span>
                              ) : null
                            )}
                          </div>
                          <p className="text-price text-body font-bold text-red-600 mt-1">฿{item.price.toLocaleString()}</p>
                        </div>
                      </div>

                      {!isSoldOut && (
                        <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-1">
                          <div className="app-surface-inset flex w-full items-center justify-between gap-2 rounded-xl p-1">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              disabled={qty === 0}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg app-surface-inset text-neutral-300 transition active:scale-95 disabled:opacity-40"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-price text-body font-bold text-neutral-100">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              disabled={qty >= item.stock}
                              className="w-7 h-7 flex items-center justify-center rounded-lg btn-crimson text-white disabled:opacity-40 transition active:scale-95 cursor-pointer shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 3: 📋 รายการที่สั่งแล้ว (Ordered History View) */}
        {activeTab === 'ordered' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h2 className="text-base font-black text-neutral-100 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-red-600" />
                  <span>รายการอาหารที่สั่งแล้ว</span>
                </h2>
                <p className="text-neutral-400 text-xs mt-0.5">ประจำ <span className="font-bold text-red-600">โต๊ะ {tableNumber ?? ''}</span></p>
              </div>
              <button 
                onClick={() => fetchOrderedItems()} 
                className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
              >
                อัปเดตสถานะ
              </button>
            </div>

            {orderedItems.length === 0 ? (
              <div className="app-card space-y-3 p-8 text-center shadow-xs">
                <div className="app-surface-inset mx-auto flex h-14 w-14 items-center justify-center rounded-full text-neutral-500">
                  <UtensilsCrossed className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-neutral-200 text-sm">ยังไม่มีรายการสั่งอาหาร</h3>
                <p className="text-neutral-500 text-xs">คุณยังไม่ได้ส่งสั่งอาหารเข้าครัวสำหรับโต๊ะนี้</p>
                <button
                  onClick={() => setActiveTab('order')}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 btn-crimson text-white rounded-2xl font-bold text-xs shadow-xs transition"
                >
                  เลือกสั่งอาหารทันที
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {orderedItems.map(item => {
                  const isPending = item.status === 'pending';
                  const isServed = item.status === 'served';
                  const isVoided = item.status === 'voided';

                  return (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-2xl border text-xs flex justify-between items-start transition-all shadow-xs ${
                        isVoided 
                          ? 'bg-rose-50/60 border-rose-200 text-neutral-500 line-through' 
                          : isServed 
                          ? 'bg-emerald-950/40 border-emerald-800 text-neutral-100' 
                          : 'bg-amber-50/50 border-amber-200 text-neutral-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-neutral-100">{item.menu_items?.name}</span>
                          <span className="font-extrabold text-neutral-400">x{item.quantity}</span>
                        </div>

                        {item.notes && (
                          <div className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md inline-block">
                            โน้ต: {item.notes}
                          </div>
                        )}

                        <div className="pt-0.5">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              กำลังปรุงในครัว...
                            </span>
                          )}
                          {isServed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              เสิร์ฟแล้ว
                            </span>
                          )}
                          {isVoided && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">
                              ยกเลิกรายการแล้ว
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="font-black text-sm text-neutral-100">
                        ฿{(item.quantity * item.unit_price).toLocaleString()}
                      </span>
                    </div>
                  );
                })}

                {/* Total Bill Summary Card */}
                {(() => {
                  const activeItems = orderedItems.filter(i => i.status !== 'voided');
                  const totalQty = activeItems.reduce((s, i) => s + i.quantity, 0);
                  const totalAmt = activeItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);

                  return (
                    <div className="space-y-3 mt-4">
                      <div className="app-card app-card--compact flex items-center justify-between p-4 shadow-xs">
                        <div>
                          <span className="text-neutral-400 text-xs font-bold block">ยอดรวมทั้งสิ้น</span>
                          <span className="text-neutral-500 text-[11px] font-semibold">{totalQty} รายการ (ไม่รวมรายการที่ยกเลิก)</span>
                        </div>
                        <span className="text-xl font-black text-red-600">฿{totalAmt.toLocaleString()}</span>
                      </div>

                      {/* Check Bill Action Button / Status Banner */}
                      <div>
                        {tableStatus === 'checking_out' ? (
                          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs text-center space-y-2.5 animate-fade-in">
                            <div className="flex items-center justify-center gap-2 text-rose-600 font-extrabold text-sm">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                              <span>⏳ แจ้งเรียกพนักงานเช็คบิลแล้ว</span>
                            </div>
                            <p className="text-neutral-400 text-xs font-semibold">
                              พนักงานกำลังจัดเตรียมใบเสร็จและเดินทางมาที่ <span className="font-extrabold text-rose-600">โต๊ะ {tableNumber ?? ''}</span>
                            </p>
                            <button
                              onClick={handleCancelCheckBill}
                              disabled={isUpdatingStatus}
                              className="app-card app-card--compact cursor-pointer px-4 py-1.5 text-xs font-bold text-rose-400 transition active:scale-95 hover:opacity-90"
                            >
                              ยกเลิกการเรียกเช็คบิล
                            </button>
                          </div>
                        ) : pendingCount > 0 ? (
                          <button
                            disabled
                            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl app-surface-inset py-3.5 text-xs font-extrabold text-neutral-500 shadow-none sm:text-sm"
                          >
                            <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
                            <span>กรุณารออาหารเสริฟครบ ก่อนเรียกเช็คบิล</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowCheckBillConfirm(true)}
                            className="w-full py-3.5 btn-crimson text-white font-extrabold text-sm rounded-2xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <BellRing className="w-5 h-5 animate-bounce" />
                            <span>เรียกเช็คบิล / ชำระเงิน</span>
                          </button>
                        )}
                      </div>

                      {/* Check Bill Confirmation Modal */}
                      {showCheckBillConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop animate-fade-in">
                          <div className="app-dialog w-full max-w-sm p-5 space-y-4 text-center">
                            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
                              <BellRing className="w-7 h-7" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-neutral-100">เรียกพนักงานเช็คบิล?</h3>
                              <p className="text-neutral-400 text-xs mt-1">
                                โต๊ะ {tableNumber ?? ''} • ยอดรวมทั้งสิ้น <span className="font-extrabold text-red-600">฿{totalAmt.toLocaleString()} บาท</span>
                              </p>
                            </div>
                            <div className="flex gap-2 border-t border-white/10 pt-2">
                              <button
                                onClick={() => setShowCheckBillConfirm(false)}
                                className="app-surface-inset flex-1 rounded-xl py-2.5 text-xs font-bold text-neutral-300 transition hover:opacity-90 cursor-pointer"
                              >
                                ยังก่อน
                              </button>
                              <button
                                onClick={handleRequestCheckBill}
                                disabled={isUpdatingStatus}
                                className="flex-1 py-2.5 btn-crimson text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs"
                              >
                                {isUpdatingStatus ? 'กำลังส่งสัญญาณ...' : 'ยืนยันเรียกเช็คบิล'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: 🏷️ โปรโมชั่น (Promotions View) */}
        {activeTab === 'promotions' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b border-white/10 pb-2">
              <h2 className="text-base font-black text-neutral-100 flex items-center gap-2">
                <Tag className="w-5 h-5 text-red-600" />
                <span>โปรโมชั่นพิเศษ</span>
              </h2>
              <p className="text-neutral-400 text-xs mt-0.5">ส่วนลดและข้อเสนอสุดคุ้มจากร้าน Yokayaki</p>
            </div>

            {promotions.length === 0 ? (
              <div className="app-card space-y-2 p-8 text-center shadow-xs">
                <Tag className="mx-auto h-10 w-10 text-neutral-600" />
                <h3 className="font-bold text-neutral-200 text-sm">ยังไม่มีโปรโมชั่นใหม่ขณะนี้</h3>
                <p className="text-neutral-500 text-xs">ติดตามส่วนลดและข้อเสนอพิเศษได้ที่นี่เร็วๆ นี้</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {promotions.map(promo => (
                  <div key={promo.id} className="app-card relative space-y-3 overflow-hidden p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-black">
                          {promo.type === 'percentage' ? `ส่วนลด ${promo.discount_percent}%` : promo.type === 'fixed' ? `ส่วนลด ฿${promo.discount_amount}` : 'ซื้อ 2 แถม 1'}
                        </span>
                        <h3 className="font-extrabold text-sm text-neutral-100">{promo.name}</h3>
                      </div>

                      {promo.start_time && (
                        <span className="app-surface-inset flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-neutral-400">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          {promo.start_time.substring(0, 5)} - {promo.end_time?.substring(0, 5)} น.
                        </span>
                      )}
                    </div>

                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-800 relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                        <Tag className="w-16 h-16 opacity-30 text-red-500" />
                      </div>
                      {promo.image_url && (
                        <img 
                          src={promo.image_url} 
                          alt={promo.name} 
                          className="w-full h-full object-cover relative z-1"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      )}
                    </div>

                    <p className="app-card app-card--compact rounded-xl p-3 text-xs leading-relaxed text-neutral-300">
                      {getPromoShortDesc(promo)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Cart Summary Bar (Positioned above bottom nav bar when active) */}
      {cart.length > 0 && !showCartDrawer && (
        <div className="fixed bottom-20 inset-x-0 z-30 px-4 max-w-md mx-auto">
          <button 
            onClick={() => setShowCartDrawer(true)}
            className="btn-crimson w-full text-white p-3.5 rounded-2xl flex items-center justify-between active:scale-98 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative rounded-xl bg-white/20 p-2">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 bg-neutral-900 text-red-600 text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-xs">
                  {cartItemCount}
                </span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">ดูรายการในตะกร้า</span>
                <span className="text-xs font-bold text-white">{cartItemCount} รายการ</span>
              </div>
            </div>
            <span className="text-base font-black text-white">฿{cartTotal.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal (Light Theme) */}
      {showCartDrawer && cart.length > 0 && (
        <div className="fixed inset-0 z-50 app-dialog-backdrop flex items-end animate-fade-in" onClick={() => setShowCartDrawer(false)}>
          <div className="app-dialog app-dialog--sheet w-full max-h-[80vh] p-5 flex flex-col gap-4 max-w-md mx-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-neutral-100">
                <ShoppingBag className="w-5 h-5 text-red-600" />
                <span>ตะกร้าของคุณ ({cartItemCount} ชิ้น)</span>
              </h3>
              <button onClick={() => setShowCartDrawer(false)} className="app-surface-inset cursor-pointer rounded-full p-1.5 text-neutral-400 hover:text-neutral-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {cart.map((item, index) => (
                <div key={`${item.id}-${item.notes || ''}-${index}`} className="app-card app-card--compact flex flex-col gap-2.5 p-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-cart-item-name">{item.name}</h4>
                      <p className="text-cart-item-price mt-1">฿{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="app-surface-inset flex items-center gap-2 rounded-xl p-1 shadow-xs">
                      <button
                        onClick={() => removeFromCart(item.id, item.notes)}
                        className="app-surface-inset flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-neutral-300 hover:opacity-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-cart-item-qty w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item, item.notes)}
                        disabled={cart.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0) >= item.stock}
                        className="btn-crimson flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Notes management */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                    {item.notes ? (
                      <span className="text-red-600 font-bold">โน้ต: {item.notes}</span>
                    ) : (
                      <span className="text-neutral-500">ไม่มีโน้ตพิเศษ</span>
                    )}
                    <button
                      onClick={() => setNoteEditTarget({ index, notes: item.notes || '' })}
                      className="text-red-600 font-bold flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-1 rounded-lg cursor-pointer active:scale-95 transition"
                    >
                      <ClipboardList className="w-3 h-3" />
                      <span>{item.notes ? 'แก้ไขโน้ต' : '+ โน้ตเพิ่ม'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-white/10 pt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-neutral-400 font-bold text-xs">ยอดรวมทั้งสิ้น:</span>
                <span className="text-xl font-black text-red-600">฿{cartTotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setShowCartDrawer(false);
                  confirmOrder();
                }}
                disabled={isSubmitting}
                className="w-full py-3.5 btn-crimson disabled:bg-neutral-700 disabled:text-neutral-400 text-white font-extrabold text-sm rounded-2xl transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
              >
                {isSubmitting ? 'กำลังส่งคำสั่งซื้อ...' : 'ยืนยันสั่งอาหารส่งเข้าครัว'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Edit Modal (Light Theme) */}
      {noteEditTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop animate-fade-in">
          <div className="app-dialog w-full max-w-sm p-5 relative space-y-4">
            <div>
              <h3 className="text-base font-black text-neutral-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-red-600" />
                <span>ระบุโน้ตพิเศษ</span>
              </h3>
              <p className="text-neutral-400 text-xs mt-1">
                สำหรับเมนู <span className="font-bold text-neutral-100">{cart[noteEditTarget.index]?.name}</span>
              </p>
            </div>

            {/* Quick Note Buttons */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 tracking-wider uppercase mb-1.5">
                ตัวเลือกด่วน
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['ไม่ใส่ผัก', 'เผ็ดน้อย', 'เผ็ดมาก', 'แยกซอส', 'ไม่ใส่ซอส', 'พิเศษ'].map(quickNote => {
                  const currentNotes = noteEditTarget.notes || '';
                  const isSelected = currentNotes.split(', ').includes(quickNote);

                  return (
                    <button
                      key={quickNote}
                      type="button"
                      onClick={() => {
                        let updatedNotes = '';
                        if (isSelected) {
                          updatedNotes = currentNotes
                            .split(', ')
                            .filter(n => n !== quickNote)
                            .join(', ');
                        } else {
                          updatedNotes = currentNotes ? `${currentNotes}, ${quickNote}` : quickNote;
                        }
                        setNoteEditTarget(prev => prev ? { ...prev, notes: updatedNotes } : null);
                      }}
                      className={`badge-pill px-2.5 py-1.5 text-xs font-bold ${
                        isSelected
                          ? 'badge-active'
                          : 'badge-inactive'
                      }`}
                    >
                      {quickNote}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Text Area */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 tracking-wider uppercase mb-1.5">
                รายละเอียดอื่นๆ
              </label>
              <textarea
                value={noteEditTarget.notes}
                onChange={(e) => setNoteEditTarget(prev => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="เช่น ขอวาซาบิเพิ่ม, แยกซอสฉ่ำๆ..."
                className="app-surface-inset w-full rounded-xl border border-transparent p-3 text-xs text-neutral-100 placeholder-neutral-500 h-16 resize-none focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => setNoteEditTarget(null)}
                className="app-surface-inset flex-1 rounded-xl py-2.5 text-xs font-bold text-neutral-300 transition hover:opacity-90 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCartItemNotes(noteEditTarget.index, noteEditTarget.notes);
                  setNoteEditTarget(null);
                }}
                className="flex-1 py-2.5 btn-crimson text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs"
              >
                บันทึกโน้ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="app-surface-bar fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200/80 dark:border-zinc-800 px-3 py-1.5 shadow-lg backdrop-blur-md">
        {/* SVG Gradient Definition for Bottom Nav Active Icons */}
        <svg width="0" height="0" className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <defs>
            <linearGradient id="customer-bottom-nav-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
        </svg>
        <div className="max-w-md mx-auto flex items-center justify-around">
          {[
            { id: 'home', label: 'หน้าหลัก', icon: Home },
            { id: 'order', label: 'สั่งอาหาร', icon: UtensilsCrossed, badge: cartItemCount },
            { id: 'ordered', label: 'สั่งแล้ว', icon: ClipboardList, badge: orderedItems.length },
            { id: 'promotions', label: 'โปรโมชั่น', icon: Tag },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as CustomerTab)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                  isActive
                    ? 'text-red-600 dark:text-red-400 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <div className="p-1.5 rounded-xl relative flex items-center justify-center">
                  <Icon
                    className="w-5 h-5 stroke-[2.2]"
                    stroke={isActive ? 'url(#customer-bottom-nav-icon-gradient)' : 'currentColor'}
                    style={{ stroke: isActive ? 'url(#customer-bottom-nav-icon-gradient)' : undefined }}
                  />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs mt-0.5 leading-none font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
