# Smooth Motion & Micro-Interactions Design

**Date**: 2026-07-23  
**Status**: Proposed  

## 1. Goal
Enhance the Mobile SlideOver Navigation Drawer and UI elements with **fluid 60fps motion animations** and **tactile micro-interactions** (cubic-bezier slide-in, backdrop fade, animated drawer exit transition, and hover shift effects).

---

## 2. Design & Motion Strategy

### A. Global CSS Animations (`app/globals.css`)
- `@keyframes drawerSlideIn`: Uses `cubic-bezier(0.16, 1, 0.3, 1)` easing for an organic, responsive slide-in feel.
- `@keyframes backdropFadeIn`: Smooth 0.25s backdrop opacity fade-in.

### B. Exit Transition Management (`components/TableMap.tsx`)
- Add state `isDrawerClosing: boolean`.
- Implement `closeDrawer(callback)` function to trigger a 220ms reverse slide-out & backdrop fade-out before unmounting the drawer DOM node.

### C. Tactile Micro-Interactions
- **Hamburger Button**: Scale spring response (`active:scale-90 hover:scale-105 transition-transform duration-200`).
- **Drawer Nav Items**: Hover horizontal nudge (`hover:translate-x-1.5 transition-all duration-200 ease-out`) with red active indicator pill.

---

## 3. Verification Plan
- Run `npx tsc --noEmit` to verify type safety.
- Run `npx next build` to verify production compilation.
