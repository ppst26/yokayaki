"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { RefreshCw, ShoppingBag, Receipt, AlertTriangle, X, ChefHat } from 'lucide-react';
import { SidebarNav, NavTab } from '@/components/SidebarNav';
import { POSOrderScreen } from '@/components/POSOrderScreen';
import { CheckoutScreen } from '@/components/CheckoutScreen';
import { KitchenScreen } from '@/components/KitchenScreen';
import { playNewOrderSound, playCheckBillSound } from '@/lib/audioNotifier';
import { TableCard } from '@/components/TableCard';
import { AppMainContent } from '@/components/common/AppMainContent';
import { canAccessTab, type EmployeeRole } from '@/lib/permissions';
import {
  FLOOR_GRID_TEMPLATE_AREAS,
  FLOOR_KITCHEN_AREA,
  FLOOR_TABLE_AREAS,
  isRatchadaBranch,
  formatTableLabel,
  RATCHADA_BAR_TABLES,
  RATCHADA_DINING_TABLES,
} from '@/lib/floorLayout';
import { Armchair, Users } from 'lucide-react';
import type { WinbackPromoDraft } from '@/lib/winbackPromo';

// แท็บหนัก — โหลดเมื่อเปิดครั้งแรก (ลดงานตอน login)
const SalesHistory = lazy(() =>
  import('@/components/SalesHistory').then(m => ({ default: m.SalesHistory })),
);
const MenuManager = lazy(() =>
  import('@/components/MenuManager').then(m => ({ default: m.MenuManager })),
);
const StockManager = lazy(() =>
  import('@/components/StockManager').then(m => ({ default: m.StockManager })),
);
const PromoManager = lazy(() =>
  import('@/components/PromoManager').then(m => ({ default: m.PromoManager })),
);
const OwnerDashboard = lazy(() =>
  import('@/components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })),
);
const LoyaltyManager = lazy(() =>
  import('@/components/LoyaltyManager').then(m => ({ default: m.LoyaltyManager })),
);
const EmployeeManager = lazy(() =>
  import('@/components/EmployeeManager').then(m => ({ default: m.EmployeeManager })),
);

const LAZY_TABS: NavTab[] = [
  'history',
  'menu',
  'stock',
  'promo',
  'dashboard',
  'loyalty',
  'employees',
];

function TabFallback() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface Table {
  id: string;
  table_number: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at: string;
}

export const TableMap: React.FC = () => {
  const { employee } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [checkoutTableId, setCheckoutTableId] = useState<string | null>(null);
  const [checkoutTableNumber, setCheckoutTableNumber] = useState<number | null>(null);
  const [actionSelectorTable, setActionSelectorTable] = useState<Table | null>(null);
  const [pendingItemCount, setPendingItemCount] = useState<number>(0);
  const [isCheckingPending, setIsCheckingPending] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('floor');
  /** แท็บที่เคยเปิดแล้ว — keep-alive ไม่ remount / ไม่ fetch ซ้ำ */
  const [visitedTabs, setVisitedTabs] = useState<Set<NavTab>>(() => new Set(['floor']));
  const [winbackDraft, setWinbackDraft] = useState<WinbackPromoDraft | null>(null);
  const [ratchadaFilter, setRatchadaFilter] = useState<'all' | 'table' | 'bar'>('all');

  const isRatchada = useMemo(() => {
    return isRatchadaBranch() || tables.length > 7 || tables.some(t => t.table_number > 7);
  }, [tables]);

  const renderTableCardItem = (tableNumber: number, compact = false) => {
    const table = tables.find(t => t.table_number === tableNumber);
    if (!table) {
      return (
        <div
          key={`placeholder-${tableNumber}`}
          className={`rounded-[24px] border border-dashed border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 flex items-center justify-center ${
            compact ? 'h-20 sm:h-24' : 'min-h-32 sm:min-h-36'
          }`}
        >
          <span className="text-caption text-slate-400">
            {formatTableLabel(tableNumber)}
          </span>
        </div>
      );
    }
    return (
      <TableCard
        key={table.id}
        table={table}
        onClick={() => handleTableClick(table)}
        compact={compact}
        className={compact ? '' : 'h-full min-h-32 sm:min-h-36'}
      />
    );
  };

  useEffect(() => {
    if (!employee) return;
    const role = employee.role as EmployeeRole;
    let initial: NavTab = 'floor';
    if (role === 'kitchen') initial = 'kitchen';
    else if (role === 'accountant') initial = 'history';
    setActiveTab(initial);
    setVisitedTabs(prev => {
      const next = new Set(prev);
      next.add(initial);
      return next;
    });
  }, [employee?.id]);

  useEffect(() => {
    if (actionSelectorTable === null) {
      setPendingItemCount(0);
      return;
    }

    // PERF/6 — เดิม orders → order_items เป็น waterfall 2 ชั้น
    // ทำให้ปุ่ม "ชำระเงิน" ค้าง disabled อยู่ ~200 ms หลังกดโต๊ะ
    // ตอนนี้ฝังรายการ pending มากับ orders ในคิวรีเดียว (เข้า idx_order_items_pending)
    const checkPendingItems = async (silent = false) => {
      try {
        if (!silent) setIsCheckingPending(true);
        const { data: orderData, error } = await supabase
          .from('orders')
          .select('id, order_items(id)')
          .eq('table_id', actionSelectorTable.id)
          .eq('status', 'active')
          .eq('order_items.status', 'pending')
          .maybeSingle();

        if (error) throw error;
        setPendingItemCount(orderData?.order_items?.length ?? 0);
      } catch (err) {
        console.error('Error checking pending items:', err);
      } finally {
        if (!silent) setIsCheckingPending(false);
      }
    };

    checkPendingItems();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRecheck = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        checkPendingItems(true);
      }, 400);
    };

    const channel = supabase
      .channel(`realtime:order_items_modal_${actionSelectorTable.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        scheduleRecheck
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      channel.unsubscribe();
    };
  }, [actionSelectorTable]);

  const fetchTables = async () => {
    if (selectedTableId !== null) return;
    try {
      setIsSyncing(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from('tables')
        .select('id, table_number, status, updated_at')
        .order('table_number', { ascending: true });

      if (error) throw error;
      if (data) setTables(data as Table[]);
    } catch (err: any) {
      console.error('Error fetching tables:', err);
      setErrorMsg('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const channel = supabase
      .channel('realtime:tablemap_audio_notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables' },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.status === 'checking_out' && payload.old?.status !== 'checking_out') {
              playCheckBillSound();
            }
            setTables(prev =>
              prev.map(t => (t.id === payload.new.id ? (payload.new as Table) : t))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload: any) => {
          if (payload.new && payload.new.status === 'pending') {
            playNewOrderSound();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedTableId]);

  const handleTabChange = (tab: NavTab) => {
    const role = (employee?.role ?? 'cashier') as EmployeeRole;
    if (!canAccessTab(role, tab)) {
      if (role === 'kitchen') setActiveTab('kitchen');
      else if (role === 'accountant') setActiveTab('history');
      else setActiveTab('floor');
      return;
    }
    setActiveTab(tab);
    setVisitedTabs(prev => {
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    setSelectedTableId(null);
    setSelectedTableNumber(null);
    setCheckoutTableId(null);
    setCheckoutTableNumber(null);
  };

  const handleCreateWinbackPromo = useCallback((draft: WinbackPromoDraft) => {
    setWinbackDraft(draft);
    const role = (employee?.role ?? 'cashier') as EmployeeRole;
    if (!canAccessTab(role, 'promo')) return;
    setActiveTab('promo');
    setVisitedTabs(prev => {
      const next = new Set(prev);
      next.add('promo');
      return next;
    });
  }, [employee?.role]);

  const role = (employee?.role ?? 'cashier') as EmployeeRole;

  const lazyPanels = useMemo(
    () =>
      ({
        history: canAccessTab(role, 'history') ? <SalesHistory /> : null,
        menu: canAccessTab(role, 'menu') ? <MenuManager /> : null,
        stock: canAccessTab(role, 'stock') ? <StockManager /> : null,
        promo: canAccessTab(role, 'promo') ? (
          <PromoManager
            winbackDraft={winbackDraft}
            onWinbackDraftConsumed={() => setWinbackDraft(null)}
          />
        ) : null,
        dashboard: canAccessTab(role, 'dashboard') ? <OwnerDashboard /> : null,
        loyalty: canAccessTab(role, 'loyalty') ? (
          <LoyaltyManager onCreateWinbackPromo={handleCreateWinbackPromo} />
        ) : null,
        employees: canAccessTab(role, 'employees') ? <EmployeeManager /> : null,
      }) as Partial<Record<NavTab, React.ReactNode>>,
    [role, winbackDraft, handleCreateWinbackPromo],
  );

  if (selectedTableId !== null) {
    return (
      <div className="flex flex-col md:flex-row h-dvh bg-gray-100 dark:bg-neutral-950 font-sans text-slate-800 dark:text-neutral-100 overflow-hidden">
        <SidebarNav activeTab={activeTab} onSelectTab={handleTabChange} />
        <AppMainContent className="overflow-hidden" fillHeight>
          <POSOrderScreen
            tableId={selectedTableId}
            tableNumber={selectedTableNumber ?? undefined}
            onBack={() => {
              setSelectedTableId(null);
              setSelectedTableNumber(null);
            }}
          />
        </AppMainContent>
      </div>
    );
  }

  if (checkoutTableId !== null) {
    return (
      <div className="flex flex-col md:flex-row h-dvh bg-gray-100 dark:bg-neutral-950 font-sans text-slate-800 dark:text-neutral-100 overflow-hidden">
        <SidebarNav activeTab={activeTab} onSelectTab={handleTabChange} />
        <AppMainContent className="overflow-hidden" fillHeight>
          <CheckoutScreen
            tableId={checkoutTableId}
            tableNumber={checkoutTableNumber ?? undefined}
            onBack={() => {
              setCheckoutTableId(null);
              setCheckoutTableNumber(null);
            }}
          />
        </AppMainContent>
      </div>
    );
  }

  const handleTableClick = (table: Table) => {
    if (table.status === 'occupied' || table.status === 'checking_out') {
      setActionSelectorTable(table);
    } else {
      setSelectedTableId(table.id);
      setSelectedTableNumber(table.table_number);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-dvh bg-gray-100 dark:bg-neutral-950 font-sans text-slate-800 dark:text-neutral-100 overflow-hidden">
      <SidebarNav activeTab={activeTab} onSelectTab={handleTabChange} />

      <AppMainContent className="overflow-y-auto no-scrollbar" innerClassName="p-[var(--page-margin)] pb-24 md:pb-8">
        {/* floor + kitchen: eager (ใช้บ่อย) */}
        {canAccessTab(role, 'floor') && (
          <div className={activeTab === 'floor' ? 'block' : 'hidden'}>
            <div className="w-full space-y-6">
              <header className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100">
                    ผังโต๊ะ
                  </h1>
                  <p className="text-caption mt-0.5">เลือกโต๊ะเพื่อเปิดออเดอร์</p>
                </div>

                <button
                  onClick={fetchTables}
                  className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl text-caption font-semibold transition active:scale-95 shadow-xs cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>รีเฟรชผังโต๊ะ</span>
                </button>
              </header>

              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-caption font-semibold flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {isRatchada ? (
                <div className="w-full max-w-4xl mx-auto space-y-4">
                  {/* Zone Filter Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      onClick={() => setRatchadaFilter('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        ratchadaFilter === 'all'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span>ผังร้านทั้งหมด (12 จุดบริการ)</span>
                    </button>
                    <button
                      onClick={() => setRatchadaFilter('table')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        ratchadaFilter === 'table'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>โต๊ะอาหาร (5 โต๊ะ)</span>
                    </button>
                    <button
                      onClick={() => setRatchadaFilter('bar')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        ratchadaFilter === 'bar'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Armchair className="w-3.5 h-3.5" />
                      <span>เคาน์เตอร์บาร์ (7 ที่นั่ง)</span>
                    </button>
                  </div>

                  {ratchadaFilter === 'table' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {RATCHADA_DINING_TABLES.map(num => renderTableCardItem(num))}
                    </div>
                  ) : ratchadaFilter === 'bar' ? (
                    <div className="p-4 sm:p-5 rounded-[28px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <Armchair className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          เคาน์เตอร์บาร์ (บาร์ 1 - บาร์ 7)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {RATCHADA_BAR_TABLES.map(num => renderTableCardItem(num, true))}
                      </div>
                    </div>
                  ) : (
                    /* ผังร้าน 3D Architectural View */
                    <div className="bg-white/60 dark:bg-neutral-900/40 p-4 sm:p-6 rounded-[32px] border border-slate-200/90 dark:border-neutral-800 shadow-sm space-y-5">
                      {/* Top: ครัว (ซ้าย) vs ทางเข้าครัว (ขวา) */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
                        <div className="md:col-span-5 pointer-events-none select-none rounded-[20px] border-2 border-dashed border-red-300/80 dark:border-red-500/40 bg-red-50/60 dark:bg-red-950/20 px-4 py-3 sm:py-3.5 flex items-center justify-center gap-2">
                          <ChefHat className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
                          <span className="text-sm font-bold tracking-wide text-red-600 dark:text-red-400">
                            ครัว (Kitchen)
                          </span>
                        </div>
                        <div className="md:col-span-7 pointer-events-none select-none rounded-[20px] border-2 border-dashed border-slate-300/80 dark:border-neutral-700/80 bg-slate-100/60 dark:bg-neutral-800/30 px-4 py-3 sm:py-3.5 flex items-center justify-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                            ทางเข้าครัว / ตู้แช่
                          </span>
                        </div>
                      </div>

                      {/* Main Floor Area: ฝั่งซ้าย (โต๊ะ 1, 2) vs ฝั่งขวา (บาร์ 1-7 + โต๊ะ 3, 4, 5) */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
                        {/* ฝั่งซ้าย (5 cols): โต๊ะ 1, โต๊ะ 2 */}
                        <div className="md:col-span-5 flex flex-col justify-between gap-4">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider px-1">
                              ฝั่งซ้าย (ด้านใน)
                            </span>
                            {renderTableCardItem(1)}
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider px-1">
                              ฝั่งซ้าย (หน้าร้าน)
                            </span>
                            {renderTableCardItem(2)}
                          </div>
                        </div>

                        {/* ฝั่งขวา (7 cols): เคาน์เตอร์บาร์ (บาร์ 1-7) + โต๊ะ 3, 4, 5 */}
                        <div className="md:col-span-7 space-y-4">
                          {/* กล่องเคาน์เตอร์บาร์ */}
                          <div className="p-3 sm:p-4 rounded-[26px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-1.5">
                                <Armchair className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                                  เคาน์เตอร์บาร์ (7 ที่นั่ง)
                                </span>
                              </div>
                              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-medium hidden sm:inline">
                                ในครัว → หน้าร้าน
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {RATCHADA_BAR_TABLES.map(num => renderTableCardItem(num, true))}
                            </div>
                          </div>

                          {/* โต๊ะฝั่งขวา (3, 4, 5) */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider px-1">
                              โต๊ะฝั่งขวา (ต่อจากบาร์)
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {renderTableCardItem(3)}
                              {renderTableCardItem(4)}
                              {renderTableCardItem(5)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Entrance */}
                      <div className="pt-2 flex justify-center">
                        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-slate-200/60 dark:bg-neutral-800/70 text-slate-600 dark:text-neutral-300 text-xs font-bold border border-slate-300/60 dark:border-neutral-700/60 shadow-2xs">
                          <span className="text-red-500">▲</span>
                          <span>ทางเข้า (หน้าร้าน)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ผังเดิม สาขา 1 (คงเดิม 100%) */
                <div
                  className="w-full max-w-3xl mx-auto grid"
                  style={{
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gridTemplateAreas: FLOOR_GRID_TEMPLATE_AREAS,
                    gap: 'var(--grid-gap-lg)',
                  }}
                >
                  <div
                    style={{ gridArea: FLOOR_KITCHEN_AREA }}
                    className="pointer-events-none select-none rounded-[24px] border-2 border-dashed border-red-300/80 dark:border-red-500/40 bg-red-50/60 dark:bg-red-950/20 px-4 py-3 sm:py-4 flex items-center justify-center gap-2"
                    aria-hidden="true"
                  >
                    <ChefHat className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
                    <span className="text-sm sm:text-base font-bold tracking-wide text-red-600 dark:text-red-400">
                      Kitchen
                    </span>
                    <span className="text-xs font-medium text-red-400/80 dark:text-red-500/70 hidden sm:inline">
                      (ทิศทาง · ไม่ใช่โต๊ะ)
                    </span>
                  </div>

                  {Object.entries(FLOOR_TABLE_AREAS).map(([area, tableNumber]) => {
                    const table = tables.find(t => t.table_number === tableNumber);
                    if (!table) {
                      return (
                        <div
                          key={area}
                          style={{ gridArea: area }}
                          className="rounded-[24px] border border-dashed border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 min-h-32 sm:min-h-36 flex items-center justify-center"
                        >
                          <span className="text-caption text-slate-400">โต๊ะ {tableNumber}</span>
                        </div>
                      );
                    }
                    return (
                      <TableCard
                        key={table.id}
                        table={table}
                        onClick={() => handleTableClick(table)}
                        className="h-full min-h-32 sm:min-h-36"
                        style={{ gridArea: area }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {canAccessTab(role, 'kitchen') && (
          <div className={activeTab === 'kitchen' ? 'block' : 'hidden'}>
            {(activeTab === 'kitchen' || visitedTabs.has('kitchen')) && <KitchenScreen />}
          </div>
        )}

        {/* แท็บหนัก: lazy + keep-alive หลังเปิดครั้งแรก */}
        <Suspense fallback={<TabFallback />}>
          {LAZY_TABS.map(tab => {
            if (!visitedTabs.has(tab) || !lazyPanels[tab]) return null;
            return (
              <div key={tab} className={activeTab === tab ? 'block' : 'hidden'}>
                {lazyPanels[tab]}
              </div>
            );
          })}
        </Suspense>
      </AppMainContent>

      {actionSelectorTable !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-h2 text-slate-900 dark:text-neutral-100">
                จัดการ {formatTableLabel(actionSelectorTable.table_number)}
              </h3>
              <button
                onClick={() => setActionSelectorTable(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pendingItemCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>ยังมีออเดอร์ในครัวค้าง {pendingItemCount} รายการ</span>
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  const table = actionSelectorTable;
                  setActionSelectorTable(null);
                  setSelectedTableId(table.id);
                  setSelectedTableNumber(table.table_number);
                }}
                className="w-full py-3.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-900 dark:text-neutral-100 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200 dark:border-neutral-700 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>สั่งอาหารเพิ่ม</span>
              </button>

              <button
                onClick={() => {
                  if (pendingItemCount > 0) return;
                  const table = actionSelectorTable;
                  setActionSelectorTable(null);
                  setCheckoutTableId(table.id);
                  setCheckoutTableNumber(table.table_number);
                }}
                disabled={pendingItemCount > 0 || isCheckingPending}
                className={`w-full py-3.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  pendingItemCount > 0
                    ? 'bg-slate-200 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border border-slate-200 dark:border-neutral-700 cursor-not-allowed'
                    : 'btn-crimson text-white shadow-md shadow-red-600/20 cursor-pointer'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>
                  {pendingItemCount > 0
                    ? `ค้างครัว (${pendingItemCount} รายการ)`
                    : 'ชำระเงิน / เช็คบิล'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
