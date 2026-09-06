# Task 7 Report: requireManageEmployees + employee routes

**Plan:** `docs/superpowers/plans/2026-09-06-m5-auth-rbac-implementation-plan.md`  
**Status:** complete

## Summary

เพิ่ม `requireManageEmployees()` ใน `lib/session.ts` ให้ owner และ manager เข้าถึง employee CRUD API ได้ แทน `requireOwner()` ที่จำกัดเฉพาะ owner

## Changes

| File | Change |
|------|--------|
| `lib/session.ts` | เพิ่ม `MANAGE_EMPLOYEES` constant และ `requireManageEmployees()` — 403 ข้อความไทยเมื่อ role ไม่ใช่ owner/manager |
| `app/api/employees/route.ts` | GET/POST ใช้ `requireManageEmployees()` |
| `app/api/employees/[id]/route.ts` | PATCH/DELETE ใช้ `requireManageEmployees()` |

## Unchanged (by design)

- `assertOwnerConfirmPin()` ใน `[id]/route.ts` ยังต้องยืนยัน PIN ของ **owner** สำหรับการแก้ role/PIN และการลบพนักงาน (step-up auth)
- `requireOwner()` ยังคงใช้ใน upload routes (`presign`, `delete`)

## Verification

```bash
pnpm typecheck  # exit 0
```

## Commit

`feat(api): allow manager role for employee CRUD`
