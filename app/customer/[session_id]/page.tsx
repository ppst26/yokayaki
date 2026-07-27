"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Plus, Minus, ChefHat, AlertCircle, RefreshCw, ClipboardList, X } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [noteEditTarget, setNoteEditTarget] = useState<{ index: number; notes: string } | null>(null);

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
        .select('*')
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
          .select('id, quantity, unit_price, status, notes, menu_items(name)')
          .eq('order_id', orderData.id)
          .order('id', { ascending: true });

        if (items) setOrderedItems(items as unknown as OrderedItem[]);
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

      {/* Category Navigation (Horizontal Scroll) */}
      <div className="sticky top-[73px] z-30 bg-stone-950/95 backdrop-blur-md border-b border-stone-900 px-4 py-3 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {['ทั้งหมด', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition duration-150 active:scale-95 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/10'
                : 'bg-stone-900/40 hover:bg-stone-900/80 border-stone-850 hover:border-stone-800 text-stone-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="m-4 p-3 bg-red-950 border border-red-900 rounded-xl text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Menu List */}
      <main className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {menuItems
          .filter(item => selectedCategory === 'ทั้งหมด' || item.category === selectedCategory)
          .map(item => {
            const qty = getCartQuantity(item.id);
            const isSoldOut = item.stock <= 0;
            const isLowStock = item.stock > 0 && item.stock <= 3;

            return (
              <div key={item.id} className={`p-3 rounded-2xl border flex flex-col justify-between gap-2.5 transition-colors ${isSoldOut ? 'bg-stone-900/40 border-stone-800 opacity-60' : 'bg-stone-900 border-stone-800'}`}>
                <div className="flex flex-col gap-2">
                  {/* Thumbnail / Image */}
                  {item.image_url && (
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-stone-800 border border-stone-800 relative">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                      {isSoldOut ? (
                        <span className="absolute top-2 right-2 text-[9px] font-black tracking-wider bg-red-950/90 text-red-400 backdrop-blur-xs px-2 py-0.5 rounded">SOLD OUT</span>
                      ) : isLowStock ? (
                        <span className="absolute top-2 right-2 text-[9px] font-bold tracking-wider bg-orange-950/90 text-orange-400 backdrop-blur-xs px-2 py-0.5 rounded whitespace-nowrap">เหลือ {item.stock} จาน</span>
                      ) : null}
                    </div>
                  )}
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-bold text-xs sm:text-sm text-stone-200 line-clamp-2 leading-snug">{item.name}</h3>
                      {!item.image_url && (
                        isSoldOut ? (
                          <span className="text-[9px] font-black tracking-wider bg-red-950 text-red-400 px-1.5 py-0.5 rounded shrink-0">SOLD OUT</span>
                        ) : isLowStock ? (
                          <span className="text-[9px] font-bold tracking-wider bg-orange-950 text-orange-400 px-1.5 py-0.5 rounded shrink-0">เหลือ {item.stock}</span>
                        ) : null
                      )}
                    </div>
                    <p className="text-amber-500 font-extrabold text-xs sm:text-sm mt-0.5">{item.price} บาท</p>
                  </div>
                </div>

                {!isSoldOut && (
                  <div className="flex items-center justify-between border-t border-stone-800/50 pt-2 mt-1">
                    <div className="flex items-center gap-2 bg-stone-950 rounded-full p-1 border border-stone-800 w-full justify-between">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        disabled={qty === 0}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 transition shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-xs text-center">{qty}</span>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={qty >= item.stock}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 transition shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{item.menu_items?.name}</span>
                      <span className="text-stone-500">x{item.quantity}</span>
                      {item.status === 'voided' && <span className="text-red-500 text-xs font-bold">(ยกเลิก)</span>}
                    </div>
                    {item.notes && (
                      <div className="text-[10px] text-amber-500/80 font-bold mt-0.5">
                        โน้ต: {item.notes}
                      </div>
                    )}
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

      {/* Bottom Cart Drawer */}
      {showCartDrawer && cart.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end animate-fade-in" onClick={() => setShowCartDrawer(false)}>
          <div className="bg-stone-900 border-t border-stone-800 w-full max-h-[70vh] rounded-t-3xl p-6 shadow-2xl flex flex-col gap-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-stone-850">
              <h3 className="font-extrabold text-lg flex items-center gap-2 text-white">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <span>ตะกร้าของคุณ ({cartItemCount} ชิ้น)</span>
              </h3>
              <button onClick={() => setShowCartDrawer(false)} className="p-1 bg-stone-950 hover:bg-stone-800 rounded-full text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
              {cart.map((item, index) => (
                <div key={`${item.id}-${item.notes || ''}-${index}`} className="flex flex-col bg-stone-950/40 border border-stone-850 p-4 rounded-2xl gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-stone-200">{item.name}</h4>
                      <p className="text-xs text-amber-500 font-bold mt-1">{item.price * item.quantity} บาท</p>
                    </div>
                    <div className="flex items-center gap-3 bg-stone-950 border border-stone-850 rounded-full p-1">
                      <button
                        onClick={() => removeFromCart(item.id, item.notes)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-900 text-stone-400"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm w-4 text-center text-stone-200">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item, item.notes)}
                        disabled={cart.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0) >= item.stock}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500 text-black disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Notes management */}
                  <div className="flex justify-between items-center border-t border-stone-850/60 pt-2.5 text-xs">
                    {item.notes ? (
                      <span className="text-amber-500/80 font-bold">โน้ต: {item.notes}</span>
                    ) : (
                      <span className="text-stone-500">ไม่มีโน้ตพิเศษ</span>
                    )}
                    <button
                      onClick={() => setNoteEditTarget({ index, notes: item.notes || '' })}
                      className="text-amber-500/90 font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl active:scale-95 transition"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>{item.notes ? 'แก้ไขโน้ต' : '+ เพิ่มโน้ต'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Drawer Total & Confirm button wrapper */}
            <div className="pt-2 border-t border-stone-850/60">
              <div className="flex justify-between items-center mb-4">
                <span className="text-stone-400 font-bold text-sm">ยอดรวมทั้งหมด:</span>
                <span className="text-xl font-black text-amber-500">{cartTotal} บาท</span>
              </div>
              <button
                onClick={() => {
                  setShowCartDrawer(false);
                  confirmOrder();
                }}
                disabled={isSubmitting}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-850 disabled:text-stone-500 text-black font-extrabold text-sm rounded-2xl transition active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15"
              >
                {isSubmitting ? 'กำลังส่งคำสั่งซื้อ...' : 'ยืนยันส่งครัว'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Bar */}
      {cart.length > 0 && !showCartDrawer && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-stone-950 via-stone-950 to-transparent">
          <div 
            onClick={() => setShowCartDrawer(true)}
            className="bg-amber-500 text-black p-4 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
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
              onClick={(e) => {
                e.stopPropagation();
                setShowCartDrawer(true);
              }}
              className="bg-black text-amber-500 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-900 active:scale-95 transition"
            >
              ดูตะกร้าสินค้า
            </button>
          </div>
        </div>
      )}

      {/* NOTE EDIT MODAL (Customer mobile) */}
      {noteEditTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-2xl relative">
            <h3 className="text-base font-black text-amber-500 flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4" />
              <span>ระบุโน้ตพิเศษ</span>
            </h3>
            <p className="text-stone-400 text-xs mb-4">
              ระบุข้อกำหนดพิเศษสำหรับเมนู <span className="font-bold text-white">{cart[noteEditTarget.index]?.name}</span>
            </p>

            <div className="space-y-4">
              {/* Quick Note Buttons */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-2">
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
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-stone-950 border-stone-850 text-stone-400 hover:border-stone-750'
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
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-2">
                  ระบุรายละเอียดอื่นๆ
                </label>
                <textarea
                  value={noteEditTarget.notes}
                  onChange={(e) => setNoteEditTarget(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="เช่น หวานน้อย, ขอวาซาบิเยอะๆ..."
                  className="w-full bg-stone-950 border border-stone-850 focus:border-stone-750 focus:outline-none rounded-xl p-3 text-xs text-stone-200 placeholder-stone-600 h-16 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-stone-850">
                <button
                  type="button"
                  onClick={() => setNoteEditTarget(null)}
                  className="flex-1 py-2.5 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-lg text-stone-400 text-xs font-bold active:scale-97 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCartItemNotes(noteEditTarget.index, noteEditTarget.notes);
                    setNoteEditTarget(null);
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold rounded-lg active:scale-97 transition"
                >
                  บันทึกโน้ต
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
