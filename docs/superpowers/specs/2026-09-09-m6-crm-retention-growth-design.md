# Design: M6 — CRM & Customer Growth (Retention-first)

วันที่: 2026-09-09  
สถานะ: Approved (แทรกก่อน Billing)  
Milestone: **M6** (Billing เลื่อนเป็น M7)

## เป้าหมายหลัก

**ให้ลูกค้าเก่ากลับมาซื้อซ้ำ (Retention / Win-back)** — ต่อยอด `P-CRM` · `P-PROMO` · `P-DASH` ที่มีอยู่ ไม่สร้าง SaaS marketing แยก

## นอกขอบเขต M6

- SMS / LINE blast (รอ consent + M10 Compliance)
- Auto-campaign cron แบบเต็ม (เฟส 3 เลื่อนหลัง M6 หรือรวม M10)
- Payment gateway / SaaS billing (M7 เดิม)
- AI forecast / omnichannel delivery

## แนวทางที่เลือก

**ต่อยอดใน POS (Approach A)** — ข้อมูลจาก `payments` · `loyalty_members` · `payment_promotions` · `order_items` คำนวณฝั่ง DB/RPC แล้วแสดงใน LoyaltyManager + Dashboard

## เฟสงาน

### Phase 6a — Customer 360 & Segments (สัปดาห์ 1–2)

| ID | งาน | โมดูล |
|---|---|---|
| G1 | Customer 360: ยอดรวม · จำนวนครั้ง · ครั้งล่าสุด · ยอดเฉลี่ย/บิล · เมนูโปรด | `P-CRM` |
| G2 | แท็กอัตโนมัติ: ใหม่ / ประจำ / VIP / หายไป (≥30 วัน) | `P-CRM` `F-GROWTH` |
| G3 | RFM แบบง่าย (R·F·M 1–5 + กลุ่ม A/B/C) — RPC หรือ materialized view | `F-GROWTH` |
| G4 | หน้า / แท็บ "ลูกค้าหายไป" (dormant list) + filter | `P-CRM` |

### Phase 6b — Win-back & กระตุ้นยอด (สัปดาห์ 2–3)

| ID | งาน | โมดูล |
|---|---|---|
| G5 | Win-back flow: เลือกกลุ่ม dormant → สร้างโปร/คูปอง (pre-fill PromoManager) | `P-PROMO` `P-CRM` |
| G6 | โปรเจาะกลุ่ม: คูปองผูก segment (หรือ export รายชื่อ + คูปองเดียว) | `P-PROMO` |
| G7 | Double points day — กิจกรรมแต้ม x2 ใน `complete_checkout` (config ต่อ org) | `P-PAY` `P-CRM` |

### Phase 6c — Retention Analytics (สัปดาห์ 3–4)

| ID | งาน | โมดูล |
|---|---|---|
| G8 | Dashboard: Member vs Walk-in (ยอด · บิล · ส่วนลดแต้ม) | `P-DASH` |
| G9 | Dashboard: Promo ROI (ส่วนลดจ่าย vs ยอดที่ใช้โปร) | `P-DASH` `P-PROMO` |
| G10 | Dashboard: Heatmap ยอดตามชั่วโมง / วันในสัปดาห์ | `P-DASH` |
| G11 | Integration tests สำหรับ RPC/view ใหม่ | `F-TEST` |

## Schema (ร่าง)

- `loyalty_members`: เพิ่ม `last_visit_at` · `visit_count` · `lifetime_spend` (maintain จาก trigger/checkout หรือ nightly refresh)
- `member_segments` (optional): `org_id` · `code` · `rule_json` · หรือคำนวณ on-the-fly ใน RPC รอบแรก
- `org_settings`: `double_points_enabled` · `double_points_dates` (JSON)

## Security

- อ่าน segment/RFM: `authenticated` + `is_owner()` / `can_manage_crm()`
- ไม่ expose เบอร์โทรในหน้าลูกค้า QR
- RPC ใหม่: `REVOKE EXECUTE FROM PUBLIC, anon` ตามกฎ A1

## เกณฑ์ผ่าน M6

1. Owner เปิด LoyaltyManager เห็น Customer 360 + รายชื่อ dormant + แท็ก RFM
2. สร้างคูปอง win-back จากกลุ่ม dormant ได้ใน ≤3 คลิก
3. Dashboard แสดง Member vs Walk-in + Promo ROI + heatmap ช่วงเวลา
4. `pnpm db:reset && pnpm db:test` ผ่านหลัง migration/RPC ใหม่

## ลำดับหลัง M6

- **M7** Billing (เดิม M6)
- PDPA consent เต็มรูปแบบ → **M10** (เดิม M9)
