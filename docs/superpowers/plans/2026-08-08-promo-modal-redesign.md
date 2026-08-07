# Promotion Creation & Edit Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Promotion Creation & Edit Modal in `PromoManager.tsx` with a 3-column card selector and dynamic form fields per promotion type.

**Architecture:** Update state handlers and modal JSX in `components/promo/PromoManager.tsx`. Replace single `<select>` with a styled 3-card toggle grid. Conditionally render forms for Discount (%, fixed, Happy Hour with specific menu selection), Coupon (code input, discount value), and Buy X Get Y (menu selector, buy qty, free qty, Happy Hour times).

**Tech Stack:** React 19, TypeScript strict mode, TailwindCSS 4, Lucide React icons, Supabase JS.

## Global Constraints

- Tech Stack: Next.js 16, React 19, TailwindCSS 4, pnpm
- File to touch: `components/promo/PromoManager.tsx`
- Strict TypeScript validation: `npx tsc --noEmit` must pass with zero errors

---

### Task 1: Update Modal State & Form Render Logic in `PromoManager.tsx`

**Files:**
- Modify: `components/promo/PromoManager.tsx`

**Interfaces:**
- Consumes: `Promotion` interface, `menuItems` state, Supabase `promotions` schema
- Produces: Updated Modal UI with Grid-3 selector and dynamic form rendering

- [ ] **Step 1: Check existing modal state variables**

In `PromoManager.tsx`, ensure all required state variables exist:
- `type`: `'percentage' | 'fixed' | 'buy_x_get_y'`
- `name`: `string`
- `discountPercent`: `string`
- `discountAmount`: `string`
- `minOrderAmount`: `string`
- `buyQty`: `string`
- `freeQty`: `string`
- `menuItemId`: `string`
- `couponCode`: `string`
- `startTime`: `string`
- `endTime`: `string`
- Add `isHappyHour`: `boolean` state for explicit Happy Hour toggle

- [ ] **Step 2: Update `openAdd` and `openEdit` handlers**

In `PromoManager.tsx`, update helper functions to correctly set `isHappyHour` boolean state based on presence of `p.start_time` or `p.end_time`.

- [ ] **Step 3: Update Modal JSX with 3-Column Card Selector & Dynamic Forms**

Replace the current `<select>` dropdown inside the modal with:
1. `grid grid-cols-3 gap-2.5` selector buttons for `ส่วนลด`, `คูปอง`, `ซื้อ - แถม` with icons (`TicketPercent`, `Tag`, `Gift`).
2. Conditional section for `ส่วนลด`: Segmented control for `%` vs `บาท`, Min Order Amount, Target Menu dropdown, Happy Hour toggle + Time inputs.
3. Conditional section for `คูปอง`: Uppercase Coupon Code input, Segmented control for `%` vs `บาท`, Min Order Amount, Target Menu dropdown.
4. Conditional section for `ซื้อ - แถม`: Target Menu dropdown (Required), Buy Qty (X), Free Qty (Y), Happy Hour toggle + Time inputs.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`  
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add components/promo/PromoManager.tsx
git commit -m "feat(promo): redesign promo modal with grid-3 selector and dynamic forms"
```

---

### Task 2: End-to-End Verification & Sanity Test

**Files:**
- Verify: `components/promo/PromoManager.tsx`

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 2: Verify git status & build**

Run: `git status`  
Expected: Working tree clean
