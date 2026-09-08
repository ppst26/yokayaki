"use client";

import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  ShieldAlert,
  Maximize2,
  Minimize2,
} from 'lucide-react';

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

interface CartPanelProps {
  cart: CartItem[];
  orderedItems: OrderedItem[];
  mobileCartExpanded: boolean;
  setMobileCartExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  updateCartQty: (index: number, delta: number) => void;
  removeFromCart: (index: number) => void;
  openNoteModal: (index: number) => void;
  setVoidTarget: (item: OrderedItem) => void;
  setVoidQuantity: (qty: number) => void;
  setVoidReason: (reason: string) => void;
  setCustomReason: (reason: string) => void;
  submitOrder: () => void;
  isSubmitting: boolean;
  cartTotal: number;
  activeOrderItems: OrderedItem[];
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  orderedItems,
  mobileCartExpanded,
  setMobileCartExpanded,
  updateCartQty,
  removeFromCart,
  openNoteModal,
  setVoidTarget,
  setVoidQuantity,
  setVoidReason,
  setCustomReason,
  submitOrder,
  isSubmitting,
  cartTotal,
  activeOrderItems,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const totalCartItemsCount = cart.reduce((s, i) => s + i.quantity, 0);

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isFullScreen;
    setIsFullScreen(nextState);
    if (nextState) {
      setMobileCartExpanded(true);
    }
  };

  const getContainerStyle = () => {
    if (isFullScreen) {
      return 'fixed inset-0 z-50 w-full h-full max-h-screen rounded-none bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out';
    }
    return 'fixed bottom-0 left-0 right-0 z-40 flex flex-col overflow-hidden rounded-t-3xl border-t border-slate-200/90 bg-white shadow-2xl transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-900 lg:static lg:h-auto lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:self-stretch lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none';
  };

  return (
    <div className={getContainerStyle()}>
      {/* Mobile Accordion Header Bar */}
      <div
        onClick={() => {
          if (isFullScreen) return;
          setMobileCartExpanded(prev => !prev);
        }}
        className="lg:hidden flex items-center justify-between px-4 sm:px-5 py-3.5 bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200/80 dark:border-neutral-800 cursor-pointer select-none shrink-0"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-xs font-black text-slate-900 dark:text-neutral-100 shrink-0">
            ตะกร้า ({totalCartItemsCount})
          </span>

          {/* Badge Button: ดูรายการทั้งหมด / ย่อหน้าจอ */}
          <button
            onClick={toggleFullScreen}
            className="ml-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>ย่อหน้าจอ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>ดูรายการทั้งหมด</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-black text-red-600 dark:text-red-400">
            {cartTotal.toLocaleString()} ฿
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isFullScreen) {
                setIsFullScreen(false);
              } else {
                setMobileCartExpanded(prev => !prev);
              }
            }}
            className="p-1 text-red-600 dark:text-red-400 flex items-center justify-center cursor-pointer"
          >
            {mobileCartExpanded || isFullScreen ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5 animate-bounce" />
            )}
          </button>
        </div>
      </div>

      {/* Cart Body: header + list + footer ล็อกที่ขอบ */}
      <div
        className={`${
          mobileCartExpanded || isFullScreen ? 'flex' : 'hidden lg:flex'
        } min-h-0 flex-1 flex-col ${mobileCartExpanded && !isFullScreen ? 'max-h-[65vh]' : ''}`}
      >
        <div className="shrink-0 px-4 pt-4 sm:px-5 sm:pt-5">
          <h2 className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            <span>ตะกร้าสินค้าใหม่</span>
            <span className="font-bold text-slate-500">{totalCartItemsCount} รายการ</span>
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto no-scrollbar px-4 py-3 sm:px-5">
          {cart.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 py-6 text-center dark:border-neutral-800">
              <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-neutral-600" />
              <p className="text-xs font-bold text-slate-400 dark:text-neutral-500">
                ยังไม่มีสินค้าในตะกร้า
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pr-1">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-neutral-700/60 dark:bg-neutral-800/80"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-neutral-100">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                        {(item.price * item.quantity).toLocaleString()} ฿
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
                        <button
                          onClick={() => updateCartQty(index, -1)}
                          className="cursor-pointer rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1 text-xs font-extrabold text-slate-900 dark:text-neutral-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(index, 1)}
                          className="cursor-pointer rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(index)}
                        className="cursor-pointer p-1.5 text-slate-400 transition hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => openNoteModal(index)}
                      className="flex cursor-pointer items-center gap-1 font-semibold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      <span>📝 {item.notes || '+ เพิ่มโน้ตพิเศษ'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeOrderItems.length > 0 && (
            <div className="border-t border-slate-100 pt-4 dark:border-neutral-800">
              <h2 className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  รายการที่ส่งครัวแล้ว
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {activeOrderItems.length} รายการ
                </span>
              </h2>

              <div className="space-y-2">
                {activeOrderItems.map(item => (
                  <div
                    key={item.id}
                    className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs dark:border-neutral-700/50 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-neutral-100">
                          {item.menu_items?.name}
                        </span>
                        <span className="ml-2 font-bold text-slate-500 dark:text-neutral-400">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.status === 'served'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {item.status === 'served' ? 'เสิร์ฟแล้ว' : 'กำลังปรุง'}
                        </span>
                        <button
                          onClick={() => {
                            setVoidTarget(item);
                            setVoidQuantity(1);
                            setVoidReason('ลูกค้าเปลี่ยนใจ');
                            setCustomReason('');
                          }}
                          className="cursor-pointer p-1 text-slate-400 transition hover:text-rose-600"
                          title="Void รายการนี้"
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        โน้ต: {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <button
          onClick={submitOrder}
          disabled={isSubmitting || cart.length === 0}
          className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>ส่งเข้าครัว ({cartTotal.toLocaleString()} ฿)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
