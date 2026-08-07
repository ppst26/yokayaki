"use client";

import React from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  ShieldAlert,
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
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:static lg:w-[380px] shrink-0 bg-white dark:bg-neutral-900 border-t lg:border-t-0 lg:border-l border-slate-200/90 dark:border-neutral-800 rounded-t-3xl lg:rounded-none lg:h-full shadow-xl lg:shadow-none flex flex-col max-h-[85vh] lg:max-h-none overflow-hidden transition-all duration-300">
      {/* Mobile Accordion Header Bar */}
      <div
        onClick={() => setMobileCartExpanded(prev => !prev)}
        className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200/80 dark:border-neutral-800 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-xs font-black text-slate-900 dark:text-neutral-100">
            ตะกร้า ({cart.reduce((s, i) => s + i.quantity, 0)} รายการ)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-red-600 dark:text-red-400">
            {cartTotal.toLocaleString()} ฿
          </span>
          <button className="p-1 text-slate-400 dark:text-neutral-400">
            {mobileCartExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Cart Body */}
      <div
        className={`${
          mobileCartExpanded ? 'flex' : 'hidden lg:flex'
        } flex-col flex-1 p-5 overflow-y-auto no-scrollbar space-y-6`}
      >
        {/* Active Cart */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-3 flex items-center justify-between">
            <span>ตะกร้าสินค้าใหม่</span>
            <span className="text-slate-500 font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)} รายการ
            </span>
          </h2>

          {cart.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl p-4">
              <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 dark:text-neutral-500">
                ยังไม่มีสินค้าในตะกร้า
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700/60 rounded-xl space-y-2"
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
                      <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg p-0.5">
                        <button
                          onClick={() => updateCartQty(index, -1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded text-slate-600 dark:text-neutral-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-extrabold px-1 text-slate-900 dark:text-neutral-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(index, 1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded text-slate-600 dark:text-neutral-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notes input trigger */}
                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => openNoteModal(index)}
                      className="text-amber-700 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>📝 {item.notes || '+ เพิ่มโน้ตพิเศษ'}</span>
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-3"
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
          )}
        </div>

        {/* Ordered Items List (Submitted to Kitchen) */}
        {activeOrderItems.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-neutral-800">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                รายการที่ส่งครัวแล้ว
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {activeOrderItems.length} รายการ
              </span>
            </h2>

            <div className="space-y-2">
              {activeOrderItems.map(item => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/50 rounded-xl text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-neutral-100">
                        {item.menu_items?.name}
                      </span>
                      <span className="text-slate-500 dark:text-neutral-400 font-bold ml-2">
                        x{item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'served'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
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
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Void รายการนี้"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
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
  );
};
