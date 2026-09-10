import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { canAccessTab, type EmployeeRole } from '@/lib/permissions';
import { SidebarBrand } from '@/components/common/SidebarBrand';
import { ThemeToggleIcon } from '@/components/common/ThemeToggleIcon';
import { applyTheme, readStoredTheme, switchTheme, type Theme } from '@/lib/theme';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'yokayaki_sidebar_collapsed';

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
  const [theme, setTheme] = useState<Theme>('dark');
  const [pendingTablesCount, setPendingTablesCount] = useState<number>(0);
  const [checkingOutCount, setCheckingOutCount] = useState<number>(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    const saved = readStoredTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    const isCollapsed = saved === 'true';
    if (isCollapsed) {
      setIsSidebarCollapsed(true);
      document.documentElement.style.setProperty('--current-sidebar-width', 'var(--sidebar-width-collapsed)');
    } else {
      document.documentElement.style.setProperty('--current-sidebar-width', 'var(--sidebar-width)');
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      document.documentElement.style.setProperty(
        '--current-sidebar-width',
        next ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)'
      );
      return next;
    });
  };

  /** สลับธีม — วงกลมแผ่ออกจากปุ่มที่กด (ดู lib/theme.ts) */
  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    const rect = event.currentTarget.getBoundingClientRect();
    switchTheme(nextTheme, {
      origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      // flush ทันทีเพื่อให้ไอคอน/ข้อความใหม่ติดไปกับ snapshot ของ view transition
      apply: () => flushSync(() => setTheme(nextTheme)),
    });
  };

  const role = (employee?.role ?? 'cashier') as EmployeeRole;
  const showCatalogSection =
    canAccessTab(role, 'menu') || canAccessTab(role, 'stock') || canAccessTab(role, 'promo');
  const showManagementSection =
    canAccessTab(role, 'dashboard') || canAccessTab(role, 'loyalty') || canAccessTab(role, 'employees');

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
      <header className="w-full shrink-0 md:hidden sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 px-4 py-2 flex items-center justify-between shadow-xs">
        <SidebarBrand size="sm" theme={theme} />

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-150 active:scale-95 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5.5 h-5.5 stroke-[2.2]" />
        </button>
      </header>

      {/* Mobile SlideOver Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div
            onClick={() => handleCloseDrawer()}
            className={`fixed inset-0 app-dialog-backdrop transition-opacity duration-300 ${
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
                <SidebarBrand size="sm" theme={theme} />

                <button
                  onClick={() => handleCloseDrawer()}
                  className="p-2 text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition active:scale-90 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {canAccessTab(role, 'floor') && (
                <button
                  onClick={() => handleTabClick('floor')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'floor'
                      ? 'nav-active'
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
                )}

                {canAccessTab(role, 'kitchen') && (
                <button
                  onClick={() => handleTabClick('kitchen')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'kitchen'
                      ? 'nav-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ChefHat className="w-4.5 h-4.5" />
                    <span>หน้าจอครัว</span>
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
                )}

                {canAccessTab(role, 'history') && (
                  <button
                    onClick={() => handleTabClick('history')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                      activeTab === 'history'
                        ? 'nav-active'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <History className="w-4.5 h-4.5" />
                    <span>ประวัติการขาย</span>
                  </button>
                )}

                {showCatalogSection && (
                  <>
                    <div className="pt-4 pb-1">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                        OWNER CONTROLS
                      </p>
                    </div>

                    {canAccessTab(role, 'menu') && (
                    <button
                      onClick={() => handleTabClick('menu')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                        activeTab === 'menu'
                          ? 'nav-active'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <UtensilsCrossed className="w-4.5 h-4.5" />
                      <span>จัดการเมนู</span>
                    </button>
                    )}

                    {canAccessTab(role, 'stock') && (
                    <button
                      onClick={() => handleTabClick('stock')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                        activeTab === 'stock'
                          ? 'nav-active'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Package className="w-4.5 h-4.5" />
                      <span>ต้นทุนวัตถุดิบ</span>
                    </button>
                    )}

                    {canAccessTab(role, 'promo') && (
                    <button
                      onClick={() => handleTabClick('promo')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                        activeTab === 'promo'
                          ? 'nav-active'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Tag className="w-4.5 h-4.5" />
                      <span>โปรโมชั่น</span>
                    </button>
                    )}
                  </>
                )}

                {showManagementSection && (
                  <>
                    <div className="pt-3 pb-1 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                        MANAGEMENT
                      </p>
                    </div>

                    {canAccessTab(role, 'dashboard') && (
                    <button
                      onClick={() => handleTabClick('dashboard')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                        activeTab === 'dashboard'
                          ? 'nav-active'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <LayoutDashboard className="w-4.5 h-4.5" />
                      <span>รายงาน / Dashboard</span>
                    </button>
                    )}

                    {canAccessTab(role, 'loyalty') && (
                    <button
                      onClick={() => handleTabClick('loyalty')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                        activeTab === 'loyalty'
                          ? 'nav-active'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Users className="w-4.5 h-4.5" />
                      <span>สมาชิก</span>
                    </button>
                    )}

                    {canAccessTab(role, 'employees') && (
                    <button
                      onClick={() => handleTabClick('employees')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                        activeTab === 'employees'
                          ? 'nav-active'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <UserCog className="w-4.5 h-4.5" />
                      <span>จัดการพนักงาน</span>
                    </button>
                    )}
                  </>
                )}
              </nav>
            </div>

            <div className="pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-3 mt-6">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2.5 px-1 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
              >
                <ThemeToggleIcon theme={theme} className="w-4 h-4" />
                <span>{theme === 'light' ? 'สลับไปโหมดมืด' : 'สลับไปโหมดสว่าง'}</span>
              </button>

              <div className="flex items-center justify-between gap-3 px-1 py-1">
                <p className="min-w-0 truncate text-xs font-bold text-zinc-800 dark:text-zinc-100">{employee?.name}</p>
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {employee?.role}
                </p>
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
        {/* SVG Gradient Definition for Bottom Nav Active Icons */}
        <svg width="0" height="0" className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <defs>
            <linearGradient id="bottom-nav-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
        </svg>

        {/* 1. แผนผังโต๊ะ */}
        {canAccessTab(role, 'floor') && (
        <button
          type="button"
          onClick={() => onSelectTab('floor')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
            activeTab === 'floor'
              ? 'text-red-600 dark:text-red-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <div className="p-1.5 rounded-xl relative flex items-center justify-center">
            <Layers
              className="w-5 h-5 stroke-[2.2]"
              stroke={activeTab === 'floor' ? 'url(#bottom-nav-icon-gradient)' : 'currentColor'}
              style={{ stroke: activeTab === 'floor' ? 'url(#bottom-nav-icon-gradient)' : undefined }}
            />
            {checkingOutCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-bounce">
                {checkingOutCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 leading-none font-bold">ผังโต๊ะ</span>
        </button>
        )}

        {/* 2. หน้าจอครัว */}
        {canAccessTab(role, 'kitchen') && (
        <button
          type="button"
          onClick={() => onSelectTab('kitchen')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
            activeTab === 'kitchen'
              ? 'text-red-600 dark:text-red-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <div className="p-1.5 rounded-xl relative flex items-center justify-center">
            <ChefHat
              className="w-5 h-5 stroke-[2.2]"
              stroke={activeTab === 'kitchen' ? 'url(#bottom-nav-icon-gradient)' : 'currentColor'}
              style={{ stroke: activeTab === 'kitchen' ? 'url(#bottom-nav-icon-gradient)' : undefined }}
            />
            {pendingTablesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-pulse">
                {pendingTablesCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 leading-none font-bold">หน้าครัว</span>
        </button>
        )}

        {/* 3. ประวัติการขาย */}
        {canAccessTab(role, 'history') && (
          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
              activeTab === 'history'
                ? 'text-red-600 dark:text-red-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <div className="p-1.5 rounded-xl relative flex items-center justify-center">
              <History
                className="w-5 h-5 stroke-[2.2]"
                stroke={activeTab === 'history' ? 'url(#bottom-nav-icon-gradient)' : 'currentColor'}
                style={{ stroke: activeTab === 'history' ? 'url(#bottom-nav-icon-gradient)' : undefined }}
              />
            </div>
            <span className="text-xs mt-0.5 leading-none font-bold">ออเดอร์</span>
          </button>
        )}

        {/* 4. เมนูเพิ่มเติม (Open Drawer) */}
        {(() => {
          const isDrawerTabActive = !['floor', 'kitchen', 'history'].includes(activeTab);
          return (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                isDrawerTabActive
                  ? 'text-red-600 dark:text-red-400 font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <div className="p-1.5 rounded-xl relative flex items-center justify-center">
                <Menu
                  className="w-5 h-5 stroke-[2.2]"
                  stroke={isDrawerTabActive ? 'url(#bottom-nav-icon-gradient)' : 'currentColor'}
                  style={{ stroke: isDrawerTabActive ? 'url(#bottom-nav-icon-gradient)' : undefined }}
                />
              </div>
              <span className="text-xs mt-0.5 leading-none font-bold">เพิ่มเติม</span>
            </button>
          );
        })()}
      </div>

      {/* Desktop Left Sidebar Navigation */}
      <aside
        data-sidebar-collapsed={isSidebarCollapsed || undefined}
        className="relative z-20 hidden md:flex shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col justify-between shadow-sm sticky top-0 h-screen transition-[width,padding] duration-200 ease-out"
        style={{
          width: isSidebarCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
          padding: isSidebarCollapsed ? '0.75rem' : 'var(--sidebar-padding)',
        }}
      >
        {/* Toggle Button docked on the sidebar edge */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          aria-label={isSidebarCollapsed ? 'ขยายเมนูด้านข้าง' : 'หุบเมนูด้านข้าง'}
          title={isSidebarCollapsed ? 'ขยายเมนู' : 'หุบเมนู'}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-md transition-all hover:bg-zinc-50 hover:text-zinc-800 hover:scale-110 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 cursor-pointer before:absolute before:-inset-2 before:content-['']"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div>
          <div className="mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="sidebar-brand-full min-w-0">
              <SidebarBrand theme={theme} />
            </div>
            <div className="sidebar-brand-compact">
              <SidebarBrand theme={theme} size="compact" />
            </div>
          </div>

          <nav className="space-y-1">
            {canAccessTab(role, 'floor') && (
            <button
              type="button"
              onClick={() => onSelectTab('floor')}
              title="แผนผังโต๊ะ"
              className={`sidebar-nav-btn relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                activeTab === 'floor'
                  ? 'nav-active'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="sidebar-nav-btn-inner flex items-center gap-3">
                <Layers className="w-4.5 h-4.5 shrink-0" />
                <span className="sidebar-nav-label">แผนผังโต๊ะ</span>
              </div>
              {checkingOutCount > 0 && (
                <>
                  <span
                    className={`sidebar-nav-badge-inline px-2 py-0.5 rounded-full text-xs font-black transition-all ${
                      activeTab === 'floor'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'bg-rose-500 text-white shadow-xs animate-bounce'
                    }`}
                  >
                    {checkingOutCount}
                  </span>
                  <span
                    className={`sidebar-nav-badge-dot absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
                      activeTab === 'floor' ? 'bg-white' : 'bg-rose-500 animate-bounce'
                    }`}
                    aria-hidden
                  />
                </>
              )}
            </button>
            )}

            {canAccessTab(role, 'kitchen') && (
            <button
              type="button"
              onClick={() => onSelectTab('kitchen')}
              title="หน้าจอครัว"
              className={`sidebar-nav-btn relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                activeTab === 'kitchen'
                  ? 'nav-active'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="sidebar-nav-btn-inner flex items-center gap-3">
                <ChefHat className="w-4.5 h-4.5 shrink-0" />
                <span className="sidebar-nav-label">หน้าจอครัว</span>
              </div>
              {pendingTablesCount > 0 && (
                <>
                  <span
                    className={`sidebar-nav-badge-inline px-2 py-0.5 rounded-full text-xs font-black transition-all ${
                      activeTab === 'kitchen'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'bg-red-600 text-white shadow-xs animate-pulse'
                    }`}
                  >
                    {pendingTablesCount}
                  </span>
                  <span
                    className={`sidebar-nav-badge-dot absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
                      activeTab === 'kitchen' ? 'bg-white' : 'bg-red-600 animate-pulse'
                    }`}
                    aria-hidden
                  />
                </>
              )}
            </button>
            )}

            {canAccessTab(role, 'history') && (
              <button
                type="button"
                onClick={() => onSelectTab('history')}
                title="ออเดอร์ประจำวัน"
                className={`sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                  activeTab === 'history'
                    ? 'nav-active'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <History className="w-4.5 h-4.5 shrink-0" />
                <span className="sidebar-nav-label">ออเดอร์ประจำวัน</span>
              </button>
            )}

            {showCatalogSection && (
              <>
                <div className="sidebar-section-divider border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-2" />
                <div className="pt-4 pb-1">
                  <p className="sidebar-section-title text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                    OWNER CONTROLS
                  </p>
                </div>

                {canAccessTab(role, 'menu') && (
                <button
                  type="button"
                  onClick={() => onSelectTab('menu')}
                  title="จัดการเมนู"
                  className={`sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'menu'
                      ? 'nav-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <UtensilsCrossed className="w-4.5 h-4.5 shrink-0" />
                  <span className="sidebar-nav-label">จัดการเมนู</span>
                </button>
                )}

                {canAccessTab(role, 'stock') && (
                <button
                  type="button"
                  onClick={() => onSelectTab('stock')}
                  title="ต้นทุนวัตถุดิบ"
                  className={`sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'stock'
                      ? 'nav-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Package className="w-4.5 h-4.5 shrink-0" />
                  <span className="sidebar-nav-label">ต้นทุนวัตถุดิบ</span>
                </button>
                )}

                {canAccessTab(role, 'promo') && (
                <button
                  type="button"
                  onClick={() => onSelectTab('promo')}
                  title="โปรโมชั่น"
                  className={`sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'promo'
                      ? 'nav-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Tag className="w-4.5 h-4.5 shrink-0" />
                  <span className="sidebar-nav-label">โปรโมชั่น</span>
                </button>
                )}
              </>
            )}

            {showManagementSection && (
              <>
                <div className="sidebar-section-divider border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-2" />
                <div className="pt-3 pb-1 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <p className="sidebar-section-title text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                    MANAGEMENT
                  </p>
                </div>

                {canAccessTab(role, 'dashboard') && (
                <button
                  type="button"
                  onClick={() => onSelectTab('dashboard')}
                  title="รายงาน / Dashboard"
                  className={`sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'dashboard'
                      ? 'nav-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
                  <span className="sidebar-nav-label">รายงาน / Dashboard</span>
                </button>
                )}

                {canAccessTab(role, 'loyalty') && (
                <button
                  type="button"
                  onClick={() => onSelectTab('loyalty')}
                  title="สมาชิก"
                  className={`sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'loyalty'
                      ? 'nav-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Users className="w-4.5 h-4.5 shrink-0" />
                  <span className="sidebar-nav-label">สมาชิก</span>
                </button>
                )}

                {canAccessTab(role, 'employees') && (
                <button
                  type="button"
                  onClick={() => onSelectTab('employees')}
                  title="จัดการพนักงาน"
                  className={`sidebar-nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none ${
                    activeTab === 'employees'
                      ? 'nav-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <UserCog className="w-4.5 h-4.5 shrink-0" />
                  <span className="sidebar-nav-label">จัดการพนักงาน</span>
                </button>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3 mt-6">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'light' ? 'สลับไปโหมดมืด' : 'สลับไปโหมดสว่าง'}
            className="sidebar-nav-btn w-full flex items-center gap-2.5 px-1 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
          >
            <ThemeToggleIcon theme={theme} className="w-4.5 h-4.5" />
            <span className="sidebar-footer-text">
              {theme === 'light' ? 'สลับไปโหมดมืด' : 'สลับไปโหมดสว่าง'}
            </span>
          </button>

          {/* User Info (Expanded: Name + Role, Collapsed: User Name centered) */}
          <div className="w-full px-1 py-1 overflow-hidden">
            <div className="sidebar-footer-full flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-bold text-zinc-800 dark:text-zinc-100" title={employee?.name}>
                {employee?.name}
              </p>
              <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {employee?.role}
              </p>
            </div>

            <div className="sidebar-footer-compact w-full items-center justify-center">
              <p
                className="w-full text-center text-xs font-extrabold text-zinc-800 dark:text-zinc-100 truncate px-0.5"
                title={employee?.name}
              >
                {employee?.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="ออกจากระบบ"
            className="sidebar-nav-btn w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            <span className="sidebar-footer-text">ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
