"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Minus, Trash2, ShieldAlert, ShoppingBag, History, HelpCircle, QrCode, X, ClipboardList } from 'lucide-react';
import QRCode from 'react-qr-code';
interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface OrderedItem {
  id: number;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'served' | 'voided';
  notes?: string;
  menu_items: {
    name: string;
  };
}

interface POSOrderScreenProps {
  tableId: number;
  onBack: () => void;
}

export const POSOrderScreen: React.FC<POSOrderScreenProps> = ({ tableId, onBack }) => {
  const { employee } = useAuth();
  
  // Data States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  
  // UI States
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [noteEditTarget, setNoteEditTarget] = useState<{ index: number; notes: string } | null>(null);
  
  // Void Modal States
  const [voidTarget, setVoidTarget] = useState<OrderedItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isVoiding, setIsVoiding] = useState(false);

  // QR Modal States
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Generate QR Session
  const generateQrSession = async () => {
    try {
      setIsGeneratingQr(true);
      setErrorMsg(null);
      // Expire in 2 hours
      const expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() + 2);

      const { data, error } = await supabase
        .from('qr_sessions')
        .insert({
          table_id: tableId,
          status: 'active',
          expired_at: expiredAt.toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data) {
        setQrSessionId(data.id);
        setShowQrModal(true);
      }
    } catch (err: any) {
      console.error('Error generating QR:', err);
      setErrorMsg('ไม่สามารถสร้าง QR Code ได้');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Fetch Menu Items
  const fetchMenu = async () => {
    try {
      setIsLoadingMenu(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, stock, category')
        .order('id', { ascending: true });
        
      if (error) throw error;
      if (data) setMenuItems(data as MenuItem[]);
    } catch (err: any) {
      console.error('Error fetching menu:', err);
      setErrorMsg('ไม่สามารถดึงข้อมูลรายการอาหารได้');
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // Fetch Active Order and its Items for this table
  const fetchActiveOrder = async () => {
    try {
      setIsLoadingOrder(true);
      // Query active order for the table
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .maybeSingle();

      if (orderError) throw orderError;

      if (orderData) {
        setActiveOrderId(orderData.id);
        
        // Fetch order items with their menu names
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            unit_price,
            status,
            notes,
            menu_items (
              name
            )
          `)
          .eq('order_id', orderData.id)
          .order('id', { ascending: true });

        if (itemsError) throw itemsError;
        if (itemsData) {
          // Type casting because of nested select format
          setOrderedItems(itemsData as unknown as OrderedItem[]);
        }
      } else {
        setActiveOrderId(null);
        setOrderedItems([]);
      }
    } catch (err: any) {
      console.error('Error fetching active order:', err);
      setErrorMsg('ไม่สามารถดึงประวัติการสั่งซื้อได้');
    } finally {
      setIsLoadingOrder(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchActiveOrder();

    // Subscribe to menu changes for realtime stock sync
    const menuChannel = supabase
      .channel('realtime:menu_items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          fetchMenu();
        }
      )
      .subscribe();

    // Subscribe to order items updates for live order changes
    const orderItemsChannel = supabase
      .channel('realtime:order_items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchActiveOrder();
        }
      )
      .subscribe();

    return () => {
      menuChannel.unsubscribe();
      orderItemsChannel.unsubscribe();
    };
  }, [tableId]);

  // Cart operations
  const addToCart = (item: MenuItem, notes?: string) => {
    if (item.stock === 0) return;
    
    setCart(prev => {
      const itemNotes = notes || '';
      const existing = prev.find(i => i.id === item.id && (i.notes || '') === itemNotes);
      const totalQtyInCart = prev.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0);

      if (existing) {
        if (totalQtyInCart >= item.stock) {
          setErrorMsg(`ไม่สามารถสั่งได้มากกว่าสต็อกคงเหลือ (${item.stock} จาน)`);
          setTimeout(() => setErrorMsg(null), 3000);
          return prev;
        }
        return prev.map(i => (i.id === item.id && (i.notes || '') === itemNotes) ? { ...i, quantity: i.quantity + 1 } : i);
      }

      if (totalQtyInCart >= item.stock) {
        setErrorMsg(`ไม่สามารถสั่งได้มากกว่าสต็อกคงเหลือ (${item.stock} จาน)`);
        setTimeout(() => setErrorMsg(null), 3000);
        return prev;
      }
      return [...prev, { ...item, quantity: 1, notes: itemNotes }];
    });
  };

  const removeFromCart = (id: number, notes?: string) => {
    const itemNotes = notes || '';
    setCart(prev => prev.map(i => (i.id === id && (i.notes || '') === itemNotes) ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
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

  const clearCart = () => setCart([]);

  // Confirm and Send Order (Direct Fire)
  const confirmOrder = async () => {
    if (cart.length === 0) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      
      let allSuccess = true;
      let failCount = 0;

      // Call database RPC place_order_item for each item in the cart
      for (const item of cart) {
        const { data: success, error: rpcError } = await supabase.rpc('place_order_item', {
          p_table_id: tableId,
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
        await fetchActiveOrder();
        await fetchMenu();
        alert('ส่งรายการสั่งซื้อสำเร็จ!');
      } else {
        setErrorMsg(`ออเดอร์ล้มเหลวจำนวน ${failCount} รายการเนื่องจากสต็อกหมดหรือเกิดข้อผิดพลาด`);
        await fetchActiveOrder();
        await fetchMenu();
      }
    } catch (err: any) {
      console.error('Error confirming order:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการทำรายการออเดอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void Handler (RPC)
  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;

    const finalReason = voidReason === 'อื่นๆ' ? customReason : voidReason;
    if (!finalReason.trim()) {
      alert('กรุณาระบุหรือเลือกสาเหตุการยกเลิก');
      return;
    }

    try {
      setIsVoiding(true);
      setErrorMsg(null);

      // Call void_order_item database function
      const { data: success, error: voidError } = await supabase.rpc('void_order_item', {
        p_order_item_id: voidTarget.id,
        p_employee_name: employee?.name || 'Unknown Staff',
        p_reason: finalReason
      });

      if (voidError) throw voidError;

      if (success) {
        setVoidTarget(null);
        setVoidReason('');
        setCustomReason('');
        await fetchActiveOrder();
        await fetchMenu();
      } else {
        setErrorMsg('ไม่สามารถดำเนินการยกเลิกรายการอาหารได้');
      }
    } catch (err: any) {
      console.error('Error voiding item:', err);
      setErrorMsg('เกิดข้อผิดพลาดระหว่างส่งการยกเลิกไปฐานข้อมูล');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-stone-900 via-neutral-950 to-black text-white flex flex-col lg:flex-row relative selection:bg-amber-500/30">
      
      {/* LEFT AREA: Menu Selection */}
      <div className="flex-1 p-6 lg:border-r border-stone-850 flex flex-col overflow-y-auto">
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-3 bg-stone-900/80 border border-stone-800 rounded-2xl hover:bg-stone-800 transition active:scale-95 text-stone-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">สั่งอาหาร</h1>
            <p className="text-sm text-stone-400 font-semibold mt-0.5">โต๊ะ {tableId}</p>
          </div>
          <button
            onClick={generateQrSession}
            disabled={isGeneratingQr}
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/30 transition-colors font-semibold text-sm whitespace-nowrap"
          >
            <QrCode className="w-4 h-4" />
            <span>{isGeneratingQr ? 'กำลังสร้าง...' : 'สร้าง QR ลูกค้า'}</span>
          </button>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 text-red-400 rounded-2xl text-sm font-semibold flex items-center gap-3 animate-fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Category Selection Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
          {['ทั้งหมด', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap border transition duration-150 active:scale-95 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-stone-900/40 hover:bg-stone-900/80 border-stone-800/80 hover:border-stone-700 text-stone-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div>
          <h2 className="text-base font-bold text-stone-400 tracking-wider mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <span>รายการอาหารและเครื่องดื่ม (MENU)</span>
          </h2>
          
          {isLoadingMenu ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-stone-900/40 border border-stone-800/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems
                .filter(item => selectedCategory === 'ทั้งหมด' || item.category === selectedCategory)
                .map(item => {
                  const isSoldOut = item.stock === 0;
                  const isUrgent = item.stock > 0 && item.stock <= 3;
                  const cartQty = cart.find(c => c.id === item.id)?.quantity || 0;
                  const remainingAvailable = item.stock - cartQty;

                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                        isSoldOut
                          ? 'bg-stone-950/80 border-stone-900 opacity-55'
                          : 'bg-stone-900/40 hover:bg-stone-900/80 border-stone-800/80 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-10">
                        <div className="pr-4">
                          <h3 className="font-bold text-lg text-stone-100 group-hover:text-white transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-amber-500 font-extrabold text-base mt-1">
                            {item.price} <span className="text-xs font-semibold text-stone-400">บาท</span>
                          </p>
                        </div>

                        {/* Stock Badges */}
                        <div>
                          {isSoldOut ? (
                            <span className="text-[10px] font-black tracking-widest px-2.5 py-1 bg-red-950/40 border border-red-900/50 text-red-500 rounded-lg uppercase">
                              SOLD OUT
                            </span>
                          ) : isUrgent ? (
                            <span className="text-[10px] font-black px-2.5 py-1 bg-orange-950/40 border border-orange-900/50 text-orange-500 rounded-lg animate-pulse whitespace-nowrap">
                              ด่วน! เหลือ {item.stock} จาน
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-950/80 border border-stone-850 text-stone-400 rounded-md">
                              สต็อก: {item.stock}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        {/* Cart qty indicator inside card */}
                        <div>
                          {cartQty > 0 && (
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                              เลือกแล้ว {cartQty}
                            </span>
                          )}
                        </div>

                        <button
                          disabled={isSoldOut || remainingAvailable <= 0}
                          onClick={() => addToCart(item)}
                          className={`p-2.5 rounded-xl transition duration-150 active:scale-95 flex items-center justify-center ${
                            isSoldOut || remainingAvailable <= 0
                              ? 'bg-stone-900 border border-stone-850 text-stone-600 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/10'
                          }`}
                        >
                          <Plus className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: Cart & Current Order Status */}
      <div className="w-full lg:w-[420px] bg-stone-950 border-t lg:border-t-0 lg:border-l border-stone-850 p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Section 1: Cart Items */}
          <div className="mb-8 border-b border-stone-900 pb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-stone-200 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <span>ตะกร้าสินค้า (Cart)</span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-stone-500 hover:text-red-400 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ล้างตะกร้า
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-stone-500 text-sm text-center py-10 font-medium">ยังไม่มีรายการอาหารในตะกร้า</p>
            ) : (
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
                {cart.map((item, index) => (
                  <div key={`${item.id}-${item.notes || ''}-${index}`} className="flex flex-col bg-stone-900/30 border border-stone-900 p-3.5 rounded-xl gap-2">
                    <div className="flex justify-between items-center">
                      <div className="pr-4 flex-1">
                        <h4 className="font-bold text-sm text-stone-200 line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-amber-500/90 font-bold mt-0.5">{item.price * item.quantity} บาท</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeFromCart(item.id, item.notes)}
                          className="p-1.5 bg-stone-900 border border-stone-800 hover:bg-stone-800 rounded-lg text-stone-400"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <span className="text-sm font-bold text-stone-200">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item, item.notes)}
                          className="p-1.5 bg-stone-900 border border-stone-800 hover:bg-stone-800 rounded-lg text-stone-400"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                    {/* Notes line */}
                    <div className="flex items-center justify-between border-t border-stone-900/40 pt-2 text-xs">
                      {item.notes ? (
                        <span className="text-amber-400/80 font-medium">โน้ต: {item.notes}</span>
                      ) : (
                        <span className="text-stone-500 font-medium">ไม่มีโน้ตพิเศษ</span>
                      )}
                      <button
                        onClick={() => setNoteEditTarget({ index, notes: item.notes || '' })}
                        className="text-stone-400 hover:text-amber-400 font-bold flex items-center gap-1 transition"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>แก้ไขโน้ต</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-6 pt-4 border-t border-stone-900">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-stone-400 font-bold">ยอดรวมตะกร้า:</span>
                  <span className="text-xl font-extrabold text-amber-500">
                    {cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)} บาท
                  </span>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={confirmOrder}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-stone-900 disabled:to-stone-900 text-black font-extrabold text-sm rounded-2xl transition duration-150 active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>กำลังยิงคำสั่งเข้าครัว...</span>
                    </>
                  ) : (
                    <span>สั่งอาหารเข้าระบบ (Direct Fire)</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Currently Ordered Items (Void Manager) */}
          <div>
            <h2 className="text-lg font-bold text-stone-200 mb-2 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              <span>อาหารที่ส่งครัวไปแล้ว (Active Order)</span>
            </h2>

            {/* Summary bar */}
            {(() => {
              const activeItems = orderedItems.filter(i => i.status !== 'voided');
              const totalQty = activeItems.reduce((s, i) => s + i.quantity, 0);
              const totalAmt = activeItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
              if (totalQty === 0) return null;
              return (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-sm">
                  <span className="text-amber-400 font-semibold">สั่งไปแล้วทั้งหมด: <span className="text-white font-bold">{totalQty} ชิ้น</span></span>
                  <span className="text-amber-500 font-extrabold">{totalAmt.toLocaleString()} บาท</span>
                </div>
              );
            })()}

            {isLoadingOrder ? (
              <div className="space-y-2">
                <div className="h-10 bg-stone-900/30 border border-stone-800/40 rounded-xl animate-pulse" />
                <div className="h-10 bg-stone-900/30 border border-stone-800/40 rounded-xl animate-pulse" />
              </div>
            ) : orderedItems.length === 0 ? (
              <p className="text-stone-500 text-sm text-center py-10 font-medium">ยังไม่มีรายการสั่งซื้อก่อนหน้านี้</p>
            ) : (
              <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-2">
                {orderedItems.map(item => {
                  const isVoided = item.status === 'voided';
                  return (
                    <div
                      key={item.id}
                      className={`flex justify-between items-center p-3 rounded-xl border ${
                        isVoided
                          ? 'bg-red-950/15 border-red-900/30 text-red-500/70 line-through opacity-70'
                          : 'bg-stone-900/20 border-stone-900 text-stone-200'
                      }`}
                    >
                      <div className="pr-4 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-300">
                            {item.menu_items?.name}
                          </span>
                          <span className="text-xs font-semibold text-stone-500 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-850">
                            x{item.quantity}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="text-xs text-amber-500/80 font-semibold mt-0.5">
                            โน้ต: {item.notes}
                          </div>
                        )}
                        <span className="text-[10px] text-stone-500 mt-1 block">
                          ราคาหน่วยละ {item.unit_price} บาท {isVoided && '(ยกเลิกแล้ว)'}
                        </span>
                      </div>
                      
                      {!isVoided && (
                        <button
                          onClick={() => setVoidTarget(item)}
                          className="px-2.5 py-1.5 bg-stone-900 hover:bg-red-950/40 border border-stone-800 hover:border-red-900/30 text-stone-400 hover:text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Void</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VOID DIALOG MODAL (Glassmorphic) */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-red-400 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-400 stroke-[2.5]" />
              <span>ยืนยันการยกเลิกรายการอาหาร (Void)</span>
            </h3>
            <p className="text-stone-400 text-sm mb-6 leading-relaxed">
              คุณกำลังจะยกเลิกรายการ <span className="font-bold text-white">{voidTarget.menu_items?.name}</span> จำนวน <span className="font-bold text-white">{voidTarget.quantity} จาน</span> {voidTarget.notes && <>โน้ต: <span className="text-amber-400 font-semibold">"{voidTarget.notes}"</span></>} (มูลค่าความเสียหาย {voidTarget.quantity * voidTarget.unit_price} บาท)
            </p>

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 tracking-wider uppercase mb-2">
                  ระบุสาเหตุความล่าช้า/ยกเลิก
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'พนักงานคีย์ผิดพลาด (คืนสต็อก)', val: 'คีย์ผิดพลาด' },
                    { label: 'อาหารตกหล่นชำรุด (ตัดสูญเสีย/ไม่คืนสต็อก)', val: 'อาหารชำรุด' },
                    { label: 'ลูกค้าขอยกเลิก (ตัดสูญเสีย/ไม่คืนสต็อก)', val: 'ลูกค้าขอยกเลิก' },
                    { label: 'ระบุสาเหตุอื่น ๆ...', val: 'อื่นๆ' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setVoidReason(opt.val)}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-semibold border text-left transition ${
                        voidReason === opt.val
                          ? 'bg-red-500/10 border-red-500/40 text-red-400'
                          : 'bg-stone-950 border-stone-850 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {voidReason === 'อื่นๆ' && (
                <div>
                  <textarea
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="กรอกเหตุผลอื่นเพิ่มเติม..."
                    className="w-full bg-stone-950 border border-stone-850 focus:border-stone-750 focus:outline-none rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 h-20 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-stone-850">
                <button
                  type="button"
                  onClick={() => {
                    setVoidTarget(null);
                    setVoidReason('');
                    setCustomReason('');
                  }}
                  className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-sm font-bold active:scale-97 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isVoiding || !voidReason}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-stone-800 text-black text-sm font-extrabold rounded-xl active:scale-97 transition flex items-center justify-center gap-1 shadow-md shadow-red-500/10"
                >
                  {isVoiding ? (
                    <span>กำลังบันทึกประวัติ Void...</span>
                  ) : (
                    <span>กดยืนยัน Void</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && qrSessionId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 bg-stone-950 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold text-white mb-2 text-center">QR Code สำหรับลูกค้า</h3>
            <p className="text-stone-400 text-xs text-center mb-6">โต๊ะ {tableId} • สแกนเพื่อสั่งอาหาร (หมดอายุใน 2 ชม.)</p>
            
            <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
              <QRCode
                value={`${window.location.origin}/customer/${qrSessionId}`}
                size={220}
                level="H"
              />
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-[10px] text-stone-500 font-mono break-all px-4">{qrSessionId}</p>
            </div>
          </div>
        </div>
      )}
      {/* NOTE EDIT MODAL */}
      {noteEditTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-amber-500 flex items-center gap-2 mb-2">
              <ClipboardList className="w-5 h-5" />
              <span>ระบุโน้ตพิเศษ</span>
            </h3>
            <p className="text-stone-400 text-xs mb-4">
              ระบุข้อกำหนดพิเศษของลูกค้าสำหรับเมนู <span className="font-bold text-white">{cart[noteEditTarget.index]?.name}</span>
            </p>

            <div className="space-y-4">
              {/* Quick Note Buttons */}
              <div>
                <label className="block text-xs font-bold text-stone-400 tracking-wider uppercase mb-2">
                  ตัวเลือกด่วน
                </label>
                <div className="flex flex-wrap gap-2">
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
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-stone-950 border-stone-850 text-stone-400 hover:border-stone-700'
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
                <label className="block text-xs font-bold text-stone-400 tracking-wider uppercase mb-2">
                  ระบุรายละเอียดอื่นๆ
                </label>
                <textarea
                  value={noteEditTarget.notes}
                  onChange={(e) => setNoteEditTarget(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="เช่น หวานน้อย, ขอวาซาบิเยอะๆ..."
                  className="w-full bg-stone-950 border border-stone-850 focus:border-stone-700 focus:outline-none rounded-xl p-3 text-sm text-stone-200 placeholder-stone-600 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-850">
                <button
                  type="button"
                  onClick={() => setNoteEditTarget(null)}
                  className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-sm font-bold active:scale-97 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCartItemNotes(noteEditTarget.index, noteEditTarget.notes);
                    setNoteEditTarget(null);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-black text-sm font-extrabold rounded-xl active:scale-97 transition shadow-md shadow-amber-500/10"
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
};
