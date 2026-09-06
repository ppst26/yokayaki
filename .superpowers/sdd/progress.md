# M5 Auth & RBAC — SDD Progress

**Milestone:** M5 Auth & RBAC  
**Status:** 🟢 Complete (2026-09-06)

| Task | Phase | Description | Status |
|:--:|:-----:|---|:--:|
| 1 | 5a | Migration role enum (`staff`→`cashier`) | 🟢 |
| 2 | 5a | Permission helpers (`can_*()`) | 🟢 |
| 3 | 5a | RLS role matrix rewrite | 🟢 |
| 4 | 5a | RPC role guards | 🟢 |
| 5 | 5a | `lib/permissions.ts` + JWT types | 🟢 |
| 6 | 5a | UI tab gating | 🟢 |
| 7 | 5a | `requireManageEmployees()` | 🟢 |
| 8 | 5a | Integration tests `role_matrix.sql` | 🟢 |
| 9 | 5a | Types + milestone partial | 🟢 |
| 10 | 5b | `memberships` migration | 🟢 |
| 11 | 5b | Supabase Auth org login + PIN gate | 🟢 |
| 12 | 5c | Session revoke + login audit | 🟢 |

**Verification (Task 12 / M5 close):**

- `pnpm db:reset && pnpm db:test` — 12 ไฟล์ผ่าน (รวม `staff_sessions.sql`)
- `pnpm test:unit` — 16 ผ่าน
- `pnpm typecheck && pnpm build` — exit 0
- `lib/database.types.ts` — 21 tables (เพิ่ม `staff_sessions`, `login_audit`)
