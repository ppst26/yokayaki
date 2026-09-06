# Daily Orders — Role-Based Views (หน้าเดียว)

**สถานะ:** อนุมัติแล้ว — implement 2026-09-07  
**วันที่:** 2026-09-07  
**บริบท:** หลัง M5 — cashier/kitchen ต้องเปิดดูบิลที่เช็คบิลแล้วเพื่อเทียบรายการอาหาร แต่ไม่ควรเห็น KPI ยอดขายรวมร้าน

---

## 1. เป้าหมาย

- **หน้าเดียว** — แท็บ "ออเดอร์ประจำวัน" (`history`) สำหรับทุก role ที่ทำงาน operational
- **cashier + kitchen** — เห็นรายการบิลปิดแล้ว + รายละเอียดอาหาร + แท็บ Void **เหมือน owner**
- **ซ่อน KPI 4 การ์ด** สำหรับ role ที่ไม่มี `can_read_sales()` (cashier, kitchen)
- **ไม่เปิด** `payments` / `payment_promotions` ให้ cashier/kitchen (คงหลัก M5)

---

## 2. Role matrix (หลังเปลี่ยน)

| ความสามารถ | owner | manager | accountant | cashier | kitchen |
|------------|:-----:|:-------:|:----------:|:-------:|:-------:|
| แท็บ ออเดอร์ประจำวัน | ✅ | ✅ | ✅ | ✅ | ✅ |
| KPI 4 การ์ด (ยอดรวมร้าน) | ✅ | ✅ | ✅ | ❌ | ❌ |
| ตารางบิลปิด + modal รายการ | ✅ | ✅ | ✅ | ✅ | ✅ |
| แท็บ ประวัติ Void | ✅ | ✅ | ✅ | ✅ | ✅ |
| อ่าน `payments` (RLS) | ✅ | ✅ | ✅ | ❌ | ❌ |
| อ่าน `void_logs` (RLS) | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. การเปลี่ยนแปลง

### 3.1 UI — `lib/permissions.ts`

```ts
// แท็บ history — เพิ่ม cashier, kitchen
history: ['owner', 'manager', 'accountant', 'cashier', 'kitchen'],

// helper ใหม่ (export)
export function canReadSales(role: EmployeeRole): boolean {
  return ['owner', 'manager', 'accountant'].includes(role);
}
```

อัปเดต `permissions.test.ts` — cashier/kitchen เห็น `history` แต่ `canReadSales` เป็น false

### 3.2 UI — `SalesHistory.tsx`

- อ่าน `employee.role` จาก `useAuth()`
- `const showKpi = canReadSales(role)`
- **`showKpi === false`:** ไม่ render `SalesSummaryCards`
- **Fetch แยกสองโหมด:**
  - **Sales mode (`canReadSales`):** logic เดิม — `orders` + `payments` + `promotions` + `loyalty_members`
  - **Audit mode (cashier/kitchen):** `orders` (completed) + `order_items` สำหรับยอดต่อบิล — **ไม่ query** `payments`, `payment_promotions`, `loyalty_members`
- **Void sub-tab:** fetch `void_logs` เหมือนเดิมทุก role (หลัง RLS เปิด)
- **Default sub-tab:** `sales` (ไม่เปลี่ยน)

### 3.3 UI — `ClosedBillTable` / `BillDetailModal`

เพิ่ม prop `auditMode?: boolean` (หรือ `showPaymentDetails?: boolean`)

**Audit mode (ไม่มี payment):**

| องค์ประกอบ | แสดง |
|-----------|------|
| โต๊ะ, เวลา (จาก `order.created_at`) | ✅ |
| ยอดต่อบิล | sum(`order_items.unit_price * quantity`) ที่ไม่ voided |
| วิธีชำระ / โปร / สมาชิก / แต้ม | ❌ ซ่อน |
| Modal — รายการอาหาร + โน้ต | ✅ |
| Modal — สรุปยอดจากรายการ | ✅ ข้อความกำกับ: *"ยอดจากรายการอาหาร ไม่รวมส่วนลด/โปร"* |

**Sales mode:** ไม่เปลี่ยนพฤติกรรมเดิม

### 3.4 DB — migration `20260917_void_logs_operational_read.sql`

Helper ใหม่:

```sql
CREATE OR REPLACE FUNCTION public.can_read_void_logs() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN (
    'owner', 'manager', 'accountant', 'cashier', 'kitchen'
  );
$$;
```

อัปเดต policy `void_logs`:

```sql
DROP POLICY IF EXISTS staff_read ON public.void_logs;
CREATE POLICY staff_read ON public.void_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_read_void_logs());
```

`payments` / `payment_promotions` — **ไม่เปลี่ยน** (ยัง `can_read_sales()` เท่านั้น)

REVOKE/GRANT `can_read_void_logs()` ตาม pattern M5

### 3.5 Tests

| ไฟล์ | การเปลี่ยน |
|------|-----------|
| `supabase/tests/role_matrix.sql` | cashier: `void_logs` จาก `zero` → `rows` |
| `supabase/tests/rls_policies.sql` | อัปเดต expected policy ถ้ามี assert ชื่อ `void_logs` |
| `lib/permissions.test.ts` | cashier/kitchen + history |

---

## 4. Navigation

- `SidebarNav` / `TableMap` — ไม่ต้องแท็บใหม่; `canAccessTab(role, 'history')` ครอบคลุม cashier/kitchen
- **Default tab:** kitchen ยัง default `kitchen`, cashier ยัง default `floor` — ไม่ auto-open history

---

## 5. Security

- cashier/kitchen **ไม่**ได้ aggregate ยอดขายร้าน (ไม่มี KPI, ไม่มี SELECT payments)
- void_logs เปิดอ่านเพื่อ operational transparency — ไม่มี INSERT/UPDATE policy ใหม่
- accountant ยังไม่เห็น floor/kitchen แต่เห็น history + KPI เต็ม (ไม่เปลี่ยน)

---

## 6. Out of scope

- แยกหน้า "ตรวจบิล"
- เปิด `payments` ให้ cashier/kitchen
- ยอดสุทธิหลังส่วนลดต่อบิลใน audit mode (ต้อง migration เพิ่มถ้าต้องการภายหลัง)

---

## 7. Verification

```bash
pnpm db:reset && pnpm db:test
pnpm test:unit lib/permissions.test.ts
pnpm typecheck && pnpm build
```

Manual:

1. Login เป็น **cashier** → แท็บ ออเดอร์ประจำวัน → ไม่มี KPI → เห็นบิล + void
2. Login เป็น **owner** → KPI + ยอด net จาก payment ครบ

---

## 8. Self-review

- [x] ไม่มี TBD / placeholder
- [x] สอดคล้อง M5 — payments ยังปิดสำหรับ cashier
- [x] void_logs เปิดตามที่ user เลือก (C)
- [x] scope พอดีสำหรับ implementation plan เดียว
