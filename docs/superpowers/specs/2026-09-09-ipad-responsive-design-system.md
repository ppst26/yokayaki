# iPad Responsive Design System

**Date:** 2026-09-09  
**Status:** Approved  
**Approach:** Token-based Design System  
**Scope:** Comprehensive — All screens and components

---

## Executive Summary

Create a comprehensive, token-based responsive design system specifically optimized for iPad devices (768px - 1366px range). The system will use CSS custom properties (design tokens) that automatically adjust values at defined breakpoints, ensuring consistent, maintainable, and scalable layouts across all iPad variants.

**Key Goals:**
- Eliminate layout distortion on iPad devices
- Create consistent design language across all screens
- Enable easy maintenance through centralized token system
- Support all iPad models: standard, Mini, Air, and Pro variants
- Maintain backward compatibility with existing mobile and desktop layouts

---

## 1. Breakpoint Strategy

### 1.1 Breakpoint Definitions

We define 4 primary breakpoints targeting specific device ranges:

| Breakpoint | Width Range | Target Devices | Primary Use Case |
|------------|-------------|----------------|------------------|
| **Mobile** | 360-767px | Phones | Base styles (default) |
| **Tablet** | 768-833px | iPad 10.2", 10.9", iPad Mini | 2-column layouts, compact sidebar (240px) |
| **Tablet-XL** | 834-1023px | iPad Pro 11", iPad Air | 3-column layouts, expanded sidebar (256px) |
| **Desktop** | 1024px+ | iPad Pro 12.9", Desktop monitors | 4-column layouts, full sidebar (288px) |

### 1.2 Implementation

**Tailwind Config Extension:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',       // iPad start
      'tablet': '834px',   // 🆕 NEW: iPad Pro 11" sweet spot
      'lg': '1024px',      // iPad Pro 12.9" / Desktop
      'xl': '1280px',
    }
  }
}
```

**Custom Media Queries:**
```css
/* app/globals.css */
@custom-media --mobile (width < 768px);
@custom-media --tablet (768px <= width < 834px);
@custom-media --tablet-xl (834px <= width < 1024px);
@custom-media --tablet-all (768px <= width < 1024px);
@custom-media --desktop (width >= 1024px);
```

### 1.3 Rationale

- **768px** — iPad standard portrait mode enters desktop layout (sidebar appears)
- **834px** — iPad Pro 11" gains sufficient width for 3-column grids
- **1024px** — iPad Pro 12.9" landscape provides full desktop experience
- `--tablet-all` media query allows shared styling across all iPad variants

---

## 2. Design Token System

### 2.1 Token Architecture

Design tokens are organized into 6 categories, each serving specific layout needs:

#### Category 1: Layout Tokens

Control page-level structure and content areas.

```css
:root {
  --sidebar-width: 0;              /* Hidden on mobile */
  --sidebar-padding: 1.25rem;
  --content-padding: 1rem;
  --content-max-width: 100%;
  --page-margin: 1rem;
}

@media (--tablet) {
  :root {
    --sidebar-width: 240px;        /* Compact sidebar */
    --content-padding: 1.5rem;     /* More breathing room */
    --content-max-width: calc(100vw - 240px);
    --page-margin: 1.5rem;
  }
}

@media (--tablet-xl) {
  :root {
    --sidebar-width: 256px;        /* Slightly wider */
    --content-padding: 1.75rem;
    --content-max-width: calc(100vw - 256px);
  }
}

@media (--desktop) {
  :root {
    --sidebar-width: 288px;        /* Full desktop width */
    --content-padding: 2rem;
    --content-max-width: calc(100vw - 288px);
    --page-margin: 2rem;
  }
}
```

**Usage:** Main layout containers, sidebar, content areas.

---

#### Category 2: Grid Tokens

Control grid column counts for different content types.

```css
:root {
  /* Mobile defaults */
  --grid-cols-menu: 2;
  --grid-cols-table: 2;
  --grid-cols-cards: 1;
  --grid-gap: 0.75rem;
  --grid-gap-lg: 1rem;
}

@media (--tablet) {
  :root {
    --grid-cols-menu: 2;           /* Keep 2 cols (sidebar takes space) */
    --grid-cols-table: 2;          /* 2 table cards fit well on tablet */
    --grid-cols-cards: 2;          /* 2-column stat cards */
    --grid-gap: 1rem;
    --grid-gap-lg: 1.25rem;
  }
}

@media (--tablet-xl) {
  :root {
    --grid-cols-menu: 3;           /* 3 menu items per row */
    --grid-cols-table: 2;          /* 2 table cards on tablet */
    --grid-cols-cards: 2;          /* Keep 2 (card width ideal) */
    --grid-gap: 1.25rem;
    --grid-gap-lg: 1.5rem;
  }
}

@media (--desktop) {
  :root {
    --grid-cols-menu: 4;           /* 4-column menu grid */
    --grid-cols-table: 4;          /* 4 table cards */
    --grid-cols-cards: 3;          /* 3-column stats */
  }
}
```

**Usage:** Menu grids, table cards, stat cards, any grid-based layouts.

---

#### Category 3: Card Tokens

Control card padding, border radius, and internal spacing.

```css
:root {
  --card-padding: 1rem;
  --card-padding-sm: 0.75rem;
  --card-padding-lg: 1.5rem;
  --card-radius: 1rem;
  --card-radius-sm: 0.75rem;
  --card-gap: 0.75rem;             /* Gap between elements inside cards */
}

@media (--tablet) {
  :root {
    --card-padding: 1.25rem;       /* More spacious */
    --card-padding-sm: 1rem;
    --card-padding-lg: 1.75rem;
    --card-radius: 1.25rem;        /* Slightly rounder */
    --card-gap: 1rem;
  }
}

@media (--tablet-xl) {
  :root {
    --card-padding: 1.5rem;
    --card-radius: 1.5rem;
  }
}

@media (--desktop) {
  :root {
    --card-padding: 2rem;
  }
}
```

**Usage:** All card components, modal dialogs, panel containers.

---

#### Category 4: Typography Tokens

Control text sizing for different UI contexts.

```css
:root {
  /* Base font sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  
  /* Component-specific typography */
  --text-card-title: 0.875rem;
  --text-card-value: 1.5rem;
  --text-table-cell: 0.875rem;
  --text-button: 0.875rem;
}

@media (--tablet-all) {
  :root {
    /* Slightly larger on all iPad sizes */
    --text-card-title: 1rem;
    --text-card-value: 1.75rem;
    --text-table-cell: 0.9375rem;
  }
}

@media (--desktop) {
  :root {
    /* Full size on desktop */
    --text-card-title: 1.125rem;
    --text-card-value: 2rem;
    --text-table-cell: 1rem;
  }
}
```

**Usage:** Card titles, metric values, table cells, buttons.

---

#### Category 5: Spacing Tokens

Control vertical/horizontal spacing between UI sections.

```css
:root {
  --space-section: 1.5rem;         /* Between major sections */
  --space-component: 1rem;         /* Between components */
  --space-element: 0.5rem;         /* Between small elements */
}

@media (--tablet) {
  :root {
    --space-section: 2rem;
    --space-component: 1.25rem;
  }
}

@media (--desktop) {
  :root {
    --space-section: 2.5rem;
    --space-component: 1.5rem;
  }
}
```

**Usage:** Margins, gaps, section dividers.

---

#### Category 6: Component-Specific Tokens

Tokens for specific components that need custom sizing.

```css
:root {
  /* POS Order Screen */
  --pos-cart-width: 100%;
  --pos-menu-cols: 2;
  
  /* Kitchen Screen */
  --kitchen-card-width: 100%;
  --kitchen-cols: 1;
  
  /* Manager Pages */
  --manager-table-font: 0.875rem;
  --manager-form-width: 100%;
}

@media (--tablet) {
  :root {
    --pos-cart-width: 380px;       /* Fixed cart width on tablet+ */
    --kitchen-cols: 2;             /* 2-column kitchen display */
    --manager-form-width: 600px;   /* Constrained form width */
  }
}

@media (--tablet-xl) {
  :root {
    --pos-menu-cols: 3;
    --kitchen-cols: 3;
  }
}
```

**Usage:** POS cart panel, kitchen order cards, form modals.

---

### 2.2 Token Usage Patterns

**Direct CSS Variable Usage:**
```tsx
<div className="p-[var(--card-padding)] rounded-[var(--card-radius)]">
  <h3 className="text-[length:var(--text-card-title)]">
    Title
  </h3>
</div>
```

**Utility Class Shortcuts:**
```css
/* app/globals.css */
@layer utilities {
  .card-default {
    padding: var(--card-padding);
    border-radius: var(--card-radius);
  }
  
  .grid-menu {
    display: grid;
    grid-template-columns: repeat(var(--grid-cols-menu), 1fr);
    gap: var(--grid-gap);
  }
}
```

```tsx
<div className="card-default">
  <div className="grid-menu">
    {items.map(item => <MenuItem />)}
  </div>
</div>
```

---

## 3. Component-Token Mappings

### 3.1 Core Navigation

**SidebarNav** (`components/common/SidebarNav.tsx`)

**Before:**
```tsx
<aside className="hidden md:flex md:w-60 lg:w-72">
```

**After:**
```tsx
<aside 
  className="hidden md:flex flex-col"
  style={{ width: 'var(--sidebar-width)', padding: 'var(--sidebar-padding)' }}
>
```

**Tokens Used:**
- `--sidebar-width` (0 → 240px → 256px → 288px)
- `--sidebar-padding` (1.25rem)

**Behavior:**
- Hidden on mobile
- 240px on iPad standard (768px)
- 256px on iPad Pro 11" (834px)
- 288px on iPad Pro 12.9"+ (1024px)

---

### 3.2 POS Order System

**MenuGrid** (`components/order/MenuGrid.tsx`)

**Before:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
```

**After:**
```tsx
<div 
  className="grid gap-[var(--grid-gap)]"
  style={{ gridTemplateColumns: `repeat(var(--grid-cols-menu), 1fr)` }}
>
```

**Tokens Used:**
- `--grid-cols-menu` (2 → 2 → 3 → 4)
- `--grid-gap` (0.75rem → 1rem → 1.25rem)

**Behavior:**
- 2 columns on mobile/tablet (768-833px)
- 3 columns on iPad Pro 11" (834-1023px)
- 4 columns on desktop (1024px+)

---

**CartPanel** (`components/order/CartPanel.tsx`)

**Before:**
```tsx
<aside className="lg:w-[380px]">
```

**After:**
```tsx
<aside 
  className="w-full md:w-[var(--pos-cart-width)]"
  style={{ padding: 'var(--card-padding)' }}
>
```

**Tokens Used:**
- `--pos-cart-width` (100% → 380px)
- `--card-padding`

---

### 3.3 Table Management

**TableMap** (`components/common/TableMap.tsx`)

**Before:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
```

**After:**
```tsx
<div 
  className="grid gap-[var(--grid-gap-lg)]"
  style={{ gridTemplateColumns: `repeat(var(--grid-cols-table), 1fr)` }}
>
```

**Tokens Used:**
- `--grid-cols-table` (2 → 3 → 3 → 4)
- `--grid-gap-lg`
- `--page-margin` (wrapper padding)

---

### 3.4 Kitchen Display

**KitchenScreen** (`components/kitchen/KitchenScreen.tsx`)

**After:**
```tsx
<div 
  className="grid gap-[var(--grid-gap)]"
  style={{ gridTemplateColumns: `repeat(var(--kitchen-cols), 1fr)` }}
>
  {orders.map(order => (
    <KitchenOrderCard 
      className="p-[var(--card-padding)]"
      order={order} 
    />
  ))}
</div>
```

**Tokens Used:**
- `--kitchen-cols` (1 → 2 → 3 → 3)
- `--grid-gap`
- `--card-padding`

---

### 3.5 Manager Pages

**Common Pattern for Loyalty/Menu/Stock/Promo Managers:**

```tsx
<div className="p-[var(--page-margin)] space-y-[var(--space-section)]">
  {/* Stats Cards Grid */}
  <div 
    className="grid gap-[var(--grid-gap)]"
    style={{ gridTemplateColumns: `repeat(var(--grid-cols-cards), 1fr)` }}
  >
    {stats.map(stat => (
      <div className="card-default">
        <h3 className="card-title">{stat.label}</h3>
        <p className="card-value">{stat.value}</p>
      </div>
    ))}
  </div>
  
  {/* Data Table */}
  <div className="card-default">
    <Table className="text-[length:var(--manager-table-font)]">
      {/* table content */}
    </Table>
  </div>
</div>
```

**Tokens Used:**
- `--page-margin` (1rem → 1.5rem → 2rem)
- `--space-section` (1.5rem → 2rem → 2.5rem)
- `--grid-cols-cards` (1 → 2 → 2 → 3)
- `--manager-table-font`

---

### 3.6 Utility Classes Reference

Create reusable utility classes in `app/globals.css`:

```css
@layer utilities {
  /* Card Utilities */
  .card-default {
    padding: var(--card-padding);
    border-radius: var(--card-radius);
  }
  
  .card-compact {
    padding: var(--card-padding-sm);
    border-radius: var(--card-radius-sm);
  }
  
  /* Grid Utilities */
  .grid-menu {
    display: grid;
    grid-template-columns: repeat(var(--grid-cols-menu), 1fr);
    gap: var(--grid-gap);
  }
  
  .grid-table {
    display: grid;
    grid-template-columns: repeat(var(--grid-cols-table), 1fr);
    gap: var(--grid-gap-lg);
  }
  
  .grid-cards {
    display: grid;
    grid-template-columns: repeat(var(--grid-cols-cards), 1fr);
    gap: var(--grid-gap);
  }
  
  /* Typography Utilities */
  .card-title {
    font-size: var(--text-card-title);
    font-weight: 700;
  }
  
  .card-value {
    font-size: var(--text-card-value);
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
}
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Foundation (1-2 hours)

**Objective:** Set up token system and breakpoints

**Tasks:**

1. **Update Tailwind Config** (15 min)
   - Add `tablet: '834px'` breakpoint
   - Commit: `feat(config): add iPad Pro 11" breakpoint`

2. **Create Token System** (45-60 min)
   - Add all 6 token categories to `app/globals.css`
   - Define values for all 4 breakpoints (mobile, tablet, tablet-xl, desktop)
   - Add custom media queries
   - Commit: `feat(design-tokens): add comprehensive iPad responsive tokens`

3. **Create Utility Classes** (30-45 min)
   - Add `.card-default`, `.card-compact`, `.grid-*`, `.card-title`, `.card-value` utilities
   - Test utility classes in browser DevTools
   - Commit: `feat(utilities): add token-based utility classes`

**Verification:**
- [ ] Tailwind compiles without errors
- [ ] Token values change in DevTools when resizing viewport
- [ ] Utility classes work correctly

---

### 4.2 Phase 2: Core Components (2-3 hours)

**Objective:** Migrate high-priority, frequently-used components

**Priority Order (highest impact first):**

**2.1 Sidebar Navigation** (30 min)
- File: `components/common/SidebarNav.tsx`
- Replace: `md:w-60 lg:w-72` → `style={{ width: 'var(--sidebar-width)' }}`
- Test: Verify sidebar width changes at 768px, 834px, 1024px
- Commit: `refactor(sidebar): migrate to token-based width`

**2.2 Menu Grid** (30 min)
- File: `components/order/MenuGrid.tsx`
- Replace: `grid grid-cols-* ...` → `.grid-menu` or token-based inline styles
- Test: Verify column counts (2→2→3→4) at breakpoints
- Commit: `refactor(menu-grid): migrate to token-based columns`

**2.3 Table Map** (30 min)
- File: `components/common/TableMap.tsx`
- Replace: Grid classes → token-based
- Replace: Padding classes → `p-[var(--page-margin)]`
- Test: Table cards layout at all breakpoints
- Commit: `refactor(table-map): migrate to token-based layout`

**2.4 POS Cart Panel** (30 min)
- File: `components/order/CartPanel.tsx`
- Replace: `md:w-[380px]` → `md:w-[var(--pos-cart-width)]`
- Replace: Padding → token-based
- Test: Cart width and spacing on tablet+
- Commit: `refactor(cart-panel): migrate to token-based sizing`

**2.5 Kitchen Screen** (30 min)
- File: `components/kitchen/KitchenScreen.tsx`
- Apply: `--kitchen-cols` token for grid
- Apply: `--card-padding` for order cards
- Test: Order card layout (1→2→3 columns)
- Commit: `refactor(kitchen): migrate to token-based grid`

**Verification per component:**
- [ ] Visual appearance matches original at all breakpoints
- [ ] No layout shifts or broken UI
- [ ] Spacing consistent with design
- [ ] Text readable at all sizes

---

### 4.3 Phase 3: Manager Pages (2-3 hours)

**Objective:** Migrate owner/manager control pages

**3.1 Loyalty Manager** (45 min)
- File: `components/loyalty/LoyaltyManager.tsx`
- Migrate: Stats cards grid → `.grid-cards` or token-based
- Migrate: Table typography → `--manager-table-font`
- Migrate: MemberDetailPanel → token-based widths
- Test: All sections responsive
- Commit: `refactor(loyalty): migrate to token-based layout`

**3.2 Menu Manager** (45 min)
- File: `components/menu/MenuManager.tsx`
- Migrate: Form layouts → responsive tokens
- Migrate: Menu items grid → `.grid-menu`
- Test: Add/edit modals, menu grid
- Commit: `refactor(menu-manager): migrate to token-based layout`

**3.3 Stock Manager** (45 min)
- File: `components/stock/StockManager.tsx`
- Similar patterns to Menu Manager
- Test: Stock table, purchase forms
- Commit: `refactor(stock): migrate to token-based layout`

**3.4 Promo Manager** (45 min)
- File: `components/promo/PromoManager.tsx`
- Migrate: Promo cards → token-based grid
- Test: Promo list, add/edit forms
- Commit: `refactor(promo): migrate to token-based layout`

---

### 4.4 Phase 4: Refinement (1-2 hours)

**Objective:** Polish typography, spacing, and card sizing across all screens

**4.1 Typography Pass** (30-45 min)
- Apply `--text-card-title` to all card titles
- Apply `--text-card-value` to all metric values
- Apply `--text-table-cell` to table content
- Verify readability at all breakpoints
- Commit: `refactor(typography): apply responsive text tokens`

**4.2 Spacing Pass** (30-45 min)
- Replace hardcoded `space-y-*` → `space-y-[var(--space-section)]`
- Replace hardcoded `gap-*` → token-based gaps
- Verify consistent spacing rhythm
- Commit: `refactor(spacing): apply spacing tokens`

**4.3 Card Sizing Pass** (30 min)
- Verify all cards use `--card-padding` variants
- Check card borders use `--card-radius`
- Ensure consistent shadows/elevation
- Commit: `refactor(cards): standardize card styling`

---

### 4.5 Phase 5: Testing & Validation (1 hour)

**Objective:** Comprehensive testing across all iPad variants

**5.1 Visual Testing Checklist**

Test each screen at these resolutions:

**iPad (10.2", 10.9")**
- [ ] Portrait: 768x1024
- [ ] Landscape: 1024x768

**iPad Pro 11"**
- [ ] Portrait: 834x1194
- [ ] Landscape: 1194x834

**iPad Pro 12.9"**
- [ ] Portrait: 1024x1366
- [ ] Landscape: 1366x1024

**Screens to test:**
- [ ] POS Order Screen (menu + cart)
- [ ] Table Map
- [ ] Kitchen Screen
- [ ] Checkout Screen
- [ ] Loyalty Manager
- [ ] Menu Manager
- [ ] Stock Manager
- [ ] Promo Manager
- [ ] Dashboard
- [ ] Sales History

**5.2 Interaction Testing**

- [ ] Touch targets minimum 44x44px
- [ ] Scrolling smooth (no jank)
- [ ] Modals/dialogs centered properly
- [ ] Buttons accessible without stretching
- [ ] Forms don't require horizontal scroll

**5.3 Edge Cases**

- [ ] Very long product names (wrap correctly)
- [ ] Empty states (centered, readable)
- [ ] Loading states (spinners centered)
- [ ] Error states (messages visible)
- [ ] Large data tables (horizontal scroll)

**5.4 Performance Check**

- [ ] No layout shift (CLS) on breakpoint change
- [ ] Smooth transitions between breakpoints
- [ ] No excessive re-renders

---

## 5. Migration Strategy

### 5.1 Incremental, Screen-by-Screen Approach

**Why This Approach:**
- ✅ Test each screen thoroughly before moving to next
- ✅ Minimize risk of breaking existing functionality
- ✅ Easy rollback if issues arise
- ✅ Allows parallel work on different screens
- ✅ Provides clear progress tracking

**Step-by-Step Process:**

1. **Add Foundation** (doesn't affect existing code)
   - Add all tokens to `globals.css`
   - Add Tailwind config
   - Commit

2. **Migrate One Component**
   - Update component to use tokens
   - Test thoroughly on iPad
   - Commit with descriptive message

3. **Verify in Browser**
   - Test at all 4 breakpoints
   - Check mobile still works
   - Check desktop still works

4. **If Issue Found:**
   - Revert that specific commit
   - Fix in separate branch
   - Re-test and merge

5. **Repeat for Next Component**

---

### 5.2 Rollback Plan

**If Critical Issue Detected:**

**Option A: Component-Level Rollback**
```bash
# Revert specific component commit
git revert <commit-hash>
git push
```
- Other migrated components continue working
- Token system stays in place

**Option B: Full Rollback (extreme)**
```bash
# Revert entire feature branch
git revert --no-commit <first-commit>..<last-commit>
git commit -m "revert: rollback iPad design system"
git push
```
- Only if fundamental design issue discovered
- Unlikely to be needed with incremental approach

---

### 5.3 Commit Message Convention

Use conventional commits for clear history:

```
feat(design-tokens): add iPad responsive token system
refactor(sidebar): migrate to token-based width
refactor(menu-grid): migrate to token-based columns
refactor(cart-panel): migrate to token-based sizing
fix(kitchen): correct column count at tablet-xl breakpoint
```

---

## 6. TypeScript Support (Optional Enhancement)

### 6.1 Type-Safe Token Access

Create typed token object for IDE autocomplete:

```typescript
// lib/designTokens.ts
export const tokens = {
  layout: {
    sidebarWidth: 'var(--sidebar-width)',
    sidebarPadding: 'var(--sidebar-padding)',
    contentPadding: 'var(--content-padding)',
    pageMargin: 'var(--page-margin)',
  },
  grid: {
    colsMenu: 'var(--grid-cols-menu)',
    colsTable: 'var(--grid-cols-table)',
    colsCards: 'var(--grid-cols-cards)',
    gap: 'var(--grid-gap)',
    gapLg: 'var(--grid-gap-lg)',
  },
  card: {
    padding: 'var(--card-padding)',
    paddingSm: 'var(--card-padding-sm)',
    paddingLg: 'var(--card-padding-lg)',
    radius: 'var(--card-radius)',
    radiusSm: 'var(--card-radius-sm)',
  },
  text: {
    cardTitle: 'var(--text-card-title)',
    cardValue: 'var(--text-card-value)',
    tableCell: 'var(--text-table-cell)',
  },
  spacing: {
    section: 'var(--space-section)',
    component: 'var(--space-component)',
    element: 'var(--space-element)',
  },
} as const;

export type DesignToken = typeof tokens[keyof typeof tokens][keyof typeof tokens[keyof typeof tokens]];
```

**Usage with Type Safety:**
```tsx
import { tokens } from '@/lib/designTokens';

<div style={{ 
  width: tokens.layout.sidebarWidth,      // ✅ Autocomplete works
  padding: tokens.card.padding,           // ✅ Type-safe
}}>
```

---

## 7. Success Criteria

### 7.1 Functional Requirements

- [ ] All components render correctly at 768px, 834px, 1024px breakpoints
- [ ] No horizontal scroll at any breakpoint (except intentional table scroll)
- [ ] Text remains readable at all sizes
- [ ] Touch targets meet 44x44px minimum
- [ ] All interactive elements accessible without zooming

### 7.2 Visual Requirements

- [ ] Consistent spacing rhythm across all screens
- [ ] Card padding scales proportionally
- [ ] Grid columns adjust appropriately (2→2→3→4 or similar)
- [ ] Typography hierarchy clear at all sizes
- [ ] No UI element overflow or clipping

### 7.3 Performance Requirements

- [ ] No layout shift (CLS) during resize
- [ ] Smooth transitions between breakpoints
- [ ] No excessive re-renders
- [ ] CSS compiles without warnings

### 7.4 Maintainability Requirements

- [ ] All tokens documented
- [ ] Utility classes created for common patterns
- [ ] TypeScript support (if implemented)
- [ ] Clear commit history
- [ ] Design doc updated with any deviations

---

## 8. Time Estimate

**Total: 7-11 hours**

| Phase | Task | Time Estimate |
|-------|------|---------------|
| **Phase 1** | Foundation Setup | 1-2 hours |
| **Phase 2** | Core Components (5 components) | 2-3 hours |
| **Phase 3** | Manager Pages (4 pages) | 2-3 hours |
| **Phase 4** | Refinement Pass | 1-2 hours |
| **Phase 5** | Testing & Validation | 1 hour |

**Breakdown by complexity:**
- Simple component (table map, cart panel): 30 min
- Medium component (menu grid, kitchen screen): 30-45 min
- Complex component (sidebar, manager pages): 45-60 min

---

## 9. Future Enhancements

### 9.1 Potential Additions

**Dark Mode Token Variants:**
```css
.dark {
  --card-padding: 1.25rem;  /* Slightly more padding in dark mode */
}
```

**Animation Tokens:**
```css
:root {
  --transition-fast: 150ms;
  --transition-normal: 300ms;
  --transition-slow: 500ms;
}
```

**Elevation Tokens:**
```css
:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

### 9.2 Design System Documentation

Create interactive documentation:
- Token value table (current values at each breakpoint)
- Component showcase (how each component uses tokens)
- Migration guide (how to add new components)

---

## 10. References

**iPad Specifications:**
- iPad 10.2": 768x1024 (portrait), 1024x768 (landscape)
- iPad Mini: 768x1024 (portrait), 1024x768 (landscape)
- iPad Air: 820x1180 (portrait), 1180x820 (landscape)
- iPad Pro 11": 834x1194 (portrait), 1194x834 (landscape)
- iPad Pro 12.9": 1024x1366 (portrait), 1366x1024 (landscape)

**Design Token Standards:**
- W3C Design Tokens Community Group: https://design-tokens.github.io/community-group/
- CSS Custom Properties Spec: https://www.w3.org/TR/css-variables/

**Tailwind CSS:**
- Custom Screens: https://tailwindcss.com/docs/screens
- CSS Variables in Tailwind: https://tailwindcss.com/docs/customizing-colors#using-css-variables

---

## Appendix A: Complete Token Reference

See implementation files:
- `app/globals.css` - Full token definitions
- `tailwind.config.ts` - Breakpoint configuration
- `lib/designTokens.ts` - TypeScript token exports (optional)

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-09  
**Next Review:** After Phase 5 completion
