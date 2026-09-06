-- =============================================================
-- M4 — Tenant Isolation (Integration Test)
--
-- ทดสอบการแยกข้อมูลระหว่าง org (Organization A vs Organization B):
-- 1. Staff ของ Org A มองไม่เห็นเมนูของ Org B
-- 2. Staff ของ Org A ไม่สามารถ INSERT เมนูของ Org B
-- 3. Staff ของ Org A ไม่สามารถสั่งอาหาร (place_order_batch) เข้าโต๊ะของ Org B
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- สร้างข้อมูล Org B ในสิทธิ์ postgres
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000000002', 'ร้าน B', 'shop-b');

INSERT INTO org_settings (org_id)
VALUES ('00000000-0000-4000-8000-000000000002');

INSERT INTO tables (id, org_id, table_number, status)
VALUES (gen_random_uuid(), '00000000-0000-4000-8000-000000000002', 1, 'vacant');

INSERT INTO menu_items (name, price, stock, org_id)
VALUES ('เมนูร้าน B', 50, 10, '00000000-0000-4000-8000-000000000002');

-- จำลอง JWT ของ Staff A (Org 1)
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'emp_id', 1, 'emp_name', 'Staff A', 'emp_role', 'owner',
    'org_id', '00000000-0000-4000-8000-000000000001'
  )::text, true);
END $$;

SET LOCAL ROLE authenticated;

-- 1. เห็นแค่เมนู org A (RLS กรองเมนู org B ออก)
DO $$
DECLARE v_b INT;
BEGIN
  SELECT COUNT(*) INTO v_b FROM menu_items WHERE org_id = '00000000-0000-4000-8000-000000000002';
  IF v_b > 0 THEN RAISE EXCEPTION 'M4 fail: staff A เห็นเมนู org B'; END IF;
END $$;

-- 2. INSERT เมนู org B ต้องถูกปฏิเสธ (WITH CHECK org_id = jwt_org_id())
DO $$
BEGIN
  INSERT INTO menu_items (name, price, stock, org_id)
  VALUES ('แฮก', 1, 1, '00000000-0000-4000-8000-000000000002');
  RAISE EXCEPTION 'M4 fail: INSERT ข้าม org สำเร็จ';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

-- 3. place_order_batch โต๊ะ org B ต้อง error (invalid_table)
DO $$
DECLARE v_tbl UUID;
BEGIN
  SELECT id INTO v_tbl FROM tables
  WHERE org_id = '00000000-0000-4000-8000-000000000002' AND table_number = 1;
  PERFORM public.place_order_batch(v_tbl, '[{"menu_item_id":1,"quantity":1}]'::jsonb);
  RAISE EXCEPTION 'M4 fail: สั่งเข้าโต๊ะ org B สำเร็จ';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%invalid_table%' AND SQLERRM NOT LIKE '%unauthorized%' THEN
    RAISE;
  END IF;
END $$;

RESET ROLE;

DO $$
BEGIN
  RAISE NOTICE 'PASS M4 tenant_isolation';
END $$;

ROLLBACK;

\echo ''
\echo '================ tenant_isolation ผ่านครบ ================'
