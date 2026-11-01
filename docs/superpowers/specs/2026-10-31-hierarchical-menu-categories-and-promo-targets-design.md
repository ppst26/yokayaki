# Hierarchical Menu Categories & Multi-Target Promotions Design Specification

- **Date:** 2026-10-31
- **Status:** Approved
- **Target Release:** Yokayaki POS Next Milestone

---

## 1. Executive Summary & Goals

### 1.1 Problem Statement
1. **Flat Categories:** Currently, `menu_categories` only supports a single flat list of categories. Restaurant owners cannot group items hierarchically into parent categories (e.g. "อาหาร" / Food, "เครื่องดื่ม" / Beverages) and sub-categories (e.g. "ของทานเล่น", "จานหลัก", "แอลกอฮอล์").
2. **Limited Promotion Targeting:** The current `promotions` table only supports applying a discount to either a single menu item (`menu_item_id`) or the entire bill (`menu_item_id IS NULL`). The restaurant cannot apply promotions across multiple items, specific sub-categories, or entire main categories (such as 10% off all food items while excluding beverages).

### 1.2 Goals
- **2-Tier Hierarchical Categories:** Support Main Categories (กลุ่มใหญ่) and Sub Categories (กลุ่มย่อย).
- **Interactive Drag & Drop UI:** Provide an intuitive Drag & Drop modal in Menu Manager to reorder categories, nest sub-categories under main categories, and commit changes with a "Save" action.
- **Multi-Target Promotion Scope:** Enable promotions to target multiple items, specific sub-categories, and/or whole main categories.
- **Accurate Item-Level Discount Calculation:** In `complete_checkout` RPC, calculate percentage discounts exclusively on qualifying items (e.g. 10% off Food reduces 10% of Food subtotal only; Beverage subtotal remains unaffected).
- **Dual-Tier Navigation:** Provide clean 2-tier navigation tabs on POS and Customer QR portals.
- **Security & Integrity Compliance:** Retain 100% adherence to Yokayaki security standards (A1–A7: RLS, authenticated-only grants, server-side RPC calculations, zero anon privilege).

### 1.3 Non-Goals
- N-level infinite nesting (restricted to 2 tiers: Main Category -> Sub Category for maximum operational speed).
- Dragging individual menu items directly in the Category Manager (menu item assignment continues to be handled via Menu Item modal forms).

---

## 2. Architecture & Data Model

### 2.1 Database Schema Changes

#### 2.1.1 `menu_categories` Table Alteration
Add `parent_id` column referencing `menu_categories(id)`.
```sql
ALTER TABLE public.menu_categories 
  ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES public.menu_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_categories_parent_id 
  ON public.menu_categories (parent_id);
```
- **Semantics:**
  - `parent_id IS NULL`: Main Category (กลุ่มใหญ่).
  - `parent_id IS NOT NULL`: Sub Category (กลุ่มย่อย) belonging to the referenced parent category.
  - `ON DELETE SET NULL`: Deleting a parent category unlinks sub-categories rather than cascading deletion.

#### 2.1.2 New Table: `promotion_targets`
Unified junction table linking promotions to target categories and menu items.
```sql
CREATE TABLE IF NOT EXISTS public.promotion_targets (
  id           SERIAL PRIMARY KEY,
  org_id       UUID NOT NULL DEFAULT public.jwt_org_id() 
               REFERENCES public.organizations(id) ON DELETE CASCADE,
  promotion_id INT NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('main_category', 'sub_category', 'menu_item')),
  target_id    INT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (promotion_id, target_type, target_id)
);

-- Indexes for hot query matching
CREATE INDEX IF NOT EXISTS idx_promo_targets_promo_id 
  ON public.promotion_targets (promotion_id);
CREATE INDEX IF NOT EXISTS idx_promo_targets_type_id 
  ON public.promotion_targets (target_type, target_id);
```

#### 2.1.3 Security & RLS Policies
```sql
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.promotion_targets FROM anon, PUBLIC;
GRANT SELECT ON public.promotion_targets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotion_targets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.promotion_targets_id_seq TO authenticated;

-- Read policy: Staff / POS / Catalog
CREATE POLICY promo_targets_read ON public.promotion_targets
  FOR SELECT TO authenticated
  USING (
    org_id = public.jwt_org_id()
    AND (public.can_operate_pos() OR public.can_write_catalog() OR public.can_kitchen())
  );

-- Write policy: Owner / Manager only
CREATE POLICY promo_targets_write ON public.promotion_targets
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_write_catalog())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_write_catalog());
```

---

## 3. Checkout RPC Business Logic (`complete_checkout`)

### 3.1 Qualifying Items Resolution
When evaluating a promotion `v_promo` in `complete_checkout`:
1. Check if targets exist:
   ```sql
   SELECT EXISTS(SELECT 1 FROM public.promotion_targets WHERE promotion_id = v_promo.id) INTO v_has_targets;
   ```
2. If `v_has_targets` is FALSE:
   - Promotion applies to all active order items in the order.
3. If `v_has_targets` is TRUE:
   - An item `oi` qualifies if:
     - Directly specified in `promotion_targets` with `target_type = 'menu_item'` and `target_id = oi.menu_item_id`.
     - OR `mi.category` matches a sub-category in `promotion_targets` (`target_type = 'sub_category'`).
     - OR `mi.category` belongs to a parent category in `promotion_targets` (`target_type = 'main_category'`).

### 3.2 Discount Computation
- **Percentage Discount:**
  ```sql
  SELECT COALESCE(SUM(ROUND(oi.quantity * oi.unit_price * v_promo.discount_percent / 100.0, 0)), 0)
  INTO v_value
  FROM order_items oi
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE oi.order_id = p_order_id AND oi.status <> 'voided'
    AND (<item qualifies based on 3.1>);
  ```
- **Buy X Get Y Discount:**
  Evaluated across qualifying sets of items.
- **Fixed Discount:**
  Deducted once if order reaches minimum spend criteria on qualifying items.

---

## 4. UI / UX Design

### 4.1 Category Manager Modal (`CategoryManagerModal.tsx`)
- **Structure:**
  - Top action bar: `[+ เพิ่มกลุ่มหลักใหม่]` (Add Main Category)
  - Vertical list of Main Category containers.
  - Inside each Main Category: Dropzone displaying child Sub Categories.
  - Reordering grips `[::]` on both Main Categories and Sub Categories.
- **Drag & Drop Interactions:**
  - Drag Sub Category within the same Main Category to reorder `sort_order`.
  - Drag Sub Category across to another Main Category to update `parent_id`.
  - Drag Main Categories to reorder main tabs on POS.
  - Unsaved indicator badge + prompt if trying to close without saving.
  - `[💾 บันทึกการจัดกลุ่ม]` (Save) button commits updated `parent_id` and `sort_order` atomically.

### 4.2 Promotion Target Selector (`PromoManager.tsx`)
- Scope selection: `( ) ทั้งร้าน (All items)` vs `(•) กำหนดเฉพาะกลุ่มหรือเมนู (Targeted)`
- Tree picker with search:
  - Checkbox on Main Category (auto-selects all child sub-categories and items).
  - Expandable to reveal Sub Categories with individual checkboxes.
  - Expandable to reveal individual Menu Items with checkboxes.
- Active target pills / chips at the bottom with quick remove `[✕]`.

### 4.3 POS & Customer Ordering Screens
- **POS Screen (`MenuGrid.tsx`):**
  - Row 1: Main Category Pills (`[ ทั้งหมด ]`, `[ 🍱 อาหาร ]`, `[ 🍹 เครื่องดื่ม ]`, ...).
  - Row 2: Sub Category Chips relevant to selected Main Category.
- **Customer Portal (`app/customer/[session_id]/page.tsx`):**
  - Smooth horizontal scroll pills for Main Categories and child Sub Categories.
  - Responsive visual promo badge `[🏷️ ลด 10%]` on qualifying items.

---

## 5. Testing & Verification Plan

### 5.1 Database Regression Tests (`supabase/tests/checkout_promo.sql`)
1. Create Main Category "Food" and Sub Category "Appetizers" (`parent_id` linked).
2. Create Main Category "Beverages" and Sub Category "Alcohol" (`parent_id` linked).
3. Create Menu Items under "Appetizers" and "Alcohol".
4. Create Promo 1: 10% off Main Category "Food".
5. Run `complete_checkout` on order with 500 THB Food + 200 THB Alcohol:
   - Assert discount is exactly 50 THB (Food only, Alcohol excluded).
6. Create Promo 2: Multi-item selection (Item A + Item B).
   - Assert only Item A and Item B receive discounts.
7. Run complete test suite via `pnpm db:test` (must pass 100% of all tests).

### 5.2 Frontend UI Verification
- Verify drag-and-drop reordering works smoothly on desktop mouse and touch devices.
- Verify save commit updates database correctly without reload glitches.
- Verify POS navigation tabs switch sub-categories properly.
- Verify Customer QR portal reflects category structure without exposing direct Supabase credentials.

