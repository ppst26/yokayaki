"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, QrCode } from 'lucide-react';
import { MenuGrid } from './MenuGrid';
import { CartPanel } from './CartPanel';
import { SpecialNoteModal } from './SpecialNoteModal';
import { VoidItemModal } from './VoidItemModal';
import { CustomerQRModal } from './CustomerQRModal';

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

  // Mobile UI States
  const [mobileCartExpanded, setMobileCartExpanded] = useState<boolean>(true);

  // QR Modal States
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const generateQrSession = async () => {
    try {
      setIsGeneratingQr(true);
      setErrorMsg(null);
      const expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() + 2);

      const { data, error } = await supabase
        .from('qr_sessions')
        .insert({
          table_id: tableId,
          status: 'active',
          expired_at: expiredAt.toISOString(),
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

  const fetchActiveOrder = async (skipVacantCheck = false) => {
    try {
      setIsLoadingOrder(true);

      // ตรวจสอบสถานะโต๊ะเฉพาะตอน mount ครั้งแรก (skipVacantCheck=false)
      // หลัง submitOrder ให้ skip เพราะ RPC เพิ่ง set table เป็น occupied
      if (!skipVacantCheck) {
        const { data: tableData } = await supabase
          .from('tables')
          .select('status')
          .eq('id', tableId)
          .single();

        if (tableData?.status === 'vacant') {
          setActiveOrderId(null);
          setOrderedItems([]);
          setIsLoadingOrder(false);
          return;
        }
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .maybeSingle();

      if (orderError) throw orderError;

      if (orderData) {
        setActiveOrderId(orderData.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('id, quantity, unit_price, status, notes, menu_items(name)')
          .eq('order_id', orderData.id)
          .order('id', { ascending: true });

        if (itemsError) throw itemsError;
        if (itemsData) setOrderedItems(itemsData as unknown as OrderedItem[]);
      } else {
        setActiveOrderId(null);
        setOrderedItems([]);
      }
    } catch (err: any) {
      console.error('Error fetching active order:', err);
      setErrorMsg('ไม่สามารถดึงข้อมูลออเดอร์เดิมได้');
    } finally {
      setIsLoadingOrder(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchActiveOrder();

    const channel = supabase
      .channel(`realtime:pos_order_items_${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchActiveOrder(true); // realtime: skip vacant check เพราะสถานะโต๊ะอัปเดตแยก
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tableId]);

  const categories = ['ทั้งหมด', ...Array.from(new Set(menuItems.map(m => m.category || 'ทั่วไป')))];

  const filteredMenuItems =
    selectedCategory === 'ทั้งหมด'
      ? menuItems
      : menuItems.filter(m => (m.category || 'ทั่วไป') === selectedCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setMobileCartExpanded(true);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const target = newCart[index];
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return newCart.filter((_, i) => i !== index);
      }
      newCart[index] = { ...target, quantity: newQty };
      return newCart;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const openNoteModal = (index: number) => {
    setNoteEditTarget({ index, notes: cart[index].notes || '' });
  };

  const saveNotes = () => {
    if (!noteEditTarget) return;
    setCart(prev => {
      const newCart = [...prev];
      newCart[noteEditTarget.index] = { ...newCart[noteEditTarget.index], notes: noteEditTarget.notes };
      return newCart;
    });
    setNoteEditTarget(null);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      for (const item of cart) {
        const { data: success, error } = await supabase.rpc('place_order_item', {
          p_table_id: tableId,
          p_menu_item_id: item.id,
          p_quantity: item.quantity,
          p_unit_price: item.price,
          p_notes: item.notes || null,
        });

        if (error) throw error;
        if (!success) {
          throw new Error(`วัตถุดิบ/สินค้า "${item.name}" หมด หรือไม่เพียงพอ`);
        }
      }

      setCart([]);
      await fetchActiveOrder(true); // skip vacant check — RPC เพิ่ง set table เป็น occupied แล้ว
      await fetchMenu();
    } catch (err: any) {
      console.error('Error submitting order:', err);
      setErrorMsg('ไม่สามารถสั่งอาหารได้: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeVoid = async () => {
    if (!voidTarget || !activeOrderId) return;
    const finalReason = voidReason === 'อื่นๆ (ระบุ)' ? customReason.trim() : voidReason;

    if (!finalReason) {
      alert('กรุณาระบุเหตุผลในการ Void');
      return;
    }

    try {
      setIsVoiding(true);
      setErrorMsg(null);

      const { data: success, error } = await supabase.rpc('void_order_item', {
        p_order_item_id: voidTarget.id,
        p_void_quantity: voidQuantity,
        p_reason: finalReason,
        p_employee_name: employee?.name || 'Staff',
      });

      if (error) throw error;

      if (success) {
        setVoidTarget(null);
        await fetchActiveOrder(true); // skip vacant check — โต๊ะยังใช้งานอยู่
        await fetchMenu();
      } else {
        setErrorMsg('ไม่สามารถ Void รายการได้');
      }
    } catch (err: any) {
      console.error('Error voiding item:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการ Void: ' + (err.message || ''));
    } finally {
      setIsVoiding(false);
    }
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const activeOrderItems = orderedItems.filter(i => i.status !== 'voided');

  return (
    <div className="w-full h-full text-slate-800 dark:text-neutral-100 font-sans flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT AREA: Menu Grid & Category Tabs */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 pb-36 lg:pb-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition active:scale-95 text-slate-700 dark:text-neutral-200 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight whitespace-nowrap">
                สั่งอาหาร
              </h1>
              <p className="text-sm md:text-base text-slate-500 dark:text-neutral-400 font-semibold whitespace-nowrap mt-0.5">
                ประจำ <span className="text-base md:text-lg text-red-600 dark:text-red-400 font-black">โต๊ะ {tableId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={generateQrSession}
            disabled={isGeneratingQr}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 dark:bg-neutral-800 hover:bg-slate-900 dark:hover:bg-neutral-700 text-white rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-xs border border-slate-700 dark:border-neutral-700"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>{errorMsg}</span>
          </div>
        )}

        <MenuGrid
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          filteredMenuItems={filteredMenuItems}
          addToCart={addToCart}
          isLoadingMenu={isLoadingMenu}
        />
      </div>

      {/* RIGHT AREA: Cart Panel */}
      <CartPanel
        cart={cart}
        orderedItems={orderedItems}
        mobileCartExpanded={mobileCartExpanded}
        setMobileCartExpanded={setMobileCartExpanded}
        updateCartQty={updateCartQty}
        removeFromCart={removeFromCart}
        openNoteModal={openNoteModal}
        setVoidTarget={setVoidTarget}
        setVoidQuantity={setVoidQuantity}
        setVoidReason={setVoidReason}
        setCustomReason={setCustomReason}
        submitOrder={submitOrder}
        isSubmitting={isSubmitting}
        cartTotal={cartTotal}
        activeOrderItems={activeOrderItems}
      />

      {/* Modals */}
      <SpecialNoteModal
        noteEditTarget={noteEditTarget}
        setNoteEditTarget={setNoteEditTarget}
        saveNotes={saveNotes}
      />

      <VoidItemModal
        voidTarget={voidTarget}
        setVoidTarget={setVoidTarget}
        voidQuantity={voidQuantity}
        setVoidQuantity={setVoidQuantity}
        voidReason={voidReason}
        setVoidReason={setVoidReason}
        customReason={customReason}
        setCustomReason={setCustomReason}
        executeVoid={executeVoid}
        isVoiding={isVoiding}
      />

      <CustomerQRModal
        showQrModal={showQrModal}
        setShowQrModal={setShowQrModal}
        tableId={tableId}
        qrSessionId={qrSessionId}
      />
    </div>
  );
};
