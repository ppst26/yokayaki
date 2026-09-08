BEGIN;

-- =============================================================
-- M6 / G1 — Customer 360: get_member_profile + list_member_summaries
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_member_profile(p_phone_number VARCHAR(10))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org           UUID := public.jwt_org_id();
  v_member        loyalty_members%ROWTYPE;
  v_lifetime      DECIMAL(10, 2);
  v_visit_count   INT;
  v_last_visit    TIMESTAMPTZ;
  v_avg_per_bill  DECIMAL(10, 2);
  v_favorites     JSONB;
  v_bills         JSONB;
  v_points_logs   JSONB;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT public.can_manage_loyalty() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_member
  FROM loyalty_members lm
  WHERE lm.phone_number = p_phone_number AND lm.org_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  SELECT
    COALESCE(SUM(p.net_amount), 0),
    COUNT(*)::INT,
    MAX(p.created_at)
  INTO v_lifetime, v_visit_count, v_last_visit
  FROM payments p
  WHERE p.phone_number = p_phone_number AND p.org_id = v_org;

  v_avg_per_bill := CASE
    WHEN v_visit_count > 0 THEN ROUND(v_lifetime / v_visit_count, 2)
    ELSE 0
  END;

  SELECT COALESCE(jsonb_agg(fav ORDER BY (fav ->> 'total_quantity')::INT DESC), '[]'::JSONB)
  INTO v_favorites
  FROM (
    SELECT jsonb_build_object(
      'menu_item_id', oi.menu_item_id,
      'name', mi.name,
      'total_quantity', SUM(oi.quantity)::INT
    ) AS fav
    FROM payments p
    JOIN orders o ON o.id = p.order_id AND o.org_id = p.org_id
    JOIN order_items oi ON oi.order_id = o.id AND oi.status <> 'voided'
    JOIN menu_items mi ON mi.id = oi.menu_item_id AND mi.org_id = p.org_id
    WHERE p.phone_number = p_phone_number AND p.org_id = v_org
    GROUP BY oi.menu_item_id, mi.name
    ORDER BY SUM(oi.quantity) DESC
    LIMIT 3
  ) fav_rows;

  SELECT COALESCE(jsonb_agg(bill ORDER BY (bill ->> 'created_at') DESC), '[]'::JSONB)
  INTO v_bills
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'order_id', p.order_id,
      'payment_method', p.payment_method,
      'subtotal', p.subtotal,
      'discount_amount', p.discount_amount,
      'net_amount', p.net_amount,
      'points_earned', p.points_earned,
      'points_redeemed', p.points_redeemed,
      'created_at', p.created_at,
      'table_number', t.table_number
    ) AS bill
    FROM payments p
    LEFT JOIN orders o ON o.id = p.order_id AND o.org_id = p.org_id
    LEFT JOIN tables t ON t.id = o.table_id AND t.org_id = p.org_id
    WHERE p.phone_number = p_phone_number AND p.org_id = v_org
    ORDER BY p.created_at DESC
  ) bill_rows;

  SELECT COALESCE(jsonb_agg(log_row ORDER BY (log_row ->> 'created_at') DESC), '[]'::JSONB)
  INTO v_points_logs
  FROM (
    SELECT jsonb_build_object(
      'id', pl.id,
      'adjustment', pl.adjustment,
      'reason', pl.reason,
      'adjusted_by', pl.adjusted_by,
      'created_at', pl.created_at
    ) AS log_row
    FROM points_logs pl
    WHERE pl.phone_number = p_phone_number AND pl.org_id = v_org
    ORDER BY pl.created_at DESC
  ) log_rows;

  RETURN jsonb_build_object(
    'member', jsonb_build_object(
      'phone_number', v_member.phone_number,
      'name', v_member.name,
      'points', v_member.points,
      'created_at', v_member.created_at
    ),
    'stats', jsonb_build_object(
      'lifetime_spend', v_lifetime,
      'visit_count', v_visit_count,
      'last_visit_at', v_last_visit,
      'avg_per_bill', v_avg_per_bill
    ),
    'favorite_menus', v_favorites,
    'bills', v_bills,
    'points_logs', v_points_logs
  );
END;
$fn$;

COMMENT ON FUNCTION public.get_member_profile(VARCHAR) IS
  'Customer 360 — สถิติสมาชิก · เมนูโปรด · ประวัติบิล · points_logs ใน org จาก JWT';

REVOKE EXECUTE ON FUNCTION public.get_member_profile(VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_profile(VARCHAR) TO authenticated, service_role;

-- สรุปย่อสำหรับตารางรายชื่อสมาชิก (หลีกเลี่ยง N query ต่อแถว)
CREATE OR REPLACE FUNCTION public.list_member_summaries()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org UUID := public.jwt_org_id();
  v_result JSONB;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT public.can_manage_loyalty() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'phone_number', lm.phone_number,
      'lifetime_spend', COALESCE(agg.lifetime_spend, 0),
      'visit_count', COALESCE(agg.visit_count, 0),
      'last_visit_at', agg.last_visit_at
    ) AS row_data
    FROM loyalty_members lm
    LEFT JOIN LATERAL (
      SELECT
        SUM(p.net_amount) AS lifetime_spend,
        COUNT(*)::INT AS visit_count,
        MAX(p.created_at) AS last_visit_at
      FROM payments p
      WHERE p.phone_number = lm.phone_number AND p.org_id = lm.org_id
    ) agg ON TRUE
    WHERE lm.org_id = v_org
    ORDER BY lm.created_at DESC
  ) rows;

  RETURN v_result;
END;
$fn$;

COMMENT ON FUNCTION public.list_member_summaries() IS
  'สรุปยอดรวม/ครั้งล่าสุดต่อสมาชิก — สำหรับตาราง LoyaltyManager';

REVOKE EXECUTE ON FUNCTION public.list_member_summaries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_member_summaries() TO authenticated, service_role;

COMMIT;
