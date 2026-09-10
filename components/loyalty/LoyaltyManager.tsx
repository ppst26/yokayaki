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
  Database,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CustomSelect } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
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
import { useActionFeedback } from '@/context/ActionFeedbackContext';

interface LoyaltyManagerProps {
  onCreateWinbackPromo?: (draft: WinbackPromoDraft) => void;
}

export const LoyaltyManager: React.FC<LoyaltyManagerProps> = ({
  onCreateWinbackPromo,
}) => {
  const { showActionFeedback } = useActionFeedback();
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<'all' | MemberTagCode>('all');
  const [listTab, setListTab] = useState<'all' | 'dormant'>('all');
  const [dormantDaysMin, setDormantDaysMin] = useState<30 | 60 | 90>(30);
  const [rfmFilter, setRfmFilter] = useState<'all' | RfmSegment>('all');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const tagFilterOptions: { value: 'all' | MemberTagCode; label: string }[] = [
    { value: 'all', label: 'ประเภท: ทั้งหมด' },
    { value: 'new', label: 'ประเภท: ใหม่' },
    { value: 'regular', label: 'ประเภท: ประจำ' },
    { value: 'vip', label: 'ประเภท: VIP' },
    { value: 'dormant', label: 'ประเภท: หายไป' },
  ];

  const rfmFilterOptions: { value: 'all' | RfmSegment; label: string }[] = [
    { value: 'all', label: 'กลุ่ม: ทั้งหมด' },
    { value: 'A', label: 'กลุ่ม: กลุ่ม A' },
    { value: 'B', label: 'กลุ่ม: กลุ่ม B' },
    { value: 'C', label: 'กลุ่ม: กลุ่ม C' },
  ];

  const dormantDaysOptions = [
    { value: '30', label: 'หายไป: ≥30 วัน' },
    { value: '60', label: 'หายไป: ≥60 วัน' },
    { value: '90', label: 'หายไป: ≥90 วัน' },
  ];

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
      showActionFeedback({
        variant: 'warning',
        title: 'จำนวนแต้มไม่ถูกต้อง',
        description: 'กรุณากรอกจำนวนแต้มที่ต้องการปรับ',
      });
      return;
    }
    if (!pointsReason.trim()) {
      showActionFeedback({
        variant: 'warning',
        title: 'กรุณาระบุเหตุผล',
        description: 'ระบุเหตุผลในการปรับแต้มก่อนบันทึก',
      });
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
      showActionFeedback({
        variant: 'error',
        title: 'ไม่สามารถปรับแต้มได้',
        description: err.message || 'กรุณาลองใหม่อีกครั้ง',
      });
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
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-[var(--space-section)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>สมาชิก CRM</span>
          </h1>
          <p className="text-caption mt-0.5">
            จัดการข้อมูลสมาชิก ค้นหาเบอร์โทร 
          </p>
        </div>
        {!selectedMember && <div className="shrink-0"><DoublePointsDialog /></div>}
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
          {/* Summary Metric Cards - 3 columns grid on mobile, flex-wrap on desktop */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:flex sm:flex-wrap items-stretch">
            <Card className="p-2.5 sm:p-5 flex flex-col justify-between sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 w-full sm:w-60 md:w-64 shrink-0 rounded-2xl">
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block min-h-[26px] sm:min-h-0 truncate">
                  <span className="sm:hidden">สมาชิกทั้งหมด</span>
                  <span className="hidden sm:inline">สมาชิกในระบบทั้งหมด</span>
                </span>
                <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-neutral-100 mt-1 flex items-baseline gap-1">
                  {totalMembers}{' '}
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-neutral-400">
                    คน
                  </span>
                </p>
              </div>
              <Users className="hidden sm:block w-6 h-6 text-slate-400 dark:text-neutral-500 shrink-0" />
            </Card>

            <Card className="p-2.5 sm:p-5 flex flex-col justify-between sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 w-full sm:w-60 md:w-64 shrink-0 rounded-2xl">
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block min-h-[26px] sm:min-h-0 truncate">
                  <span className="sm:hidden">แต้มคงเหลือ</span>
                  <span className="hidden sm:inline">แต้มสะสมคงเหลือรวมทั้งระบบ</span>
                </span>
                <p className="text-base sm:text-2xl font-black text-amber-500 dark:text-amber-400 mt-1 flex items-baseline gap-1">
                  {totalPointsInSystem.toLocaleString()}{' '}
                  <span className="text-[10px] sm:text-xs font-bold text-amber-500/80 sm:text-slate-500 sm:dark:text-neutral-400">
                    แต้ม
                  </span>
                </p>
              </div>
              <Database className="hidden sm:block w-6 h-6 text-slate-400 dark:text-neutral-500 shrink-0" />
            </Card>

            <Card className="p-2.5 sm:p-5 flex flex-col justify-between sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 w-full sm:w-60 md:w-64 shrink-0 rounded-2xl">
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block min-h-[26px] sm:min-h-0 leading-tight">
                  <span className="sm:hidden">
                    ลูกค้าหายไป
                    <span className="block text-[9px] font-semibold text-slate-400/80 dark:text-neutral-500">
                      (≥30 วัน)
                    </span>
                  </span>
                  <span className="hidden sm:inline">ลูกค้าหายไป (≥30 วัน)</span>
                </span>
                <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-neutral-100 mt-1 flex items-baseline gap-1">
                  {dormantCount}{' '}
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-neutral-400">
                    คน
                  </span>
                </p>
              </div>
              <Clock className="hidden sm:block w-6 h-6 text-slate-400 dark:text-neutral-500 shrink-0" />
            </Card>
          </div>

          {/* List tabs: ทั้งหมด / ลูกค้าหายไป (Pill style on mobile) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setListTab('all')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
                listTab === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border border-slate-200/80 dark:border-neutral-800 shadow-xs'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              รายชื่อทั้งหมด ({totalMembers})
            </button>
            <button
              type="button"
              onClick={() => setListTab('dormant')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                listTab === 'dormant'
                  ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 border border-slate-200/80 dark:border-neutral-800 shadow-xs'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              ลูกค้าหายไป ({dormantTabCount})
            </button>
          </div>

          {/* Search + filters + export */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3">
            {/* Search Input + Mobile Export Button */}
            <div className="flex items-center gap-2 flex-1 min-w-0 sm:max-w-xs">
              <SearchInput
                placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="flex-1 min-w-0"
              />

              {/* Mobile Export Button (icon only next to search) */}
              <button
                type="button"
                onClick={exportFilteredMembers}
                disabled={filteredMembers.length === 0}
                className="sm:hidden h-10 w-10 shrink-0 flex items-center justify-center bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 text-slate-700 dark:text-zinc-200 rounded-xl transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                title={`ส่งออกรายชื่อ (${filteredMembers.length})`}
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Dropdowns (2 columns grid on mobile) */}
            {listTab === 'dormant' ? (
              <div className="w-full sm:w-44 shrink-0">
                <CustomSelect
                  value={String(dormantDaysMin)}
                  onChange={val => setDormantDaysMin(Number(val) as 30 | 60 | 90)}
                  options={dormantDaysOptions}
                  placeholder="หายไป: ≥30 วัน"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
                <div className="w-full sm:w-40 shrink-0">
                  <CustomSelect
                    value={tagFilter}
                    onChange={val => setTagFilter(val as 'all' | MemberTagCode)}
                    options={tagFilterOptions}
                    placeholder="ประเภท: ทั้งหมด"
                  />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                  <CustomSelect
                    value={rfmFilter}
                    onChange={val => setRfmFilter(val as 'all' | RfmSegment)}
                    options={rfmFilterOptions}
                    placeholder="กลุ่ม: ทั้งหมด"
                  />
                </div>
              </div>
            )}

            {/* Desktop Export Button */}
            {filteredMembers.length > 0 && (
              <button
                type="button"
                onClick={exportFilteredMembers}
                className="hidden sm:flex items-center justify-center gap-2 h-10 px-3.5 bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 lg:ml-auto shadow-xs active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>ส่งออกรายชื่อ ({filteredMembers.length})</span>
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
              <Table className="text-[length:var(--manager-table-font)]" containerClassName="-mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full rounded-none md:rounded-sm border-x-0 md:border-x">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-neutral-100">
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
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
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
