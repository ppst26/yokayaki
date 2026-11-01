# Hierarchical Menu Categories & Multi-Target Promotions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-tier hierarchical category system (Main Categories -> Sub Categories) with a Drag & Drop reordering interface and multi-target promotion scoping across categories and menu items.

**Architecture:** Database schema introduces `parent_id` in `menu_categories` and a new `promotion_targets` junction table. The PostgreSQL `complete_checkout` RPC is updated to calculate percentage discounts exclusively on qualifying items. The UI adds a 2-tier drag-and-drop category editor, a flexible promotion target selector, and dual-tier category navigation on both POS and customer portals.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Supabase (PostgreSQL 15+ / RPC / RLS), Tailwind CSS 4, Vitest, Lucide React.

## Global Constraints
- Security: All database policies `TO authenticated`; zero access for `anon` role.
- All new RPCs / functions must execute `REVOKE EXECUTE ... FROM PUBLIC, anon`.
- Calculation Integrity: Promotion discounts must be computed strictly inside Postgres RPC (`complete_checkout`), never trusted from client input.
- Package Manager: `pnpm` exclusively (never `npm` or `yarn`).

---

### Task 1: Database Migration — Schema & RPC Hardening

**Files:**
- Create: `supabase/migrations/20261031_hierarchical_categories_and_promo_targets.sql`

**Interfaces:**
- Produces: 
  - `menu_categories.parent_id` column with index
  - `promotion_targets` table with RLS and authenticated grants
  - Updated `complete_checkout` function supporting `promotion_targets`

- [ ] **Step 1: Write the migration SQL file**
Write `supabase/migrations/20261031_hierarchical_categories_and_promo_targets.sql`:
```sql
BEGIN;

-- 1. Add parent_id to menu_categories for 2-tier hierarchy
ALTER TABLE public.menu_categories 
  ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES public.menu_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_categories_parent_id 
  ON public.menu_categories (parent_id);

-- 2. Create promotion_targets table
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

CREATE INDEX IF NOT EXISTS idx_promo_targets_promo_id 
  ON public.promotion_targets (promotion_id);
CREATE INDEX IF NOT EXISTS idx_promo_targets_type_id 
  ON public.promotion_targets (target_type, target_id);

-- 3. RLS & Privileges
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.promotion_targets FROM anon, PUBLIC;
GRANT SELECT ON public.promotion_targets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotion_targets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.promotion_targets_id_seq TO authenticated;

DROP POLICY IF EXISTS promo_targets_read ON public.promotion_targets;
CREATE POLICY promo_targets_read ON public.promotion_targets
  FOR SELECT TO authenticated
  USING (
    org_id = public.jwt_org_id()
    AND (public.can_operate_pos() OR public.can_write_catalog() OR public.can_kitchen())
  );

DROP POLICY IF EXISTS promo_targets_write ON public.promotion_targets;
CREATE POLICY promo_targets_write ON public.promotion_targets
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_write_catalog())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_write_catalog());

-- 4. Update complete_checkout RPC to support promotion_targets
CREATE OR REPLACE FUNCTION public.complete_checkout(
  p_order_id      INT,
  p_cash_received DECIMAL(10, 2) DEFAULT 0,
  p_coupon_code   VARCHAR(30)    DEFAULT NULL,
  p_phone_number  VARCHAR(10)    DEFAULT NULL,
  p_points_redeem INT            DEFAULT 0
) RETURNS TABLE (
  status           TEXT,
  payment_id       INT,
  subtotal         DECIMAL(10, 2),
  promo_discount   DECIMAL(10, 2),
  points_redeemed  INT,
  discount_amount  DECIMAL(10, 2),
  net_amount       DECIMAL(10, 2),
  points_earned    INT,
  cash_amount      DECIMAL(10, 2),
  promptpay_amount DECIMAL(10, 2),
  change_amount    DECIMAL(10, 2),
  payment_method   TEXT,
  applied_promos   JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  c_points_per_baht CONSTANT INT := 10;
  c_store_tz        CONSTANT TEXT := 'Asia/Bangkok';

  v_order_status   TEXT;
  v_table_id       UUID;
  v_emp_id         INT;
  v_emp_name       TEXT;
  v_org_id         UUID;
  v_today          DATE;
  v_promo          RECORD;
  v_value          DECIMAL(10, 2);
  v_free           JSONB;
  v_set_size       INT;
  v_member_pts     INT;
  v_pts_to_use     INT := 0;
  v_pts_discount   DECIMAL(10, 2) := 0;
  v_phone          VARCHAR(10);
  v_pay_id         INT;
  v_cash_in        DECIMAL(10, 2);
  v_has_targets    BOOLEAN;

  r_subtotal       DECIMAL(10, 2) := 0;
  r_promo_disc     DECIMAL(10, 2) := 0;
  r_total_disc     DECIMAL(10, 2) := 0;
  r_net            DECIMAL(10, 2) := 0;
  r_pts_earned     INT := 0;
  r_cash           DECIMAL(10, 2) := 0;
  r_promptpay      DECIMAL(10, 2) := 0;
  r_change         DECIMAL(10, 2) := 0;
  r_method         TEXT;
  r_applied        JSONB := '[]'::JSONB;
BEGIN
  IF NOT (public.can_operate_pos() OR public.can_write_catalog()) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ปิดบิล (ต้องเป็น staff หรือ owner)';
  END IF;

  v_emp_id   := public.jwt_emp_id();
  v_emp_name := public.jwt_emp_name();
  v_org_id   := public.jwt_org_id();

  SELECT o.status, o.table_id INTO v_order_status, v_table_id
  FROM orders o
  WHERE o.id = p_order_id AND o.org_id = v_org_id
  FOR UPDATE;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION 'ไม่พบออเดอร์หมายเลข %', p_order_id;
  END IF;

  IF v_order_status <> 'active' THEN
    RAISE EXCEPTION 'ออเดอร์นี้อยู่ในสถานะ % ไม่สามารถปิดบิลซ้ำได้', v_order_status;
  END IF;

  SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) INTO r_subtotal
  FROM order_items oi
  WHERE oi.order_id = p_order_id AND oi.status <> 'voided';

  v_today := (NOW() AT TIME ZONE c_store_tz)::DATE;

  FOR v_promo IN
    SELECT * FROM promotions p
    WHERE p.org_id = v_org_id
      AND COALESCE(p.is_active, FALSE)
      AND (p.start_date IS NULL OR p.start_date <= v_today)
      AND (p.end_date   IS NULL OR p.end_date   >= v_today)
    ORDER BY p.id
  LOOP
    IF v_promo.type = 'fixed' AND v_promo.coupon_code IS NOT NULL THEN
      IF p_coupon_code IS NULL
         OR UPPER(TRIM(p_coupon_code)) <> UPPER(TRIM(v_promo.coupon_code)) THEN
        CONTINUE;
      END IF;
    END IF;

    IF COALESCE(v_promo.min_order_amount, 0) > 0
       AND r_subtotal < v_promo.min_order_amount THEN
      CONTINUE;
    END IF;

    v_value := 0;
    v_free  := NULL;

    SELECT EXISTS(
      SELECT 1 FROM promotion_targets pt WHERE pt.promotion_id = v_promo.id
    ) INTO v_has_targets;

    IF v_promo.type = 'percentage' AND COALESCE(v_promo.discount_percent, 0) > 0 THEN
      IF NOT v_has_targets AND v_promo.menu_item_id IS NULL 
         AND v_promo.start_time IS NULL AND v_promo.end_time IS NULL THEN
        v_value := ROUND(r_subtotal * v_promo.discount_percent / 100.0, 0);
      ELSE
        SELECT COALESCE(SUM(ROUND(oi.quantity * oi.unit_price * v_promo.discount_percent / 100.0, 0)), 0)
        INTO v_value
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = p_order_id AND oi.status <> 'voided'
          AND (
            NOT v_has_targets AND (v_promo.menu_item_id IS NULL OR oi.menu_item_id = v_promo.menu_item_id)
            OR (
              v_has_targets AND (
                EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'menu_item' AND pt.target_id = oi.menu_item_id
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories c ON c.id = pt.target_id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'sub_category' AND c.name = mi.category
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories parent ON parent.id = pt.target_id
                  JOIN menu_categories child ON child.parent_id = parent.id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'main_category' AND child.name = mi.category
                )
              )
            )
          )
          AND (v_promo.start_time IS NULL OR v_promo.end_time IS NULL
               OR ((oi.created_at AT TIME ZONE c_store_tz)::TIME >= v_promo.start_time
                   AND (oi.created_at AT TIME ZONE c_store_tz)::TIME <  v_promo.end_time));
      END IF;

    ELSIF v_promo.type = 'fixed' THEN
      v_value := COALESCE(v_promo.discount_amount, 0);

    ELSIF v_promo.type = 'buy_x_get_y'
          AND COALESCE(v_promo.buy_qty, 0) > 0 AND COALESCE(v_promo.free_qty, 0) > 0 THEN
      v_set_size := v_promo.buy_qty + v_promo.free_qty;

      WITH grouped AS (
        SELECT oi.menu_item_id, mi.name,
               SUM(oi.quantity)::INT AS qty,
               MIN(oi.unit_price)    AS price
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = p_order_id AND oi.status <> 'voided'
          AND (
            NOT v_has_targets AND (v_promo.menu_item_id IS NULL OR oi.menu_item_id = v_promo.menu_item_id)
            OR (
              v_has_targets AND (
                EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'menu_item' AND pt.target_id = oi.menu_item_id
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories c ON c.id = pt.target_id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'sub_category' AND c.name = mi.category
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories parent ON parent.id = pt.target_id
                  JOIN menu_categories child ON child.parent_id = parent.id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'main_category' AND child.name = mi.category
                )
              )
            )
          )
        GROUP BY oi.menu_item_id, mi.name
      ), freebies AS (
        SELECT g.name, g.price,
               (FLOOR(g.qty::NUMERIC / v_set_size) * v_promo.free_qty)::INT AS free_qty
        FROM grouped g
      )
      SELECT COALESCE(SUM(f.free_qty * f.price), 0),
             COALESCE(jsonb_agg(jsonb_build_object('name', f.name, 'qty', f.free_qty)), '[]'::JSONB)
      INTO v_value, v_free
      FROM freebies f WHERE f.free_qty > 0;
    END IF;

    IF COALESCE(v_value, 0) > 0 THEN
      r_promo_disc := r_promo_disc + v_value;
      r_applied := r_applied || jsonb_build_object(
        'promotion_id',   v_promo.id,
        'promotion_name', v_promo.name,
        'promotion_type', v_promo.type,
        'discount_value', v_value,
        'free_items',     v_free
      );
    END IF;
  END LOOP;

  r_promo_disc := LEAST(r_promo_disc, r_subtotal);

  IF p_phone_number IS NOT NULL AND LENGTH(TRIM(p_phone_number)) = 10 THEN
    v_phone := TRIM(p_phone_number);
    SELECT lm.points INTO v_member_pts
    FROM loyalty_members lm 
    WHERE lm.phone_number = v_phone AND lm.org_id = v_org_id 
    FOR UPDATE;
  END IF;

  IF v_member_pts IS NOT NULL THEN
    v_pts_to_use := GREATEST(0, LEAST(COALESCE(p_points_redeem, 0), v_member_pts));
    v_pts_discount := LEAST(v_pts_to_use::DECIMAL(10, 2), r_subtotal - r_promo_disc);
    v_pts_to_use := v_pts_discount::INT;
  END IF;

  r_total_disc := r_promo_disc + v_pts_discount;
  r_net        := GREATEST(0, r_subtotal - r_total_disc);
  r_pts_earned := FLOOR(r_net / c_points_per_baht)::INT;

  v_cash_in := GREATEST(0, COALESCE(p_cash_received, 0));
  IF v_cash_in >= r_net THEN
    r_cash      := r_net;
    r_promptpay := 0;
    r_change    := v_cash_in - r_net;
    r_method    := 'cash';
  ELSIF v_cash_in > 0 THEN
    r_cash      := v_cash_in;
    r_promptpay := r_net - v_cash_in;
    r_change    := 0;
    r_method    := 'mixed';
  ELSE
    r_cash      := 0;
    r_promptpay := r_net;
    r_change    := 0;
    r_method    := 'promptpay';
  END IF;

  INSERT INTO payments (
    order_id, subtotal, discount_amount, net_amount,
    cash_amount, promptpay_amount, change_amount,
    payment_method, points_earned, points_redeemed,
    phone_number, created_by, created_by_name, org_id
  ) VALUES (
    p_order_id, r_subtotal, r_total_disc, r_net,
    r_cash, r_promptpay, r_change,
    r_method, r_pts_earned, v_pts_to_use,
    v_phone, v_emp_id, v_emp_name, v_org_id
  ) RETURNING id INTO v_pay_id;

  IF jsonb_array_length(r_applied) > 0 THEN
    INSERT INTO payment_promotions (payment_id, promotion_id, discount_applied, org_id)
    SELECT v_pay_id, (p->>'promotion_id')::INT, (p->>'discount_value')::DECIMAL, v_org_id
    FROM jsonb_array_elements(r_applied) p;
  END IF;

  IF v_phone IS NOT NULL THEN
    UPDATE loyalty_members
    SET points = points - v_pts_to_use + r_pts_earned,
        total_spent = total_spent + r_net
    WHERE phone_number = v_phone AND org_id = v_org_id;

    IF v_pts_to_use > 0 THEN
      INSERT INTO points_logs (member_phone, points_change, reason, org_id)
      VALUES (v_phone, -v_pts_to_use, 'Redeemed in order #' || p_order_id, v_org_id);
    END IF;
    IF r_pts_earned > 0 THEN
      INSERT INTO points_logs (member_phone, points_change, reason, org_id)
      VALUES (v_phone, r_pts_earned, 'Earned from order #' || p_order_id, v_org_id);
    END IF;
  END IF;

  UPDATE orders
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_order_id AND org_id = v_org_id;

  UPDATE order_items
  SET status = 'served'
  WHERE order_id = p_order_id AND status = 'pending';

  IF v_table_id IS NOT NULL THEN
    UPDATE tables SET status = 'vacant' WHERE id = v_table_id AND org_id = v_org_id;
    UPDATE qr_sessions
    SET status = 'expired'
    WHERE table_id = v_table_id AND org_id = v_org_id AND status = 'active';
  END IF;

  RETURN QUERY SELECT
    'success'::TEXT, v_pay_id, r_subtotal, r_promo_disc,
    v_pts_to_use, r_total_disc, r_net, r_pts_earned,
    r_cash, r_promptpay, r_change, r_method, r_applied;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.complete_checkout(INT, DECIMAL, VARCHAR, VARCHAR, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_checkout(INT, DECIMAL, VARCHAR, VARCHAR, INT) TO authenticated;

COMMIT;
```

- [ ] **Step 2: Commit the migration**
```bash
git add supabase/migrations/20261031_hierarchical_categories_and_promo_targets.sql
git commit -m "feat(db): add hierarchical categories and promotion_targets schema"
```

---

### Task 2: Database Regression Tests

**Files:**
- Modify: `supabase/tests/checkout_promo.sql`

**Interfaces:**
- Consumes: `complete_checkout`, `promotion_targets`, `menu_categories (parent_id)`
- Produces: Verified SQL assertions in docker test suite

- [ ] **Step 1: Write test assertions in `supabase/tests/checkout_promo.sql`**
Append target promotion test cases to `supabase/tests/checkout_promo.sql`:
```sql
-- -------------------------------------------------------------
-- ส่วนลดเฉพาะกลุ่มใหญ่ (Food 10% - อาหารลด เครื่องดื่มไม่ลด)
-- -------------------------------------------------------------
DO $$
DECLARE
  v_main_food INT;
  v_sub_snack INT;
  v_main_bev  INT;
  v_sub_drink INT;
  v_food_item INT;
  v_bev_item  INT;
  v_promo     INT;
  v_order     INT;
  v_res       RECORD;
  v_tbl1      UUID := pg_temp.table_id(1);
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"ผู้ทดสอบ","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  -- Setup categories
  INSERT INTO menu_categories (name, parent_id, org_id) VALUES ('กลุ่มอาหารทดสอบ', NULL, '00000000-0000-4000-8000-000000000001') RETURNING id INTO v_main_food;
  INSERT INTO menu_categories (name, parent_id, org_id) VALUES ('อาหารทานเล่นทดสอบ', v_main_food, '00000000-0000-4000-8000-000000000001') RETURNING id INTO v_sub_snack;

  INSERT INTO menu_categories (name, parent_id, org_id) VALUES ('กลุ่มเครื่องดื่มทดสอบ', NULL, '00000000-0000-4000-8000-000000000001') RETURNING id INTO v_main_bev;
  INSERT INTO menu_categories (name, parent_id, org_id) VALUES ('เครื่องดื่มทั่วไปทดสอบ', v_main_bev, '00000000-0000-4000-8000-000000000001') RETURNING id INTO v_sub_drink;

  -- Setup menu items
  INSERT INTO menu_items (name, price, stock, is_happy_hour, category, is_stock_tracked, org_id)
  VALUES ('เกี๊ยวซ่าทดสอบ', 500.00, 50, FALSE, 'อาหารทานเล่นทดสอบ', TRUE, '00000000-0000-4000-8000-000000000001')
  RETURNING id INTO v_food_item;

  INSERT INTO menu_items (name, price, stock, is_happy_hour, category, is_stock_tracked, org_id)
  VALUES ('ชาเขียวทดสอบ', 200.00, 50, FALSE, 'เครื่องดื่มทั่วไปทดสอบ', TRUE, '00000000-0000-4000-8000-000000000001')
  RETURNING id INTO v_bev_item;

  -- Create promo targeting Main Category (Food)
  INSERT INTO promotions (name, type, discount_percent, min_order_amount, is_active, org_id)
  VALUES ('ลดกลุ่มอาหาร 10%', 'percentage', 10, 0, TRUE, '00000000-0000-4000-8000-000000000001')
  RETURNING id INTO v_promo;
  PERFORM pg_temp.only_promo(v_promo);

  INSERT INTO promotion_targets (promotion_id, target_type, target_id, org_id)
  VALUES (v_promo, 'main_category', v_main_food, '00000000-0000-4000-8000-000000000001');

  -- Order 500 Food + 200 Bev = 700 THB
  PERFORM pg_temp.reset_table(v_tbl1);
  PERFORM public.place_order_item(v_tbl1, v_food_item, 1, NULL);
  PERFORM public.place_order_item(v_tbl1, v_bev_item, 1, NULL);

  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = v_tbl1 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 1000, NULL, NULL, 0);

  -- Assert: Discount = 50 (10% of 500), Net = 650
  IF v_res.subtotal <> 700 OR v_res.promo_discount <> 50 OR v_res.net_amount <> 650 THEN
    RAISE EXCEPTION 'Targeted Main Category Promo ล้มเหลว: subtotal %, discount % (คาดหวัง 50), net % (คาดหวัง 650)',
      v_res.subtotal, v_res.promo_discount, v_res.net_amount;
  END IF;
END $$;
```

- [ ] **Step 2: Run docker tests to verify**
Run: `pnpm db:reset && pnpm db:test`
Expected output: All 50+ assertions pass including target promo checks.

- [ ] **Step 3: Commit test updates**
```bash
git add supabase/tests/checkout_promo.sql
git commit -m "test(db): add regression tests for category target promotions"
```

---

### Task 3: Data Access Layer & Category Tree Helpers

**Files:**
- Modify: `lib/menuCategories.ts`
- Create: `lib/promoTargets.ts`
- Modify: `lib/menuCategories.test.ts`
- Create: `lib/promoTargets.test.ts`

**Interfaces:**
- Produces in `lib/menuCategories.ts`:
  - `MenuCategoryRow` with `parent_id?: number | null`
  - `CategoryTreeItem`: `{ id, name, sort_order, parent_id, children: CategoryTreeItem[] }`
  - `buildCategoryTree(categories: MenuCategoryRow[]): CategoryTreeItem[]`
  - `saveCategoryHierarchy(updates: Array<{ id: number; parent_id: number | null; sort_order: number }>): Promise<{ error: string | null }>`
- Produces in `lib/promoTargets.ts`:
  - `PromotionTargetRow`: `{ id, promotion_id, target_type, target_id }`
  - `fetchPromotionTargets(promoId: number): Promise<PromotionTargetRow[]>`
  - `savePromotionTargets(promoId: number, targets: Array<{ target_type: string; target_id: number }>): Promise<{ error: string | null }>`

- [ ] **Step 1: Write unit tests in `lib/menuCategories.test.ts`**
```typescript
it('buildCategoryTree correctly groups parent and child categories', () => {
  const rows: MenuCategoryRow[] = [
    { id: 1, org_id: 'org1', name: 'อาหาร', sort_order: 1, parent_id: null, created_at: '' },
    { id: 2, org_id: 'org1', name: 'ของทานเล่น', sort_order: 1, parent_id: 1, created_at: '' },
    { id: 3, org_id: 'org1', name: 'จานหลัก', sort_order: 2, parent_id: 1, created_at: '' },
    { id: 4, org_id: 'org1', name: 'เครื่องดื่ม', sort_order: 2, parent_id: null, created_at: '' },
  ];
  const tree = buildCategoryTree(rows);
  expect(tree).toHaveLength(2);
  expect(tree[0].name).toBe('อาหาร');
  expect(tree[0].children).toHaveLength(2);
  expect(tree[0].children[0].name).toBe('ของทานเล่น');
  expect(tree[1].name).toBe('เครื่องดื่ม');
  expect(tree[1].children).toHaveLength(0);
});
```

- [ ] **Step 2: Run unit test to verify failure**
Run: `pnpm test:unit lib/menuCategories.test.ts`
Expected: FAIL (buildCategoryTree is not defined).

- [ ] **Step 3: Implement tree helpers in `lib/menuCategories.ts` and `lib/promoTargets.ts`**
Update `lib/menuCategories.ts` with `buildCategoryTree` and `saveCategoryHierarchy`.
Create `lib/promoTargets.ts` with Supabase fetch/save functions.

- [ ] **Step 4: Run unit tests to verify pass**
Run: `pnpm test:unit lib/menuCategories.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/menuCategories.ts lib/promoTargets.ts lib/menuCategories.test.ts
git commit -m "feat: add category tree helpers and promo targets data layer"
```

---

### Task 4: Drag & Drop Category Management UI

**Files:**
- Modify: `components/menu/CategoryManagerModal.tsx`

**Interfaces:**
- Consumes: `buildCategoryTree`, `saveCategoryHierarchy`, `addMenuCategory`, `deleteMenuCategory`
- Produces: 2-Tier interactive board with drag & drop, add main, add sub, and Save Changes button.

- [ ] **Step 1: Update `CategoryManagerModal.tsx` state and UI**
Implement:
- Local state for category tree: `tree: CategoryTreeItem[]` and `isDirty: boolean`.
- Handlers for:
  - Drag Main Category to reorder: updates main category indices in `tree`.
  - Drag Sub Category within/across Main Categories: updates parent and child positions in `tree`.
  - Add Main Category: adds node with `parent_id = null`.
  - Add Sub Category: adds node with `parent_id = targetParentId`.
  - Inline rename for both parent and child.
  - Delete category with confirmation.
- Bottom actions:
  - Dirty banner: "⚠️ มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก"
  - `[ยกเลิก]` and `[💾 บันทึกการจัดกลุ่ม]` (Save Changes) calling `saveCategoryHierarchy`.
- Warning on modal close if `isDirty` is true.

- [ ] **Step 2: Verify in browser / component test**
Run: `pnpm typecheck`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**
```bash
git add components/menu/CategoryManagerModal.tsx
git commit -m "feat(ui): 2-tier drag and drop category management modal"
```

---

### Task 5: Multi-Target Selector in `PromoManager.tsx`

**Files:**
- Modify: `components/promo/PromoManager.tsx`

**Interfaces:**
- Consumes: `fetchPromotionTargets`, `savePromotionTargets`, `buildCategoryTree`
- Produces: Target selector component in Promo modal (All vs Targeted tree picker with pills).

- [ ] **Step 1: Enhance Promo Modal with Scope Selector**
In `PromoManager.tsx`:
- Add state:
  - `targetScope: 'all' | 'custom'`
  - `selectedTargets: Array<{ type: 'main_category' | 'sub_category' | 'menu_item'; id: number; label: string }>`
- Render target picker:
  - Radio options: "ใช้ได้กับทุกเมนูทั้งร้าน" vs "กำหนดเฉพาะกลุ่ม / เจาะจงเมนู"
  - Searchable collapsible list of Main Categories, Sub Categories, and Menu Items.
  - Selecting Main Category toggles all child sub-categories and items.
  - Chip container showing active selections with quick remove `[✕]`.
- On Save:
  - Save promo row to `promotions`.
  - Save targets to `promotion_targets` via `savePromotionTargets`.

- [ ] **Step 2: Typecheck & verify**
Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add components/promo/PromoManager.tsx
git commit -m "feat(promo): multi-target selector for main categories, sub categories, and items"
```

---

### Task 6: 2-Tier Category Navigation on POS Screen

**Files:**
- Modify: `components/order/MenuGrid.tsx`
- Modify: `components/order/POSOrderScreen.tsx`

**Interfaces:**
- Consumes: `CategoryTreeItem`, `menuItems`
- Produces: Dual-tier horizontal tabs on POS screen.

- [ ] **Step 1: Update `MenuGrid.tsx` to render dual-tier tabs**
- Top row: Main Categories (`[ ทั้งหมด ]`, `[ 🍱 อาหาร ]`, `[ 🍹 เครื่องดื่ม ]`, ...).
- Sub row: Sub Categories under active Main Category (`[ ทั้งหมดในหมวด ]`, `[ ของทานเล่น ]`, `[ จานหลัก ]`, ...).
- Filter menu items:
  - If Main = "ทั้งหมด", show all items.
  - If Main is selected but Sub = "ทั้งหมด", show all items belonging to any sub-category under that Main.
  - If Sub is selected, show only items belonging to that Sub.
- Badge promo: Display `[🏷️ ลด %]` tag on items matching active promotions.

- [ ] **Step 2: Typecheck POS components**
Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add components/order/MenuGrid.tsx components/order/POSOrderScreen.tsx
git commit -m "feat(pos): dual-tier category navigation and promo badges"
```

---

### Task 7: 2-Tier Category Navigation on Customer QR Portal

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`
- Modify: `app/api/customer/[session_id]/state/route.ts`

**Interfaces:**
- Consumes: Customer state endpoint
- Produces: Mobile-friendly dual-tier category pills on customer portal without direct Supabase access.

- [ ] **Step 1: Update customer state API to return category hierarchy**
In `app/api/customer/[session_id]/state/route.ts`:
- Fetch `menu_categories` including `parent_id` and sort order.
- Return structured `categories` list with parent-child metadata.

- [ ] **Step 2: Update `app/customer/[session_id]/page.tsx` UI**
- Render Row 1: Main Category pills with horizontal scroll.
- Render Row 2: Sub Category pills for active Main Category.
- Filter menu grid matching active category.
- Show active promo tags on eligible items.

- [ ] **Step 3: Run unit tests and typecheck**
Run: `pnpm typecheck && pnpm test:unit`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add app/customer/[session_id]/page.tsx app/api/customer/[session_id]/state/route.ts
git commit -m "feat(customer): mobile-friendly dual-tier category navigation"
```

---

### Task 8: Full System Build & Verification

**Files:**
- Test all components and endpoints

- [ ] **Step 1: Run complete unit tests**
Run: `pnpm test:unit`
Expected: All test suites PASS.

- [ ] **Step 2: Run complete typecheck**
Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run production build**
Run: `pnpm build`
Expected: Next.js build succeeds with static pages generated.

- [ ] **Step 4: Final commit & verify git status clean**
```bash
git status
```

