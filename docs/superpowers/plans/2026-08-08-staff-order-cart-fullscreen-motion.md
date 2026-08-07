# Fullscreen Motion Cart Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "ดูรายการทั้งหมด" badge button on the cart header bar (`CartPanel.tsx`) that triggers a smooth fullscreen slide-up motion mode on mobile screens.

**Architecture:** Add `isFullScreen` state in `CartPanel.tsx`. Update container classes dynamically when `isFullScreen` is true to `fixed inset-0 z-50 w-full h-full max-h-screen rounded-none bg-white dark:bg-neutral-900 transition-all duration-300 ease-out`. In fullscreen mode, items list expands to fill all available vertical space (`flex-1 max-h-none overflow-y-auto`).

**Tech Stack:** React 19, Next.js 16, TailwindCSS 4, Lucide React (`Maximize2`, `Minimize2`, `ChevronUp`, `ChevronDown`).

## Global Constraints

- Header bar features a badge button: `ดูรายการทั้งหมด ⛶` in compact view, `ย่อหน้าจอ 🗗` in fullscreen view.
- Fullscreen mode expands to fill 100% viewport (`fixed inset-0 z-50`).
- Sticky bottom footer ("ส่งเข้าครัว") remains anchored at bottom in both compact and fullscreen modes.

---

### Task 1: Add Fullscreen State & Badge Button to CartPanel

**Files:**
- Modify: `components/order/CartPanel.tsx:75-265`

**Interfaces:**
- Consumes: `CartPanelProps`
- Produces: `CartPanel` component supporting fullscreen slide-up mode and badge toggle button.

- [ ] **Step 1: Add `isFullScreen` state and header badge button in `CartPanel.tsx`**

Modify `components/order/CartPanel.tsx` to add `isFullScreen` state and render badge button:

```tsx
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

// ... interface definitions remain identical ...

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
    setIsFullScreen(prev => {
      const nextState = !prev;
      if (nextState) setMobileCartExpanded(true);
      return nextState;
    });
  };

  const getContainerStyle = () => {
    if (isFullScreen) {
      return 'fixed inset-0 z-50 w-full h-full max-h-screen rounded-none bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out';
    }
    return 'fixed bottom-0 left-0 right-0 z-40 lg:static lg:w-[380px] shrink-0 bg-white dark:bg-neutral-900 border-t lg:border-t-0 lg:border-l border-slate-200/90 dark:border-neutral-800 rounded-t-3xl lg:rounded-none lg:h-full shadow-2xl lg:shadow-none flex flex-col max-h-[85vh] lg:max-h-none overflow-hidden transition-all duration-300';
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
          <ShoppingBag className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-xs font-black text-slate-900 dark:text-neutral-100">
            ตะกร้า ({totalCartItemsCount} รายการ)
          </span>

          {/* Badge Button: ดูรายการทั้งหมด / ย่อหน้าจอ */}
          <button
            onClick={toggleFullScreen}
            className="ml-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
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

        <div className="flex items-center gap-3">
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

      {/* Cart Body */}
      <div
        className={`${
          mobileCartExpanded || isFullScreen ? 'flex' : 'hidden lg:flex'
        } flex-col flex-1 p-4 sm:p-5 overflow-y-auto no-scrollbar space-y-5`}
      >
        {/* Active Cart */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-3 flex items-center justify-between">
            <span>ตะกร้าสินค้าใหม่</span>
            <span className="text-slate-500 font-bold">
              {totalCartItemsCount} รายการ
            </span>
          </h2>

          {cart.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl p-4">
              <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 dark:text-neutral-500">
                ยังไม่มีสินค้าในตะกร้า
              </p>
            </div>
          ) : (
            <div className={`space-y-2.5 ${isFullScreen ? 'max-h-none' : 'max-h-[220px] sm:max-h-[260px] lg:max-h-none'} overflow-y-auto no-scrollbar pr-1`}>
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
                          className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded text-slate-600 dark:text-neutral-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-extrabold px-1 text-slate-900 dark:text-neutral-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(index, 1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded text-slate-600 dark:text-neutral-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => openNoteModal(index)}
                      className="text-amber-700 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>📝 {item.notes || '+ เพิ่มโน้ตพิเศษ'}</span>
                    </button>
                  </div>
                </div>
              ))}
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

            <div className={`space-y-2 ${isFullScreen ? 'max-h-none' : 'max-h-[180px] lg:max-h-none'} overflow-y-auto no-scrollbar`}>
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
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
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

      {/* Sticky Footer: Submit Order Button */}
      <div
        className={`${
          mobileCartExpanded || isFullScreen ? 'block' : 'hidden lg:block'
        } p-4 bg-white dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 shrink-0`}
      >
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
```

- [ ] **Step 2: Verify type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

---

### Task 2: Build Verification

- [ ] **Step 1: Build Next.js project**

Run: `pnpm run build`
Expected: Build succeeds with 0 errors.
