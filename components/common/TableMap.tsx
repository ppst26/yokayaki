"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { RefreshCw, ShoppingBag, Receipt, AlertTriangle, X } from 'lucide-react';
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
import { TableCard } from '@/components/TableCard';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('floor');

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

  const fetchTables = async () => {
    if (selectedTableId !== null) return;
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
      setErrorMsg('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const channel = supabase
      .channel('realtime:tables')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        (payload: any) => {
          if (payload.new) {
            setTables(prev =>
              prev.map(t => (t.id === payload.new.id ? (payload.new as Table) : t))
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedTableId]);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    setSelectedTableId(null);
    setCheckoutTableId(null);
  };

  if (selectedTableId !== null) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-neutral-950 font-sans text-slate-800 dark:text-neutral-100 overflow-hidden">
        <SidebarNav activeTab={activeTab} onSelectTab={handleTabChange} />
        <main className="flex-1 overflow-hidden">
          <POSOrderScreen
            tableId={selectedTableId}
            onBack={() => setSelectedTableId(null)}
          />
        </main>
      </div>
    );
  }

  if (checkoutTableId !== null) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-neutral-950 font-sans text-slate-800 dark:text-neutral-100 overflow-hidden">
        <SidebarNav activeTab={activeTab} onSelectTab={handleTabChange} />
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8">
          <CheckoutScreen
            tableId={checkoutTableId}
            onBack={() => setCheckoutTableId(null)}
          />
        </main>
      </div>
    );
  }

  const handleTableClick = (table: Table) => {
    if (table.status === 'occupied' || table.status === 'checking_out') {
      setActionSelectorTable(table.id);
    } else {
      setSelectedTableId(table.id);
    }
  };

  const isOwner = employee?.role === 'owner';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-neutral-950 font-sans text-slate-800 dark:text-neutral-100 overflow-hidden">
      <SidebarNav activeTab={activeTab} onSelectTab={handleTabChange} />

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8">
        {activeTab === 'kitchen' && <KitchenScreen />}
        {activeTab === 'history' && <SalesHistory />}
        {activeTab === 'menu' && isOwner && <MenuManager />}
        {activeTab === 'stock' && isOwner && <StockManager />}
        {activeTab === 'promo' && isOwner && <PromoManager />}
        {activeTab === 'dashboard' && isOwner && <OwnerDashboard />}
        {activeTab === 'loyalty' && isOwner && <LoyaltyManager />}
        {activeTab === 'employees' && isOwner && <EmployeeManager />}

        {activeTab === 'floor' && (
          <div className="w-full space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-h1 text-slate-900 dark:text-neutral-100">
                  ผังโต๊ะอาหาร (Table Map)
                </h1>
                <p className="text-caption mt-0.5">
                  เลือกโต๊ะเพื่อเปิดออเดอร์ หรือเช็คบิลชำระเงิน
                </p>
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {tables.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={() => handleTableClick(table)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Action Selector Modal */}
      {actionSelectorTable !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-h2 text-slate-900 dark:text-neutral-100">
                จัดการ โต๊ะ {actionSelectorTable}
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
                  const tid = actionSelectorTable;
                  setActionSelectorTable(null);
                  setSelectedTableId(tid);
                }}
                className="w-full py-3.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-900 dark:text-neutral-100 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200 dark:border-neutral-700 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>สั่งอาหารเพิ่ม</span>
              </button>

              <button
                onClick={() => {
                  if (pendingItemCount > 0) return;
                  const tid = actionSelectorTable;
                  setActionSelectorTable(null);
                  setCheckoutTableId(tid);
                }}
                disabled={pendingItemCount > 0 || isCheckingPending}
                className={`w-full py-3.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                  pendingItemCount > 0
                    ? 'bg-slate-200 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border border-slate-200 dark:border-neutral-700 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 cursor-pointer'
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
