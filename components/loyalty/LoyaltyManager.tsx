"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Search,
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CustomSelect } from '@/components/ui/select';
import { TablePagination } from '@/components/ui/pagination';
import { MemberInfoCard } from './MemberInfoCard';
import { PointsHistoryModal } from './PointsHistoryModal';

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

export const LoyaltyManager: React.FC = () => {
  const { employee } = useAuth();

  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [pointsLogs, setPointsLogs] = useState<PointsLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loyalty_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setMembers(data as LoyaltyMember[]);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setMessage({ text: 'ไม่สามารถดึงข้อมูลสมาชิกได้', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetails = async (phone: string) => {
    try {
      setDetailLoading(true);

      const { data: billsData, error: billsError } = await supabase
        .from('payments')
        .select('id, order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed, created_at, orders(table_id)')
        .eq('phone_number', phone)
        .order('created_at', { ascending: false });

      if (billsError) throw billsError;
      if (billsData) setBills(billsData as unknown as BillRecord[]);

      const { data: logsData, error: logsError } = await supabase
        .from('points_logs')
        .select('*')
        .eq('phone_number', phone)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      if (logsData) setPointsLogs(logsData as PointsLog[]);
    } catch (err: any) {
      console.error('Error fetching member details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openDetail = (member: LoyaltyMember) => {
    setSelectedMember(member);
    fetchMemberDetails(member.phone_number);
  };

  const closeDetail = () => {
    setSelectedMember(null);
    setBills([]);
    setPointsLogs([]);
  };

  const handleEditMember = async () => {
    if (!selectedMember || !editName.trim()) return;
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('loyalty_members')
        .update({ name: editName.trim() })
        .eq('phone_number', selectedMember.phone_number);

      if (error) throw error;

      const updated = { ...selectedMember, name: editName.trim() };
      setSelectedMember(updated);
      setMembers(prev =>
        prev.map(m => (m.phone_number === selectedMember.phone_number ? updated : m))
      );

      setShowEditModal(false);
      setMessage({ text: 'อัปเดตข้อมูลสมาชิกเรียบร้อยแล้ว', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'ไม่สามารถอัปเดตข้อมูลได้: ' + (err.message || ''), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('loyalty_members')
        .delete()
        .eq('phone_number', selectedMember.phone_number);

      if (error) throw error;

      setShowDeleteModal(false);
      closeDetail();
      fetchMembers();
      setMessage({ text: 'ลบสมาชิกเรียบร้อยแล้ว', type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'ไม่สามารถลบสมาชิกได้: ' + (err.message || ''), type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedMember) return;
    const amount = parseInt(pointsAdjustment, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('กรุณากรอกจำนวนแต้มให้ถูกต้อง');
      return;
    }
    if (!pointsReason.trim()) {
      alert('กรุณาระบุเหตุผลในการปรับแต้ม');
      return;
    }

    const finalAdjustment = pointsDirection === 'add' ? amount : -amount;
    const newPoints = Math.max(0, selectedMember.points + finalAdjustment);

    try {
      setIsAdjusting(true);

      const { error: updateError } = await supabase
        .from('loyalty_members')
        .update({ points: newPoints })
        .eq('phone_number', selectedMember.phone_number);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('points_logs').insert([
        {
          phone_number: selectedMember.phone_number,
          adjustment: finalAdjustment,
          reason: pointsReason.trim(),
          adjusted_by: employee?.name || 'Staff',
        },
      ]);

      if (logError) console.error('Error writing points log:', logError);

      const updated = { ...selectedMember, points: newPoints };
      setSelectedMember(updated);
      setMembers(prev =>
        prev.map(m => (m.phone_number === selectedMember.phone_number ? updated : m))
      );

      setShowPointsModal(false);
      setPointsAdjustment('');
      setPointsReason('');
      fetchMemberDetails(selectedMember.phone_number);
      setMessage({ text: `ปรับแต้มเรียบร้อยแล้ว (${finalAdjustment > 0 ? '+' : ''}${finalAdjustment} แต้ม)`, type: 'success' });
    } catch (err: any) {
      alert('ไม่สามารถปรับแต้มได้: ' + (err.message || ''));
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredMembers = members.filter(
    m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone_number.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalMembers = members.length;
  const totalPointsInSystem = members.reduce((s, m) => s + m.points, 0);

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'เงินสด';
      case 'promptpay':
        return 'โอนเงิน';
      case 'mixed':
        return 'ผสม';
      default:
        return method;
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="w-[50%]">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>สมาชิก CRM</span>
          </h1>
          <p className="text-caption mt-0.5">
            จัดการข้อมูลสมาชิก ค้นหาเบอร์โทร 
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main List View vs Detail View */}
      {!selectedMember ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  สมาชิกในระบบทั้งหมด
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-neutral-100 mt-1">
                  {totalMembers}{' '}
                  <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                    คน
                  </span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </Card>

            <Card className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  แต้มสะสมคงเหลือรวมทั้งระบบ
                </span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {totalPointsInSystem.toLocaleString()}{' '}
                  <span className="text-xs font-bold">แต้ม</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* Search bar */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 shadow-xs flex items-center gap-2.5 max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อ หรือ เบอร์โทร..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-semibold text-slate-800 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8">
              <Users className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
                ไม่พบข้อมูลสมาชิก
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table containerClassName="-mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full rounded-none md:rounded-sm border-x-0 md:border-x">
                <TableHeader>
                  <TableRow>
                    <TableHead>สมาชิก</TableHead>
                    <TableHead>เบอร์โทรศัพท์</TableHead>
                    <TableHead className="text-right">แต้มสะสม</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.map(m => (
                    <TableRow
                      key={m.phone_number}
                      className="cursor-pointer"
                      onClick={() => openDetail(m)}
                    >
                      <TableCell className="font-bold text-slate-900 dark:text-neutral-100">
                        {m.name}
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 dark:text-neutral-300">
                        {m.phone_number}
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                        {m.points.toLocaleString()} แต้ม
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-neutral-400">
                        {formatDate(m.created_at)}
                      </TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openDetail(m)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination controls */}
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredMembers.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </>
      ) : (
        /* Member Detail View */
        <div className="space-y-6">
          <button
            onClick={closeDetail}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับไปหน้ารายชื่อสมาชิก</span>
          </button>

          {/* SINGLE MAIN OUTER CARD */}
          <Card className="p-6 md:p-8 space-y-6">
            {/* Member Info Card Header */}
            <MemberInfoCard
              selectedMember={selectedMember}
              setShowEditModal={setShowEditModal}
              setEditName={setEditName}
              setEditPhone={setEditPhone}
              setShowPointsModal={setShowPointsModal}
              setShowDeleteModal={setShowDeleteModal}
              formatDate={formatDate}
            />

            {/* Member Purchase & Points History Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Purchase History Inner Section */}
              <div className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                  ประวัติการใช้บริการ (ชำระเงิน)
                </h3>

                {detailLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : bills.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-neutral-500 text-center py-8">
                    ยังไม่มีประวัติการชำระเงิน
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {bills.map(b => (
                      <div
                        key={b.id}
                        className="p-3 bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 rounded-xl text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex justify-between items-center font-bold text-slate-900 dark:text-neutral-100">
                          <span>
                            บิล ORD-{b.order_id} ({b.orders?.table_id ? `โต๊ะ ${b.orders.table_id}` : 'กลับบ้าน'})
                          </span>
                          <span className="text-red-600 dark:text-red-400">
                            {b.net_amount.toLocaleString()} ฿
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-neutral-400 font-semibold">
                          <span>
                            {formatDate(b.created_at)} {formatTime(b.created_at)} น. •{' '}
                            {getPaymentLabel(b.payment_method)}
                          </span>
                          <div className="flex gap-2">
                            {b.points_earned > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                +{b.points_earned} แต้ม
                              </span>
                            )}
                            {b.points_redeemed > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                                ใช้ {b.points_redeemed} แต้ม
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Points Logs Inner Section */}
              <div className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ประวัติการปรับแต่งแต้มด้วยมือ
                </h3>

                {detailLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : pointsLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-neutral-500 text-center py-8">
                    ไม่มีประวัติการปรับแต้มด้วยมือ
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {pointsLogs.map(log => (
                      <div
                        key={log.id}
                        className="p-3 bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 rounded-xl text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span
                            className={
                              log.adjustment > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {log.adjustment > 0 ? '+' : ''}
                            {log.adjustment} แต้ม
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-semibold">
                            โดย: {log.adjusted_by}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-neutral-300 font-semibold">
                          เหตุผล: {log.reason}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-neutral-500">
                          {formatDate(log.created_at)} {formatTime(log.created_at)} น.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
                แก้ไขข้อมูลสมาชิก
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
                เบอร์โทรศัพท์ (ไม่สามารถแก้ไขได้):
              </label>
              <input
                type="text"
                disabled
                value={editPhone}
                className="w-full bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-500 dark:text-neutral-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
                ชื่อสมาชิก *:
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEditMember}
                disabled={isSaving || !editName.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'บันทึกข้อมูล'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
              ยืนยันการลบสมาชิก
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              คุณต้องการลบสมาชิก <span className="font-bold text-slate-800 dark:text-neutral-200">{selectedMember.name}</span> ({selectedMember.phone_number}) หรือไม่? ประวัติและแต้มสะสมจะถูกลบถาวร
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'ลบสมาชิก'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      <PointsHistoryModal
        showPointsModal={showPointsModal}
        setShowPointsModal={setShowPointsModal}
        pointsDirection={pointsDirection}
        setPointsDirection={setPointsDirection}
        pointsAdjustment={pointsAdjustment}
        setPointsAdjustment={setPointsAdjustment}
        pointsReason={pointsReason}
        setPointsReason={setPointsReason}
        presetReasons={PRESET_REASONS}
        handleAdjustPoints={handleAdjustPoints}
        isAdjusting={isAdjusting}
        memberName={selectedMember?.name}
        currentPoints={selectedMember?.points}
      />
    </div>
  );
};
