# Mobile SlideOver Navigation Drawer Design

**Date**: 2026-07-23  
**Status**: Proposed  

## 1. Goal & Requirements
On mobile screen sizes (`< md`), replace the inline vertically-stacked sidebar with a **SlideOver drawer navigation panel** triggered by a **Hamburger Menu button** in a sticky mobile header bar.

On desktop screens (`>= md`), maintain the persistent 64-column (`w-64`) left sidebar navigation.

---

## 2. Design & Architecture

### A. Mobile Header Bar (`md:hidden`)
- Sticky top header: `flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30`
- Left: YokaYaki POS Logo & Brand title
- Right: Hamburger button (`Menu` icon in YokaYaki Red / dark slate), styled with red active state or clean button.

### B. SlideOver Drawer Component (`md:hidden`)
- Backdrop: `fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50`
- Drawer container: `fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl z-50 p-5 flex flex-col justify-between overflow-y-auto`
- Drawer Header: Logo + Close (`X`) button
- Drawer Navigation Items: Same role-based navigation tabs (Floor Map, KDS, History, Menu, Stock, Promo, Dashboard, Loyalty). Clicking any tab updates `activeTab` and automatically closes the drawer (`setIsMobileMenuOpen(false)`).
- Drawer Footer: Logged-in employee status card & Logout CTA.

### C. Desktop Navigation (`hidden md:flex`)
- Keep fixed left sidebar (`w-64 bg-white border-r border-slate-200 sticky top-0 h-screen`).

---

## 3. Verification Plan
- Run `npx tsc --noEmit` to verify type safety.
- Run `npx next build` to verify production compilation.
