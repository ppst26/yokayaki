"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Save, ToggleLeft, ToggleRight, Plus, Minus, Loader2, CheckCircle } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_stock_tracked: boolean;
}

export const StockManager: React.FC = () => {
  const { employee } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [initialItems, setInitialItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, stock, is_stock_tracked')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) {
        setItems(data as MenuItem[]);
        setInitialItems(data as MenuItem[]);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'ไม่สามารถดึงข้อมูลสต็อกได้', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();

    // ติดตามการอัปเดตแบบเรียลไทม์ในตาราง menu_items
    const channel = supabase
      .channel('realtime:menu_stock')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          // ดึงข้อมูลใหม่เงียบๆ ข้างหลัง
          supabase
            .from('menu_items')
            .select('id, name, price, stock, is_stock_tracked')
            .order('id', { ascending: true })
            .then(({ data }) => {
              if (data) setItems(data as MenuItem[]);
            });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleStockChange = (id: number, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newStock = Math.max(0, item.stock + delta);
        return { ...item, stock: newStock };
      }
      return item;
    }));
  };

  const handleStockInputChange = (id: number, val: string) => {
    const parsed = parseInt(val, 10);
    const stockVal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setItems(prev => prev.map(item => item.id === id ? { ...item, stock: stockVal } : item));
  };

  const handleToggleTracked = (id: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_stock_tracked: !item.is_stock_tracked } : item));
  };

  const saveAllChanges = async () => {
    try {
      setIsSaving(true);

      // หารายการที่มีการเปลี่ยนแปลง (สต็อก หรือ is_stock_tracked)
      const changedItems = items.filter(item => {
        const original = initialItems.find(o => o.id === item.id);
        if (!original) return false;
        return item.stock !== original.stock || item.is_stock_tracked !== original.is_stock_tracked;
      });

      if (changedItems.length === 0) {
        setMessage({ text: 'ไม่มีรายการใดที่เปลี่ยนแปลง', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // อัปเดตเฉพาะรายการที่เปลี่ยนแปลงเท่านั้น
      const updates = changedItems.map(item =>
        supabase
          .from('menu_items')
          .update({ stock: item.stock, is_stock_tracked: item.is_stock_tracked })
          .eq('id', item.id)
      );
      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);
      if (hasError) throw new Error('บางรายการไม่สามารถบันทึกได้');

      // บันทึกประวัติลง stock_logs เฉพาะรายการที่สต็อกเปลี่ยนแปลง
      const stockChangedItems = changedItems.filter(item => {
        const original = initialItems.find(o => o.id === item.id);
        return original && item.stock !== original.stock;
      });

      if (stockChangedItems.length > 0) {
        const logEntries = stockChangedItems.map(item => {
          const original = initialItems.find(o => o.id === item.id)!;
          return {
            menu_item_id: item.id,
            menu_item_name: item.name,
            employee_name: employee?.name || 'ไม่ระบุชื่อ',
            old_stock: original.stock,
            new_stock: item.stock,
            change_amount: item.stock - original.stock
          };
        });

        const { error: logError } = await supabase.from('stock_logs').insert(logEntries);
        if (logError) {
          console.error('Error writing stock logs:', logError);
          // ไม่ throw เพราะสต็อกอัปเดตสำเร็จแล้ว แค่ประวัติเขียนไม่ได้
        }
      }

      // อัปเดต initialItems เป็นค่าปัจจุบันหลังบันทึกสำเร็จ
      setInitialItems([...items]);

      setMessage({ text: `บันทึกสต็อก ${changedItems.length} รายการสำเร็จ` + (stockChangedItems.length > 0 ? ` (บันทึกประวัติ ${stockChangedItems.length} รายการ)` : ''), type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              ระบบจัดการสต็อกสินค้า (Stock Manager)
            </h2>
            <p className="text-stone-400 text-xs mt-1">อัปเดตจำนวนจานอาหารพร้อมจำหน่ายและสลับโหมดนับสต็อกแบบเรียลไทม์</p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาเมนู..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
              : 'bg-red-950/20 border-red-900/40 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/80">
                    <th className="py-4 px-6">รายการเมนู</th>
                    <th className="py-4 px-4 text-center">เปิด/ปิด สต็อก</th>
                    <th className="py-4 px-6 text-center">สต็อกจานพร้อมขาย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-sm">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-stone-900/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-stone-200">{item.name}</div>
                        <div className="text-stone-500 text-xs mt-0.5">{item.price} บาท</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleTracked(item.id)}
                          className="focus:outline-none inline-flex cursor-pointer transition active:scale-95"
                        >
                          {item.is_stock_tracked ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-full">
                              <ToggleRight className="w-4 h-4" />
                              <span>นับสต็อก</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-stone-500 font-bold text-xs bg-stone-900/80 border border-stone-800 px-2.5 py-1 rounded-full">
                              <ToggleLeft className="w-4 h-4" />
                              <span>ไม่จำกัด</span>
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleStockChange(item.id, -1)}
                            disabled={!item.is_stock_tracked}
                            className={`p-1.5 border rounded-lg active:scale-95 transition ${
                              item.is_stock_tracked
                                ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300'
                                : 'bg-stone-900/30 border-stone-850/50 text-stone-600 cursor-not-allowed'
                            }`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={item.stock}
                            disabled={!item.is_stock_tracked}
                            onChange={e => handleStockInputChange(item.id, e.target.value)}
                            className={`w-16 text-center py-1.5 text-sm font-bold border rounded-lg focus:outline-none ${
                              item.is_stock_tracked
                                ? 'bg-stone-950 border-stone-800 text-white focus:border-amber-500/50'
                                : 'bg-stone-900/10 border-stone-900/50 text-stone-600 cursor-not-allowed'
                            }`}
                          />

                          <button
                            onClick={() => handleStockChange(item.id, 1)}
                            disabled={!item.is_stock_tracked}
                            className={`p-1.5 border rounded-lg active:scale-95 transition ${
                              item.is_stock_tracked
                                ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300'
                                : 'bg-stone-900/30 border-stone-850/50 text-stone-600 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-stone-500 font-medium text-xs">
                        ไม่พบรายการเมนูที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ปุ่มบันทึกทั้งหมด */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAllChanges}
                disabled={isSaving}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-stone-700 disabled:to-stone-700 text-stone-950 disabled:text-stone-400 px-6 py-3 rounded-2xl font-extrabold text-sm inline-flex items-center gap-2.5 transition active:scale-95 shadow-lg shadow-amber-500/10"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
