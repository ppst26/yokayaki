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
          className="p-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200/80 dark:border-red-900/50 rounded-xl transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer shadow-xs"
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'floor'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>แผนผังโต๊ะ</span>
                </button>

                <button
                  onClick={() => handleTabClick('kitchen')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'kitchen'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>หน้าจอครัว (KDS)</span>
                </button>

                <button
                  onClick={() => handleTabClick('history')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>ประวัติการขาย</span>
                </button>

                {isOwner && (
                  <>
                    <div className="pt-4 pb-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                        OWNER CONTROLS
                      </p>
                    </div>

                    <button
                      onClick={() => handleTabClick('menu')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'menu'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                      }`}
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>จัดการเมนู</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('stock')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'stock'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>ต้นทุนวัตถุดิบ</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('promo')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'promo'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                      }`}
                    >
                      <Tag className="w-4 h-4" />
                      <span>โปรโมชั่น</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('dashboard')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'dashboard'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>รายงาน / Dashboard</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('loyalty')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'loyalty'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>สมาชิก</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('employees')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out cursor-pointer ${
                        activeTab === 'employees'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:translate-x-1.5'
                      }`}
                    >
                      <UserCog className="w-4 h-4" />
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
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider">MANAGEMENT SYSTEM</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => onSelectTab('floor')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'floor'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>ออเดอร์ประจำวัน</span>
            </button>

            {isOwner && (
              <>
                <div className="pt-4 pb-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3">
                    OWNER CONTROLS
                  </p>
                </div>

                <button
                  onClick={() => onSelectTab('menu')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === 'menu'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span>จัดการพนักงาน</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3 mt-6">
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
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
