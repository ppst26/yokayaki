"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Minus, Trash2, ShieldAlert, ShoppingBag, History, HelpCircle, QrCode, X, ClipboardList, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import QRCode from 'react-qr-code';
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

interface VoidLog {
  id: number;
  employee_name: string;
  menu_name: string;
  quantity: number;
  total_amount: number;
  reason: string;
  restored_stock: boolean;
  created_at: string;
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
  const [voidQuantity, setVoidQuantity] = useState<number>(1);
  const [isVoiding, setIsVoiding] = useState(false);

  // Void Logs States
  const [voidLogs, setVoidLogs] = useState<VoidLog[]>([]);

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
        .select('*')
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
    fetchVoidLogs();

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

      // Call void_order_item database function (with partial void quantity)
      const { data: success, error: voidError } = await supabase.rpc('void_order_item', {
        p_order_item_id: voidTarget.id,
        p_employee_name: employee?.name || 'Unknown Staff',
        p_reason: finalReason,
        p_void_quantity: voidQuantity
      });

      if (voidError) throw voidError;

      if (success) {
        setVoidTarget(null);
        setVoidReason('');
        setCustomReason('');
        setVoidQuantity(1);
        await fetchActiveOrder();
        await fetchMenu();
        await fetchVoidLogs();
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

  // Fetch Void Logs (today only)
  const fetchVoidLogs = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('void_logs')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVoidLogs((data || []) as VoidLog[]);
    } catch (err) {
      console.error('Error fetching void logs:', err);
    }
  };

  return (
    <div className="w-full text-slate-800 flex flex-col lg:flex-row relative font-sans min-h-screen flex-1 bg-white">
      
      {/* LEFT AREA: Menu Selection */}
      <div className="flex-1 p-6 lg:border-r border-slate-200 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200/80">
          <button
            onClick={onBack}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition active:scale-95 text-slate-700 shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">สั่งอาหาร (POS Order)</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">ประจำ <span className="text-red-600 font-bold">โต๊ะ {tableId}</span></p>
          </div>

          <button
            onClick={generateQrSession}
            disabled={isGeneratingQr}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl border border-red-200 transition-colors font-bold text-xs shadow-xs whitespace-nowrap cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>{isGeneratingQr ? 'กำลังสร้าง...' : 'สร้าง QR Code ให้ลูกค้า'}</span>
          </button>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-fade-in">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Category Selection Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
          {['ทั้งหมด', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap border transition duration-150 active:scale-95 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-red-600" />
            <span>รายการอาหารและเครื่องดื่ม</span>
          </h2>
          
          {isLoadingMenu ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-36 bg-white border border-slate-200 rounded-2xl animate-pulse shadow-xs" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
                      className={`p-3 sm:p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between shadow-xs ${
                        isSoldOut
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white hover:shadow-md border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Image Area (1:1 Aspect Ratio) */}
                      <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 border border-slate-100 mb-3 flex items-center justify-center group">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
                            <UtensilsCrossed className="w-8 h-8 stroke-[1.5]" />
                            <span className="text-[10px] font-semibold text-slate-400">ไม่มีรูปภาพ</span>
                          </div>
                        )}

                        {/* Stock Badge Overlay */}
                        <div className="absolute top-2 right-2 z-10">
                          {isSoldOut ? (
                            <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 bg-rose-900/90 text-rose-100 backdrop-blur-xs rounded-lg uppercase shadow-xs">
                              SOLD OUT
                            </span>
                          ) : isUrgent ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-stone-950 font-black rounded-lg shadow-xs animate-pulse">
                              เหลือ {item.stock} จาน
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900/75 text-white backdrop-blur-xs rounded-md shadow-xs">
                              สต็อก: {item.stock}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info Area */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-2">
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {item.name}
                          </h3>
                          <p className="text-red-600 font-extrabold text-base mt-0.5">
                            {item.price} <span className="text-xs font-semibold text-slate-500">บาท</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        {/* Cart qty indicator inside card */}
                        <div>
                          {cartQty > 0 && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                              เลือกแล้ว {cartQty}
                            </span>
                          )}
                        </div>

                        <button
                          disabled={isSoldOut || remainingAvailable <= 0}
                          onClick={() => addToCart(item)}
                          className={`p-2.5 rounded-xl transition duration-150 active:scale-95 flex items-center justify-center cursor-pointer ${
                            isSoldOut || remainingAvailable <= 0
                              ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20'
                          }`}
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
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
      <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-6 flex flex-col justify-between shadow-xs overflow-y-auto shrink-0 self-stretch min-h-full">
        <div>
          {/* Section 1: Cart Items */}
          <div className="mb-8 border-b border-slate-100 pb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-red-600" />
                <span>ตะกร้าสินค้า (Cart)</span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-slate-400 hover:text-red-600 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ล้างตะกร้า
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-8 font-medium bg-slate-50 rounded-2xl border border-slate-100">ยังไม่มีรายการอาหารในตะกร้า</p>
            ) : (
              <div className="space-y-3 max-h-[32vh] overflow-y-auto pr-1">
                {cart.map((item, index) => (
                  <div key={`${item.id}-${item.notes || ''}-${index}`} className="flex flex-col bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl gap-2">
                    <div className="flex justify-between items-center">
                      <div className="pr-3 flex-1">
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-red-600 font-extrabold mt-0.5">{item.price * item.quantity} บาท</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.id, item.notes)}
                          className="p-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 shadow-xs"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <span className="text-xs font-extrabold text-slate-900 px-1">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item, item.notes)}
                          className="p-1 bg-red-600 hover:bg-red-700 rounded-lg text-white shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                    {/* Notes line */}
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                      {item.notes ? (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">โน้ต: {item.notes}</span>
                      ) : (
                        <span className="text-slate-400 font-medium">ไม่มีโน้ตพิเศษ</span>
                      )}
                      <button
                        onClick={() => setNoteEditTarget({ index, notes: item.notes || '' })}
                        className="text-slate-500 hover:text-red-600 font-bold flex items-center gap-1 transition"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>โน้ต</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-500 font-bold">ยอดรวมตะกร้า:</span>
                  <span className="text-2xl font-black text-red-600">
                    {cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)} บาท
                  </span>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={confirmOrder}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-extrabold text-sm rounded-xl transition duration-150 active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังส่งออเดอร์...</span>
                    </>
                  ) : (
                    <span>สั่งอาหารเข้าระบบ (Send Order)</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Currently Ordered Items (Active Order) */}
          <div>
            <h2 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-red-600" />
              <span>อาหารที่ส่งครัวแล้ว (Active Order)</span>
            </h2>

            {/* Summary bar */}
            {(() => {
              const activeItems = orderedItems.filter(i => i.status !== 'voided');
              const totalQty = activeItems.reduce((s, i) => s + i.quantity, 0);
              const totalAmt = activeItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
              if (totalQty === 0) return null;
              return (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">สั่งไปแล้ว: <span className="text-red-600 font-extrabold">{totalQty} ชิ้น</span></span>
                  <span className="text-red-600 font-extrabold">{totalAmt.toLocaleString()} บาท</span>
                </div>
              );
            })()}

            {isLoadingOrder ? (
              <div className="space-y-2">
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ) : orderedItems.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6 font-medium bg-slate-50 rounded-2xl border border-slate-100">ยังไม่มีรายการสั่งซื้อก่อนหน้านี้</p>
            ) : (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {orderedItems.map(item => {
                  const isVoided = item.status === 'voided';
                  return (
                    <div
                      key={item.id}
                      className={`flex justify-between items-center p-3 rounded-xl border text-xs ${
                        isVoided
                          ? 'bg-rose-50/50 border-rose-200 text-rose-400 line-through opacity-70'
                          : 'bg-slate-50 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="pr-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {item.menu_items?.name}
                          </span>
                          <span className="text-[11px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                            x{item.quantity}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                            โน้ต: {item.notes}
                          </div>
                        )}
                      </div>
                      
                      {!isVoided && (
                        <button
                          onClick={() => { setVoidTarget(item); setVoidQuantity(item.quantity); }}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-xs"
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

          {/* Section 3: Void Logs (Today) */}
          {voidLogs.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-extrabold text-rose-500/80 flex items-center gap-1.5 mb-3 tracking-wide uppercase">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>รายการที่ยกเลิกบิลนี้ ({voidLogs.length})</span>
              </h2>
              <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                {voidLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800">{log.menu_name}</span>
                        <span className="text-rose-500 font-extrabold ml-1.5">x{log.quantity}</span>
                      </div>
                      <span className="font-extrabold text-rose-600 whitespace-nowrap">
                        -{log.total_amount.toLocaleString()} ฿
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                        {log.reason}
                      </span>
                      {log.restored_stock && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          คืนสต็อกแล้ว
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {log.employee_name} • {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VOID DIALOG MODAL */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative">
            <h3 className="text-lg font-extrabold text-rose-600 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 stroke-[2.5]" />
              <span>ยืนยันการยกเลิกรายการอาหาร (Void)</span>
            </h3>
            <p className="text-slate-600 text-xs mb-3 leading-relaxed">
              ยกเลิกรายการ <span className="font-bold text-slate-900">{voidTarget.menu_items?.name}</span> (สั่งทั้งหมด {voidTarget.quantity} จาน • ราคา {voidTarget.unit_price} บาท/จาน)
            </p>

            {/* Void Quantity Selector */}
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2.5">
                จำนวนที่ต้องการยกเลิก (Void)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVoidQuantity(q => Math.max(1, q - 1))}
                  disabled={voidQuantity <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold text-lg transition active:scale-95 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-black text-rose-600">{voidQuantity}</span>
                  <span className="text-xs font-semibold text-slate-400 ml-1">/ {voidTarget.quantity} จาน</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVoidQuantity(q => Math.min(voidTarget.quantity, q + 1))}
                  disabled={voidQuantity >= voidTarget.quantity}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold text-lg transition active:scale-95 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">
                  มูลค่าที่ยกเลิก:
                </span>
                <span className="font-extrabold text-rose-600">
                  {(voidQuantity * voidTarget.unit_price).toLocaleString()} บาท
                </span>
              </div>
              {voidQuantity < voidTarget.quantity && (
                <div className="mt-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-center">
                  เหลือในออเดอร์: {voidTarget.quantity - voidQuantity} จาน ({((voidTarget.quantity - voidQuantity) * voidTarget.unit_price).toLocaleString()} บาท)
                </div>
              )}
            </div>

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                  ระบุสาเหตุการยกเลิก
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
                      className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold border text-left transition ${
                        voidReason === opt.val
                          ? 'bg-red-50 border-red-300 text-red-600 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 h-20 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setVoidTarget(null);
                    setVoidReason('');
                    setCustomReason('');
                    setVoidQuantity(1);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl active:scale-97 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isVoiding || !voidReason}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-extrabold rounded-xl active:scale-97 transition flex items-center justify-center gap-1 shadow-md shadow-rose-600/20"
                >
                  {isVoiding ? (
                    <span>กำลังบันทึก Void...</span>
                  ) : (
                    <span>ยืนยัน Void</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && qrSessionId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-xl relative text-center">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black text-slate-900 mb-1">QR Code สำหรับลูกค้า</h3>
            <p className="text-slate-500 text-xs mb-5 font-medium">โต๊ะ {tableId} • สแกนเพื่อสั่งอาหาร (หมดอายุใน 2 ชม.)</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block">
              <QRCode
                value={`${window.location.origin}/customer/${qrSessionId}`}
                size={200}
                level="H"
              />
            </div>
            
            <div className="mt-4">
              <p className="text-[10px] text-slate-400 font-mono break-all">{qrSessionId}</p>
            </div>
          </div>
        </div>
      )}

      {/* NOTE EDIT MODAL */}
      {noteEditTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-2">
              <ClipboardList className="w-5 h-5 text-red-600" />
              <span>ระบุโน้ตพิเศษ</span>
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              ข้อกำหนดพิเศษสำหรับเมนู <span className="font-bold text-slate-900">{cart[noteEditTarget.index]?.name}</span>
            </p>

            <div className="space-y-4">
              {/* Quick Note Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-red-50 border-red-300 text-red-600 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
                  ระบุรายละเอียดอื่นๆ
                </label>
                <textarea
                  value={noteEditTarget.notes}
                  onChange={(e) => setNoteEditTarget(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="เช่น หวานน้อย, ขอวาซาบิเยอะๆ..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:outline-none rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoteEditTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl active:scale-97 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCartItemNotes(noteEditTarget.index, noteEditTarget.notes);
                    setNoteEditTarget(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl active:scale-97 transition shadow-md shadow-red-600/20"
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


