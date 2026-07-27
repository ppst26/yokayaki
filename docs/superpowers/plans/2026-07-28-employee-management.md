# Employee Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างหน้าจอจัดการพนักงาน (Employee Management) ให้ Owner เพิ่ม/ลบ/แก้ไขชื่อ/เปลี่ยน PIN/เปลี่ยน Role ของพนักงานในร้านได้

**Architecture:** RPC-based SECURITY DEFINER functions สำหรับ write operations บนตาราง `employees` ตาม pattern เดียวกับ `place_order_item`, `complete_checkout` ฯลฯ — ไม่เปิด RLS write policy เพิ่ม, PIN hash ทำที่ client ด้วย SHA-256 ก่อนส่ง

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (RPC + Realtime), TailwindCSS 4, Lucide Icons

## Global Constraints

- Package manager: `pnpm` เท่านั้น (ห้าม npm/yarn)
- Import paths ใช้ `@/` alias เสมอ
- ทุก Component เป็น `'use client'` — ไม่ใช้ Server Components
- Comment ในโค้ดเขียนเป็นภาษาไทย
- ชื่อตัวแปร ฟังก์ชัน interface เขียนเป็นภาษาอังกฤษ
- ห้ามแก้ไข RPC ที่มีอยู่เดิม (`place_order_item`, `void_order_item`, `customer_place_order_item`, `complete_checkout`)
- ห้ามลบหรือเปลี่ยน PIN hash logic ใน `AuthContext.tsx`
- SQL migration ตั้งชื่อตาม format `YYYYMMDD_description.sql`
- Commit ทุกครั้งหลังทำ task สำเร็จ

**Spec Reference:** [`docs/superpowers/specs/2026-07-28-employee-management-design.md`](file:///c:/Users/PP/Desktop/React/yokayaki/docs/superpowers/specs/2026-07-28-employee-management-design.md)

---

### Task 1: SQL Migration — RPC Functions สำหรับจัดการพนักงาน

**Files:**
- Create: `supabase/migrations/20260728_employee_management.sql`

**Interfaces:**
- Consumes: ตาราง `employees` (id, name, pin_hash, role, created_at) จาก `20260705_init_schema.sql`
- Produces:
  - RPC `add_employee(p_name TEXT, p_pin_hash TEXT, p_role TEXT) → INT` — return employee id หรือ -1 ถ้า PIN ซ้ำ
  - RPC `update_employee(p_employee_id INT, p_name TEXT, p_pin_hash TEXT, p_role TEXT) → BOOLEAN` — null parameter = ไม่เปลี่ยน
  - RPC `delete_employee(p_employee_id INT, p_requester_pin_hash TEXT) → TEXT` — return 'ok', 'self_delete', 'not_owner', 'not_found'

- [ ] **Step 1: สร้างไฟล์ migration**

สร้างไฟล์ `supabase/migrations/20260728_employee_management.sql`:

```sql
-- ============================================================
-- Employee Management RPC Functions
-- ============================================================
-- เพิ่ม/แก้ไข/ลบพนักงาน สำหรับ Owner เท่านั้น
-- ทุกฟังก์ชันเป็น SECURITY DEFINER

-- 1. add_employee: เพิ่มพนักงานใหม่
-- Returns: employee id ถ้าสำเร็จ, -1 ถ้า PIN ซ้ำ
CREATE OR REPLACE FUNCTION add_employee(
  p_name TEXT,
  p_pin_hash TEXT,
  p_role TEXT
) RETURNS INT AS $$
DECLARE
  v_existing INT;
  v_new_id INT;
BEGIN
  -- ตรวจสอบ role ถูกต้อง
  IF p_role NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- ตรวจสอบชื่อไม่ว่าง
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;

  -- ตรวจสอบ PIN ไม่ซ้ำ
  SELECT id INTO v_existing FROM employees WHERE pin_hash = p_pin_hash LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN -1; -- PIN ซ้ำ
  END IF;

  -- เพิ่มพนักงานใหม่
  INSERT INTO employees (name, pin_hash, role)
  VALUES (TRIM(p_name), p_pin_hash, p_role)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. update_employee: แก้ไขข้อมูลพนักงาน
-- ส่ง null ในพารามิเตอร์ที่ไม่ต้องการเปลี่ยน
-- Returns: TRUE ถ้าสำเร็จ
CREATE OR REPLACE FUNCTION update_employee(
  p_employee_id INT,
  p_name TEXT DEFAULT NULL,
  p_pin_hash TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_existing INT;
BEGIN
  -- ตรวจสอบว่าพนักงานมีอยู่จริง
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RAISE EXCEPTION 'Employee not found: %', p_employee_id;
  END IF;

  -- ตรวจสอบ role ถูกต้อง (ถ้าส่งมา)
  IF p_role IS NOT NULL AND p_role NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- ตรวจสอบ PIN ไม่ซ้ำ (ถ้าส่ง pin_hash ใหม่มา)
  IF p_pin_hash IS NOT NULL THEN
    SELECT id INTO v_existing FROM employees
    WHERE pin_hash = p_pin_hash AND id != p_employee_id LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RAISE EXCEPTION 'PIN already exists';
    END IF;
  END IF;

  -- อัปเดตข้อมูล
  UPDATE employees SET
    name = COALESCE(NULLIF(TRIM(COALESCE(p_name, '')), ''), name),
    pin_hash = COALESCE(p_pin_hash, pin_hash),
    role = COALESCE(p_role, role)
  WHERE id = p_employee_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. delete_employee: ลบพนักงาน (ต้องยืนยันตัวตน Owner)
-- Returns: 'ok', 'self_delete', 'not_owner', 'not_found'
CREATE OR REPLACE FUNCTION delete_employee(
  p_employee_id INT,
  p_requester_pin_hash TEXT
) RETURNS TEXT AS $$
DECLARE
  v_requester_id INT;
  v_requester_role TEXT;
BEGIN
  -- ตรวจสอบว่า requester เป็น Owner จริง
  SELECT id, role INTO v_requester_id, v_requester_role
  FROM employees WHERE pin_hash = p_requester_pin_hash LIMIT 1;

  IF v_requester_id IS NULL OR v_requester_role != 'owner' THEN
    RETURN 'not_owner';
  END IF;

  -- ห้ามลบตัวเอง
  IF v_requester_id = p_employee_id THEN
    RETURN 'self_delete';
  END IF;

  -- ตรวจสอบว่าพนักงานที่จะลบมีอยู่จริง
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RETURN 'not_found';
  END IF;

  -- ลบพนักงาน
  DELETE FROM employees WHERE id = p_employee_id;

  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260728_employee_management.sql
git commit -m "feat(db): add employee management RPC functions (add/update/delete)"
```

---

### Task 2: Export hashPin จาก AuthContext

**Files:**
- Modify: `context/AuthContext.tsx` (line 23)

**Interfaces:**
- Consumes: —
- Produces: `export async function hashPin(pin: string): Promise<string>` — ใช้ได้จาก `import { hashPin } from '@/context/AuthContext'`

- [ ] **Step 1: เพิ่ม `export` ให้ฟังก์ชัน `hashPin`**

แก้ไขไฟล์ `context/AuthContext.tsx` บรรทัด 23:

เปลี่ยนจาก:
```typescript
async function hashPin(pin: string): Promise<string> {
```

เป็น:
```typescript
export async function hashPin(pin: string): Promise<string> {
```

> **หมายเหตุ:** เปลี่ยนเฉพาะเพิ่ม `export` keyword เท่านั้น ไม่แก้ไข logic ข้างในเลย

- [ ] **Step 2: Commit**

```bash
git add context/AuthContext.tsx
git commit -m "refactor(auth): export hashPin for reuse in EmployeeManager"
```

---

### Task 3: สร้าง EmployeeManager Component

**Files:**
- Create: `components/EmployeeManager.tsx`

**Interfaces:**
- Consumes:
  - `useAuth()` → `{ employee }` จาก `@/context/AuthContext`
  - `hashPin(pin: string): Promise<string>` จาก `@/context/AuthContext`
  - `supabase` จาก `@/lib/supabase`
  - RPCs: `add_employee`, `update_employee`, `delete_employee` จาก Task 1
- Produces: `export const EmployeeManager: React.FC` — component พร้อมใช้ใน TableMap

- [ ] **Step 1: สร้างไฟล์ `components/EmployeeManager.tsx`**

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hashPin } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  UserCog, Plus, Pencil, KeyRound, ArrowLeftRight,
  Trash2, X, CheckCircle, AlertTriangle, Shield, User,
  Eye, EyeOff
} from 'lucide-react';

// ========== Interfaces ==========

interface Employee {
  id: number;
  name: string;
  role: 'owner' | 'staff';
  created_at: string;
}

type ModalType = 'add' | 'editName' | 'changePin' | 'changeRole' | 'delete' | null;

// ========== Component ==========

export const EmployeeManager: React.FC = () => {
  const { employee: currentUser } = useAuth();

  // รายชื่อพนักงาน
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [targetEmployee, setTargetEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ฟอร์มเพิ่มพนักงาน
  const [addName, setAddName] = useState('');
  const [addPin, setAddPin] = useState('');
  const [addPinConfirm, setAddPinConfirm] = useState('');
  const [addRole, setAddRole] = useState<'staff' | 'owner'>('staff');
  const [showAddPin, setShowAddPin] = useState(false);

  // ฟอร์มแก้ไขชื่อ
  const [editName, setEditName] = useState('');

  // ฟอร์มเปลี่ยน PIN
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  // ฟอร์มยืนยัน PIN (ลบ / เปลี่ยน Role)
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // ========== Data Fetching ==========

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role, created_at')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setEmployees(data as Employee[]);
    } catch (err) {
      console.error('Error fetching employees:', err);
      showMessage('ไม่สามารถดึงข้อมูลพนักงานได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();

    // Realtime subscription
    const channel = supabase
      .channel('realtime:employees-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ========== Helpers ==========

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const resetModal = () => {
    setActiveModal(null);
    setTargetEmployee(null);
    setIsSaving(false);
    setAddName('');
    setAddPin('');
    setAddPinConfirm('');
    setAddRole('staff');
    setShowAddPin(false);
    setEditName('');
    setNewPin('');
    setNewPinConfirm('');
    setShowNewPin(false);
    setConfirmPin('');
    setShowConfirmPin(false);
  };

  const openModal = (type: ModalType, emp?: Employee) => {
    resetModal();
    setActiveModal(type);
    if (emp) {
      setTargetEmployee(emp);
      if (type === 'editName') setEditName(emp.name);
    }
  };

  // ========== Actions ==========

  // เพิ่มพนักงานใหม่
  const handleAddEmployee = async () => {
    if (!addName.trim()) return showMessage('กรุณากรอกชื่อพนักงาน', 'error');
    if (addPin.length !== 6 || !/^\d{6}$/.test(addPin)) return showMessage('PIN ต้องเป็นตัวเลข 6 หลัก', 'error');
    if (addPin !== addPinConfirm) return showMessage('PIN ทั้ง 2 ช่องไม่ตรงกัน', 'error');

    try {
      setIsSaving(true);
      const pinHash = await hashPin(addPin);
      const { data, error } = await supabase.rpc('add_employee', {
        p_name: addName.trim(),
        p_pin_hash: pinHash,
        p_role: addRole,
      });

      if (error) throw error;

      if (data === -1) {
        showMessage('PIN นี้ถูกใช้แล้ว กรุณาใช้ PIN อื่น', 'error');
        return;
      }

      showMessage(`เพิ่มพนักงาน "${addName.trim()}" สำเร็จ`, 'success');
      resetModal();
      fetchEmployees();
    } catch (err: any) {
      console.error('Error adding employee:', err);
      showMessage(err.message || 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // แก้ไขชื่อ
  const handleEditName = async () => {
    if (!targetEmployee) return;
    if (!editName.trim()) return showMessage('กรุณากรอกชื่อพนักงาน', 'error');
    if (editName.trim() === targetEmployee.name) { resetModal(); return; }

    try {
      setIsSaving(true);
      const { error } = await supabase.rpc('update_employee', {
        p_employee_id: targetEmployee.id,
        p_name: editName.trim(),
      });

      if (error) throw error;

      showMessage(`เปลี่ยนชื่อเป็น "${editName.trim()}" สำเร็จ`, 'success');
      resetModal();
      fetchEmployees();
    } catch (err: any) {
      console.error('Error updating name:', err);
      showMessage(err.message || 'เกิดข้อผิดพลาดในการแก้ไขชื่อ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // เปลี่ยน PIN
  const handleChangePin = async () => {
    if (!targetEmployee) return;
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) return showMessage('PIN ต้องเป็นตัวเลข 6 หลัก', 'error');
    if (newPin !== newPinConfirm) return showMessage('PIN ทั้ง 2 ช่องไม่ตรงกัน', 'error');

    try {
      setIsSaving(true);
      const pinHash = await hashPin(newPin);
      const { error } = await supabase.rpc('update_employee', {
        p_employee_id: targetEmployee.id,
        p_pin_hash: pinHash,
      });

      if (error) {
        if (error.message?.includes('PIN already exists')) {
          showMessage('PIN นี้ถูกใช้แล้ว กรุณาใช้ PIN อื่น', 'error');
          return;
        }
        throw error;
      }

      showMessage(`เปลี่ยน PIN ของ "${targetEmployee.name}" สำเร็จ`, 'success');
      resetModal();
    } catch (err: any) {
      console.error('Error changing PIN:', err);
      showMessage(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยน PIN', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // เปลี่ยน Role (ต้องยืนยัน PIN)
  const handleChangeRole = async () => {
    if (!targetEmployee) return;
    if (confirmPin.length !== 6 || !/^\d{6}$/.test(confirmPin)) return showMessage('กรุณากรอก PIN 6 หลัก', 'error');

    try {
      setIsSaving(true);
      // ตรวจสอบ PIN ของ Owner ฝั่ง client ก่อน
      const ownerPinHash = await hashPin(confirmPin);
      const { data: ownerCheck } = await supabase
        .from('employees')
        .select('id, role')
        .eq('pin_hash', ownerPinHash)
        .limit(1);

      if (!ownerCheck || ownerCheck.length === 0 || ownerCheck[0].role !== 'owner') {
        showMessage('PIN ไม่ถูกต้อง หรือไม่ใช่ PIN ของ Owner', 'error');
        setIsSaving(false);
        return;
      }

      const newRole = targetEmployee.role === 'owner' ? 'staff' : 'owner';
      const { error } = await supabase.rpc('update_employee', {
        p_employee_id: targetEmployee.id,
        p_role: newRole,
      });

      if (error) throw error;

      showMessage(`เปลี่ยนตำแหน่ง "${targetEmployee.name}" เป็น ${newRole === 'owner' ? 'Owner' : 'Staff'} สำเร็จ`, 'success');
      resetModal();
      fetchEmployees();
    } catch (err: any) {
      console.error('Error changing role:', err);
      showMessage(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนตำแหน่ง', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ลบพนักงาน (ต้องยืนยัน PIN)
  const handleDeleteEmployee = async () => {
    if (!targetEmployee) return;
    if (confirmPin.length !== 6 || !/^\d{6}$/.test(confirmPin)) return showMessage('กรุณากรอก PIN 6 หลัก', 'error');

    try {
      setIsSaving(true);
      const ownerPinHash = await hashPin(confirmPin);
      const { data, error } = await supabase.rpc('delete_employee', {
        p_employee_id: targetEmployee.id,
        p_requester_pin_hash: ownerPinHash,
      });

      if (error) throw error;

      if (data === 'self_delete') {
        showMessage('ไม่สามารถลบตัวเองได้', 'error');
      } else if (data === 'not_owner') {
        showMessage('PIN ไม่ถูกต้อง หรือไม่ใช่ PIN ของ Owner', 'error');
      } else if (data === 'not_found') {
        showMessage('ไม่พบพนักงานที่ต้องการลบ', 'error');
      } else if (data === 'ok') {
        showMessage(`ลบพนักงาน "${targetEmployee.name}" สำเร็จ`, 'success');
        resetModal();
        fetchEmployees();
      }
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      showMessage(err.message || 'เกิดข้อผิดพลาดในการลบพนักงาน', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ========== Computed ==========

  const ownerCount = employees.filter(e => e.role === 'owner').length;
  const staffCount = employees.filter(e => e.role === 'staff').length;

  // ========== Render ==========

  return (
    <div className="max-w-4xl space-y-6">
      {/* Toast Message */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-fade-in ${
          message.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border border-rose-200 text-rose-700'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />
          }
          <span>{message.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">พนักงานทั้งหมด</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{employees.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner</p>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">{ownerCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-500" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff</p>
          </div>
          <p className="text-2xl font-black text-sky-600 mt-1">{staffCount}</p>
        </div>
      </div>

      {/* ปุ่มเพิ่มพนักงาน */}
      <div className="flex justify-end">
        <button
          onClick={() => openModal('add')}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* รายชื่อพนักงาน */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm font-semibold">
          ยังไม่มีพนักงานในระบบ
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const isOwnerBadge = emp.role === 'owner';
            const isSelf = currentUser?.id === emp.id;

            return (
              <div
                key={emp.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm ${
                  isSelf ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
                }`}
              >
                {/* ข้อมูลพนักงาน */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isOwnerBadge
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                        {isSelf && (
                          <span className="text-[9px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-md border border-red-100">
                            คุณ
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        สร้างเมื่อ {new Date(emp.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                    isOwnerBadge
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}>
                    {emp.role}
                  </span>
                </div>

                {/* ปุ่ม Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openModal('editName', emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-[11px] font-bold transition active:scale-95 border border-slate-200 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    แก้ไขชื่อ
                  </button>
                  <button
                    onClick={() => openModal('changePin', emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-[11px] font-bold transition active:scale-95 border border-slate-200 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    เปลี่ยน PIN
                  </button>
                  <button
                    onClick={() => openModal('changeRole', emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 rounded-lg text-[11px] font-bold transition active:scale-95 border border-amber-200 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    เปลี่ยนตำแหน่ง
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => openModal('delete', emp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg text-[11px] font-bold transition active:scale-95 border border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== Modals ========== */}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">

            {/* === Modal: เพิ่มพนักงาน === */}
            {activeModal === 'add' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-red-600" />
                    เพิ่มพนักงานใหม่
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* ชื่อ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อพนักงาน</label>
                    <input
                      type="text"
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                      placeholder="เช่น สมชาย"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition"
                    />
                  </div>

                  {/* PIN */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">PIN 6 หลัก</label>
                    <div className="relative">
                      <input
                        type={showAddPin ? 'text' : 'password'}
                        value={addPin}
                        onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setAddPin(e.target.value); }}
                        placeholder="● ● ● ● ● ●"
                        maxLength={6}
                        inputMode="numeric"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddPin(!showAddPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showAddPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ยืนยัน PIN */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">ยืนยัน PIN</label>
                    <input
                      type={showAddPin ? 'text' : 'password'}
                      value={addPinConfirm}
                      onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setAddPinConfirm(e.target.value); }}
                      placeholder="● ● ● ● ● ●"
                      maxLength={6}
                      inputMode="numeric"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono tracking-[0.3em] focus:outline-none focus:ring-2 transition pr-10 ${
                        addPinConfirm && addPinConfirm !== addPin
                          ? 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-400'
                          : 'border-slate-200 focus:ring-red-500/30 focus:border-red-400'
                      }`}
                    />
                    {addPinConfirm && addPinConfirm !== addPin && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">PIN ไม่ตรงกัน</p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">ตำแหน่ง</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAddRole('staff')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          addRole === 'staff'
                            ? 'bg-sky-50 text-sky-700 border-sky-300 ring-1 ring-sky-200'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <User className="w-4 h-4 inline mr-1.5" />
                        Staff
                      </button>
                      <button
                        onClick={() => setAddRole('owner')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          addRole === 'owner'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Shield className="w-4 h-4 inline mr-1.5" />
                        Owner
                      </button>
                    </div>
                  </div>
                </div>

                {/* ปุ่ม */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={resetModal}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleAddEmployee}
                    disabled={isSaving || !addName.trim() || addPin.length !== 6 || addPin !== addPinConfirm}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20"
                  >
                    {isSaving ? 'กำลังบันทึก...' : '✅ บันทึก'}
                  </button>
                </div>
              </>
            )}

            {/* === Modal: แก้ไขชื่อ === */}
            {activeModal === 'editName' && targetEmployee && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-sky-600" />
                    แก้ไขชื่อพนักงาน
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  ชื่อปัจจุบัน: <span className="font-bold text-slate-700">{targetEmployee.name}</span>
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">ชื่อใหม่</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={resetModal} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleEditName}
                    disabled={isSaving || !editName.trim()}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20"
                  >
                    {isSaving ? 'กำลังบันทึก...' : '✅ บันทึก'}
                  </button>
                </div>
              </>
            )}

            {/* === Modal: เปลี่ยน PIN === */}
            {activeModal === 'changePin' && targetEmployee && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-600" />
                    เปลี่ยน PIN
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  พนักงาน: <span className="font-bold text-slate-700">{targetEmployee.name} ({targetEmployee.role})</span>
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">PIN ใหม่ (6 หลัก)</label>
                    <div className="relative">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        value={newPin}
                        onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setNewPin(e.target.value); }}
                        placeholder="● ● ● ● ● ●"
                        maxLength={6}
                        inputMode="numeric"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">ยืนยัน PIN ใหม่</label>
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      value={newPinConfirm}
                      onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setNewPinConfirm(e.target.value); }}
                      placeholder="● ● ● ● ● ●"
                      maxLength={6}
                      inputMode="numeric"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono tracking-[0.3em] focus:outline-none focus:ring-2 transition ${
                        newPinConfirm && newPinConfirm !== newPin
                          ? 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-400'
                          : 'border-slate-200 focus:ring-red-500/30 focus:border-red-400'
                      }`}
                    />
                    {newPinConfirm && newPinConfirm !== newPin && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">PIN ไม่ตรงกัน</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={resetModal} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleChangePin}
                    disabled={isSaving || newPin.length !== 6 || newPin !== newPinConfirm}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20"
                  >
                    {isSaving ? 'กำลังบันทึก...' : '✅ บันทึก'}
                  </button>
                </div>
              </>
            )}

            {/* === Modal: เปลี่ยน Role (ต้องยืนยัน PIN) === */}
            {activeModal === 'changeRole' && targetEmployee && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                    เปลี่ยนตำแหน่ง
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-semibold">
                  <p>คุณกำลังจะเปลี่ยนตำแหน่งของ <span className="font-extrabold">{targetEmployee.name}</span></p>
                  <p className="mt-1">
                    จาก <span className="font-extrabold uppercase">{targetEmployee.role}</span> →{' '}
                    <span className="font-extrabold uppercase">{targetEmployee.role === 'owner' ? 'staff' : 'owner'}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🔐 กรุณากรอก PIN ของคุณเพื่อยืนยัน</label>
                  <div className="relative">
                    <input
                      type={showConfirmPin ? 'text' : 'password'}
                      value={confirmPin}
                      onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setConfirmPin(e.target.value); }}
                      placeholder="● ● ● ● ● ●"
                      maxLength={6}
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={resetModal} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleChangeRole}
                    disabled={isSaving || confirmPin.length !== 6}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    {isSaving ? 'กำลังบันทึก...' : '✅ ยืนยัน'}
                  </button>
                </div>
              </>
            )}

            {/* === Modal: ลบพนักงาน (ต้องยืนยัน PIN) === */}
            {activeModal === 'delete' && targetEmployee && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    ลบพนักงาน
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold">
                  <p>⚠️ คุณกำลังจะลบพนักงาน <span className="font-extrabold">{targetEmployee.name}</span> ({targetEmployee.role}) ออกจากระบบ</p>
                  <p className="mt-1 text-rose-500">การลบนี้ไม่สามารถย้อนกลับได้</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🔐 กรุณากรอก PIN ของคุณเพื่อยืนยัน</label>
                  <div className="relative">
                    <input
                      type={showConfirmPin ? 'text' : 'password'}
                      value={confirmPin}
                      onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setConfirmPin(e.target.value); }}
                      placeholder="● ● ● ● ● ●"
                      maxLength={6}
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={resetModal} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDeleteEmployee}
                    disabled={isSaving || confirmPin.length !== 6}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-rose-600/20"
                  >
                    {isSaving ? 'กำลังลบ...' : '🗑️ ยืนยันลบ'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/EmployeeManager.tsx
git commit -m "feat(ui): add EmployeeManager component with full CRUD + PIN confirmation"
```

---

### Task 4: เชื่อม Navigation — SidebarNav + TableMap

**Files:**
- Modify: `components/SidebarNav.tsx` (lines 19-27 NavTab type, lines 158-226 owner section mobile, lines 310-377 owner section desktop)
- Modify: `components/TableMap.tsx` (lines 6-16 imports, lines 163-171 header titles, lines 190-205 tab content rendering)

**Interfaces:**
- Consumes: `EmployeeManager` จาก `@/components/EmployeeManager` (Task 3)
- Produces: แท็บ `'employees'` เข้าถึงได้จาก sidebar (Owner only)

- [ ] **Step 1: เพิ่ม `'employees'` ใน NavTab type — `SidebarNav.tsx`**

แก้ไข `components/SidebarNav.tsx` บรรทัด 19-27:

เปลี่ยนจาก:
```typescript
export type NavTab =
  | 'floor'
  | 'kitchen'
  | 'history'
  | 'stock'
  | 'menu'
  | 'promo'
  | 'dashboard'
  | 'loyalty';
```

เป็น:
```typescript
export type NavTab =
  | 'floor'
  | 'kitchen'
  | 'history'
  | 'stock'
  | 'menu'
  | 'promo'
  | 'dashboard'
  | 'loyalty'
  | 'employees';
```

- [ ] **Step 2: เพิ่ม import `UserCog` icon — `SidebarNav.tsx`**

แก้ไข `components/SidebarNav.tsx` บรรทัด 5-17:

เพิ่ม `UserCog` ใน import list ของ lucide-react:

เปลี่ยนจาก:
```typescript
import {
  LogOut,
  ChefHat,
  Layers,
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  Tag,
  History,
  Users,
  Menu,
  X,
} from 'lucide-react';
```

เป็น:
```typescript
import {
  LogOut,
  ChefHat,
  Layers,
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  Tag,
  History,
  Users,
  UserCog,
  Menu,
  X,
} from 'lucide-react';
```

- [ ] **Step 3: เพิ่มปุ่ม "จัดการพนักงาน" ใน Mobile drawer — `SidebarNav.tsx`**

หลังปุ่ม "สมาชิก" (บรรทัด ~224 ใน Mobile drawer section) เพิ่มปุ่มใหม่:

```tsx
                    <button
                      onClick={() => handleTabClick('employees')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'employees'
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                      }`}
                    >
                      <UserCog className="w-4 h-4" />
                      <span>จัดการพนักงาน</span>
                    </button>
```

- [ ] **Step 4: เพิ่มปุ่ม "จัดการพนักงาน" ใน Desktop sidebar — `SidebarNav.tsx`**

หลังปุ่ม "สมาชิก" (บรรทัด ~376 ใน Desktop sidebar section) เพิ่มปุ่มใหม่:

```tsx
                <button
                  onClick={() => onSelectTab('employees')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'employees'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span>จัดการพนักงาน</span>
                </button>
```

- [ ] **Step 5: เพิ่ม import + render ใน TableMap — `TableMap.tsx`**

แก้ไข `components/TableMap.tsx`:

**5a.** เพิ่ม import (หลังบรรทัด 16):
```typescript
import { EmployeeManager } from '@/components/EmployeeManager';
```

**5b.** เพิ่ม header title (บรรทัด ~171 ในกลุ่ม header):
```tsx
                  {activeTab === 'employees' && 'จัดการพนักงาน'}
```

**5c.** เพิ่ม tab content rendering (บรรทัด ~191 ก่อน `activeTab === 'loyalty'`):

เปลี่ยนจาก:
```tsx
        {activeTab === 'loyalty' && isOwner ? (
          <LoyaltyManager />
```

เป็น:
```tsx
        {activeTab === 'employees' && isOwner ? (
          <EmployeeManager />
        ) : activeTab === 'loyalty' && isOwner ? (
          <LoyaltyManager />
```

- [ ] **Step 6: Commit**

```bash
git add components/SidebarNav.tsx components/TableMap.tsx
git commit -m "feat(nav): integrate EmployeeManager tab in sidebar (Owner only)"
```

---

## Verification

หลังทำทุก task เสร็จ:

- [ ] `pnpm build` — ไม่มี TypeScript errors
- [ ] ทดสอบ dev server: เปิดแท็บ "จัดการพนักงาน" ได้จาก sidebar (Owner only)
- [ ] ทดสอบ: เพิ่มพนักงานใหม่ → ปรากฏในรายชื่อ
- [ ] ทดสอบ: PIN ซ้ำ → แสดง error
- [ ] ทดสอบ: ลบพนักงาน → กรอก PIN Owner ยืนยัน → หายจากรายชื่อ
- [ ] ทดสอบ: ลบตัวเอง → ปุ่มลบไม่แสดง (client-side) + ถ้าเลี่ยงได้จะโดน server block
- [ ] ทดสอบ: แก้ไขชื่อ → อัปเดตทันที
- [ ] ทดสอบ: เปลี่ยน PIN → ล็อกเอาท์แล้วล็อกอินด้วย PIN ใหม่ได้
- [ ] ทดสอบ: เปลี่ยน Role → badge เปลี่ยน + ต้องยืนยัน PIN
- [ ] Final commit ทั้งหมดเรียบร้อย
