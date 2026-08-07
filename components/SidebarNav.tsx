import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
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
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/20">
            <ChefHat className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">
              Mini Restaurant <span className="text-red-600">POS</span>
            </h1>
            <p className="text-[10px] font-semibold text-slate-400 tracking-wider">MANAGEMENT SYSTEM</p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 rounded-xl transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer shadow-xs"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Mobile SlideOver Navigation Drawer (Right Side) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Dark Backdrop */}
          <div
            onClick={() => handleCloseDrawer()}
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ${
              isDrawerClosing ? 'opacity-0' : 'animate-backdrop-in'
            }`}
          />

          {/* Drawer Content Panel */}
          <div
            className={`relative w-72 max-w-[80vw] bg-white h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto transition-transform duration-300 ease-out ${
              isDrawerClosing ? 'translate-x-full' : 'animate-drawer-in-right'
            }`}
          >
            <div>
              {/* Drawer Header: Logo + Close Button */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/20">
                    <ChefHat className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight text-slate-900">
                      Mini Restaurant <span className="text-red-600">POS</span>
                    </h1>
                    <p className="text-[9px] font-semibold text-slate-400 tracking-wider">MANAGEMENT SYSTEM</p>
                  </div>
                </div>

                <button
                  onClick={() => handleCloseDrawer()}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition active:scale-90 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="space-y-1">
                <button
                  onClick={() => handleTabClick('floor')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'floor'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>แผนผังโต๊ะ</span>
                </button>

                <button
                  onClick={() => handleTabClick('kitchen')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'kitchen'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>หน้าจอครัว (KDS)</span>
                </button>

                <button
                  onClick={() => handleTabClick('history')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>ประวัติการขาย</span>
                </button>

                {isOwner && (
                  <>
                    <div className="pt-4 pb-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3">
                        OWNER CONTROLS
                      </p>
                    </div>

                    <button
                      onClick={() => handleTabClick('menu')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'menu'
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                      }`}
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>จัดการเมนู</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('stock')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'stock'
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>ต้นทุนวัตถุดิบ</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('promo')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'promo'
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                      }`}
                    >
                      <Tag className="w-4 h-4" />
                      <span>โปรโมชั่น</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('dashboard')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'dashboard'
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>รายงาน / Dashboard</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('loyalty')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'loyalty'
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>สมาชิก</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('employees')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'employees'
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1.5'
                      }`}
                    >
                      <UserCog className="w-4 h-4" />
                      <span>จัดการพนักงาน</span>
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Drawer Footer: Theme Switcher + Employee Info + Logout */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3 mt-6">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>{theme === 'dark' ? 'โหมดมืด (Dark)' : 'โหมดสว่าง (Light)'}</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">สลับ</span>
              </button>

              <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                  {employee?.name?.charAt(0) || 'E'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{employee?.name}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {employee?.role}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition duration-150 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex-col justify-between shadow-sm shrink-0 sticky top-0 h-screen">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/20">
              <ChefHat className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                 Mini POS <span className="text-red-600">POS</span>
              </h1>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wider">MANAGEMENT SYSTEM</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => onSelectTab('floor')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'floor'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>แผนผังโต๊ะ</span>
            </button>

            <button
              onClick={() => onSelectTab('kitchen')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'kitchen'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>หน้าจอครัว (KDS)</span>
            </button>

            <button
              onClick={() => onSelectTab('history')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>ออเดอร์ประจำวัน</span>
            </button>

            {isOwner && (
              <>
                <div className="pt-4 pb-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
                    OWNER CONTROLS
                  </p>
                </div>

                <button
                  onClick={() => onSelectTab('menu')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'menu'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>จัดการเมนู</span>
                </button>

                <button
                  onClick={() => onSelectTab('stock')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'stock'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>ต้นทุนวัตถุดิบ</span>
                </button>

                <button
                  onClick={() => onSelectTab('promo')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'promo'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>โปรโมชั่น</span>
                </button>

                <button
                  onClick={() => onSelectTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>รายงาน / Dashboard</span>
                </button>

                <button
                  onClick={() => onSelectTab('loyalty')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'loyalty'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>สมาชิก</span>
                </button>

                <button
                  onClick={() => onSelectTab('employees')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'employees'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span>จัดการพนักงาน</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Footer: Theme Switcher + Logged in Employee Info + Logout */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3 mt-6">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>{theme === 'dark' ? 'โหมดมืด (Dark)' : 'โหมดสว่าง (Light)'}</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">สลับ</span>
          </button>

          <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
              {employee?.name?.charAt(0) || 'E'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{employee?.name}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {employee?.role}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
