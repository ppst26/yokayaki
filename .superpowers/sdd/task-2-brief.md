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
