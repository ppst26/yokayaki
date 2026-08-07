"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Boxes,
  Plus,
  Minus,
  Search,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  History,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_stock_tracked: boolean;
  category: string;
}

interface StockLog {
  id: number;
  menu_item_id: number;
  menu_item_name?: string;
  change_amount: number;
  reason: string;
  employee_name: string;
  created_at: string;
  menu_items?: { name: string };
}

export const StockManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [adjustTarget, setAdjustTarget] = useState<MenuItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('1');
  const [adjustReason, setAdjustReason] = useState<string>('จัดซื้อเข้าเพิ่ม');
  const [adjustDirection, setAdjustDirection] = useState<'add' | 'deduct'>('add');
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const showMsg = (text: string, t: 'success' | 'error') => {
    setMessage({ text, type: t });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, stock, is_stock_tracked, category')
        .order('id', { ascending: true });

      if (error) throw error;
      setItems((data || []) as MenuItem[]);
    } catch (err: any) {
      console.error('Error fetching stock:', err);
      showMsg('ไม่สามารถดึงข้อมูลสต็อกได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data: rawLogs, error } = await supabase
        .from('stock_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!rawLogs || rawLogs.length === 0) {
        setLogs([]);
        return;
      }

      const missingItemIds = Array.from(
        new Set(
          rawLogs
            .filter(l => !l.menu_item_name && l.menu_item_id)
            .map(l => l.menu_item_id)
        )
      );

      const nameMap: Record<number, string> = {};
      if (missingItemIds.length > 0) {
        const { data: menuData } = await supabase
          .from('menu_items')
          .select('id, name')
          .in('id', missingItemIds);
        if (menuData) {
          menuData.forEach(m => {
            nameMap[m.id] = m.name;
          });
        }
      }

      const formatted: StockLog[] = rawLogs.map(l => ({
        ...l,
        menu_item_name: l.menu_item_name || nameMap[l.menu_item_id] || `เมนู #${l.menu_item_id}`,
      }));

      setLogs(formatted);
    } catch (err: any) {
      console.error('Error fetching stock logs:', err?.message || err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchLogs();
  }, []);

  const handleAdjustStock = async () => {
    if (!adjustTarget) return;
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount <= 0) return showMsg('กรุณาระบุจำนวนสินค้า', 'error');

    const change = adjustDirection === 'add' ? amount : -amount;
    const newStock = Math.max(0, adjustTarget.stock + change);

    try {
      setIsAdjusting(true);
      const { error: updateErr } = await supabase
        .from('menu_items')
        .update({ stock: newStock })
        .eq('id', adjustTarget.id);

      if (updateErr) throw updateErr;

      await supabase.from('stock_logs').insert([
        {
          menu_item_id: adjustTarget.id,
          menu_item_name: adjustTarget.name,
          old_stock: adjustTarget.stock,
          new_stock: newStock,
          change_amount: change,
          reason: adjustReason,
          employee_name: 'Staff',
        },
      ]);

      showMsg(`ปรับสต็อก "${adjustTarget.name}" เป็น ${newStock} ชิ้นเรียบร้อย`, 'success');
      setAdjustTarget(null);
      fetchItems();
      fetchLogs();
    } catch (err: any) {
      console.error('Error adjusting stock:', err);
      showMsg('ไม่สามารถปรับสต็อกได้', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  const toggleStockTracked = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_stock_tracked: !item.is_stock_tracked })
        .eq('id', item.id);

      if (error) throw error;
      showMsg(
        `${!item.is_stock_tracked ? 'เปิด' : 'ปิด'}การนับสต็อกสำหรับ "${item.name}" แล้ว`,
        'success'
      );
      fetchItems();
    } catch (err: any) {
      showMsg('ไม่สามารถอัปเดตการตัดสต็อกได้', 'error');
    }
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-red-600 dark:text-red-400" />
            จัดการสต็อกวัตถุดิบ & สินค้า
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold mt-0.5">
            ปรับปรุงจำนวนคงเหลือ ตรวจสอบประวัติการตัดสต็อกอัตโนมัติ และสต็อกคงเหลือต่ำ
          </p>
        </div>

        <button
          onClick={fetchItems}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
          }`}
        >
          รายการสต็อกคงเหลือ ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
          }`}
        >
          ประวัติการปรับสต็อกล่าสุด ({logs.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              <input
                type="text"
                placeholder="ค้นหาวัตถุดิบ/สินค้า..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                        <th className="p-4">สินค้า/วัตถุดิบ</th>
                        <th className="p-4">หมวดหมู่</th>
                        <th className="p-4 text-center">ระบบนับสต็อก</th>
                        <th className="p-4 text-right">จำนวนคงเหลือ</th>
                        <th className="p-4 text-center">ปรับสต็อก</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200">
                      {paginatedItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/50 transition">
                          <td className="p-4 font-bold text-slate-900 dark:text-neutral-100">{item.name}</td>
                          <td className="p-4">{item.category || 'ทั่วไป'}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleStockTracked(item)}
                              className={`px-3 py-1 rounded-full text-[11px] font-extrabold cursor-pointer ${
                                item.is_stock_tracked
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                              }`}
                            >
                              {item.is_stock_tracked ? 'ตัดสต็อกอยู่' : 'ไม่ตัดสต็อก'}
                            </button>
                          </td>
                          <td className="p-4 text-right font-black text-sm">
                            <span
                              className={
                                item.stock <= 5
                                  ? 'text-rose-600 dark:text-rose-400 font-black'
                                  : 'text-slate-900 dark:text-neutral-100'
                              }
                            >
                              {item.stock} ชิ้น
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                setAdjustTarget(item);
                                setAdjustAmount('1');
                                setAdjustReason('จัดซื้อเข้าเพิ่ม');
                                setAdjustDirection('add');
                              }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              ปรับจำนวน
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-sm text-xs font-semibold text-slate-600 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <span>แสดงหน้า:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-slate-800 dark:text-neutral-100 focus:outline-none cursor-pointer font-bold"
                  >
                    <option value={10}>10 รายการ</option>
                    <option value={20}>20 รายการ</option>
                    <option value={50}>50 รายการ</option>
                  </select>
                  <span>(ทั้งหมด {filteredItems.length} รายการ)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* History Log Table */
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  <th className="p-4">เวลา</th>
                  <th className="p-4">สินค้า</th>
                  <th className="p-4 text-center">การเปลี่ยนแปลง</th>
                  <th className="p-4">เหตุผล</th>
                  <th className="p-4">ผู้ทำรายการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/50 transition">
                    <td className="p-4 text-slate-500 dark:text-neutral-400">
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-neutral-100">
                      {log.menu_item_name || log.menu_items?.name || `Item #${log.menu_item_id}`}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`font-black ${
                          log.change_amount > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {log.change_amount > 0 ? '+' : ''}
                        {log.change_amount} ชิ้น
                      </span>
                    </td>
                    <td className="p-4">{log.reason}</td>
                    <td className="p-4 text-slate-500 dark:text-neutral-400">{log.employee_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
                ปรับสต็อก ({adjustTarget.name})
              </h3>
              <button
                onClick={() => setAdjustTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              จำนวนคงเหลือปัจจุบัน: <span className="font-extrabold text-slate-900 dark:text-neutral-100">{adjustTarget.stock} ชิ้น</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustDirection('add')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer border ${
                  adjustDirection === 'add'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                เพิ่มสต็อก
              </button>
              <button
                type="button"
                onClick={() => setAdjustDirection('deduct')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer border ${
                  adjustDirection === 'deduct'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300'
                }`}
              >
                <Minus className="w-4 h-4" />
                ลดสต็อก
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
                จำนวนสินค้า:
              </label>
              <input
                type="number"
                min={1}
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
                เหตุผลในการปรับสต็อก:
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAdjustTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAdjustStock}
                disabled={isAdjusting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isAdjusting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'ยืนยัน'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
