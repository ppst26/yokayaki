"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, RefreshCw, ChefHat, User, Layers, ShoppingBag, Receipt, LayoutDashboard, Package, AlertTriangle } from 'lucide-react';
import { POSOrderScreen } from '@/components/POSOrderScreen';
import { CheckoutScreen } from '@/components/CheckoutScreen';
import { StockManager } from '@/components/StockManager';
import { OwnerDashboard } from '@/components/OwnerDashboard';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'floor' | 'stock' | 'dashboard'>('floor');
  const [lowStockItems, setLowStockItems] = useState<{ name: string; stock: number }[]>([]);

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

  // ดึงรายการสต็อกต่ำ (สำหรับ Widget แจ้งเตือนบน Header)
  const fetchLowStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('name, stock')
        .eq('is_stock_tracked', true)
        .lte('stock', 5)
        .order('stock', { ascending: true });

      if (error) throw error;
      if (data) setLowStockItems(data);
    } catch (err) {
      console.error('Error fetching low-stock items:', err);
    }
  };

  // Real-time subscription & Inactivity Auto-Lock
  useEffect(() => {
    fetchTables();
    if (employee?.role === 'owner') {
      fetchLowStockItems();
    }

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

    // ติดตามการเปลี่ยนแปลงสต็อกเพื่ออัปเดต Widget แจ้งเตือน
    const stockChannel = supabase
      .channel('realtime:stock_alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          if (employee?.role === 'owner') {
            fetchLowStockItems();
          }
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
      stockChannel.unsubscribe();
      clearTimeout(timeout);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [logout, employee?.role]);

  if (checkoutTableId !== null) {
    return (
      <CheckoutScreen
        tableId={checkoutTableId}
        onBack={() => { setCheckoutTableId(null); fetchTables(); }}
      />
    );
  }

  if (selectedTableId !== null) {
    return (
      <POSOrderScreen
        tableId={selectedTableId}
        onBack={() => setSelectedTableId(null)}
      />
    );
  }

  const isOwner = employee?.role === 'owner';

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-stone-900 via-neutral-950 to-black text-white p-6 relative selection:bg-amber-500/30">
      {/* Background neon glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-stone-800/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-center text-amber-500 shadow-md">
              <ChefHat className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-stone-100 to-stone-400 bg-clip-text text-transparent">
                YOKAYAKI POS
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-stone-400 font-medium">
                <User className="w-4 h-4 text-amber-500/80" />
                <span>พนักงาน:</span>
                <span className="text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {employee?.name}
                </span>
                <span className="text-stone-500">•</span>
                <span className="text-stone-300 uppercase text-xs tracking-wider bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
                  {employee?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Widget แจ้งเตือนสต็อกต่ำ (เจ้าของเท่านั้น) */}
            {isOwner && lowStockItems.length > 0 && (
              <button
                onClick={() => setActiveTab('stock')}
                className="relative flex items-center gap-2 px-3 py-2 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-xs font-bold hover:bg-red-950/50 transition active:scale-95 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>สต็อกใกล้หมด {lowStockItems.length} รายการ</span>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-[10px] font-black text-white rounded-full flex items-center justify-center shadow-md shadow-red-500/30">
                  {lowStockItems.length}
                </span>
              </button>
            )}

            <button
              onClick={fetchTables}
              disabled={isSyncing}
              className="p-2.5 bg-stone-900/60 hover:bg-stone-800 border border-stone-800/80 rounded-xl transition duration-150 active:scale-95 text-stone-300 hover:text-white flex items-center gap-2 text-sm font-medium"
              title="รีเฟรชข้อมูลโต๊ะ"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-500' : ''}`} />
              <span>ซิงค์โต๊ะ</span>
            </button>
            
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-950/40 to-stone-900 hover:from-red-900/40 hover:to-stone-800 border border-red-900/40 hover:border-red-800/50 px-4 py-2.5 rounded-xl transition duration-150 active:scale-95 text-red-400 hover:text-red-300 text-sm font-bold ml-auto md:ml-0"
            >
              <LogOut className="w-4 h-4" />
              <span>สลับพนักงาน (Logout)</span>
            </button>
          </div>
        </header>

        {/* Navigation Tabs (Owner เห็น 3 แท็บ, พนักงานทั่วไปเห็นแค่ Floor Map) */}
        {isOwner && (
          <nav className="flex items-center gap-2 mb-8 bg-stone-900/40 backdrop-blur-md border border-stone-850 p-1.5 rounded-2xl max-w-lg">
            <button
              onClick={() => setActiveTab('floor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'floor'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>แผนผังโต๊ะ</span>
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>จัดการสต็อก</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>รายงาน / Dashboard</span>
            </button>
          </nav>
        )}

        {/* Tab Content Rendering */}
        {activeTab === 'stock' && isOwner ? (
          <StockManager />
        ) : activeTab === 'dashboard' && isOwner ? (
          <OwnerDashboard />
        ) : (
          <>
            {/* Info Banner / Error message */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 text-red-400 rounded-2xl text-sm font-semibold flex items-center gap-3 animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Legend / Status Indicators */}
            <div className="flex flex-wrap gap-4 mb-8 bg-stone-900/30 backdrop-blur-md border border-stone-850 p-4 rounded-2xl text-xs font-semibold text-stone-400 max-w-lg">
              <div className="flex items-center gap-2 mr-2">
                <span className="w-3.5 h-3.5 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /></span>
                <span>ว่าง (Vacant)</span>
              </div>
              <div className="flex items-center gap-2 mr-2">
                <span className="w-3.5 h-3.5 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" /></span>
                <span>มีลูกค้า (Occupied)</span>
              </div>
              <div className="flex items-center gap-2 mr-2">
                <span className="w-3.5 h-3.5 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" /></span>
                <span>รอเช็คบิล (Checking Out)</span>
              </div>
            </div>

            {/* Tables Floor Plan Grid */}
            <main className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {tables.length === 0 ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-44 rounded-3xl bg-stone-900/40 border border-stone-800/60 animate-pulse flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                  </div>
                ))
              ) : (
                tables.map(table => {
                  const isVacant = table.status === 'vacant';
                  const isOccupied = table.status === 'occupied';
                  const isCheckingOut = table.status === 'checking_out';

                  let cardStyle = 'bg-stone-900/40 border-stone-800/80 text-stone-400 hover:border-stone-700 hover:bg-stone-900/60 hover:text-stone-300';
                  let badgeStyle = 'bg-stone-950 text-stone-400 border-stone-800';
                  let glowIndicator = 'bg-stone-700';

                  if (isVacant) {
                    cardStyle = 'bg-stone-900/30 border-emerald-950/60 text-emerald-500/90 hover:border-emerald-800/60 hover:bg-emerald-950/10 shadow-[inset_0_1px_0_rgba(16,185,129,0.05)]';
                    badgeStyle = 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40';
                    glowIndicator = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]';
                  } else if (isOccupied) {
                    cardStyle = 'bg-stone-900/30 border-blue-950/60 text-blue-500/95 hover:border-blue-800/60 hover:bg-blue-950/10 shadow-[inset_0_1px_0_rgba(59,130,246,0.05)] font-bold';
                    badgeStyle = 'bg-blue-950/40 text-blue-400 border-blue-900/40';
                    glowIndicator = 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]';
                  } else if (isCheckingOut) {
                    cardStyle = 'bg-gradient-to-b from-amber-950/20 to-stone-900/40 border-amber-500/50 text-amber-500 hover:border-amber-400 hover:bg-amber-950/10 shadow-[0_0_15px_rgba(245,158,11,0.1)] font-extrabold animate-pulse';
                    badgeStyle = 'bg-amber-950/50 text-amber-400 border-amber-900/50';
                    glowIndicator = 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)] animate-ping';
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
                      className={`group relative h-44 rounded-3xl border flex flex-col items-center justify-center gap-4 transition-all duration-300 active:scale-98 shadow-lg cursor-pointer overflow-hidden ${cardStyle}`}
                    >
                      <span className="absolute top-4 right-4 flex h-3 w-3">
                        <span className={`rounded-full h-3 w-3 ${glowIndicator}`} />
                      </span>

                      <span className="text-stone-500 text-xs font-semibold tracking-widest uppercase opacity-60">TABLE</span>
                      <span className="text-4xl font-black tracking-tight drop-shadow-sm group-hover:scale-105 transition-transform duration-200">
                        โต๊ะ {table.id}
                      </span>
                      
                      <span className={`text-xs font-bold tracking-wide px-3 py-1 rounded-full border shadow-sm transition-colors duration-200 ${badgeStyle}`}>
                        {table.status === 'vacant' && 'ว่าง (Vacant)'}
                        {table.status === 'occupied' && 'มีลูกค้า (Occupied)'}
                        {table.status === 'checking_out' && 'รอเช็คบิล'}
                      </span>
                    </button>
                  );
                })
              )}
            </main>
          </>
        )}
      </div>

      {/* Action Selector Modal for occupied tables */}
      {actionSelectorTable !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-white text-center">โต๊ะ {actionSelectorTable}</h3>
            <p className="text-stone-400 text-xs text-center">เลือกสิ่งที่ต้องการทำ</p>
            <button
              onClick={() => { setSelectedTableId(actionSelectorTable); setActionSelectorTable(null); }}
              className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95"
            >
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              สั่งอาหารเพิ่ม
            </button>
            <button
              onClick={() => { setCheckoutTableId(actionSelectorTable); setActionSelectorTable(null); }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/10"
            >
              <Receipt className="w-5 h-5" />
              ชำระเงิน / เช็คบิล
            </button>
            <button
              onClick={() => setActionSelectorTable(null)}
              className="w-full py-2 text-stone-500 text-xs font-bold hover:text-stone-300 transition"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
