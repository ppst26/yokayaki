"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

export default function CustomerOrderPortal() {
  const params = useParams();
  const sessionId = params.session_id as string;

  const [activeTab, setActiveTab] = useState<CustomerTab>('home');
  const [tableId, setTableId] = useState<number | null>(null);
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

  useEffect(() => {
    if (sessionId) {
      verifySessionAndFetchData();
    }
  }, [sessionId]);

  // Realtime subscriptions for table status, qr_session status, orders status, order items, and menu changes
  useEffect(() => {
    if (!tableId) return;

    // 1. Listen to table status changes (e.g. checking_out, occupied, vacant)
    const tableChannel = supabase
      .channel(`realtime:customer_table_${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${tableId}` },
        (payload) => {
          if (payload.new && payload.new.status) {
            const newStatus = payload.new.status as 'vacant' | 'occupied' | 'checking_out';
            setTableStatus(newStatus);
            if (newStatus === 'vacant') {
              setIsCheckoutCompleted(true);
            }
          }
        }
      )
      .subscribe();

    // 2. Listen to qr_sessions status changes (e.g. expired)
    const sessionChannel = supabase
      .channel(`realtime:customer_session_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'qr_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new && payload.new.status === 'expired') {
            setIsCheckoutCompleted(true);
          }
        }
      )
      .subscribe();

    // 3. Listen to orders status changes (e.g. completed)
    const ordersChannel = supabase
      .channel(`realtime:customer_orders_${tableId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `table_id=eq.${tableId}` },
        (payload) => {
          if (payload.new && payload.new.status === 'completed') {
            setIsCheckoutCompleted(true);
          }
        }
      )
      .subscribe();

    // 4. Listen to order_items changes (e.g. kitchen marks item as served or voided)
    const orderItemsChannel = supabase
      .channel(`realtime:customer_order_items_${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchOrderedItems(tableId);
        }
      )
      .subscribe();

    // 5. Listen to menu_items changes (e.g. stock or price update)
    const menuChannel = supabase
      .channel(`realtime:customer_menu_items`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        async () => {
          const { data: menuData } = await supabase
            .from('menu_items')
            .select('*')
            .order('id', { ascending: true });
          if (menuData) setMenuItems(menuData as MenuItem[]);
        }
      )
      .subscribe();

    return () => {
      tableChannel.unsubscribe();
      sessionChannel.unsubscribe();
      ordersChannel.unsubscribe();
      orderItemsChannel.unsubscribe();
      menuChannel.unsubscribe();
    };
  }, [tableId, sessionId]);

  const verifySessionAndFetchData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      // 1. Verify session
      const { data: sessionData, error: sessionError } = await supabase
        .from('qr_sessions')
        .select('table_id, status, expired_at')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      
      if (!sessionData || sessionData.status !== 'active') {
        setSessionValid(false);
        return;
      }

      if (sessionData.expired_at && new Date(sessionData.expired_at) < new Date()) {
        setSessionValid(false);
        return;
      }

      setTableId(sessionData.table_id);
      setSessionValid(true);

      // Fetch table status
      const { data: tableData } = await supabase
        .from('tables')
        .select('status')
        .eq('id', sessionData.table_id)
        .maybeSingle();

      if (tableData) {
        const currentStatus = tableData.status as 'vacant' | 'occupied' | 'checking_out';
        // If table is already vacant on initial load, the session is stale
        // → show "QR expired" instead of "checkout completed"
        // Don't set tableStatus to 'vacant' here — the render condition
        // (isCheckoutCompleted || tableStatus === 'vacant') would show the
        // wrong screen. Keep tableStatus at default 'occupied' so the render
        // falls through to the sessionValid === false check.
        if (currentStatus === 'vacant') {
          setSessionValid(false);
          return;
        }
        setTableStatus(currentStatus);
      }

      // 2. Fetch Menu
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true });

      if (menuError) throw menuError;
      if (menuData) setMenuItems(menuData as MenuItem[]);

      // 3. Fetch Active Promotions
      fetchPromotions();

      // 4. Fetch ordered items for this table
      await fetchOrderedItems(sessionData.table_id);
    } catch (err) {
      console.error('Error loading portal:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดระบบสั่งอาหาร');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const { data } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (data) setPromotions(data as Promotion[]);
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
  };

  const fetchOrderedItems = async (tId: number) => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tId)
        .eq('status', 'active')
        .maybeSingle();

      if (orderData) {
        const { data: items } = await supabase
          .from('order_items')
          .select('id, quantity, unit_price, status, notes, menu_items(name)')
          .eq('order_id', orderData.id)
          .order('id', { ascending: true });

        if (items) setOrderedItems(items as unknown as OrderedItem[]);
      } else {
        setOrderedItems([]);
      }
    } catch (err) {
      console.error('Error fetching ordered items:', err);
    }
  };

  const addToCart = (item: MenuItem, notes?: string) => {
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
      return [...prev, { ...item, quantity: 1, notes: itemNotes }];
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

      // Check if order is still active
      const { data: activeOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .maybeSingle();

      if (!activeOrder) {
        setIsCheckoutCompleted(true);
        setShowCheckBillConfirm(false);
        return;
      }

      const { error } = await supabase
        .from('tables')
        .update({ status: 'checking_out', updated_at: new Date().toISOString() })
        .eq('id', tableId);

      if (error) throw error;
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
      const { error } = await supabase
        .from('tables')
        .update({ status: 'occupied', updated_at: new Date().toISOString() })
        .eq('id', tableId);

      if (error) throw error;
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
      let allSuccess = true;
      let failCount = 0;

      for (const item of cart) {
        const { data: success, error: rpcError } = await supabase.rpc('customer_place_order_item', {
          p_session_id: sessionId,
          p_menu_item_id: item.id,
          p_quantity: item.quantity,
          p_unit_price: item.price,
          p_notes: item.notes || null
        });

        if (rpcError || !success) {
          allSuccess = false;
          failCount++;
          console.error(`Failed to place order for item ${item.name}`, rpcError);
        }
      }

      if (allSuccess) {
        setCart([]);
        if (tableId) await fetchOrderedItems(tableId);
        setActiveTab('ordered');
        alert('ส่งรายการสั่งซื้อเข้าครัวสำเร็จ!');
      } else {
        setErrorMsg(`ออเดอร์ล้มเหลวจำนวน ${failCount} รายการ อาจเป็นเพราะสต็อกหมดหรือเซสชันหมดอายุ`);
        verifySessionAndFetchData();
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

  // Render Loader (Light Theme)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 mt-4 font-bold text-sm animate-pulse">กำลังดาวน์โหลดเมนู Yokayaki...</p>
      </div>
    );
  }

  // Render Thank You / Checkout Completed Screen (Light Theme)
  if (isCheckoutCompleted || tableStatus === 'vacant') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans animate-fade-in">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full flex flex-col items-center space-y-4 relative overflow-hidden">
          {/* Top Decorative Banner */}
          <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500" />
          
          <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1 pt-1">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black tracking-wide uppercase">
              ชำระเงินเรียบร้อยแล้ว
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">
              ขอบคุณที่ใช้บริการ!
            </h1>
            <p className="text-slate-500 text-xs font-semibold">
              Yokayaki Izakaya • โต๊ะ {tableId || ''}
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-slate-600 text-xs font-medium leading-relaxed space-y-2 text-left">
            <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-200 pb-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>ทางร้านได้รับการชำระเงินเรียบร้อยแล้ว</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
              ขอบพระคุณลูกค้าที่มาร่วมรับประทานอาหารกับ Yokayaki ครับ หวังว่าจะได้รับความไว้วางใจและมีโอกาสให้บริการท่านอีกครั้งครับ 🙏
            </p>
          </div>

          <div className="w-full pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md max-w-sm w-full flex flex-col items-center">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-600 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">QR Code หมดอายุหรือไม่ถูกต้อง</h1>
          <p className="text-slate-500 text-xs leading-relaxed mb-6">กรุณาสแกนใหม่อีกครั้ง หรือแจ้งพนักงานประจำร้านเพื่อสร้าง QR Code สั่งอาหารชุดใหม่ครับ</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = orderedItems.filter(i => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-36">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center shadow-xs">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-base leading-tight tracking-tight text-slate-900">Yokayaki</h1>
            <p className="text-slate-500 text-xs md:text-sm font-bold whitespace-nowrap mt-0.5">
              ประจำ <span className="text-red-600 font-black text-sm md:text-base">โต๊ะ {tableId}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={verifySessionAndFetchData} 
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition rounded-xl border border-slate-200 active:scale-95 cursor-pointer"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className="w-4 h-4" />
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold tracking-wide uppercase text-white mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  ยินดีต้อนรับสู่ Yokayaki
                </span>
                <h2 className="text-2xl font-black tracking-tight mb-1">สั่งอาหาร โต๊ะ {tableId}</h2>
                <p className="text-white/80 text-xs font-medium leading-relaxed">
                  เลือกเมนูที่ชอบและส่งสั่งครัวได้ทันทีจากมือถือของคุณ
                </p>

                <button
                  onClick={() => setActiveTab('order')}
                  className="mt-4 inline-flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-md hover:bg-red-50 transition active:scale-95 cursor-pointer"
                >
                  <span>เริ่มเลือกสั่งอาหาร</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <ChefHat className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
            </div>

            {/* Active Order Summary Status */}
            {orderedItems.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">รายการสั่งอาหารของคุณ</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
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
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
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
                      className="min-w-[240px] max-w-[260px] bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs shrink-0 cursor-pointer hover:border-red-200 transition"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-black">
                          {promo.type === 'percentage' ? `ลด ${promo.discount_percent}%` : promo.type === 'fixed' ? `ลด ฿${promo.discount_amount}` : 'ซื้อ 2 แถม 1'}
                        </span>
                        {promo.start_time && (
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {promo.start_time.substring(0, 5)} - {promo.end_time?.substring(0, 5)}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 truncate">{promo.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {getPromoShortDesc(promo)}
                      </p>
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition duration-150 active:scale-95 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-red-600 text-white border-red-600 shadow-xs shadow-red-600/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
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
                      className={`p-3 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all shadow-xs ${
                        isSoldOut ? 'bg-rose-50/80 border-2 border-rose-200 opacity-95' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        {item.image_url && (
                          <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
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
                            <h3 className="text-h3 text-slate-900 line-clamp-2">{item.name}</h3>
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
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1">
                          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-200 w-full justify-between">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              disabled={qty === 0}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 transition active:scale-95 cursor-pointer shadow-xs"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-price text-body font-bold text-slate-900">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              disabled={qty >= item.stock}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 transition active:scale-95 cursor-pointer shadow-xs"
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
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-red-600" />
                  <span>รายการอาหารที่สั่งแล้ว</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">ประจำ <span className="font-bold text-red-600">โต๊ะ {tableId}</span></p>
              </div>
              <button 
                onClick={() => tableId && fetchOrderedItems(tableId)} 
                className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
              >
                อัปเดตสถานะ
              </button>
            </div>

            {orderedItems.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <UtensilsCrossed className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">ยังไม่มีรายการสั่งอาหาร</h3>
                <p className="text-slate-400 text-xs">คุณยังไม่ได้ส่งสั่งอาหารเข้าครัวสำหรับโต๊ะนี้</p>
                <button
                  onClick={() => setActiveTab('order')}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-xs transition"
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
                          ? 'bg-rose-50/60 border-rose-200 text-slate-400 line-through' 
                          : isServed 
                          ? 'bg-emerald-50/40 border-emerald-200 text-slate-800' 
                          : 'bg-amber-50/50 border-amber-200 text-slate-900'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{item.menu_items?.name}</span>
                          <span className="font-extrabold text-slate-500">x{item.quantity}</span>
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

                      <span className="font-black text-sm text-slate-900">
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
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex justify-between items-center">
                        <div>
                          <span className="text-slate-500 text-xs font-bold block">ยอดรวมทั้งสิ้น</span>
                          <span className="text-slate-400 text-[11px] font-semibold">{totalQty} รายการ (ไม่รวมรายการที่ยกเลิก)</span>
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
                            <p className="text-slate-500 text-xs font-semibold">
                              พนักงานกำลังจัดเตรียมใบเสร็จและเดินทางมาที่ <span className="font-extrabold text-rose-600">โต๊ะ {tableId}</span>
                            </p>
                            <button
                              onClick={handleCancelCheckBill}
                              disabled={isUpdatingStatus}
                              className="px-4 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                            >
                              ยกเลิกการเรียกเช็คบิล
                            </button>
                          </div>
                        ) : pendingCount > 0 ? (
                          <button
                            disabled
                            className="w-full py-3.5 bg-slate-200 text-slate-500 font-extrabold text-xs sm:text-sm rounded-2xl border border-slate-300 flex items-center justify-center gap-2 cursor-not-allowed shadow-none"
                          >
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>กรุณารออาหารเสริฟครบ ก่อนเรียกเช็คบิล</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowCheckBillConfirm(true)}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <BellRing className="w-5 h-5 animate-bounce" />
                            <span>เรียกเช็คบิล / ชำระเงิน</span>
                          </button>
                        )}
                      </div>

                      {/* Check Bill Confirmation Modal */}
                      {showCheckBillConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
                          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
                            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
                              <BellRing className="w-7 h-7" />
                            </div>
                            <div>
                              <h3 className="text-base font-black text-slate-900">เรียกพนักงานเช็คบิล?</h3>
                              <p className="text-slate-500 text-xs mt-1">
                                โต๊ะ {tableId} • ยอดรวมทั้งสิ้น <span className="font-extrabold text-red-600">฿{totalAmt.toLocaleString()} บาท</span>
                              </p>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => setShowCheckBillConfirm(false)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                              >
                                ยังก่อน
                              </button>
                              <button
                                onClick={handleRequestCheckBill}
                                disabled={isUpdatingStatus}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs"
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
            <div className="pb-2 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-red-600" />
                <span>โปรโมชั่นพิเศษ</span>
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">ส่วนลดและข้อเสนอสุดคุ้มจากร้าน Yokayaki</p>
            </div>

            {promotions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                <Tag className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">ยังไม่มีโปรโมชั่นใหม่ขณะนี้</h3>
                <p className="text-slate-400 text-xs">ติดตามส่วนลดและข้อเสนอพิเศษได้ที่นี่เร็วๆ นี้</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {promotions.map(promo => (
                  <div key={promo.id} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-black">
                          {promo.type === 'percentage' ? `ส่วนลด ${promo.discount_percent}%` : promo.type === 'fixed' ? `ส่วนลด ฿${promo.discount_amount}` : 'ซื้อ 2 แถม 1'}
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">{promo.name}</h3>
                      </div>

                      {promo.start_time && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {promo.start_time.substring(0, 5)} - {promo.end_time?.substring(0, 5)} น.
                        </span>
                      )}
                    </div>

                    {promo.image_url && (
                      <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img 
                          src={promo.image_url} 
                          alt={promo.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                    )}

                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl leading-relaxed">
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
            className="w-full bg-red-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between hover:bg-red-700 active:scale-98 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-white/20 p-2 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-red-600 text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-xs">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end animate-fade-in" onClick={() => setShowCartDrawer(false)}>
          <div className="bg-white border-t border-slate-200 w-full max-h-[80vh] rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 max-w-md mx-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900">
                <ShoppingBag className="w-5 h-5 text-red-600" />
                <span>ตะกร้าของคุณ ({cartItemCount} ชิ้น)</span>
              </h3>
              <button onClick={() => setShowCartDrawer(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {cart.map((item, index) => (
                <div key={`${item.id}-${item.notes || ''}-${index}`} className="flex flex-col bg-slate-50 border border-slate-200 p-3.5 rounded-2xl gap-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                      <p className="text-xs text-red-600 font-extrabold mt-0.5">฿{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                      <button
                        onClick={() => removeFromCart(item.id, item.notes)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold text-xs w-4 text-center text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item, item.notes)}
                        disabled={cart.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0) >= item.stock}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-600 text-white disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Notes management */}
                  <div className="flex justify-between items-center border-t border-slate-200/80 pt-2 text-[11px]">
                    {item.notes ? (
                      <span className="text-red-600 font-bold">โน้ต: {item.notes}</span>
                    ) : (
                      <span className="text-slate-400">ไม่มีโน้ตพิเศษ</span>
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
            
            <div className="pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-500 font-bold text-xs">ยอดรวมทั้งสิ้น:</span>
                <span className="text-xl font-black text-red-600">฿{cartTotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setShowCartDrawer(false);
                  confirmOrder();
                }}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-extrabold text-sm rounded-2xl transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
              >
                {isSubmitting ? 'กำลังส่งคำสั่งซื้อ...' : 'ยืนยันสั่งอาหารส่งเข้าครัว'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Edit Modal (Light Theme) */}
      {noteEditTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl relative space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-red-600" />
                <span>ระบุโน้ตพิเศษ</span>
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                สำหรับเมนู <span className="font-bold text-slate-900">{cart[noteEditTarget.index]?.name}</span>
              </p>
            </div>

            {/* Quick Note Buttons */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
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
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                รายละเอียดอื่นๆ
              </label>
              <textarea
                value={noteEditTarget.notes}
                onChange={(e) => setNoteEditTarget(prev => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="เช่น ขอวาซาบิเพิ่ม, แยกซอสฉ่ำๆ..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 h-16 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setNoteEditTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCartItemNotes(noteEditTarget.index, noteEditTarget.notes);
                  setNoteEditTarget(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs"
              >
                บันทึกโน้ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-2 shadow-lg">
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
                onClick={() => setActiveTab(tab.id as CustomerTab)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
                  isActive ? 'text-red-600 font-bold' : 'text-slate-400 font-medium hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                  {tab.badge ? tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[9px] font-black px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  ) : null : null}
                </div>
                <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
