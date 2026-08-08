# Employee Edit Modal Refactoring — Design Spec

## Overview
Consolidate the 3 individual edit buttons (`แก้ไขชื่อ`, `เปลี่ยน PIN`, `เปลี่ยนตำแหน่ง`) on each employee card in `EmployeeManager.tsx` into a single **`[ ✏️ แก้ไข ]` (Edit)** button that opens a unified **Edit Employee Modal**.

---

## Changes Required

### 1. Employee Card UI
Replace the 4 action buttons on each employee card with 2 clean buttons:
1. **`[ ✏️ แก้ไข ]` (Edit)**: Opens unified Edit Employee Modal (`activeModal === 'edit'`)
2. **`[ 🗑️ ลบ ]` (Delete)**: Opens Delete confirmation modal (`activeModal === 'delete'`) - hidden if editing self.

### 2. Unified Edit Employee Modal (`activeModal === 'edit'`)
The Edit Modal will allow changing:
- **ชื่อพนักงาน (Name)**: Text input, prefilled with current name.
- **ตำแหน่ง (Role)**: Toggle selector (`Staff` vs `Owner`), prefilled with current role.
- **เปลี่ยน PIN 6 หลัก (New PIN - Optional)**: 6-digit numeric input with show/hide toggle and confirm PIN field.
- **PIN ยืนยันสิทธิ์ Owner (Confirm Owner PIN)**: Required if role is changed or PIN is updated.

### 3. Action Handler (`handleEditEmployee`)
Calls `supabase.rpc('update_employee', { p_employee_id, p_name, p_pin_hash, p_role })`:
- Validates name non-empty.
- Validates optional PIN (6 digits + match).
- Validates Owner PIN if role/PIN changed.
- Invokes RPC and refreshes list.

---

## File Target
- `components/EmployeeManager.tsx`
