"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Pencil, KeyRound, ArrowLeftRight,
  Trash2, X, CheckCircle, AlertTriangle, Shield, User, Users,
  Eye, EyeOff
} from 'lucide-react';
import { Card } from '@/components/ui/card';

// ========== Interfaces ==========

interface Employee {
  id: number;
  name: string;
  role: 'owner' | 'staff';
  created_at: string;
}

type ModalType = 'add' | 'edit' | 'delete' | null;

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

  // ฟอร์มแก้ไขพนักงาน (รวม ชื่อ, ตำแหน่ง, และ PIN)
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'staff' | 'owner'>('staff');
  const [editPin, setEditPin] = useState('');
  const [editPinConfirm, setEditPinConfirm] = useState('');
  const [showEditPin, setShowEditPin] = useState(false);

  // ฟอร์มยืนยัน PIN (ลบ / อนุมัติเปลี่ยนตำแหน่งหรือ PIN)
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // ========== Data Fetching ==========

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // ตาราง employees ไม่มี SELECT policy อีกต่อไป (A2) — รายชื่อมาทาง server tier ทางเดียว
      const res = await fetch('/api/employees', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'ไม่สามารถดึงข้อมูลพนักงานได้');
      setEmployees((data.employees ?? []) as Employee[]);
    } catch (err) {
      console.error('Error fetching employees:', err);
      showMessage('ไม่สามารถดึงข้อมูลพนักงานได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // ไม่มี realtime subscription บน employees แล้ว — ตารางนี้ client อ่านตรงไม่ได้
    // ทุกการเปลี่ยนแปลงมาจากหน้านี้เอง จึง refetch หลังทำรายการสำเร็จก็พอ
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
    setEditRole('staff');
    setEditPin('');
    setEditPinConfirm('');
    setShowEditPin(false);
    setConfirmPin('');
    setShowConfirmPin(false);
  };

  const openModal = (type: ModalType, emp?: Employee) => {
    resetModal();
    setActiveModal(type);
    if (emp) {
      setTargetEmployee(emp);
      if (type === 'edit') {
        setEditName(emp.name);
        setEditRole(emp.role);
      }
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
      // PIN ถูกส่งเป็น plaintext ผ่าน HTTPS แล้ว hash ด้วย bcrypt ใน DB
      // (เดิม client คำนวณ SHA-256 เองแล้วส่ง hash ไปให้ RPC ที่ไม่เช็คสิทธิ์อะไรเลย — A3)
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), pin: addPin, role: addRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data?.error ?? 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน', 'error');
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

  // แก้ไขข้อมูลพนักงาน (รวม ชื่อ, ตำแหน่ง, PIN)
  const handleEditEmployee = async () => {
    if (!targetEmployee) return;
    if (!editName.trim()) return showMessage('กรุณากรอกชื่อพนักงาน', 'error');

    const isRoleChanged = editRole !== targetEmployee.role;
    const isPinEntered = editPin.length > 0;

    if (isPinEntered) {
      if (editPin.length !== 6 || !/^\d{6}$/.test(editPin)) return showMessage('PIN ต้องเป็นตัวเลข 6 หลัก', 'error');
      if (editPin !== editPinConfirm) return showMessage('PIN ทั้ง 2 ช่องไม่ตรงกัน', 'error');
    }

    // หากมีการเปลี่ยน Role หรือเปลี่ยน PIN ให้ยืนยัน PIN ของ Owner
    if ((isRoleChanged || isPinEntered) && confirmPin.length !== 6) {
      return showMessage('กรุณากรอก PIN 6 หลักของคุณเพื่อยืนยันการทำรายการ', 'error');
    }

    try {
      setIsSaving(true);

      // การยืนยัน PIN ของ Owner ทำที่ server (/api/employees/[id]) ผ่าน verify_pin
      // เดิมทำโดย query .eq('pin_hash', ...) จากเบราว์เซอร์ = PIN oracle ตัวที่สอง (A2)
      const res = await fetch(`/api/employees/${targetEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() !== targetEmployee.name ? editName.trim() : null,
          role: isRoleChanged ? editRole : null,
          pin: isPinEntered ? editPin : null,
          confirmPin: (isRoleChanged || isPinEntered) ? confirmPin : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data?.error ?? 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลพนักงาน', 'error');
        return;
      }

      showMessage(`อัปเดตข้อมูลพนักงาน "${editName.trim()}" สำเร็จ`, 'success');
      resetModal();
      fetchEmployees();
    } catch (err: any) {
      console.error('Error updating employee:', err);
      showMessage(err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลพนักงาน', 'error');
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
      const res = await fetch(`/api/employees/${targetEmployee.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmPin }),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(data?.error ?? 'เกิดข้อผิดพลาดในการลบพนักงาน', 'error');
      } else {
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
    <div className="w-full space-y-6">
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

      {/* Header & Add Employee Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-[50%]">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>จัดการพนักงาน</span>
          </h1>
          <p className="text-caption mt-0.5">
            จัดการข้อมูลพนักงาน กำหนดตำแหน่ง
          </p>
        </div>

        <button
          onClick={() => openModal('add')}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-extrabold shadow-md shadow-red-600/20 transition active:scale-95 cursor-pointer shrink-0 self-end md:self-auto border-none"
        >
          <Plus className="w-4 h-4" />
          เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-card-label">พนักงานทั้งหมด</p>
          <p className="text-card-value mt-1">{employees.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-red-500" />
            <p className="text-card-label">Owner</p>
          </div>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{ownerCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            <p className="text-card-label">Staff</p>
          </div>
          <p className="text-2xl font-black text-slate-700 dark:text-neutral-300 mt-1">{staffCount}</p>
        </Card>
      </div>

      {/* รายชื่อพนักงาน */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-neutral-500 text-sm font-semibold">
          ยังไม่มีพนักงานในระบบ
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {employees.map(emp => {
            const isOwnerBadge = emp.role === 'owner';
            const isSelf = currentUser?.id === emp.id;

            return (
              <Card
                key={emp.id}
                className="p-5 transition-all"
              >
                {/* ข้อมูลพนักงาน */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-extrabold text-slate-900 dark:text-neutral-100">{emp.name}</p>
                      {isSelf && (
                        <span className="text-xs font-extrabold bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-md border border-red-100 dark:border-red-900/50">
                          คุณ
                        </span>
                      )}
                    </div>
                    <p className="text-card-sublabel mt-0.5">
                      สร้างเมื่อ {new Date(emp.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                    isOwnerBadge
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                      : 'bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                  }`}>
                    {emp.role}
                  </span>
                </div>

                {/* ปุ่ม Actions (แก้ไข & ลบ) */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    onClick={() => openModal('edit', emp)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700/80 text-slate-700 dark:text-neutral-200 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-sm font-bold transition active:scale-95 border border-slate-200 dark:border-neutral-700 hover:border-red-200 dark:hover:border-red-900/50 shadow-2xs cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-slate-400" />
                    แก้ไข
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => openModal('delete', emp)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer border-none"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                      ลบ
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========== Modals ========== */}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">

            {/* === Modal: เพิ่มพนักงาน === */}
            {activeModal === 'add' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-red-600 dark:text-red-400" />
                    เพิ่มพนักงานใหม่
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* ชื่อ */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">ชื่อพนักงาน</label>
                    <input
                      type="text"
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                      placeholder="เช่น สมชาย"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm text-slate-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition"
                    />
                  </div>

                  {/* PIN */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">PIN 6 หลัก</label>
                    <div className="relative">
                      <input
                        type={showAddPin ? 'text' : 'password'}
                        value={addPin}
                        onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setAddPin(e.target.value); }}
                        placeholder="● ● ● ● ● ●"
                        maxLength={6}
                        inputMode="numeric"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm text-slate-800 dark:text-neutral-100 font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddPin(!showAddPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        {showAddPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ยืนยัน PIN */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">ยืนยัน PIN</label>
                    <input
                      type={showAddPin ? 'text' : 'password'}
                      value={addPinConfirm}
                      onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setAddPinConfirm(e.target.value); }}
                      placeholder="● ● ● ● ● ●"
                      maxLength={6}
                      inputMode="numeric"
                      className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border rounded-xl text-sm text-slate-800 dark:text-neutral-100 font-mono tracking-[0.3em] focus:outline-none focus:ring-2 transition pr-10 ${
                        addPinConfirm && addPinConfirm !== addPin
                          ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/30 focus:border-rose-400'
                          : 'border-slate-200 dark:border-neutral-700 focus:ring-red-500/30 focus:border-red-400'
                      }`}
                    />
                    {addPinConfirm && addPinConfirm !== addPin && (
                      <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1">PIN ไม่ตรงกัน</p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">ตำแหน่ง</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAddRole('staff')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${
                          addRole === 'staff'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 ring-1 ring-sky-200 dark:ring-sky-900/50'
                            : 'bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <User className="w-4 h-4 inline mr-1.5" />
                        Staff
                      </button>
                      <button
                        onClick={() => setAddRole('owner')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${
                          addRole === 'owner'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 ring-1 ring-amber-200 dark:ring-amber-900/50'
                            : 'bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700'
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
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 rounded-xl text-sm font-bold transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleAddEmployee}
                    disabled={isSaving || !addName.trim() || addPin.length !== 6 || addPin !== addPinConfirm}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20 border-none"
                  >
                    {isSaving ? 'กำลังบันทึก...' : '✅ บันทึก'}
                  </button>
                </div>
              </>
            )}



            {/* === Modal: แก้ไขพนักงาน (รวมชื่อ ตำแหน่ง และ PIN) === */}
            {activeModal === 'edit' && targetEmployee && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-red-600 dark:text-red-400" />
                    แก้ไขข้อมูลพนักงาน
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* ชื่อพนักงาน */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">ชื่อพนักงาน</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="เช่น สมชาย"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm text-slate-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition"
                    />
                  </div>

                  {/* ตำแหน่ง (Role) */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">ตำแหน่ง</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditRole('staff')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${
                          editRole === 'staff'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 ring-1 ring-sky-200 dark:ring-sky-900/50'
                            : 'bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <User className="w-4 h-4 inline mr-1.5" />
                        Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRole('owner')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${
                          editRole === 'owner'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 ring-1 ring-amber-200 dark:ring-amber-900/50'
                            : 'bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <Shield className="w-4 h-4 inline mr-1.5" />
                        Owner
                      </button>
                    </div>
                  </div>

                  {/* เปลี่ยน PIN (ไม่บังคับ — ปล่อยว่างถ้าไม่เปลี่ยน) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1">
                      เปลี่ยน PIN 6 หลัก <span className="text-slate-400 font-normal text-xs">(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPin ? 'text' : 'password'}
                        value={editPin}
                        onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setEditPin(e.target.value); }}
                        placeholder="● ● ● ● ● ●"
                        maxLength={6}
                        inputMode="numeric"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm text-slate-800 dark:text-neutral-100 font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPin(!showEditPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {editPin.length > 0 && (
                      <div className="mt-3">
                        <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">ยืนยัน PIN ใหม่</label>
                        <input
                          type={showEditPin ? 'text' : 'password'}
                          value={editPinConfirm}
                          onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setEditPinConfirm(e.target.value); }}
                          placeholder="● ● ● ● ● ●"
                          maxLength={6}
                          inputMode="numeric"
                          className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border rounded-xl text-sm text-slate-800 dark:text-neutral-100 font-mono tracking-[0.3em] focus:outline-none focus:ring-2 transition ${
                            editPinConfirm && editPinConfirm !== editPin
                              ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/30 focus:border-rose-400'
                              : 'border-slate-200 dark:border-neutral-700 focus:ring-red-500/30 focus:border-red-400'
                          }`}
                        />
                        {editPinConfirm && editPinConfirm !== editPin && (
                          <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1">PIN ไม่ตรงกัน</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* PIN ยืนยันสิทธิ์ Owner (แสดงเมื่อมีการเปลี่ยนตำแหน่ง หรือเปลี่ยน PIN) */}
                  {(editRole !== targetEmployee.role || editPin.length > 0) && (
                    <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                      <label className="block text-sm font-bold text-amber-800 dark:text-amber-300 mb-1.5">
                        🔐 กรอก PIN ของคุณเพื่ออนุมัติการเปลี่ยนตำแหน่ง/PIN
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPin ? 'text' : 'password'}
                          value={confirmPin}
                          onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setConfirmPin(e.target.value); }}
                          placeholder="● ● ● ● ● ●"
                          maxLength={6}
                          inputMode="numeric"
                          className="w-full px-4 py-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm text-slate-800 dark:text-neutral-100 font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ปุ่มกดยืนยัน */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={resetModal}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 rounded-xl text-sm font-bold transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleEditEmployee}
                    disabled={
                      isSaving ||
                      !editName.trim() ||
                      (editPin.length > 0 && (editPin.length !== 6 || editPin !== editPinConfirm)) ||
                      ((editRole !== targetEmployee.role || editPin.length > 0) && confirmPin.length !== 6)
                    }
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-red-600/20 border-none"
                  >
                    {isSaving ? 'กำลังบันทึก...' : '✅ บันทึก'}
                  </button>
                </div>
              </>
            )}

            {/* === Modal: ลบพนักงาน (ต้องยืนยัน PIN) === */}
            {activeModal === 'delete' && targetEmployee && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    ลบพนักงาน
                  </h3>
                  <button onClick={resetModal} className="p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 text-sm text-rose-700 dark:text-rose-300 font-semibold">
                  <p>⚠️ คุณกำลังจะลบพนักงาน <span className="font-extrabold">{targetEmployee.name}</span> ({targetEmployee.role}) ออกจากระบบ</p>
                  <p className="mt-1 text-rose-500 dark:text-rose-400">การลบนี้ไม่สามารถย้อนกลับได้</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-neutral-300 mb-1.5">🔐 กรุณากรอก PIN ของคุณเพื่อยืนยัน</label>
                  <div className="relative">
                    <input
                      type={showConfirmPin ? 'text' : 'password'}
                      value={confirmPin}
                      onChange={e => { if (/^\d{0,6}$/.test(e.target.value)) setConfirmPin(e.target.value); }}
                      placeholder="● ● ● ● ● ●"
                      maxLength={6}
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm text-slate-800 dark:text-neutral-100 font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={resetModal} className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 rounded-xl text-sm font-bold transition cursor-pointer">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDeleteEmployee}
                    disabled={isSaving || confirmPin.length !== 6}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-rose-600/20 border-none"
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
