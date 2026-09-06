# Task 8 Report — M5 role matrix integration tests

**Plan:** `docs/superpowers/plans/2026-09-06-m5-auth-rbac-implementation-plan.md`  
**Status:** complete

## Summary

เพิ่ม `supabase/tests/role_matrix.sql` ทดสอบ RLS + RPC guards ครบ 4 roles (kitchen, cashier, accountant, manager) และอัปเดตเทสต์เดิมจาก `staff` → `cashier` ให้สอดคล้อง M5 matrix (cashier อ่าน `payments` ไม่ได้)

## Changes

| File | Change |
|------|--------|
| `supabase/tests/role_matrix.sql` | **ใหม่** — integration ทุก role: SELECT matrix + RPC guards (`place_order_batch`, `void_order_item`, `complete_checkout`, `adjust_loyalty_points`, `upsert_purchase_order`) |
| `supabase/tests/rls_policies.sql` | JWT `cashier` · คาดหวัง `payments`/`payment_promotions`/`void_logs` = `zero` สำหรับ cashier |
| `supabase/tests/employees_rpc.sql` | แทน role `'staff'` → `'cashier'` ทุกจุด |
| `supabase/tests/security.sql` | `admin_add_employee` ใช้ role `cashier` |
| `supabase/tests/a7_audit.sql` | A7.5 ใช้ owner JWT สำหรับ `place_order_item` + kitchen JWT สำหรับ void (M5 RPC guards) · A7.6 ใช้ `cashier` |

## role_matrix coverage

| Role | Assert |
|------|--------|
| `kitchen` | อ่าน order_items/orders/tables · ไม่เห็น payments/menu/QR · `place_order_batch` forbidden · void/serve ได้ |
| `cashier` | POS สั่งได้ · ไม่อ่าน payments/payment_promotions/void_logs/stock_logs |
| `accountant` | อ่าน payments/menu · ไม่เห็น floor tables · POS/checkout forbidden · INSERT menu denied |
| `manager` | อ่าน payments/stock · POS + loyalty + purchase RPC ได้ |

## Verification

```bash
pnpm db:reset && pnpm db:test
# ผ่านครบทุกไฟล์ (11 ไฟล์ รวม role_matrix.sql)
```

## Commit

`test(db): M5 role matrix and update SQL tests`
