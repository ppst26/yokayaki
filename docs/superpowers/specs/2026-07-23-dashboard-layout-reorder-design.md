# Dashboard Layout Reordering Design

**Date**: 2026-07-23  
**Status**: Proposed  

## 1. Goal
Restructure the **Owner Dashboard** (`components/OwnerDashboard.tsx`) layout:
1. Make the **Sales Chart (กราฟยอดขาย)** span **100% full width** as a standalone container.
2. Position the **Top Sellers Ranking (จัดอันดับเมนูขายดี)** and **Void Summary Log (สรุปการยกเลิกรายการอาหาร)** side-by-side in a 2-column grid (`grid-cols-1 lg:grid-cols-2 gap-6`) directly below the sales chart.

---

## 2. Component Layout Strategy (`components/OwnerDashboard.tsx`)

```
+-----------------------------------------------------------------------+
| 1. Metric Summary Cards (4 Cards Grid)                                |
+-----------------------------------------------------------------------+
| 2. Sales Chart Block (Full Width Card)                                |
+---------------------------------------------------+-------------------+
| 3a. Top Sellers Ranking (Card 1 - 50% Width)      | 3b. Void Summary  |
|                                                   |     (Card 2 - 50%)|
+---------------------------------------------------+-------------------+
```

### Detailed Section Specs
1. **Sales Chart Card**:
   - Standalone full-width container (`w-full bg-white border rounded-2xl p-6`).
   - Adaptive sales chart bars (`h-64`) expand cleanly across the entire stage.

2. **Bottom Dual-Card Grid (`grid grid-cols-1 lg:grid-cols-2 gap-6`)**:
   - **Left Card**: Top Sellers Ranking with top 5 items.
   - **Right Card**: Void Summary Log with waste totals, top 3 voided items, and detail audit button.

---

## 3. Verification Plan
- Run `npx tsc --noEmit` to verify type safety.
- Run `npx next build` to verify Next.js production build compilation.
