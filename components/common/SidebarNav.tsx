import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  LogOut,
  ChefHat,
  Layers,
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  Tag,
  History,
  Users,
  UserCog,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

export type NavTab =
  | 'floor'
  | 'kitchen'
  | 'history'
  | 'stock'
  | 'menu'
  | 'promo'
  | 'dashboard'
  | 'loyalty'
  | 'employees';

export interface SidebarNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, onSelectTab }) => {
  const { employee, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [pendingTablesCount, setPendingTablesCount] = useState<number>(0);
  const [checkingOutCount, setCheckingOutCount] = useState<number>(0);

  useEffect(() => {
    const fetchPendingTables = async () => {
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('id, orders!inner(table_id, status)')
          .eq('status', 'pending')
          .eq('orders.status', 'active');

        if (error) throw error;
        if (data) {
          const uniqueTableIds = new Set(
            data.map((item: any) => item.orders?.table_id).filter(Boolean)
          );
          setPendingTablesCount(uniqueTableIds.size);
        }
      } catch (err) {
        console.error('Error fetching pending tables count for sidebar:', err);
      }
    };

    const fetchCheckingOutCount = async () => {
      try {
        const { count, error } = await supabase
          .from('tables')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'checking_out');

        if (error) throw error;
        setCheckingOutCount(count || 0);
      } catch (err) {
        console.error('Error fetching checking out tables count:', err);
      }
    };

    fetchPendingTables();
    fetchCheckingOutCount();

    const channel = supabase
      .channel('realtime:sidebar_badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchPendingTables();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchPendingTables();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => {
          fetchCheckingOutCount();
          fetchPendingTables();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('yokayaki_theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('yokayaki_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isOwner = employee?.role === 'owner';

  const handleCloseDrawer = (callback?: () => void) => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsDrawerClosing(false);
      if (callback) callback();
    }, 220);
  };

  const handleTabClick = (tab: NavTab) => {
    handleCloseDrawer(() => onSelectTab(tab));
  };

  return (
    <>
      {/* Mobile Sticky Top Header Bar */}
      <div className="w-full shrink-0 md:hidden sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/20">
            <ChefHat className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">
              Yokayaki <span className="text-red-600">POS</span>
            </h1>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider">MANAGEMENT SYSTEM</p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 active:scale-90 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Mobile SlideOver Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div
            onClick={() => handleCloseDrawer()}
            className={`fixed inset-0 bg-zinc-900/60 backdrop-blur-xs transition-opacity duration-300 ${
              isDrawerClosing ? 'opacity-0' : 'animate-backdrop-in'
            }`}
          />

          <div
            className={`relative w-72 max-w-[80vw] bg-white dark:bg-zinc-900 h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto transition-transform duration-300 ease-out ${
              isDrawerClosing ? 'translate-x-full' : 'animate-drawer-in-right'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/20">
                    <ChefHat className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                      Yokayaki <span className="text-red-600">POS</span>
                    </h1>
                    <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider">MANAGEMENT SYSTEM</p>
                  </div>
                </div>

                <button
                  onClick={() => handleCloseDrawer()}
                  className="p-2 text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition active:scale-90 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button
                  onClick={() => handleTabClick('floor')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'floor'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4.5 h-4.5" />
                    <span>แผนผังโต๊ะ</span>
                  </div>
                  {checkingOutCount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-black transition-all ${
                        activeTab === 'floor'
                          ? 'bg-white text-red-600 shadow-xs'
                          : 'bg-rose-500 text-white shadow-xs animate-bounce'
                      }`}
                    >
                      {checkingOutCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('kitchen')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'kitchen'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ChefHat className="w-4.5 h-4.5" />
                    <span>หน้าจอครัว (KDS)</span>
                  </div>
                  {pendingTablesCount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-black transition-all ${
                        activeTab === 'kitchen'
                          ? 'bg-white text-red-600 shadow-xs'
                          : 'bg-red-600 text-white shadow-xs animate-pulse'
                      }`}
                    >
                      {pendingTablesCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('history')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                  }`}
                >
                  <History className="w-4.5 h-4.5" />
                  <span>ประวัติการขาย</span>
                </button>

                {isOwner && (
                  <>
                    <div className="pt-4 pb-1">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                        OWNER CONTROLS
                      </p>
                    </div>

                    <button
                      onClick={() => handleTabClick('menu')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'menu'
                          ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                      }`}
                    >
                      <UtensilsCrossed className="w-4.5 h-4.5" />
                      <span>จัดการเมนู</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('stock')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'stock'
                          ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                      }`}
                    >
                      <Package className="w-4.5 h-4.5" />
                      <span>ต้นทุนวัตถุดิบ</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('promo')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'promo'
                          ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                      }`}
                    >
                      <Tag className="w-4.5 h-4.5" />
                      <span>โปรโมชั่น</span>
                    </button>

                    <div className="pt-3 pb-1 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                        MANAGEMENT
                      </p>
                    </div>

                    <button
                      onClick={() => handleTabClick('dashboard')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'dashboard'
                          ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                      }`}
                    >
                      <LayoutDashboard className="w-4.5 h-4.5" />
                      <span>รายงาน / Dashboard</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('loyalty')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'loyalty'
                          ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                      }`}
                    >
                      <Users className="w-4.5 h-4.5" />
                      <span>สมาชิก</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('employees')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'employees'
                          ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:translate-x-1.5'
                      }`}
                    >
                      <UserCog className="w-4.5 h-4.5" />
                      <span>จัดการพนักงาน</span>
                    </button>
                  </>
                )}
              </nav>
            </div>

            <div className="pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-3 mt-6">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-4 h-4 text-indigo-500 fill-indigo-500/20 shrink-0" />
                    <span>สลับไปโหมดมืด</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />
                    <span>สลับไปโหมดสว่าง</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 p-2.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/70 dark:border-zinc-700">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{employee?.name}</p>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {employee?.role}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition duration-150 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 px-3 py-1.5 flex items-center justify-around shadow-lg">
        {/* 1. แผนผังโต๊ะ */}
        <button
          onClick={() => onSelectTab('floor')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
            activeTab === 'floor'
              ? 'text-red-600 dark:text-red-400 font-extrabold scale-105'
              : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all relative ${activeTab === 'floor' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : ''}`}>
            <Layers className="w-5 h-5 stroke-[2.2]" />
            {checkingOutCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-bounce">
                {checkingOutCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 leading-none font-bold">ผังโต๊ะ</span>
        </button>

        {/* 2. หน้าจอครัว */}
        <button
          onClick={() => onSelectTab('kitchen')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
            activeTab === 'kitchen'
              ? 'text-red-600 dark:text-red-400 font-extrabold scale-105'
              : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all relative ${activeTab === 'kitchen' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : ''}`}>
            <ChefHat className="w-5 h-5 stroke-[2.2]" />
            {pendingTablesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-pulse">
                {pendingTablesCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 leading-none font-bold">หน้าครัว</span>
        </button>

        {/* 3. ประวัติการขาย */}
        <button
          onClick={() => onSelectTab('history')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
            activeTab === 'history'
              ? 'text-red-600 dark:text-red-400 font-extrabold scale-105'
              : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'history' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : ''}`}>
            <History className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-xs mt-0.5 leading-none font-bold">ออเดอร์</span>
        </button>

        {/* 4. เมนูเพิ่มเติม (Open Drawer) */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
        >
          <div className="p-1.5">
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-xs mt-0.5 leading-none font-bold">เพิ่มเติม</span>
        </button>
      </div>

      {/* Desktop Left Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-5 flex-col justify-between shadow-sm shrink-0 sticky top-0 h-screen">
        <div>
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/20">
              <ChefHat className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                Yokayaki <span className="text-red-600">POS</span>
              </h1>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider">MANAGEMENT SYSTEM</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => onSelectTab('floor')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'floor'
                  ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4.5 h-4.5" />
                <span>แผนผังโต๊ะ</span>
              </div>
              {checkingOutCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black transition-all ${
                    activeTab === 'floor'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'bg-rose-500 text-white shadow-xs animate-bounce'
                  }`}
                >
                  {checkingOutCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('kitchen')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'kitchen'
                  ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <ChefHat className="w-4.5 h-4.5" />
                <span>หน้าจอครัว (KDS)</span>
              </div>
              {pendingTablesCount > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-black transition-all ${
                    activeTab === 'kitchen'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'bg-red-600 text-white shadow-xs animate-pulse'
                  }`}
                >
                  {pendingTablesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('history')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <History className="w-4.5 h-4.5" />
              <span>ออเดอร์ประจำวัน</span>
            </button>

            {isOwner && (
              <>
                <div className="pt-4 pb-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                    OWNER CONTROLS
                  </p>
                </div>

                <button
                  onClick={() => onSelectTab('menu')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'menu'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <UtensilsCrossed className="w-4.5 h-4.5" />
                  <span>จัดการเมนู</span>
                </button>

                <button
                  onClick={() => onSelectTab('stock')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'stock'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Package className="w-4.5 h-4.5" />
                  <span>ต้นทุนวัตถุดิบ</span>
                </button>

                <button
                  onClick={() => onSelectTab('promo')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'promo'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Tag className="w-4.5 h-4.5" />
                  <span>โปรโมชั่น</span>
                </button>

                <div className="pt-3 pb-1 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                    MANAGEMENT
                  </p>
                </div>

                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4.5 h-4.5" />
                  <span>รายงาน / Dashboard</span>
                </button>

                <button
                  onClick={() => onSelectTab('loyalty')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'loyalty'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Users className="w-4.5 h-4.5" />
                  <span>สมาชิก</span>
                </button>

                <button
                  onClick={() => onSelectTab('employees')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'employees'
                      ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <UserCog className="w-4.5 h-4.5" />
                  <span>จัดการพนักงาน</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3 mt-6">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4.5 h-4.5 text-indigo-500 fill-indigo-500/20 shrink-0" />
                <span>สลับไปโหมดมืด</span>
              </>
            ) : (
              <>
                <Sun className="w-4.5 h-4.5 text-amber-400 fill-amber-400/20 shrink-0" />
                <span>สลับไปโหมดสว่าง</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 p-2.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/70 dark:border-zinc-700">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{employee?.name}</p>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                {employee?.role}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition duration-150 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
