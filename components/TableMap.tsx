"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, RefreshCw, ChefHat, User, Layers, ShoppingBag, Receipt, LayoutDashboard, Package, AlertTriangle, UtensilsCrossed, Tag, History, Users } from 'lucide-react';
import { POSOrderScreen } from '@/components/POSOrderScreen';
import { CheckoutScreen } from '@/components/CheckoutScreen';
import { StockManager } from '@/components/StockManager';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { KitchenScreen } from '@/components/KitchenScreen';
import { MenuManager } from '@/components/MenuManager';
import { PromoManager } from '@/components/PromoManager';
import { SalesHistory } from '@/components/SalesHistory';
import { LoyaltyManager } from '@/components/LoyaltyManager';

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
  const [activeTab, setActiveTab] = useState<'floor' | 'kitchen' | 'history' | 'stock' | 'menu' | 'promo' | 'dashboard' | 'loyalty'>('floor');

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
    <div className="min-h-screen bg-gray-100 text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Left Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-col justify-between shadow-sm shrink-0 md:sticky md:top-0 md:h-screen">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/20">
              <ChefHat className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                YOKAYAKI <span className="text-red-600">POS</span>
              </h1>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wider">MANAGEMENT SYSTEM</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('floor')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'floor'
                  ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>แผนผังโต๊ะ</span>
            </button>
            
            <button
              onClick={() => setActiveTab('kitchen')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'kitchen'
                  ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>หน้าจอครัว (KDS)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>ประวัติการขาย</span>
            </button>

            {isOwner && (
              <>
                <div className="pt-4 pb-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3">OWNER CONTROLS</p>
                </div>

                <button
                  onClick={() => setActiveTab('menu')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'menu'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>จัดการเมนู</span>
                </button>

                <button
                  onClick={() => setActiveTab('stock')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'stock'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>ต้นทุนวัตถุดิบ</span>
                </button>

                <button
                  onClick={() => setActiveTab('promo')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'promo'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>โปรโมชั่น</span>
                </button>

                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>รายงาน / Dashboard</span>
                </button>

                <button
                  onClick={() => setActiveTab('loyalty')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'loyalty'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>สมาชิก</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Footer: Logged in Employee Info + Logout */}
        <div className="pt-6 border-t border-slate-100 space-y-3 mt-6">
          <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
              {employee?.name?.charAt(0) || 'E'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{employee?.name}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{employee?.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition duration-150"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Stage */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl">
        {/* Top Action Bar */}
        <header className="flex flex-row justify-between items-center mb-6 pb-4 border-b border-slate-200/80">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {activeTab === 'floor' && 'ผังโต๊ะอาหาร'}
              {activeTab === 'kitchen' && 'หน้าจอห้องครัว (KDS)'}
              {activeTab === 'history' && 'ประวัติการขาย'}
              {activeTab === 'menu' && 'จัดการเมนูอาหาร'}
              {activeTab === 'stock' && 'ต้นทุนวัตถุดิบ & สต็อก'}
              {activeTab === 'promo' && 'จัดการโปรโมชั่น'}
              {activeTab === 'dashboard' && 'รายงาน & แดชบอร์ด'}
              {activeTab === 'loyalty' && 'ระบบสมาชิก & CRM'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeTab === 'floor' && 'เลือกโต๊ะที่ต้องการสั่งอาหารหรือเช็คบิล'}
              {activeTab === 'kitchen' && 'รายการอาหารที่ต้องจัดทำตามลำดับออเดอร์'}
            </p>
          </div>

          <button
            onClick={fetchTables}
            disabled={isSyncing}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition duration-150 active:scale-95 text-slate-700 hover:text-slate-900 flex items-center gap-2 text-xs font-bold shadow-xs"
            title="รีเฟรชข้อมูลโต๊ะ"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-red-600' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </header>

        {/* Tab Content Rendering */}
        {activeTab === 'loyalty' && isOwner ? (
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
          <>
            {/* Info Banner / Error message */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Legend / Status Indicators */}
            <div className="flex flex-wrap gap-4 mb-6 bg-white border border-slate-200/80 p-3.5 rounded-2xl text-xs font-semibold text-slate-600 shadow-xs max-w-lg">
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
                  <div key={i} className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse flex items-center justify-center shadow-xs">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ))
              ) : (
                tables.map(table => {
                  const isVacant = table.status === 'vacant';
                  const isOccupied = table.status === 'occupied';
                  const isCheckingOut = table.status === 'checking_out';

                  let cardStyle = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
                  let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
                  let glowIndicator = 'bg-slate-400';

                  if (isVacant) {
                    cardStyle = 'bg-white border-slate-200 text-slate-800 hover:border-red-400 hover:shadow-md';
                    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    glowIndicator = 'bg-emerald-500';
                  } else if (isOccupied) {
                    cardStyle = 'bg-amber-50/60 border-amber-300 text-amber-900 shadow-sm font-bold hover:border-amber-400';
                    badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
                    glowIndicator = 'bg-amber-500';
                  } else if (isCheckingOut) {
                    cardStyle = 'bg-rose-50/70 border-rose-300 text-rose-900 shadow-sm font-extrabold hover:border-rose-400 animate-pulse';
                    badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300';
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

                      <span className="text-slate-400 text-[11px] font-bold tracking-widest uppercase">TABLE</span>
                      <span className="text-3xl font-black tracking-tight text-slate-900 group-hover:scale-105 transition-transform duration-200">
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
          </>
        )}
      </main>

      {/* Action Selector Modal for occupied tables */}
      {actionSelectorTable !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xs p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 text-center">โต๊ะ {actionSelectorTable}</h3>
            <p className="text-slate-500 text-xs text-center font-medium">เลือกทำรายการ</p>
            <button
              onClick={() => { setSelectedTableId(actionSelectorTable); setActionSelectorTable(null); }}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 border border-slate-200"
            >
              <ShoppingBag className="w-5 h-5 text-red-600" />
              สั่งอาหารเพิ่ม
            </button>
            <button
              onClick={() => { setCheckoutTableId(actionSelectorTable); setActionSelectorTable(null); }}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-red-600/20"
            >
              <Receipt className="w-5 h-5" />
              ชำระเงิน / เช็คบิล
            </button>
            <button
              onClick={() => setActionSelectorTable(null)}
              className="w-full py-2 text-slate-400 text-xs font-bold hover:text-slate-600 transition"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

