"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { RefreshCw, ShoppingBag, Receipt, AlertTriangle, X } from 'lucide-react';
import { SidebarNav, NavTab } from '@/components/SidebarNav';
import { POSOrderScreen } from '@/components/POSOrderScreen';
import { CheckoutScreen } from '@/components/CheckoutScreen';
import { KitchenScreen } from '@/components/KitchenScreen';
import { playNewOrderSound, playCheckBillSound } from '@/lib/audioNotifier';
import { TableCard } from '@/components/TableCard';
import { AppMainContent } from '@/components/common/AppMainContent';
import { canAccessTab, type EmployeeRole } from '@/lib/permissions';
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

    const checkPendingItems = async () => {
      try {
        setIsCheckingPending(true);
        const { data: orderData } = await supabase
          .from('orders')
          .select('id')
          .eq('table_id', actionSelectorTable.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!orderData) {
          setPendingItemCount(0);
          return;
        }

        const { count, error } = await supabase
          .from('order_items')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', orderData.id)
          .eq('status', 'pending');

        if (error) throw error;
        setPendingItemCount(count || 0);
      } catch (err) {
        console.error('Error checking pending items:', err);
      } finally {
        setIsCheckingPending(false);
      }
    };

    checkPendingItems();

    const channel = supabase
      .channel(`realtime:order_items_modal_${actionSelectorTable.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          checkPendingItems();
        }
      )
      .subscribe();

    return () => {
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
        <AppMainContent className="overflow-y-auto no-scrollbar" innerClassName="p-4 md:p-6 lg:p-8">
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

      <AppMainContent className="overflow-y-auto no-scrollbar" innerClassName="p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
        {/* floor + kitchen: eager (ใช้บ่อย) */}
        {canAccessTab(role, 'floor') && (
          <div className={activeTab === 'floor' ? 'block' : 'hidden'}>
            <div className="w-full space-y-6">
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="w-[50%]">
                  <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100">
                    ผังโต๊ะ
                  </h1>
                  <p className="text-caption mt-0.5">เลือกโต๊ะเพื่อเปิดออเดอร์</p>
                </div>

                <button
                  onClick={fetchTables}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl text-caption font-semibold transition active:scale-95 shadow-xs cursor-pointer self-start md:self-auto"
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

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {tables.map(table => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onClick={() => handleTableClick(table)}
                  />
                ))}
              </div>
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
                จัดการ โต๊ะ {actionSelectorTable.table_number}
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
