# Design: M6 G8–G11 Retention Analytics Dashboard

วันที่: 2026-09-09  
สถานะ: Approved  
แนวทาง: **RPC เดียว** `get_retention_analytics(p_start, p_end)`

## RPC

- Guard: `can_read_sales()` + `jwt_org_id()`
- Timezone: `org_settings.timezone` (fallback `Asia/Bangkok`)
- Filter: `payments.org_id` + `created_at` ใน `[p_start, p_end]`

## JSON shape

- `member_vs_walkin`: member / walkin (`bills`, `net`, `points_redeemed`) + `member_share_pct`
- `promo_roi[]`: `promotion_id`, `name`, `uses`, `discount_total`, `sales_with_promo`, `roi`
- `heatmap`: `cells[{dow, hour, net, bills}]` — `dow` = ISO 0=จันทร์ … 6=อาทิตย์

## UI

สามการ์ดใน `OwnerDashboard` ใช้ช่วงวันที่จาก `DateFilterBar` เดิม

## Tests

`supabase/tests/retention_analytics.sql`
