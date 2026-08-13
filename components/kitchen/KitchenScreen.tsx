"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ChefHat, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { KitchenOrderCard } from './KitchenOrderCard';
import { Card } from '@/components/ui/card';
import { playNewOrderSound, playCheckBillSound } from '@/lib/audioNotifier';

interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'served' | 'voided';
  created_at: string;
  notes?: string;
  menu_items: {
    id: number;
    name: string;
    category?: string;
    unit?: string;
  };
  orders?: {
    table_id: number;
    status: string;
  };
}

interface TableGroup {
  table_id: number;
  order_id: number;
  oldest_created_at: string;
  items: OrderItem[];
}

export const KitchenScreen: React.FC = () => {
  const { employee } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const prevItemsCountRef = useRef<number>(0);

  const playChime = () => {
    if (!soundEnabled) return;
    playNewOrderSound();
  };

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          menu_item_id,
          quantity,
          unit_price,
          status,
          created_at,
          notes,
          menu_items (id, name, category, unit),
          orders!inner (table_id, status)
        `)
        .eq('status', 'pending')
        .eq('orders.status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const fetchedItems = data as unknown as OrderItem[];

        if (
          prevItemsCountRef.current > 0 &&
          fetchedItems.length > prevItemsCountRef.current
        ) {
          playChime();
        }

        prevItemsCountRef.current = fetchedItems.length;
        setItems(fetchedItems);
      }
    } catch (err) {
      console.error('Error fetching kitchen items:', err);
    } finally {
      setLoading(false);
    }
  };

  const markItemAsServed = async (itemId: number) => {
    try {
      setItems(prev => prev.filter(i => i.id !== itemId));

      const { error } = await supabase
        .from('order_items')
        .update({ status: 'served' })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking item as served:', err);
      fetchPendingItems();
    }
  };

  const voidOrderItem = async (itemId: number, reason: string, quantity: number): Promise<boolean> => {
    try {
      const { data: success, error } = await supabase.rpc('void_order_item', {
        p_order_item_id: itemId,
        p_void_quantity: quantity,
        p_reason: reason,
        p_employee_name: employee?.name || 'Kitchen',
      });
      if (error) throw error;
      if (success) {
        fetchPendingItems();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error voiding item from kitchen:', err);
      return false;
    }
  };

  const markAllTableItemsAsServed = async (itemsToServe: OrderItem[]) => {
    const itemIds = itemsToServe.map(i => i.id);
    try {
      setItems(prev => prev.filter(i => !itemIds.includes(i.id)));

      const { error } = await supabase
        .from('order_items')
        .update({ status: 'served' })
        .in('id', itemIds);

      if (error) throw error;
    } catch (err) {
      console.error('Error serving all table items:', err);
      fetchPendingItems();
    }
  };

  useEffect(() => {
    fetchPendingItems();

    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);

    const channel = supabase
      .channel('realtime:kitchen_items')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload: any) => {
          if (soundEnabled && payload.new && payload.new.status === 'pending') {
            playNewOrderSound();
          }
          fetchPendingItems();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items' },
        () => {
          fetchPendingItems();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables' },
        (payload: any) => {
          if (soundEnabled && payload.new && payload.new.status === 'checking_out' && payload.old?.status !== 'checking_out') {
            playCheckBillSound();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      channel.unsubscribe();
    };
  }, [soundEnabled]);

  const groupMap: Record<number, TableGroup> = {};
  for (const item of items) {
    const tableId = item.orders?.table_id || 0;
    if (!groupMap[tableId]) {
      groupMap[tableId] = {
        table_id: tableId,
        order_id: item.order_id,
        oldest_created_at: item.created_at,
        items: [],
      };
    }
    groupMap[tableId].items.push(item);

    if (
      new Date(item.created_at).getTime() <
      new Date(groupMap[tableId].oldest_created_at).getTime()
    ) {
      groupMap[tableId].oldest_created_at = item.created_at;
    }
  }

  const tableGroups = Object.values(groupMap).sort(
    (a, b) =>
      new Date(a.oldest_created_at).getTime() -
      new Date(b.oldest_created_at).getTime()
  );

  const getWaitTimeMinutes = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const diffMs = now.getTime() - created;
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  };

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      {/* KDS Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="w-[50%]">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
            <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 shrink-0" />
            <span>ห้องครัว</span>
          </h1>
          <p className="text-caption mt-0.5">
            รายการออเดอร์ทีต้องทำเสริ์ฟ
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-400'
            }`}
            title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียง'}</span>
          </button>

          <button
            onClick={fetchPendingItems}
            className="p-2 sm:p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl transition active:scale-95 shadow-xs cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Order Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tableGroups.length === 0 ? (
        <Card className="text-center py-20 p-8 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <ChefHat className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
            ยังไม่มีออเดอร์ในครัว
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold max-w-sm mx-auto">
            เมื่อมีออเดอร์ใหม่จากพนักงาน POS หรือลูกค้าระบบจะแสดงการ์ดรายการอาหารให้ที่นี่โดยอัตโนมัติ
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tableGroups.map(group => (
            <KitchenOrderCard
              key={group.table_id}
              group={group}
              getWaitTimeMinutes={getWaitTimeMinutes}
              markItemAsServed={markItemAsServed}
              markAllTableItemsAsServed={markAllTableItemsAsServed}
              voidOrderItem={voidOrderItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
