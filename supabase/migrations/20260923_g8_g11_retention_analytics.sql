BEGIN;

-- =============================================================
-- M6 / G8–G11 — get_retention_analytics (Member vs Walk-in · Promo ROI · Heatmap)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_retention_analytics(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org      UUID := public.jwt_org_id();
  v_tz       TEXT;
  v_member   JSONB;
  v_walkin   JSONB;
  v_share    NUMERIC;
  v_member_net NUMERIC;
  v_total_net  NUMERIC;
  v_promo    JSONB;
  v_heat     JSONB;
BEGIN
  IF v_org IS NULL OR NOT public.can_read_sales() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
    RAISE EXCEPTION 'invalid_range';
  END IF;

  SELECT COALESCE(NULLIF(TRIM(os.timezone), ''), 'Asia/Bangkok')
  INTO v_tz
  FROM org_settings os
  WHERE os.org_id = v_org;

  v_tz := COALESCE(v_tz, 'Asia/Bangkok');

  -- G8: Member vs Walk-in
  SELECT jsonb_build_object(
    'bills', COUNT(*)::INT,
    'net', COALESCE(SUM(p.net_amount), 0),
    'points_redeemed', COALESCE(SUM(p.points_redeemed), 0)::INT
  )
  INTO v_member
  FROM payments p
  WHERE p.org_id = v_org
    AND p.created_at >= p_start
    AND p.created_at <= p_end
    AND p.phone_number IS NOT NULL;

  SELECT jsonb_build_object(
    'bills', COUNT(*)::INT,
    'net', COALESCE(SUM(p.net_amount), 0),
    'points_redeemed', COALESCE(SUM(p.points_redeemed), 0)::INT
  )
  INTO v_walkin
  FROM payments p
  WHERE p.org_id = v_org
    AND p.created_at >= p_start
    AND p.created_at <= p_end
    AND p.phone_number IS NULL;

  v_member_net := COALESCE((v_member ->> 'net')::NUMERIC, 0);
  v_total_net := v_member_net + COALESCE((v_walkin ->> 'net')::NUMERIC, 0);
  v_share := CASE
    WHEN v_total_net <= 0 THEN 0
    ELSE ROUND(v_member_net * 100.0 / v_total_net, 1)
  END;

  -- G9: Promo ROI — sales_with_promo = ยอดสุทธิของบิลที่ใช้โปรนั้น (ต่อแถว payment_promotions)
  SELECT COALESCE(jsonb_agg(row_to_json(x)::JSONB ORDER BY x.discount_total DESC), '[]'::JSONB)
  INTO v_promo
  FROM (
    SELECT
      pp.promotion_id,
      MAX(pp.promotion_name) AS name,
      COUNT(*)::INT AS uses,
      COALESCE(SUM(pp.discount_value), 0) AS discount_total,
      COALESCE(SUM(p.net_amount), 0) AS sales_with_promo,
      CASE
        WHEN COALESCE(SUM(pp.discount_value), 0) <= 0 THEN NULL
        ELSE ROUND(COALESCE(SUM(p.net_amount), 0) / SUM(pp.discount_value), 2)
      END AS roi
    FROM payment_promotions pp
    JOIN payments p ON p.id = pp.payment_id AND p.org_id = pp.org_id
    WHERE pp.org_id = v_org
      AND p.created_at >= p_start
      AND p.created_at <= p_end
    GROUP BY pp.promotion_id
  ) x;

  -- G10: Heatmap — ISO DOW 0=จันทร์ … 6=อาทิตย์
  SELECT COALESCE(jsonb_agg(row_to_json(c)::JSONB), '[]'::JSONB)
  INTO v_heat
  FROM (
    SELECT
      ((EXTRACT(ISODOW FROM (p.created_at AT TIME ZONE v_tz))::INT) - 1) AS dow,
      EXTRACT(HOUR FROM (p.created_at AT TIME ZONE v_tz))::INT AS hour,
      COALESCE(SUM(p.net_amount), 0) AS net,
      COUNT(*)::INT AS bills
    FROM payments p
    WHERE p.org_id = v_org
      AND p.created_at >= p_start
      AND p.created_at <= p_end
    GROUP BY 1, 2
    ORDER BY 1, 2
  ) c;

  RETURN jsonb_build_object(
    'member_vs_walkin', jsonb_build_object(
      'member', v_member,
      'walkin', v_walkin,
      'member_share_pct', v_share
    ),
    'promo_roi', v_promo,
    'heatmap', jsonb_build_object(
      'hours', (SELECT jsonb_agg(t.h ORDER BY t.h) FROM generate_series(0, 23) AS t(h)),
      'dows', (SELECT jsonb_agg(t.d ORDER BY t.d) FROM generate_series(0, 6) AS t(d)),
      'cells', COALESCE(v_heat, '[]'::JSONB)
    )
  );
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_retention_analytics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_retention_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
