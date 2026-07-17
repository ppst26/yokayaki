"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Plus, Minus, ChefHat, AlertCircle, RefreshCw, ClipboardList } from 'lucide-react';

interface OrderedItem {
  id: number;
  quantity: number;
  unit_price: number;
  status: string;
  menu_items: { name: string };
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function CustomerOrderPortal() {
  const params = useParams();
  const sessionId = params.session_id as string;

  const [tableId, setTableId] = useState<number | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifySessionAndFetchMenu();
    }
  }, [sessionId]);

  const verifySessionAndFetchMenu = async () => {
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
      
      if (!sessionData) {
        setSessionValid(false);
        return;
      }

      if (sessionData.status !== 'active') {
        setSessionValid(false);
        return;
      }

      if (sessionData.expired_at && new Date(sessionData.expired_at) < new Date()) {
        setSessionValid(false);
        return;
      }

      setTableId(sessionData.table_id);
      setSessionValid(true);

      // 2. Fetch Menu
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, price, stock')
        .order('id', { ascending: true });

      if (menuError) throw menuError;
      if (menuData) setMenuItems(menuData as MenuItem[]);

      // 3. Fetch ordered items for this table
      await fetchOrderedItems(sessionData.table_id);
    } catch (err) {
      console.error('Error loading portal:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดระบบสั่งอาหาร');
    } finally {
      setIsLoading(false);
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
          .select('id, quantity, unit_price, status, menu_items(name)')
          .eq('order_id', orderData.id)
          .order('id', { ascending: true });

        if (items) setOrderedItems(items as unknown as OrderedItem[]);
      }
    } catch (err) {
      console.error('Error fetching ordered items:', err);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock) return prev;
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (item.stock === 0) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getCartQuantity = (itemId: number) => {
    return cart.find(i => i.id === itemId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
          p_unit_price: item.price
        });

        if (rpcError || !success) {
          allSuccess = false;
          failCount++;
          console.error(`Failed to place order for item ${item.name}`, rpcError);
        }
      }

      if (allSuccess) {
        setCart([]);
        await verifySessionAndFetchMenu();
        alert('ส่งรายการสั่งซื้อเข้าครัวสำเร็จ!');
      } else {
        setErrorMsg(`ออเดอร์ล้มเหลวจำนวน ${failCount} รายการ อาจเป็นเพราะสต็อกหมดหรือเซสชันหมดอายุ`);
        await verifySessionAndFetchMenu();
      }
    } catch (err: any) {
      console.error('Error confirming order:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการทำรายการออเดอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-amber-500 mt-4 font-semibold animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  // Render Invalid Session
  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">QR Code หมดอายุหรือไม่ถูกต้อง</h1>
        <p className="text-stone-400 mb-6">กรุณาแจ้งพนักงานเพื่อสร้าง QR Code สำหรับสั่งอาหารใหม่ครับ</p>
      </div>
    );
  }

  // Render Valid Portal
  return (
    <div className="min-h-screen bg-stone-950 text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-md border-b border-stone-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-tight">Yokayaki</h1>
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase">โต๊ะ {tableId}</p>
          </div>
        </div>
        <button onClick={verifySessionAndFetchMenu} className="p-2 text-stone-400 hover:text-white transition bg-stone-900 rounded-full">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Error Message */}
      {errorMsg && (
        <div className="m-4 p-3 bg-red-950 border border-red-900 rounded-xl text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Menu List */}
      <main className="p-4 space-y-4">
        {menuItems.map(item => {
          const qty = getCartQuantity(item.id);
          const isSoldOut = item.stock <= 0;
          const isLowStock = item.stock > 0 && item.stock <= 3;

          return (
            <div key={item.id} className={`p-4 rounded-2xl border flex flex-col gap-3 transition-colors ${isSoldOut ? 'bg-stone-900/40 border-stone-800 opacity-60' : 'bg-stone-900 border-stone-800'}`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-stone-200">{item.name}</h3>
                  <p className="text-amber-500 font-semibold text-sm mt-1">{item.price} บาท</p>
                </div>
                {isSoldOut ? (
                  <span className="text-[10px] font-black tracking-wider bg-red-950 text-red-500 px-2 py-1 rounded">SOLD OUT</span>
                ) : isLowStock ? (
                  <span className="text-[10px] font-bold tracking-wider bg-orange-950 text-orange-500 px-2 py-1 rounded whitespace-nowrap">เหลือ {item.stock} จาน</span>
                ) : null}
              </div>

              {!isSoldOut && (
                <div className="flex items-center justify-between border-t border-stone-800/50 pt-3 mt-1">
                  <span className="text-xs text-stone-500">เลือกจำนวน</span>
                  <div className="flex items-center gap-4 bg-stone-950 rounded-full p-1 border border-stone-800">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      disabled={qty === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold w-4 text-center">{qty}</span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={qty >= item.stock}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* Ordered Items History */}
      {orderedItems.length > 0 && (() => {
        const activeItems = orderedItems.filter(i => i.status !== 'voided');
        const totalQty = activeItems.reduce((s, i) => s + i.quantity, 0);
        const totalAmt = activeItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
        return (
          <section className="p-4 pb-8">
            <h2 className="text-base font-bold text-stone-300 flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              รายการที่สั่งไปแล้ว
            </h2>
            <div className="space-y-2">
              {orderedItems.map(item => (
                <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border text-sm ${
                  item.status === 'voided'
                    ? 'bg-red-950/20 border-red-900/30 text-red-500/60 line-through opacity-60'
                    : 'bg-stone-900/50 border-stone-800 text-stone-300'
                }`}>
                  <div>
                    <span className="font-semibold">{item.menu_items?.name}</span>
                    <span className="text-stone-500 ml-2">x{item.quantity}</span>
                    {item.status === 'voided' && <span className="text-red-500 text-xs ml-2">(ยกเลิก)</span>}
                  </div>
                  <span className="font-bold text-amber-500/80">{item.quantity * item.unit_price} ฿</span>
                </div>
              ))}
            </div>
            {totalQty > 0 && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between items-center">
                <span className="text-amber-400 text-sm font-semibold">รวมทั้งหมด ({totalQty} ชิ้น)</span>
                <span className="text-amber-500 font-extrabold">{totalAmt.toLocaleString()} บาท</span>
              </div>
            )}
          </section>
        );
      })()}

      {/* Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-stone-950 via-stone-950 to-transparent">
          <div className="bg-amber-500 text-black p-4 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-amber-500">
                  {cartItemCount}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold opacity-80">ยอดรวม</span>
                <span className="font-black leading-none">{cartTotal} บาท</span>
              </div>
            </div>
            
            <button
              onClick={confirmOrder}
              disabled={isSubmitting}
              className="bg-black text-amber-500 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-900 active:scale-95 transition"
            >
              {isSubmitting ? 'กำลังส่ง...' : 'สั่งอาหาร'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
