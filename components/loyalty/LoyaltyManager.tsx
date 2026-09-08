"use client";

import React, { useState, useEffect } from 'react';
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
  TicketPercent,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CustomSelect } from '@/components/ui/select';
import { TablePagination } from '@/components/ui/pagination';
import { MemberDetailPanel } from './MemberDetailPanel';
import { PointsHistoryModal } from './PointsHistoryModal';
import { MemberTagChips } from './MemberTagChips';
import { MemberRfmBadge } from './MemberRfmBadge';
import {
  type MemberTagCode,
  MEMBER_TAG_FILTER_OPTIONS,
  memberHasTag,
  parseMemberTags,
} from '@/lib/memberTags';
import {
  type RfmSegment,
  DORMANT_DAYS_OPTIONS,
  RFM_SEGMENT_FILTER_OPTIONS,
  parseMemberRfm,
} from '@/lib/memberRfm';
import {
  type LoyaltyMember,
  type BillRecord,
  type MemberProfile,
  type MemberSummary,
  buildPointEvents,
} from './memberProfileTypes';
import { buildWinbackPromoDraft, type WinbackPromoDraft } from '@/lib/winbackPromo';
import { buildMemberSegmentCsv, downloadCsvFile } from '@/lib/exportMemberCsv';
import type { SegmentMemberRow } from '@/lib/promoSegments';
import { DoublePointsDialog } from './DoublePointsSettings';

interface LoyaltyManagerProps {
  onCreateWinbackPromo?: (draft: WinbackPromoDraft) => void;
}

export const LoyaltyManager: React.FC<LoyaltyManagerProps> = ({
  onCreateWinbackPromo,
}) => {
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<'all' | MemberTagCode>('all');
  const [listTab, setListTab] = useState<'all' | 'dormant'>('all');
  const [dormantDaysMin, setDormantDaysMin] = useState<30 | 60 | 90>(30);
  const [rfmFilter, setRfmFilter] = useState<'all' | RfmSegment>('all');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, tagFilter, listTab, dormantDaysMin, rfmFilter]);

  const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [memberSummaries, setMemberSummaries] = useState<Record<string, MemberSummary>>({});
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

  const fetchMemberSummaries = async () => {
    try {
      const { data, error } = await supabase.rpc('list_member_summaries');
      if (error) throw error;

      const map: Record<string, MemberSummary> = {};
      for (const row of (data as unknown as MemberSummary[]) ?? []) {
        map[row.phone_number] = {
          ...row,
          tags: parseMemberTags(row.tags),
          rfm: parseMemberRfm(row.rfm),
        };
      }
      setMemberSummaries(map);
    } catch (err: unknown) {
      console.error('Error fetching member summaries:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loyalty_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setMembers(data as LoyaltyMember[]);
      await fetchMemberSummaries();
    } catch (err: unknown) {
      console.error('Error fetching members:', err);
      setMessage({ text: 'ไม่สามารถดึงข้อมูลสมาชิกได้', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetails = async (phone: string) => {
    try {
      setDetailLoading(true);

      const { data, error } = await supabase.rpc('get_member_profile', {
        p_phone_number: phone,
      });

      if (error) throw error;
      if (data) {
        const profile = data as unknown as MemberProfile;
        setMemberProfile({
          ...profile,
          tags: parseMemberTags(profile.tags),
          rfm: parseMemberRfm(profile.rfm),
        });
      }
    } catch (err: unknown) {
      console.error('Error fetching member profile:', err);
      setMessage({ text: 'ไม่สามารถดึงข้อมูล Customer 360 ได้', type: 'error' });
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
    setMemberProfile(null);
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

    try {
      setIsAdjusting(true);

      const { data, error } = await supabase.rpc('adjust_loyalty_points', {
        p_phone_number: selectedMember.phone_number,
        p_adjustment: finalAdjustment,
        p_reason: pointsReason.trim(),
      });

      if (error) throw error;

      const result = data as { points: number; adjustment: number };
      const updated = { ...selectedMember, points: result.points };
      setSelectedMember(updated);
      setMembers(prev =>
        prev.map(m => (m.phone_number === selectedMember.phone_number ? updated : m))
      );

      setShowPointsModal(false);
      setPointsAdjustment('');
      setPointsReason('');
      await fetchMemberDetails(selectedMember.phone_number);
      await fetchMemberSummaries();
      setMessage({
        text: `ปรับแต้มเรียบร้อยแล้ว (${result.adjustment > 0 ? '+' : ''}${result.adjustment} แต้ม)`,
        type: 'success',
      });
    } catch (err: any) {
      alert('ไม่สามารถปรับแต้มได้: ' + (err.message || ''));
    } finally {
      setIsAdjusting(false);
    }
  };

  const getSummary = (phone: string) => memberSummaries[phone];

  const filteredMembers = members
    .filter(m => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone_number.includes(searchTerm);
      const summary = getSummary(m.phone_number);
      const tags = parseMemberTags(summary?.tags);
      const rfm = summary?.rfm ?? null;

      if (listTab === 'dormant') {
        const days = rfm?.days_inactive ?? 0;
        return (
          matchesSearch &&
          memberHasTag(tags, 'dormant') &&
          days >= dormantDaysMin
        );
      }

      const matchesTag = tagFilter === 'all' || memberHasTag(tags, tagFilter);
      const matchesRfm = rfmFilter === 'all' || rfm?.segment === rfmFilter;
      return matchesSearch && matchesTag && matchesRfm;
    })
    .sort((a, b) => {
      if (listTab === 'dormant') {
        const daysA = getSummary(a.phone_number)?.rfm?.days_inactive ?? 0;
        const daysB = getSummary(b.phone_number)?.rfm?.days_inactive ?? 0;
        return daysB - daysA;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalMembers = members.length;
  const totalPointsInSystem = members.reduce((s, m) => s + m.points, 0);
  const dormantCount = members.filter(m =>
    memberHasTag(parseMemberTags(getSummary(m.phone_number)?.tags), 'dormant'),
  ).length;
  const dormantTabCount = members.filter(m => {
    const summary = getSummary(m.phone_number);
    const tags = parseMemberTags(summary?.tags);
    const days = summary?.rfm?.days_inactive ?? 0;
    return memberHasTag(tags, 'dormant') && days >= dormantDaysMin;
  }).length;

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

  const bills = memberProfile?.bills ?? [];
  const pointEvents = memberProfile
    ? buildPointEvents(memberProfile.bills, memberProfile.points_logs)
    : [];

  const profileTags = parseMemberTags(memberProfile?.tags);
  const profileRfm = memberProfile?.rfm ?? null;

  const exportFilteredMembers = () => {
    const rows: SegmentMemberRow[] = filteredMembers.map(m => {
      const summary = getSummary(m.phone_number);
      return {
        phone_number: m.phone_number,
        name: m.name,
        lifetime_spend: summary?.lifetime_spend ?? 0,
        visit_count: summary?.visit_count ?? 0,
        last_visit_at: summary?.last_visit_at ?? null,
        days_inactive: summary?.rfm?.days_inactive ?? 0,
        tags: parseMemberTags(summary?.tags),
        rfm_segment: summary?.rfm?.segment ?? null,
      };
    });

    const suffix =
      listTab === 'dormant'
        ? `dormant-${dormantDaysMin}d`
        : tagFilter !== 'all'
          ? tagFilter
          : rfmFilter !== 'all'
            ? `rfm-${rfmFilter}`
            : 'all';

    downloadCsvFile(
      `members-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      buildMemberSegmentCsv(rows),
    );
    setMessage({ text: `ส่งออก ${rows.length} รายชื่อแล้ว`, type: 'success' });
  };

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>สมาชิก CRM</span>
          </h1>
          <p className="text-caption mt-0.5">
            จัดการข้อมูลสมาชิก ค้นหาเบอร์โทร 
          </p>
        </div>
        {!selectedMember && <DoublePointsDialog />}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Card className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  ลูกค้าหายไป (≥30 วัน)
                </span>
                <p className="text-2xl font-black text-slate-600 dark:text-neutral-300 mt-1">
                  {dormantCount}{' '}
                  <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">คน</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* List tabs: ทั้งหมด / ลูกค้าหายไป (G4) */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-neutral-800 pb-1">
            <button
              type="button"
              onClick={() => setListTab('all')}
              className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition cursor-pointer ${
                listTab === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border border-b-0 border-slate-200/80 dark:border-neutral-800'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              รายชื่อทั้งหมด ({totalMembers})
            </button>
            <button
              type="button"
              onClick={() => setListTab('dormant')}
              className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
                listTab === 'dormant'
                  ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border border-b-0 border-slate-200/80 dark:border-neutral-800'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              ลูกค้าหายไป ({dormantTabCount})
            </button>
          </div>

          {/* Search + filters + export */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
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

          {listTab === 'dormant' ? (
            <div className="w-full sm:w-40 shrink-0">
              <CustomSelect
                value={String(dormantDaysMin)}
                onChange={val => setDormantDaysMin(Number(val) as 30 | 60 | 90)}
                options={DORMANT_DAYS_OPTIONS.map(opt => ({
                  value: String(opt.value),
                  label: opt.label,
                }))}
                placeholder="หายไปกี่วัน"
              />
            </div>
          ) : (
            <>
              <div className="w-full sm:w-40 shrink-0">
                <CustomSelect
                  value={tagFilter}
                  onChange={val => setTagFilter(val as 'all' | MemberTagCode)}
                  options={MEMBER_TAG_FILTER_OPTIONS}
                  placeholder="ประเภทลูกค้า"
                />
              </div>
              <div className="w-full sm:w-40 shrink-0">
                <CustomSelect
                  value={rfmFilter}
                  onChange={val => setRfmFilter(val as 'all' | RfmSegment)}
                  options={RFM_SEGMENT_FILTER_OPTIONS}
                  placeholder="กลุ่มลูกค้า"
                />
              </div>
            </>
          )}
          </div>

          {filteredMembers.length > 0 && (
            <button
              type="button"
              onClick={exportFilteredMembers}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 lg:ml-auto"
            >
              <Download className="w-4 h-4" />
              ส่งออกรายชื่อ ({filteredMembers.length})
            </button>
          )}
          </div>

          {listTab === 'dormant' && onCreateWinbackPromo && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-900/40 rounded-2xl">
              <div>
                <p className="text-xs font-extrabold text-violet-800 dark:text-violet-200">
                  Win-back — ดึงลูกค้ากลับมา
                </p>
                <p className="text-[11px] font-semibold text-violet-600/90 dark:text-violet-300/80 mt-0.5">
                  สร้างคูปองจากกลุ่มที่ filter อยู่ ({filteredMembers.length} คน · ≥
                  {dormantDaysMin} วัน)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={filteredMembers.length === 0}
                  onClick={() =>
                    onCreateWinbackPromo(
                      buildWinbackPromoDraft(dormantDaysMin, filteredMembers.length),
                    )
                  }
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  <TicketPercent className="w-4 h-4" />
                  สร้างคูปอง Win-back
                </button>
              </div>
            </div>
          )}

          {/* Members Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 app-dialog p-8">
              <Users className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
                {listTab === 'dormant'
                  ? 'ไม่พบลูกค้าหายไปในช่วงที่เลือก'
                  : 'ไม่พบข้อมูลสมาชิก'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table containerClassName="-mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full rounded-none md:rounded-sm border-x-0 md:border-x">
                <TableHeader>
                  <TableRow>
                    <TableHead>สมาชิก</TableHead>
                    <TableHead>เบอร์โทรศัพท์</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead>
                      {listTab === 'dormant' ? 'หายไป' : 'ครั้งล่าสุด'}
                    </TableHead>
                    <TableHead>RFM</TableHead>
                    <TableHead className="text-right">แต้มสะสม</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.map(m => {
                    const summary = getSummary(m.phone_number);
                    return (
                    <TableRow
                      key={m.phone_number}
                      className="cursor-pointer"
                      onClick={() => openDetail(m)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 dark:text-neutral-100 block">
                            {m.name}
                          </span>
                          <MemberTagChips
                            tags={parseMemberTags(summary?.tags)}
                            size="xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 dark:text-neutral-300">
                        {m.phone_number}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700 dark:text-neutral-200 text-sm">
                        {(summary?.lifetime_spend ?? 0).toLocaleString()} ฿
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-neutral-400 text-xs">
                        {listTab === 'dormant' ? (
                          <span className="font-bold text-slate-700 dark:text-neutral-300">
                            {summary?.rfm?.days_inactive ?? 0} วัน
                          </span>
                        ) : summary?.last_visit_at ? (
                          formatDate(summary.last_visit_at)
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <MemberRfmBadge rfm={summary?.rfm ?? null} size="xs" />
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                        {m.points.toLocaleString()} แต้ม
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
                    );
                  })}
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

          <MemberDetailPanel
            selectedMember={selectedMember}
            stats={
              memberProfile?.stats ?? {
                lifetime_spend: 0,
                visit_count: 0,
                last_visit_at: null,
                avg_per_bill: 0,
              }
            }
            tags={profileTags}
            rfm={profileRfm}
            favoriteMenus={memberProfile?.favorite_menus ?? []}
            bills={bills}
            pointEvents={pointEvents}
            loading={detailLoading}
            formatDate={formatDate}
            formatTime={formatTime}
            getPaymentLabel={getPaymentLabel}
            onEdit={() => {
              setEditName(selectedMember.name);
              setEditPhone(selectedMember.phone_number);
              setShowEditModal(true);
            }}
            onAdjustPoints={() => setShowPointsModal(true)}
            onDelete={() => setShowDeleteModal(true)}
          />
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4">
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
                className="flex-1 py-2.5 btn-crimson disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
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
