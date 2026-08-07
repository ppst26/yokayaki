# Reusable Navigation Component Design (`SidebarNav.tsx`)

**Date**: 2026-07-23  
**Status**: Proposed  

## 1. Goal & Component Boundary
Extract the mobile sticky header, mobile SlideOver drawer, and desktop sidebar into a standalone, encapsulated reusable component: `components/SidebarNav.tsx`.

---

## 2. Architecture & Design

### Component Interface (`components/SidebarNav.tsx`)
```typescript
export type NavTab = 'floor' | 'kitchen' | 'history' | 'stock' | 'menu' | 'promo' | 'dashboard' | 'loyalty';

export interface SidebarNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}
```

### Encapsulated Features
1. **Auth Context**: Internal consumption of `useAuth()` to handle role-based navigation rendering (`owner` vs `staff`) and logout.
2. **Mobile Drawer State**: Self-contained `isMobileMenuOpen` and `isDrawerClosing` state management with 220ms reverse exit animations (`handleCloseDrawer`).
3. **Responsive Views**:
   - Mobile Sticky Top Bar (`md:hidden`) with Hamburger trigger.
   - Mobile SlideOver Drawer (`md:hidden`) with backdrop blur and smooth cubic-bezier animations.
   - Desktop Left Sidebar (`hidden md:flex w-64`) fixed to viewport height.

---

## 3. Integration in `TableMap.tsx`
Replace inline sidebar/drawer markup in `TableMap.tsx` with:
```tsx
<SidebarNav activeTab={activeTab} onSelectTab={setActiveTab} />
```

---

## 4. Verification Plan
- Run `npx tsc --noEmit` to verify type safety.
- Run `npx next build` to verify Next.js production build compilation.
