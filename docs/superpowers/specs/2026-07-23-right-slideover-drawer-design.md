# Right SlideOver Drawer & Unified Layout Design

**Date**: 2026-07-23  
**Status**: Proposed  

## 1. Goal
1. Convert the mobile SlideOver Navigation Drawer to slide in from the **RIGHT side** of the screen (`right-0`), with fluid 60fps cubic-bezier motion animation.
2. Integrate all application screens (including POS Order and Checkout) into the primary layout structure with `SidebarNav`.

---

## 2. Design & Architecture

### A. Right SlideOver Drawer Animations (`app/globals.css`)
- Keyframes `@keyframes drawerSlideInRight`:
  - `0%`: `transform: translateX(100%)`, `opacity: 0.7`
  - `100%`: `transform: translateX(0)`, `opacity: 1`
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for 0.32s.

### B. Mobile Drawer Positioning (`components/SidebarNav.tsx`)
- Drawer container: `fixed inset-y-0 right-0 w-72 max-w-[80vw] bg-white h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto`
- Entrance class: `animate-drawer-in-right`
- Exit class: `translate-x-full` with 220ms smooth transition before unmounting.

### C. Unified Layout Stage (`components/TableMap.tsx`)
- Keep `SidebarNav` persistent across all views.
- Render `POSOrderScreen` and `CheckoutScreen` inside `<main className="flex-1 p-6 overflow-y-auto w-full">`.
- Tab change handler resets table modes (`setSelectedTableId(null)`, `setCheckoutTableId(null)`).

---

## 3. Verification Plan
- Run `npx tsc --noEmit` to verify type safety.
- Run `npx next build` to verify Next.js production build compilation.
