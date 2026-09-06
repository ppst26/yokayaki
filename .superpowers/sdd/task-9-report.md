# Task 9 Report — Phase 5a closure (types + milestone partial)

**Date:** 2026-09-06  
**Commit message:** `chore: complete M5 phase 5a role matrix`

## Summary

ปิด Phase 5a ของ M5 Auth & RBAC โดย regenerate TypeScript types จาก schema ล่าสุด รัน verification ครบชุด และอัปเดต milestone tracker ให้สะท้อนว่า 5a เสร็จแล้ว แต่ M5 ยังไม่ปิด (รอ 5b/5c)

## Step 1 — Regenerate `lib/database.types.ts`

```bash
pnpm db:types:local
# → [gen-db-types] wrote lib/database.types.ts (18 tables, 29 functions)
```

**Changes:** เพิ่ม 8 RPC helpers ใน types:
- `can_operate_pos`, `can_kitchen`, `can_read_sales`, `can_write_catalog`
- `can_manage_stock`, `can_manage_loyalty`, `can_manage_employees`, `can_read_org_settings`

## Step 2 — Verification

| Command | Result |
|---|---|
| `pnpm db:reset && pnpm db:test` | ✅ 11 ไฟล์ผ่าน (รวม `role_matrix.sql`) |
| `pnpm test:unit` | ✅ 16 tests / 4 files |
| `pnpm typecheck && pnpm build` | ✅ exit 0 |
| `node scripts/verify-lockdown.mjs` | ✅ 15/15 ปิดแล้ว (`.env.local` มีอยู่) |

## Step 3 — Documentation updates

- **`MODULES_MILESTONES.md`**
  - M5 milestone → 🟡 (in progress)
  - Phase 5a task board → 🟢 ครบ Task 1–9
  - `F-AUTHZ` → ⚠️ (5a done, 5b/5c pending)
  - `P-AUTH` → ⚠️ (5 roles done, Auth/revoke pending)
- **`docs/superpowers/specs/2026-09-06-m5-auth-rbac-design.md`**
  - สถานะ: Phase 5a complete (2026-09-06)

## Files changed

| File | Change |
|---|---|
| `lib/database.types.ts` | +32 lines (8 `can_*` functions) |
| `MODULES_MILESTONES.md` | M5 5a board + status updates |
| `docs/superpowers/specs/2026-09-06-m5-auth-rbac-design.md` | Phase 5a status |
| `.superpowers/sdd/progress.md` | Task 9 complete |
| `.superpowers/sdd/task-9-report.md` | This report |

## Next

- **Task 10:** `20260915_m5_memberships.sql`
- **Task 11:** Supabase Auth org-login + PIN gate
- **Task 12:** staff_sessions + revoke → ปิด M5 ทั้ง milestone
