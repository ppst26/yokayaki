"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, RefreshCw, ChefHat, User, Layers, ShoppingBag, Receipt, LayoutDashboard, Package, AlertTriangle, UtensilsCrossed, Tag, History, Users } from 'lucide-react';
import { SidebarNav, NavTab } from '@/components/SidebarNav';
import { POSOrderScreen } from '@/components/POSOrderScreen';
import { CheckoutScreen } from '@/components/CheckoutScreen';
import { StockManager } from '@/components/StockManager';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { KitchenScreen } from '@/components/KitchenScreen';
import { MenuManager } from '@/components/MenuManager';
import { PromoManager } from '@/components/PromoManager';
import { SalesHistory } from '@/components/SalesHistory';
import { LoyaltyManager } from '@/components/LoyaltyManager';
import { EmployeeManager } from '@/components/EmployeeManager';

interface Table {
  id: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at: string;
}

export const TableMap: React.FC = () => {
  const { employee, logout } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [checkoutTableId, setCheckoutTableId] = useState<number | null>(null);
  const [actionSelectorTable, setActionSelectorTable] = useState<number | null>(null);
  const [pendingItemCount, setPendingItemCount] = useState<number>(0);
  const [isCheckingPending, setIsCheckingPending] = useState<boolean>(false);

  // Check pending kitchen items when Action Selector Modal opens for a table
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
          .eq('table_id', actionSelectorTable)
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
      .channel(`realtime:order_items_modal_${actionSelectorTable}`)
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('floor');

  // Fetch tables from Supabase
  const fetchTables = async () => {
    // If we have selected a table, return the POSOrderScreen view instead
    if (selectedTableId !== null) {
      return;
    }
    try {
      setIsSyncing(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setTables(data as Table[]);
    } catch (err: any) {
      console.error('Error fetching tables:', err);
      setErrorMsg('ไม่สามารถดึงข้อมูลโต๊ะได้');
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle table status in Supabase
  const handleTableClick = async (tableId: number, currentStatus: 'vacant' | 'occupied' | 'checking_out') => {
    let nextStatus: 'vacant' | 'occupied' | 'checking_out' = 'occupied';
    if (currentStatus === 'vacant') {
      nextStatus = 'occupied';
    } else if (currentStatus === 'occupied') {
      nextStatus = 'checking_out';
    } else if (currentStatus === 'checking_out') {
      nextStatus = 'vacant';
    }

    // Optimistic UI update
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: nextStatus } : t));

    try {
      const { error } = await supabase
        .from('tables')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', tableId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating table:', err);
      setErrorMsg('ไม่สามารถบันทึกสถานะโต๊ะได้');
      // Rollback to original state on failure
      fetchTables();
    }
  };



  // Real-time subscription & Inactivity Auto-Lock
  useEffect(() => {
    fetchTables();

    // Subscribe to real-time changes in tables table
    const tableChannel = supabase
      .channel('realtime:tables')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables' },
        (payload) => {
          const updatedTable = payload.new as Table;
          setTables(prev => prev.map(t => t.id === updatedTable.id ? updatedTable : t));
        }
      )
      .subscribe();

    // 5-minute Auto-Lock / Inactivity Logout
    const timeoutDuration = 5 * 60 * 1000;
    let timeout = setTimeout(logout, timeoutDuration);

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(logout, timeoutDuration);
    };

    // User interactions to reset timer
    window.addEventListener('click', resetTimer);
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    return () => {
      tableChannel.unsubscribe();
      clearTimeout(timeout);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [logout, employee?.role]);

  const handleTabSelect = (tab: NavTab) => {
    setSelectedTableId(null);
    setCheckoutTableId(null);
    setActiveTab(tab);
  };

  const isOwner = employee?.role === 'owner';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Reusable Sidebar & Mobile Navigation */}
      <SidebarNav activeTab={activeTab} onSelectTab={handleTabSelect} />

      {/* Main Content Stage */}
      <main className={`flex-1 overflow-y-auto w-full flex flex-col ${selectedTableId !== null ? 'p-0' : 'p-6'}`}>
        {selectedTableId !== null ? (
          <POSOrderScreen
            tableId={selectedTableId}
            onBack={() => setSelectedTableId(null)}
          />
        ) : checkoutTableId !== null ? (
          <CheckoutScreen
            tableId={checkoutTableId}
            onBack={() => { setCheckoutTableId(null); fetchTables(); }}
          />
        ) : (
          <>
            {/* Top Action Bar */}
            <header className="flex flex-row justify-between items-center mb-6 pb-4 border-b border-slate-200/80 dark:border-neutral-800">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-neutral-100">
                  {activeTab === 'floor' && 'ผังโต๊ะอาหาร'}
                  {activeTab === 'kitchen' && 'หน้าจอห้องครัว (KDS)'}
                  {activeTab === 'history' && 'ประวัติการขาย'}
                  {activeTab === 'menu' && 'จัดการเมนูอาหาร'}
                  {activeTab === 'stock' && 'ต้นทุนวัตถุดิบ & สต็อก'}
                  {activeTab === 'promo' && 'จัดการโปรโมชั่น'}
                  {activeTab === 'dashboard' && 'รายงาน & แดชบอร์ด'}
                  {activeTab === 'loyalty' && 'ระบบสมาชิก & CRM'}
                  {activeTab === 'employees' && 'จัดการพนักงาน'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium mt-0.5">
                  {activeTab === 'floor' && 'เลือกโต๊ะที่ต้องการสั่งอาหารหรือเช็คบิล'}
                  {activeTab === 'kitchen' && 'รายการอาหารที่ต้องจัดทำตามลำดับออเดอร์'}
                </p>
              </div>

              <button
                onClick={fetchTables}
                disabled={isSyncing}
                className="p-2.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-xl transition duration-150 active:scale-95 text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-neutral-100 flex items-center gap-2 text-xs font-bold shadow-xs cursor-pointer"
                title="รีเฟรชข้อมูลโต๊ะ"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-red-600' : ''}`} />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </header>

        {/* Tab Content Rendering */}
        {activeTab === 'employees' && isOwner ? (
          <EmployeeManager />
        ) : activeTab === 'loyalty' && isOwner ? (
          <LoyaltyManager />
        ) : activeTab === 'stock' && isOwner ? (
          <StockManager />
        ) : activeTab === 'menu' && isOwner ? (
          <MenuManager />
        ) : activeTab === 'promo' && isOwner ? (
          <PromoManager />
        ) : activeTab === 'dashboard' && isOwner ? (
          <OwnerDashboard />
        ) : activeTab === 'kitchen' ? (
          <KitchenScreen />
        ) : activeTab === 'history' ? (
          <SalesHistory />
        ) : (
          <div className="max-w-6xl">
            {/* Info Banner / Error message */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Legend / Status Indicators */}
            <div className="flex flex-wrap gap-4 mb-6 bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 p-3.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-neutral-300 shadow-xs max-w-lg">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
                <span>ว่าง (Vacant)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
                <span>มีลูกค้า (Occupied)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <span>รอเช็คบิล (Checking Out)</span>
              </div>
            </div>

            {/* Tables Floor Plan Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {tables.length === 0 ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-44 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 animate-pulse flex items-center justify-center shadow-xs">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ))
              ) : (
                tables.map(table => {
                  const isVacant = table.status === 'vacant';
                  const isOccupied = table.status === 'occupied';
                  const isCheckingOut = table.status === 'checking_out';

                  let cardStyle = 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 hover:border-slate-300 dark:hover:border-neutral-700';
                  let badgeStyle = 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700';
                  let glowIndicator = 'bg-slate-400';

                  if (isVacant) {
                    cardStyle = 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-100 hover:border-red-400 dark:hover:border-red-500 hover:shadow-md';
                    badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';
                    glowIndicator = 'bg-emerald-500';
                  } else if (isOccupied) {
                    cardStyle = 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 shadow-sm font-bold hover:border-amber-400';
                    badgeStyle = 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
                    glowIndicator = 'bg-amber-500';
                  } else if (isCheckingOut) {
                    cardStyle = 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 shadow-sm font-extrabold hover:border-rose-400 animate-pulse';
                    badgeStyle = 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
                    glowIndicator = 'bg-rose-500 animate-ping';
                  }

                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        const t = tables.find(tt => tt.id === table.id);
                        if (t && (t.status === 'occupied' || t.status === 'checking_out')) {
                          setActionSelectorTable(table.id);
                        } else {
                          setSelectedTableId(table.id);
                        }
                      }}
                      className={`group relative h-44 rounded-2xl border p-5 flex flex-col items-center justify-center gap-3 transition-all duration-200 active:scale-98 shadow-sm cursor-pointer overflow-hidden ${cardStyle}`}
                    >
                      <span className="absolute top-4 right-4 flex h-3 w-3">
                        <span className={`rounded-full h-3 w-3 ${glowIndicator}`} />
                      </span>

                      <span className="text-slate-400 dark:text-neutral-500 text-[11px] font-bold tracking-widest uppercase">TABLE</span>
                      <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-neutral-100 group-hover:scale-105 transition-transform duration-200">
                        โต๊ะ {table.id}
                      </span>
                      
                      <span className={`text-xs font-bold tracking-wide px-3 py-1 rounded-full border shadow-xs transition-colors duration-200 ${badgeStyle}`}>
                        {table.status === 'vacant' && 'ว่าง (Vacant)'}
                        {table.status === 'occupied' && 'มีลูกค้า (Occupied)'}
                        {table.status === 'checking_out' && 'รอเช็คบิล'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </>
    )}
  </main>

      {/* Action Selector Modal for occupied tables */}
      {actionSelectorTable !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-neutral-100">โต๊ะ {actionSelectorTable}</h3>
              <p className="text-slate-500 dark:text-neutral-400 text-xs font-medium">เลือกทำรายการ</p>
            </div>

            {/* Warning banner if there are pending kitchen orders */}
            {pendingItemCount > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-semibold flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">ยังมีออเดอร์ในครัว ({pendingItemCount} รายการ)</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-normal">
                    ต้องเสิร์ฟอาหารจากหน้าจอครัวให้ครบก่อน จึงจะกดชำระเงินได้
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => { setSelectedTableId(actionSelectorTable); setActionSelectorTable(null); }}
              className="w-full py-3.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-100 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-200 dark:border-neutral-700 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-red-600 dark:text-red-400" />
              สั่งอาหารเพิ่ม
            </button>

            <button
              disabled={pendingItemCount > 0 || isCheckingPending}
              onClick={() => {
                if (pendingItemCount > 0) return;
                setCheckoutTableId(actionSelectorTable);
                setActionSelectorTable(null);
              }}
              className={`w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                pendingItemCount > 0 || isCheckingPending
                  ? 'bg-slate-200 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border border-slate-300/80 dark:border-neutral-700 cursor-not-allowed shadow-none opacity-80'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 cursor-pointer'
              }`}
            >
              <Receipt className="w-5 h-5" />
              {isCheckingPending ? (
                <span>กำลังตรวจสอบครัว...</span>
              ) : pendingItemCount > 0 ? (
                <span>ยังชำระเงินไม่ได้ (ค้างครัว {pendingItemCount})</span>
              ) : (
                <span>ชำระเงิน / เช็คบิล</span>
              )}
            </button>

            <button
              onClick={() => setActionSelectorTable(null)}
              className="w-full py-2 text-slate-400 dark:text-neutral-500 text-xs font-bold hover:text-slate-600 dark:hover:text-neutral-300 transition cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

