"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Search, ArrowLeft, Plus, Minus, Pencil, Trash2,
  DollarSign, Calendar, CheckCircle, AlertTriangle, X,
  CreditCard, Banknote, ArrowLeftRight, Clock
} from 'lucide-react';

// ========== Constants ==========

const POINTS_PER_100_BAHT = 10;
const POINT_VALUE_BAHT = 1;

// ========== Interfaces ==========

interface LoyaltyMember {
  phone_number: string;
  name: string;
  points: number;
  created_at: string;
}

interface BillRecord {
  id: number;
  order_id: number;
  payment_method: 'cash' | 'promptpay' | 'mixed';
  subtotal: number;
  discount_amount: number;
  net_amount: number;
  points_earned: number;
  points_redeemed: number;
  created_at: string;
  orders: { table_id: number } | null;
}

interface PointsLog {
  id: number;
  phone_number: string;
  adjustment: number;
  reason: string;
  adjusted_by: string;
  created_at: string;
}

// ========== Component ==========

export const LoyaltyManager: React.FC = () => {
  const { employee } = useAuth();

  // Main view state
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Detail view state
  const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [pointsLogs, setPointsLogs] = useState<PointsLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Adjust points modal
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsAdjustment, setPointsAdjustment] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsDirection, setPointsDirection] = useState<'add' | 'deduct'>('add');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const PRESET_REASONS = [
    'ชดเชยออเดอร์ผิด',
    'โปรโมชั่นวันเกิด',
    'ชดเชยความไม่สะดวก',
    'ของขวัญลูกค้า VIP',
    'แก้ไขข้อผิดพลาด',
  ];

  // ========== Helpers ==========

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'เงินสด';
      case 'promptpay': return 'โอนเงิน';
      case 'mixed': return 'ผสม';
      default: return method;
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-3.5 h-3.5" />;
      case 'promptpay': return <CreditCard className="w-3.5 h-3.5" />;
      case 'mixed': return <ArrowLeftRight className="w-3.5 h-3.5" />;
      default: return <Banknote className="w-3.5 h-3.5" />;
    }
  };

  // ========== Data Fetching ==========

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loyalty_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers((data || []) as LoyaltyMember[]);
    } catch (err) {
      console.error('Error fetching members:', err);
      showMsg('ไม่สามารถดึงข้อมูลสมาชิกได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetail = async (member: LoyaltyMember) => {
    try {
      setDetailLoading(true);
      setSelectedMember(member);

      // ดึงประวัติบิล (query payments + nested orders independently)
      let billResults: BillRecord[] = [];
      try {
        const { data: billData, error: billError } = await supabase
          .from('payments')
          .select('id, order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed, created_at, orders!inner(table_id)')
          .eq('phone_number', member.phone_number)
          .order('created_at', { ascending: false })
          .limit(50);

        if (billError) {
          // Fallback: query without nested orders join
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('payments')
            .select('id, order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed, created_at')
            .eq('phone_number', member.phone_number)
            .order('created_at', { ascending: false })
            .limit(50);

          if (fallbackError) throw fallbackError;
          billResults = (fallbackData || []).map(b => ({ ...b, orders: null })) as unknown as BillRecord[];
        } else {
          billResults = (billData || []) as unknown as BillRecord[];
        }
      } catch (billErr) {
        console.warn('Error fetching bills, continuing:', billErr);
      }
      setBills(billResults);

      // ดึงประวัติปรับแต้ม
      let logsResults: PointsLog[] = [];
      try {
        const { data: logsData, error: logsError } = await supabase
          .from('points_logs')
          .select('*')
          .eq('phone_number', member.phone_number)
          .order('created_at', { ascending: false })
          .limit(50);

        if (logsError) throw logsError;
        logsResults = (logsData || []) as PointsLog[];
      } catch (logsErr) {
        console.warn('Error fetching points logs, continuing:', logsErr);
      }
      setPointsLogs(logsResults);
    } catch (err) {
      console.error('Error fetching member detail:', err);
      showMsg('ไม่สามารถดึงข้อมูลรายละเอียดสมาชิกได้', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // ========== Actions ==========

  const handleEdit = async () => {
    if (!selectedMember || !editName.trim()) return;
    try {
      setIsSaving(true);

      if (editPhone !== selectedMember.phone_number) {
        // เปลี่ยนเบอร์: ต้องสร้างแถวใหม่แล้วลบแถวเก่า (PK = phone_number)
        const { error: insertErr } = await supabase.from('loyalty_members').insert({
          phone_number: editPhone,
          name: editName.trim(),
          points: selectedMember.points,
        });
        if (insertErr) throw insertErr;

        const { error: deleteErr } = await supabase.from('loyalty_members').delete().eq('phone_number', selectedMember.phone_number);
        if (deleteErr) throw deleteErr;

        setSelectedMember({ ...selectedMember, phone_number: editPhone, name: editName.trim() });
      } else {
        const { error } = await supabase
          .from('loyalty_members')
          .update({ name: editName.trim() })
          .eq('phone_number', selectedMember.phone_number);
        if (error) throw error;
        setSelectedMember({ ...selectedMember, name: editName.trim() });
      }

      showMsg('แก้ไขข้อมูลสมาชิกสำเร็จ', 'success');
      setShowEditModal(false);
      fetchMembers();
    } catch (err) {
      console.error(err);
      showMsg('ไม่สามารถแก้ไขข้อมูลได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('loyalty_members').delete().eq('phone_number', selectedMember.phone_number);
      if (error) throw error;
      showMsg(`ลบสมาชิก "${selectedMember.name}" สำเร็จ`, 'success');
      setShowDeleteModal(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      console.error(err);
      showMsg('ไม่สามารถลบสมาชิกได้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedMember || !pointsAdjustment || !pointsReason.trim()) return;
    const amount = parseInt(pointsAdjustment);
    if (isNaN(amount) || amount <= 0) return;

    const adjustment = pointsDirection === 'add' ? amount : -amount;
    const newPoints = selectedMember.points + adjustment;
    if (newPoints < 0) {
      showMsg('แต้มไม่เพียงพอสำหรับการหักแต้ม', 'error');
      return;
    }

    try {
      setIsAdjusting(true);

      // อัปเดตแต้มสมาชิก
      const { error: updateErr } = await supabase
        .from('loyalty_members')
        .update({ points: newPoints })
        .eq('phone_number', selectedMember.phone_number);
      if (updateErr) throw updateErr;

      // บันทึก log
      const { error: logErr } = await supabase.from('points_logs').insert({
        phone_number: selectedMember.phone_number,
        adjustment,
        reason: pointsReason.trim(),
        adjusted_by: employee?.name || 'Unknown',
      });
      if (logErr) throw logErr;

      setSelectedMember({ ...selectedMember, points: newPoints });
      showMsg(`${pointsDirection === 'add' ? 'เพิ่ม' : 'หัก'}แต้ม ${amount} แต้มสำเร็จ`, 'success');
      setShowPointsModal(false);
      setPointsAdjustment('');
      setPointsReason('');
      fetchMembers();
      // Refresh logs
      fetchMemberDetail({ ...selectedMember, points: newPoints });
    } catch (err) {
      console.error(err);
      showMsg('ไม่สามารถปรับแต้มได้', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  // ========== Filtered Data ==========

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone_number.includes(searchTerm)
  );

  const totalPoints = members.reduce((s, m) => s + m.points, 0);

  // ========== Detail View ==========

  if (selectedMember) {
    return (
      <div className="space-y-6 font-sans w-full">
        {/* Header with back button */}
          <div className="flex items-center gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
            <button
              onClick={() => setSelectedMember(null)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition active:scale-95 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {selectedMember.name}
              </h2>
              <p className="text-slate-500 text-xs font-semibold mt-0.5">📱 {selectedMember.phone_number} · สมัครเมื่อ {formatDate(selectedMember.created_at)}</p>
            </div>
          </div>

          {/* Member Info + Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-slate-500 text-xs font-semibold">แต้มคงเหลือ</div>
                <div className="text-2xl font-black text-red-600">{selectedMember.points.toLocaleString()} <span className="text-xs font-bold text-slate-400">แต้ม</span></div>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="flex gap-3 items-center md:col-span-2">
              <button
                onClick={() => {
                  setPointsDirection('add');
                  setPointsAdjustment('');
                  setPointsReason('');
                  setShowPointsModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                เพิ่มแต้ม
              </button>
              <button
                onClick={() => {
                  setPointsDirection('deduct');
                  setPointsAdjustment('');
                  setPointsReason('');
                  setShowPointsModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Minus className="w-4 h-4" />
                หักแต้ม
              </button>
              <button
                onClick={() => {
                  setEditName(selectedMember.name);
                  setEditPhone(selectedMember.phone_number);
                  setShowEditModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Pencil className="w-4 h-4" />
                แก้ไข
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center gap-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 px-4 py-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ประวัติบิลย้อนหลัง */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    ประวัติบิลย้อนหลัง ({bills.length} รายการ)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-700 text-xs font-extrabold bg-slate-50">
                        <th className="py-3.5 px-6">วันที่</th>
                        <th className="py-3.5 px-4">โต๊ะ</th>
                        <th className="py-3.5 px-4 text-right">ยอดชำระ</th>
                        <th className="py-3.5 px-4">วิธีชำระ</th>
                        <th className="py-3.5 px-4 text-center">แต้มได้</th>
                        <th className="py-3.5 px-4 text-center">แต้มใช้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {bills.map(bill => (
                        <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6 text-slate-500 font-semibold">
                            {formatDate(bill.created_at)} {formatTime(bill.created_at)} น.
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-800">
                            T{bill.orders?.table_id || '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-red-600 text-sm">
                            {Number(bill.net_amount).toLocaleString()} ฿
                          </td>
                          <td className="py-4 px-4">
                            <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                              {getPaymentIcon(bill.payment_method)}
                              {getPaymentLabel(bill.payment_method)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {bill.points_earned > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                +{bill.points_earned}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {bill.points_redeemed > 0 && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                -{bill.points_redeemed}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {bills.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                            ยังไม่มีประวัติชำระเงินสำหรับสมาชิกท่านนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        {/* ============ EDIT MODAL ============ */}
        {showEditModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">แก้ไขข้อมูลสมาชิก</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">ชื่อ</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">เบอร์โทร (10 หลัก)</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isSaving || !editName.trim() || editPhone.length !== 10}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ DELETE MODAL ============ */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 text-center space-y-3">
                <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">ยืนยันการลบสมาชิก</h3>
                <p className="text-xs text-slate-600">
                  คุณต้องการลบ <span className="text-slate-900 font-bold">{selectedMember.name}</span> ({selectedMember.phone_number}) ออกจากระบบหรือไม่?
                </p>
                <p className="text-[11px] text-rose-600 font-bold">⚠️ การลบจะไม่สามารถย้อนกลับได้ แต้มสะสมทั้งหมดจะหายไป</p>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-center gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isDeleting ? 'กำลังลบ...' : 'ลบสมาชิก'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ ADJUST POINTS MODAL ============ */}
        {showPointsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowPointsModal(false)}>
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${
                pointsDirection === 'add' ? 'bg-emerald-50' : 'bg-rose-50'
              }`}>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  {pointsDirection === 'add' ? <Plus className="w-4 h-4 text-emerald-600" /> : <Minus className="w-4 h-4 text-rose-600" />}
                  {pointsDirection === 'add' ? 'เพิ่มแต้ม' : 'หักแต้ม'}ให้ {selectedMember.name}
                </h3>
                <button onClick={() => setShowPointsModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">จำนวนแต้ม</label>
                  <input
                    type="number"
                    value={pointsAdjustment}
                    onChange={e => setPointsAdjustment(e.target.value)}
                    min="1"
                    placeholder="กรอกจำนวนแต้ม"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500"
                  />
                  {pointsDirection === 'deduct' && (
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">แต้มคงเหลือปัจจุบัน: {selectedMember.points.toLocaleString()} แต้ม</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">เหตุผล *</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_REASONS.map(reason => (
                      <button
                        key={reason}
                        onClick={() => setPointsReason(reason)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                          pointsReason === reason
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={pointsReason}
                    onChange={e => setPointsReason(e.target.value)}
                    placeholder="หรือพิมพ์เหตุผลเอง..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowPointsModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleAdjustPoints}
                  disabled={isAdjusting || !pointsAdjustment || parseInt(pointsAdjustment) <= 0 || !pointsReason.trim()}
                  className={`px-5 py-2 text-xs font-extrabold rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs ${
                    pointsDirection === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {isAdjusting ? 'กำลังบันทึก...' : `${pointsDirection === 'add' ? 'เพิ่ม' : 'หัก'}แต้ม`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== Main View (รายชื่อสมาชิก) ==========

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              ระบบจัดการสมาชิก (CRM / Loyalty)
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              ดูรายชื่อ แก้ไข ลบ และจัดการแต้มสมาชิกของร้าน · ทุก 100 บาท = {POINTS_PER_100_BAHT} แต้ม · {POINT_VALUE_BAHT} แต้ม = ลด {POINT_VALUE_BAHT} บาท
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-slate-500 text-xs font-semibold">สมาชิกทั้งหมด</div>
              <div className="text-2xl font-black text-slate-900">{members.length} <span className="text-xs font-bold text-slate-400">คน</span></div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-slate-500 text-xs font-semibold">แต้มสะสมรวมในระบบ</div>
              <div className="text-2xl font-black text-red-600">{totalPoints.toLocaleString()} <span className="text-xs font-bold text-slate-400">แต้ม</span></div>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Members Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 text-xs font-extrabold bg-slate-50">
                    <th className="py-3.5 px-6">ชื่อ</th>
                    <th className="py-3.5 px-4">เบอร์โทร</th>
                    <th className="py-3.5 px-4 text-center">แต้มคงเหลือ</th>
                    <th className="py-3.5 px-6">วันที่สมัคร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMembers.map(member => (
                    <tr
                      key={member.phone_number}
                      onClick={() => fetchMemberDetail(member)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                        {member.name}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-semibold">
                        {member.phone_number}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-xs font-black text-amber-500">{member.points.toLocaleString()}</span>
                        <span className="text-[10px] text-stone-500 ml-1">แต้ม</span>
                      </td>
                      <td className="py-4 px-6 text-stone-500 font-medium">
                        {formatDate(member.created_at)}
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-16 text-center">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-xs font-bold">
                          {searchTerm ? 'ไม่พบสมาชิกที่ค้นหา' : 'ยังไม่มีสมาชิกในระบบ'}
                        </p>
                        <p className="text-slate-400 text-[10px] mt-1 font-medium">
                          {searchTerm ? 'ลองค้นหาด้วยชื่อหรือเบอร์อื่น' : 'สมาชิกจะถูกเพิ่มเมื่อพนักงานสมัครให้ตอนเช็คบิล'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Count */}
            {filteredMembers.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-semibold">
                แสดง {filteredMembers.length} จาก {members.length} คน
              </div>
            )}
          </div>
        )}
    </div>
  );
};
