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

      // ดึงประวัติบิล
      const { data: billData, error: billError } = await supabase
        .from('payments')
        .select('id, order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed, created_at, orders(table_id)')
        .eq('phone_number', member.phone_number)
        .order('created_at', { ascending: false })
        .limit(50);

      if (billError) throw billError;
      setBills((billData || []) as unknown as BillRecord[]);

      // ดึงประวัติปรับแต้ม
      const { data: logsData, error: logsError } = await supabase
        .from('points_logs')
        .select('*')
        .eq('phone_number', member.phone_number)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setPointsLogs((logsData || []) as PointsLog[]);
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
      <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header with back button */}
          <div className="flex items-center gap-4 border-b border-stone-850 pb-6">
            <button
              onClick={() => setSelectedMember(null)}
              className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl hover:bg-stone-800 transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-stone-300" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                {selectedMember.name}
              </h2>
              <p className="text-stone-400 text-xs mt-0.5">📱 {selectedMember.phone_number} · สมัครเมื่อ {formatDate(selectedMember.created_at)}</p>
            </div>
          </div>

          {/* Member Info + Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-stone-400 text-xs font-medium">แต้มคงเหลือ</div>
                <div className="text-2xl font-black text-amber-500">{selectedMember.points.toLocaleString()} <span className="text-sm font-bold text-stone-500">แต้ม</span></div>
              </div>
              <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
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
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 px-4 py-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
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
                className="flex-1 flex items-center justify-center gap-2 bg-red-950/30 hover:bg-red-950/50 border border-red-900/30 text-red-400 px-4 py-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
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
                className="flex-1 flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 px-4 py-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                แก้ไข
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 px-4 py-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                : 'bg-red-950/20 border-red-900/40 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ประวัติบิลย้อนหลัง */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
                <div className="px-6 py-4 border-b border-stone-800">
                  <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    ประวัติบิลย้อนหลัง ({bills.length} รายการ)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/50">
                        <th className="py-3.5 px-6">วันที่</th>
                        <th className="py-3.5 px-4">โต๊ะ</th>
                        <th className="py-3.5 px-4 text-right">ยอดชำระ</th>
                        <th className="py-3.5 px-4">วิธีชำระ</th>
                        <th className="py-3.5 px-4 text-center">แต้มได้</th>
                        <th className="py-3.5 px-4 text-center">แต้มใช้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-850 text-xs">
                      {bills.map(bill => (
                        <tr key={bill.id} className="hover:bg-stone-900/20 transition-colors">
                          <td className="py-4 px-6 text-stone-400 font-semibold">
                            {formatDate(bill.created_at)} {formatTime(bill.created_at)} น.
                          </td>
                          <td className="py-4 px-4 font-bold text-stone-300">
                            T{bill.orders?.table_id || '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-stone-100">
                            {Number(bill.net_amount).toLocaleString()} ฿
                          </td>
                          <td className="py-4 px-4">
                            <span className="flex items-center gap-1.5 text-stone-400 font-medium">
                              {getPaymentIcon(bill.payment_method)}
                              {getPaymentLabel(bill.payment_method)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {bill.points_earned > 0 && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                                +{bill.points_earned}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {bill.points_redeemed > 0 && (
                              <span className="text-[10px] font-bold text-red-400 bg-red-950/20 border border-red-900/30 px-2 py-0.5 rounded-full">
                                -{bill.points_redeemed}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {bills.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-stone-500 font-semibold text-xs">
                            ยังไม่มีประวัติการซื้อ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ประวัติปรับแต้มด้วยมือ */}
              {pointsLogs.length > 0 && (
                <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
                  <div className="px-6 py-4 border-b border-stone-800">
                    <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      ประวัติปรับแต้มด้วยมือ ({pointsLogs.length} รายการ)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/50">
                          <th className="py-3.5 px-6">วันที่</th>
                          <th className="py-3.5 px-4 text-center">จำนวน</th>
                          <th className="py-3.5 px-4">เหตุผล</th>
                          <th className="py-3.5 px-6">ผู้ปรับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-850 text-xs">
                        {pointsLogs.map(log => (
                          <tr key={log.id} className="hover:bg-stone-900/20 transition-colors">
                            <td className="py-4 px-6 text-stone-400 font-semibold">
                              {formatDate(log.created_at)} {formatTime(log.created_at)} น.
                            </td>
                            <td className="py-4 px-4 text-center">
                              {log.adjustment > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-0.5 rounded-full">
                                  +{log.adjustment}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-red-400 bg-red-950/20 border border-red-900/30 px-2.5 py-0.5 rounded-full">
                                  {log.adjustment}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-stone-300 font-medium">{log.reason}</td>
                            <td className="py-4 px-6 text-stone-400 font-medium">{log.adjusted_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============ EDIT MODAL ============ */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
            <div className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">แก้ไขข้อมูลสมาชิก</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-stone-900 rounded-xl transition cursor-pointer">
                  <X className="w-4 h-4 text-stone-400" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1.5">ชื่อ</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1.5">เบอร์โทร (10 หลัก)</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-stone-800 flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white transition cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isSaving || !editName.trim() || editPhone.length !== 10}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ DELETE MODAL ============ */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 text-center space-y-3">
                <div className="w-14 h-14 bg-red-950/30 border border-red-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-sm font-bold text-white">ยืนยันการลบสมาชิก</h3>
                <p className="text-xs text-stone-400">
                  คุณต้องการลบ <span className="text-white font-bold">{selectedMember.name}</span> ({selectedMember.phone_number}) ออกจากระบบหรือไม่?
                </p>
                <p className="text-[10px] text-red-400 font-semibold">⚠️ การลบจะไม่สามารถย้อนกลับได้ แต้มสะสมทั้งหมดจะหายไป</p>
              </div>
              <div className="px-6 py-4 border-t border-stone-800 flex justify-center gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="px-5 py-2 text-xs font-bold text-stone-400 hover:text-white transition cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'กำลังลบ...' : 'ลบสมาชิก'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ ADJUST POINTS MODAL ============ */}
        {showPointsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPointsModal(false)}>
            <div className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className={`px-6 py-4 border-b border-stone-800 flex items-center justify-between ${
                pointsDirection === 'add' ? 'bg-emerald-950/20' : 'bg-red-950/20'
              }`}>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {pointsDirection === 'add' ? <Plus className="w-4 h-4 text-emerald-400" /> : <Minus className="w-4 h-4 text-red-400" />}
                  {pointsDirection === 'add' ? 'เพิ่มแต้ม' : 'หักแต้ม'}ให้ {selectedMember.name}
                </h3>
                <button onClick={() => setShowPointsModal(false)} className="p-2 hover:bg-stone-900 rounded-xl transition cursor-pointer">
                  <X className="w-4 h-4 text-stone-400" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1.5">จำนวนแต้ม</label>
                  <input
                    type="number"
                    value={pointsAdjustment}
                    onChange={e => setPointsAdjustment(e.target.value)}
                    min="1"
                    placeholder="กรอกจำนวนแต้ม"
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                  {pointsDirection === 'deduct' && (
                    <p className="text-[10px] text-stone-500 mt-1">แต้มคงเหลือปัจจุบัน: {selectedMember.points.toLocaleString()} แต้ม</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1.5">เหตุผล *</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_REASONS.map(reason => (
                      <button
                        key={reason}
                        onClick={() => setPointsReason(reason)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                          pointsReason === reason
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
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
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-stone-800 flex justify-end gap-3">
                <button onClick={() => setShowPointsModal(false)} className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white transition cursor-pointer">
                  ยกเลิก
                </button>
                <button
                  onClick={handleAdjustPoints}
                  disabled={isAdjusting || !pointsAdjustment || parseInt(pointsAdjustment) <= 0 || !pointsReason.trim()}
                  className={`px-5 py-2 text-xs font-extrabold rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    pointsDirection === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
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
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              ระบบจัดการสมาชิก (CRM / Loyalty)
            </h2>
            <p className="text-stone-400 text-xs mt-1">
              ดูรายชื่อ แก้ไข ลบ และจัดการแต้มสมาชิกของร้าน · ทุก 100 บาท = {POINTS_PER_100_BAHT} แต้ม · {POINT_VALUE_BAHT} แต้ม = ลด {POINT_VALUE_BAHT} บาท
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-stone-400 text-xs font-medium">สมาชิกทั้งหมด</div>
              <div className="text-2xl font-black text-white">{members.length} <span className="text-sm font-bold text-stone-500">คน</span></div>
            </div>
            <div className="p-3 bg-blue-950/30 text-blue-400 rounded-xl border border-blue-900/25">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-stone-400 text-xs font-medium">แต้มสะสมรวมในระบบ</div>
              <div className="text-2xl font-black text-amber-500">{totalPoints.toLocaleString()} <span className="text-sm font-bold text-stone-500">แต้ม</span></div>
            </div>
            <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
              : 'bg-red-950/20 border-red-900/40 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Members Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/50">
                    <th className="py-3.5 px-6">ชื่อ</th>
                    <th className="py-3.5 px-4">เบอร์โทร</th>
                    <th className="py-3.5 px-4 text-center">แต้มคงเหลือ</th>
                    <th className="py-3.5 px-6">วันที่สมัคร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850 text-xs">
                  {filteredMembers.map(member => (
                    <tr
                      key={member.phone_number}
                      onClick={() => fetchMemberDetail(member)}
                      className="hover:bg-stone-900/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-bold text-stone-200 group-hover:text-amber-400 transition-colors">
                        {member.name}
                      </td>
                      <td className="py-4 px-4 text-stone-400 font-semibold">
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
                        <Users className="w-10 h-10 text-stone-700 mx-auto mb-3" />
                        <p className="text-stone-500 text-xs font-semibold">
                          {searchTerm ? 'ไม่พบสมาชิกที่ค้นหา' : 'ยังไม่มีสมาชิกในระบบ'}
                        </p>
                        <p className="text-stone-600 text-[10px] mt-1">
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
              <div className="px-5 py-3 bg-stone-900/50 border-t border-stone-850 text-xs text-stone-500 font-medium">
                แสดง {filteredMembers.length} จาก {members.length} คน
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
